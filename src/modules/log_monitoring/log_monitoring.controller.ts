import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { logMonitoringService } from "./log_monitoring.service";
import { mockLogDetails } from "./mock";
import ExcelJS from "exceljs";
import { logRepository } from "./log_monitoring.repository";
import { ListLogsQuery, LogEntry } from "../../types/log_monitoring";

const toGB = (d: Date) =>
  d.toLocaleString("en-GB", { hour12: false }).replace(",", "");
const normalizeStatus = (s?: string): LogEntry["STATUS"] => {
  if (!s) return "Success";
  const v = String(s).toLowerCase().trim();
  if (v === "success") return "Success";
  if (v === "failure" || v === "error") return "Error";
  if (v === "warning") return "Warning";
  if (v === "inprogress" || v === "in progress") return "InProgress";
  // fallback aman
  return "Success";
};
let seqCounter = 0;
function generateProcessId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(seqCounter++).padStart(5, "0"); // 00001, 00002, ...
  return `${yyyy}${mm}${dd}${seq}`;
}
export const logMonitoringController = {
  listLogs:
    (app: FastifyInstance) =>
      async (
        req: FastifyRequest<{
          Querystring: ListLogsQuery
        }>,
        reply: FastifyReply
      ) => {
        const result = await logMonitoringService.listLogs(req.query);
        return reply.status(200).send(result);
      },

  getLog:
    (app: FastifyInstance) =>
      async (
        req: FastifyRequest<{ Params: { processId: string } }>,
        reply: FastifyReply
      ) => {
        const {processId} = req.params
        // console.log("req.params.processId", req.params.processId);
        const data = await logMonitoringService.getLog(processId);
        if (!data) return reply.status(404).send({ message: "Log not found" });
        // console.log("data", data)
        return reply.status(200).send({ data });
      },

  listDetails:
    (app: FastifyInstance) =>
      async (
        req: FastifyRequest<{
          Params: { processId: string };
          Querystring: { page?: number; limit?: number };
        }>,
        reply: FastifyReply
      ) => {
        const result = await logMonitoringService.listDetails(
          req.params.processId,
          req.query.page,
          req.query.limit
        );
        return reply.status(200).send(result);
      },

  createLog:
    (app: FastifyInstance) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        try {
          const body = req.body as any;
          const now = new Date();

          const processId = generateProcessId();

          const newLog: LogEntry = {
            NO: 0, // repo yang isi urutan
            PROCESS_ID: String(processId),
            USER_ID: String(body.userId ?? "anonymous"),
            MODULE: String(body.module ?? "Unknown"),
            FUNCTION_NAME: String(body.action ?? "Unknown"),
            START_DATE: toGB(new Date(body.timestamp ?? now)),
            END_DATE: toGB(now),
            STATUS: normalizeStatus(body.status),
            DETAILS: [
              {
                ID: 1,
                PROCESS_ID: String(processId),
                MESSAGE_DATE_TIME: toGB(now),
                LOCATION: String(body.location ?? body.module ?? "Unknown"),
                MESSAGE_DETAIL: String(
                  body.description ?? "Action logged by frontend"
                ),
              },
            ],
          };

          await logRepository.insertLog(newLog);
          return reply.status(201).send({ message: "Log created", data: newLog });
        } catch (err) {
          app.log.error(err);
          return reply.status(500).send({ message: "Failed to create log" });
        }
      },

  exportExcel:
    (app: FastifyInstance) =>
      async (
        req: FastifyRequest<{
          Querystring: {
            page?: number;
            limit?: number;
            status?: any;
            module?: string;
            userId?: string;
            q?: string;
            startDate?: string;
            endDate?: string;
            sortBy?: any;
            order?: any;
            includeDetails?: boolean;
          };
        }>,
        reply: FastifyReply
      ) => {
        const { includeDetails = false, ...filters } = req.query;

        const effective = {
          ...filters,
          page: filters.page ?? 1,
          limit: filters.limit ?? 1000,
        };
        const { data, meta } = await logMonitoringService.listLogs(
          effective as any
        );

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Logs");

        // Header
        ws.addRow([
          "No",
          "Process ID",
          "User ID",
          "Module",
          "Function Name",
          "Start Date",
          "End Date",
          "Status",
        ]);

        // Rows
        data.forEach((row, idx) => {
          ws.addRow([
            (effective.page - 1) * effective.limit + idx + 1,
            row.PROCESS_ID,
            row.USER_ID,
            row.MODULE,
            row.FUNCTION_NAME,
            row.START_DATE,
            row.END_DATE,
            row.STATUS,
          ]);
        });

        ws.columns.forEach((col) => {
          let max = 10;
          col.eachCell?.({ includeEmpty: true }, (cell) => {
            const v = String(cell.value ?? "");
            max = Math.max(max, v.length + 2);
          });
          col.width = Math.min(max, 50);
        });

        if (includeDetails) {
          const wsd = wb.addWorksheet("LogDetails");
          wsd.addRow([
            "No",
            "Process ID",
            "Message Date Time",
            "Location",
            "Message Detail",
          ]);

          const pids = new Set(data.map((d) => d.PROCESS_ID));
          const details = mockLogDetails
            .filter((d) => pids.has(d.PROCESS_ID))
            .sort((a, b) => {
              const ka = (a as any).ID ?? (a as any).NO ?? 0;
              const kb = (b as any).ID ?? (b as any).NO ?? 0;
              return ka - kb;
            });

          details.forEach((d) => {
            wsd.addRow([
              (d as any).ID ?? (d as any).NO ?? "",
              d.PROCESS_ID,
              d.MESSAGE_DATE_TIME,
              d.LOCATION,
              d.MESSAGE_DETAIL,
            ]);
          });

          wsd.columns.forEach((col) => {
            let max = 10;
            col.eachCell?.({ includeEmpty: true }, (cell) => {
              const v = String(cell.value ?? "");
              max = Math.max(max, v.length + 2);
            });
            col.width = Math.min(max, 70);
          });
        }

        const now = new Date();
        const dateStamp = `${now.getFullYear()}${String(
          now.getMonth() + 1
        ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const filename = `SAR_log_${dateStamp}.xlsx`;

        reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          )
          .header("Content-Disposition", `attachment; filename="${filename}"`);

        // ⬇️ kirim sebagai Buffer agar Fastify menetapkan headernya
        const arrayBuf = await wb.xlsx.writeBuffer();
        const buf = Buffer.from(arrayBuf);
        return reply.send(buf);
      },
  exportDetailsExcel:
    (app: FastifyInstance) =>
      async (
        req: FastifyRequest<{ Params: { processId: string } }>,
        reply: FastifyReply
      ) => {
        const { processId } = req.params;

        // 1️⃣ ambil semua detail data dari service
        const { data } = await logMonitoringService.listDetails(
          processId,
          1,
          1000
        ); // ambil semua step

        if (!data.length) {
          return reply
            .status(404)
            .send({ message: "No details found for this process ID" });
        }

        // 2️⃣ buat workbook
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("LogDetails");

        // 3️⃣ header
        ws.addRow(["No", "Message Date Time", "Location", "Message Detail"]);

        // 4️⃣ data rows
        data.forEach((d, i) => {
          ws.addRow([i + 1, d.MESSAGE_DATE_TIME, d.LOCATION, d.MESSAGE_DETAIL]);
        });

        // 5️⃣ auto width kolom
        ws.columns.forEach((col) => {
          let max = 10;
          col.eachCell?.({ includeEmpty: true }, (cell) => {
            const len = String(cell.value ?? "").length;
            max = Math.max(max, len + 2);
          });
          col.width = Math.min(max, 70);
        });

        // 6️⃣ kirim sebagai file download
        const filename = `LogDetails_${processId}.xlsx`;

        const arrayBuffer = await wb.xlsx.writeBuffer();
        const buffer = Buffer.from(arrayBuffer);

        reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          )
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .send(buffer);
      },
};
