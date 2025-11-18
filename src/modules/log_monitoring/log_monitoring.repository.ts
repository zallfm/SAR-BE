import { LogDetail, LogEntry } from "../../types/log_monitoring";
import { prisma } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/index.js";

type Order = "asc" | "desc";
type SortBy = "NO" | "START_DATE" | "END_DATE";

export interface ListLogsQuery {
  page?: number;
  limit?: number;
  status?: LogEntry["STATUS"];
  module?: string;
  userId?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: SortBy;
  order?: Order;
}

// STATUS → MESSAGE_TYPE di master
const statusToMsgType: Record<LogEntry["STATUS"], string> = {
  Success: "SUC",
  Error: "ERR",
  Warning: "WRN",
  InProgress: "INF",
};
function dayPrefix(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

// Ambil satu baris message default untuk status tertentu
async function resolveMessageForStatus(status: LogEntry["STATUS"]) {
  const wantedType = statusToMsgType[status] ?? "INF";
  const msg = await prisma.tB_M_MESSAGE.findFirst({
    where: { MESSAGE_TYPE: wantedType },
    orderBy: { MESSAGE_ID: "asc" }, // ambil yg pertama; bebas atur
  });
  if (!msg) throw new Error(`TB_M_MESSAGE not found for MESSAGE_TYPE=${wantedType}`);
  return msg; // { MESSAGE_ID: 'MSG004', MESSAGE_TYPE: 'SUC', ... }
}
async function allocateProcessId(tx: Prisma.TransactionClient, baseDate: Date) {
  const prefix = dayPrefix(baseDate);
  const resource = `LOG_SEQ_${prefix}`;

  // 1) ambil lock eksklusif (lock milik transaksi ini)
  await tx.$executeRawUnsafe(
    `EXEC sp_getapplock @Resource = @p1, @LockMode = 'Exclusive', @LockOwner='Transaction', @LockTimeout = 5000;`,
    resource
  );

  // 2) baca MAX(PROCESS_ID) hari ini (pakai HOLDLOCK untuk jaga konsistensi)
  const [row] = await tx.$queryRaw<{ last?: string }[]>`
    SELECT MAX([PROCESS_ID]) AS [last]
    FROM [dbo].[TB_R_LOG_H] WITH (HOLDLOCK)
    WHERE [PROCESS_ID] LIKE ${prefix + '%'}
  `;

  const last = row?.last ?? `${prefix}00000`;
  const nextSeq = String(Number(last.slice(-5)) + 1).padStart(5, "0");
  const candidate = `${prefix}${nextSeq}`;

  return candidate; // contoh: 2025103000005
}


const parseDate = (s: string): Date => {
  if (!s) return new Date();
  try {
    const safe = s.replace(/\//g, "-").replace(/\\/g, "-");
    const [d, m, rest] = safe.split("-");
    const [y, time] = (rest ?? "").split(" ");
    const [hh, mm, ss] = (time ?? "00:00:00").split(":").map(Number);
    return new Date(Number(y), Number(m) - 1, Number(d), hh, mm, ss);
  } catch (err) {
    console.error("[parseDate ERROR]", s, err);
    return new Date();
  }
};

function withinRange(dt?: string, start?: string, end?: string): boolean {
  if (!dt) return false;
  const t = parseDate(dt).getTime();
  if (start && t < parseDate(start).getTime()) return false;
  if (end && t > parseDate(end).getTime()) return false;
  return true;
}

const toGB = (d?: Date | null): string => {
  if (!d) return "";
  return d.toLocaleString("en-GB", { hour12: false }).replace(",", "");
};

const normalizeStatusFromDb = (s?: string | null): LogEntry["STATUS"] => {
  const v = (s ?? "").toUpperCase();
  if (v === "S") return "Success";
  if (v === "E" || v === "F") return "Error";
  if (v === "W") return "Warning";
  if (v === "P") return "InProgress";
  return "Success";
};

export const logRepository = {
  async listLogs(params: ListLogsQuery) {
    const {
      page = 1,
      limit = 10,
      status,
      module,
      userId,
      q,
      startDate,
      endDate,
      sortBy = "START_DATE",
      order = "desc",
    } = params;

    const where: any = {};
    if (status) {
      const map: Record<LogEntry["STATUS"], string> = {
        Success: "S",
        Error: "E",
        Warning: "W",
        InProgress: "P",
      };
      where.PROCESS_STATUS = map[status];
    }
    if (module) {
      // filter by module name via relation
      where.TB_M_MODULE = { MODULE_NAME: { equals: module } };
    }
    if (userId) {
      where.CREATED_BY = { equals: userId };
    }
    if (startDate || endDate) {
      where.START_DT = {};
      if (startDate) where.START_DT.gte = parseDate(startDate);
      if (endDate) where.START_DT.lte = parseDate(endDate);
    }
    if (q) {
      const s = q;
      where.OR = [
        { PROCESS_ID: { contains: s } },
        { TB_M_MODULE: { MODULE_NAME: { contains: s } } },
        { TB_M_FUNCTION: { FUNCTION_NAME: { contains: s } } },
      ];
    }

    // log_monitoring.repository.ts
    const orderBy: any = (() => {
      if (sortBy === "NO") {
        // biasanya tidak dipakai untuk “terbaru”, tapi tetap konsisten
        return [{ PROCESS_ID: order }];
      }
      if (sortBy === "END_DATE") {
        // terbaru di atas + tiebreaker
        return [{ END_DT: order }, { START_DT: order }, { PROCESS_ID: "desc" }];
      }
      // DEFAULT = START_DATE (terbaru di atas) + tiebreaker
      return [{ START_DT: order }, { END_DT: order }, { PROCESS_ID: "desc" }];
    })();


    const [total, rows] = await Promise.all([
      prisma.tB_R_LOG_H.count({ where }),
      prisma.tB_R_LOG_H.findMany({
        where,
        include: {
          TB_M_MODULE: true,
          TB_M_FUNCTION: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data: LogEntry[] = rows.map((h, idx) => ({
      NO: (page - 1) * limit + idx + 1,
      PROCESS_ID: h.PROCESS_ID,
      USER_ID: h.CREATED_BY,
      MODULE: h.TB_M_MODULE?.MODULE_NAME ?? h.MODULE_ID,
      FUNCTION_NAME: h.TB_M_FUNCTION?.FUNCTION_NAME ?? h.FUNCTION_ID,
      START_DATE: toGB(h.START_DT),
      END_DATE: toGB(h.END_DT ?? null),
      STATUS: normalizeStatusFromDb(h.PROCESS_STATUS),
      DETAILS: [],
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async getLogByProcessId(processId: string) {
    const h = await prisma.tB_R_LOG_H.findUnique({
      where: { PROCESS_ID: processId },
      include: {
        TB_M_MODULE: true,
        TB_M_FUNCTION: true,
        TB_R_LOG_D: true,
      },
    });
    if (!h) return null;

    const details: LogDetail[] = (h.TB_R_LOG_D ?? [])
      .sort((a, b) => a.SEQ_NO - b.SEQ_NO)
      .map((d) => ({
        ID: d.SEQ_NO,
        PROCESS_ID: d.PROCESS_ID,
        MESSAGE_DATE_TIME: toGB(d.CREATED_DT),
        LOCATION: d.LOCATION,
        MESSAGE_DETAIL: d.MESSAGE_CONTENT,
        MESSAGE_ID: d.MESSAGE_ID,
        MESSAGE_TYPE: d.MESSAGE_TYPE
      }));

    const result: LogEntry = {
      NO: 1,
      PROCESS_ID: h.PROCESS_ID,
      USER_ID: h.CREATED_BY,
      MODULE: h.TB_M_MODULE?.MODULE_NAME ?? h.MODULE_ID,
      FUNCTION_NAME: h.TB_M_FUNCTION?.FUNCTION_NAME ?? h.FUNCTION_ID,
      START_DATE: toGB(h.START_DT),
      END_DATE: toGB(h.END_DT ?? null),
      STATUS: normalizeStatusFromDb(h.PROCESS_STATUS),
      DETAILS: details,
    };
    return result;
  },

  async insertLog(newLog: LogEntry) {
    const statusToDb: Record<LogEntry["STATUS"], string> = {
      Success: "S",
      Error: "E",
      Warning: "W",
      InProgress: "P",
    };
    console.log("newLog", newLog)

    // cari modul by ID/NAMA (tahan banting)
    const moduleRow = await prisma.tB_M_MODULE.findFirst({
      where: { OR: [{ MODULE_ID: newLog.MODULE }, { MODULE_NAME: newLog.MODULE }] },
    });
    if (!moduleRow) throw new Error(`MODULE not found: ${newLog.MODULE}`);

    const functionRow = await prisma.tB_M_FUNCTION.findFirst({
      where: { MODULE_ID: moduleRow.MODULE_ID, FUNCTION_NAME: newLog.FUNCTION_NAME },
    });
    if (!functionRow) {
      throw new Error(`FUNCTION_NAME not found for module ${moduleRow.MODULE_ID}: ${newLog.FUNCTION_NAME}`);
    }

    // ✅ tentukan message default dari STATUS
    const defaultMsg = await resolveMessageForStatus(newLog.STATUS);

    const startDt = parseDate(newLog.START_DATE);
    const endDt = newLog.END_DATE ? parseDate(newLog.END_DATE) : null;

    // console.log("newLog", newLog)

    try {
      await prisma.$transaction(async (tx) => {
        let processId = await allocateProcessId(tx, startDt);
        // console.log("processId", processId)
        await tx.tB_R_LOG_H.create({
          data: {
            PROCESS_ID: processId,
            MODULE_ID: moduleRow.MODULE_ID,
            FUNCTION_ID: functionRow.FUNCTION_ID,
            START_DT: startDt,
            END_DT: endDt,
            PROCESS_STATUS: statusToDb[newLog.STATUS],
            CREATED_BY: newLog.USER_ID,
            CREATED_DT: new Date(),
          },
        });

        if (newLog.DETAILS?.length) {
          await tx.tB_R_LOG_D.createMany({
            data: newLog.DETAILS.map((d) => ({
              PROCESS_ID: processId,
              SEQ_NO: d.ID,
              // ⬇️ default dari master, boleh override kalau d.MESSAGE_ID ada
              MESSAGE_ID: d.MESSAGE_ID ?? defaultMsg.MESSAGE_ID,
              MESSAGE_TYPE: d.MESSAGE_TYPE ?? defaultMsg.MESSAGE_TYPE,
              MESSAGE_CONTENT: d.MESSAGE_DETAIL,
              LOCATION: d.LOCATION,
              CREATED_BY: newLog.USER_ID,
              CREATED_DT: parseDate(d.MESSAGE_DATE_TIME),
              MODULE_ID: moduleRow.MODULE_ID,
              FUNCTION_ID: functionRow.FUNCTION_ID,
            })),
          });
        }
      });
    } catch (e) {
      console.error("[insertLog] TRANSACTION FAILED:", (e as any)?.message, e);
      throw e;
    }
    console.log("reponewLog", newLog)

    return newLog;
  },

  async listDetailsByProcessId(processId: string, page = 1, limit = 20) {
    const where = { PROCESS_ID: processId } as const;
    const [total, rows] = await Promise.all([
      prisma.tB_R_LOG_D.count({ where }),
      prisma.tB_R_LOG_D.findMany({
        where,
        orderBy: { SEQ_NO: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data: LogDetail[] = rows.map((d) => ({
      ID: d.SEQ_NO,
      PROCESS_ID: d.PROCESS_ID,
      MESSAGE_DATE_TIME: toGB(d.CREATED_DT),
      LOCATION: d.LOCATION,
      MESSAGE_DETAIL: d.MESSAGE_CONTENT,
      MESSAGE_ID: d.MESSAGE_ID,
      MESSAGE_TYPE: d.MESSAGE_TYPE
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },
};
