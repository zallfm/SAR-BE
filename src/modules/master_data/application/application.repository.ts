// Repository untuk entity Application
// - Menggunakan Prisma (DB SAR) dengan tabel utama: TB_M_APPLICATION
// - Lookup user menggunakan TB_M_EMPLOYEE (snapshot terbaru via VALID_TO desc)
// - Daftar Security Center diambil dari distinct TB_M_APPLICATION.SECURITY_CENTER
import { prisma } from "../../../db/prisma";
import type { Application as ApplicationRow, SystemUser } from "../../../types/application";

type SortField = "APPLICATION_ID" | "APPLICATION_NAME" | "CREATED_DT" | "CHANGED_DT";
type SortOrder = "asc" | "desc";

// ===== Helpers =====
// Konversi parameter sort menjadi objek orderBy Prisma
function toOrder(sortField: SortField, sortOrder: SortOrder) {
  const field = sortField ?? "CREATED_DT";
  const order = sortOrder ?? "desc";
  return { [field]: order } as Record<string, "asc" | "desc">;
}

// Mapping status DB (0/1) <-> DTO (Active/Inactive)
// Catatan: di DB, 0 = Active, 1 = Inactive (bisa tersimpan sebagai string '0'/'1' atau number 0/1)
function mapStatusDbToDto(db: string | number | null | undefined): "Active" | "Inactive" {
  if (db === 0 || db === "0") return "Active";
  if (db === 1 || db === "1") return "Inactive";
  return "Inactive";
}

function mapRowDbToDto(r: any): ApplicationRow {
  return {
    APPLICATION_ID: r.APPLICATION_ID,
    APPLICATION_NAME: r.APPLICATION_NAME,
    DIVISION_ID_OWNER: String(r.DIVISION_ID_OWNER),
    NOREG_SYSTEM_OWNER: r.NOREG_SYSTEM_OWNER,
    NOREG_SYSTEM_CUST: r.NOREG_SYSTEM_CUST,
    SECURITY_CENTER: r.SECURITY_CENTER,
    APPLICATION_STATUS: mapStatusDbToDto(r.APPLICATION_STATUS),
    CREATED_BY: r.CREATED_BY,
    CREATED_DT: new Date(r.CREATED_DT).toISOString(),
    CHANGED_BY: r.CHANGED_BY,
    CHANGED_DT: new Date(r.CHANGED_DT).toISOString(),
  } as ApplicationRow;
}

// Ambil waktu dari DB server (SQL Server) agar audit time konsisten dengan server
async function getDbNow(): Promise<Date> {
  const rows: Array<{ now: Date }> = await prisma.$queryRaw`SELECT GETDATE() AS now`;
  return rows[0]?.now ?? new Date();
}

export const applicationRepository = {
  // List aplikasi dengan pencarian, sorting, dan pagination
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortField: SortField;
    sortOrder: SortOrder;
  }) {
    // Pencarian: by APPLICATION_ID / APPLICATION_NAME (contains, case-insensitive tergantung collation DB)
    // DIVISION_ID_OWNER: jika input numerik, cocokkan sebagai exact number
    const search = params.search?.trim();
    const orConds: any[] = [];
    if (search) {
      orConds.push({ APPLICATION_ID: { contains: search } });
      orConds.push({ APPLICATION_NAME: { contains: search } });
      const num = Number(search);
      if (Number.isFinite(num)) {
        orConds.push({ DIVISION_ID_OWNER: num });
      }
    }
    const where = search ? { OR: orConds } : undefined;

    const [dataRaw, total] = await Promise.all([
      prisma.tB_M_APPLICATION.findMany({
        where,
        orderBy: toOrder(params.sortField, params.sortOrder),
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.tB_M_APPLICATION.count({ where }),
    ]);

    const data = dataRaw.map(mapRowDbToDto);
    return { data, total };
  },

  // Ambil detail aplikasi by primary key (APPLICATION_ID)
  async findById(id: string) {
    const row = await prisma.tB_M_APPLICATION.findUnique({
      where: { APPLICATION_ID: id },
    });
    return row ? mapRowDbToDto(row) : null;
  },

  // Alias pencarian code (identik dengan findById di model ini)
  async findByCode(code: string) {
    const row = await prisma.tB_M_APPLICATION.findUnique({
      where: { APPLICATION_ID: code },
    });
    return row ? mapRowDbToDto(row) : null;
  },

  // Buat aplikasi baru
  // Catatan:
  // - APPLICATION_STATUS pada DB disimpan sebagai kode numerik string: '0' (Active) / '1' (Inactive)
  // - CREATED_DT/CHANGED_DT bertipe Date pada SQL Server; Prisma akan memetakannya
  async create(payload: Omit<ApplicationRow, "CREATED_BY" | "CREATED_DT" | "CHANGED_BY" | "CHANGED_DT">, auditUser: string) {
    const now = await getDbNow();
    console.log("payloadss", payload)
    const created = await prisma.tB_M_APPLICATION.create({
      data: {
        APPLICATION_ID: payload.APPLICATION_ID,
        APPLICATION_NAME: payload.APPLICATION_NAME,
        DIVISION_ID_OWNER: Number(payload.DIVISION_ID_OWNER),
        NOREG_SYSTEM_OWNER: payload.NOREG_SYSTEM_OWNER,
        NOREG_SYSTEM_CUST: payload.NOREG_SYSTEM_CUST,
        SECURITY_CENTER: payload.SECURITY_CENTER as unknown as string,
        // Simpan sebagai '0' (Active) atau '1' (Inactive)
        APPLICATION_STATUS: payload.APPLICATION_STATUS === "Active" ? "0" : "1",
        CREATED_BY: auditUser,
        CREATED_DT: now as unknown as any,
        CHANGED_BY: auditUser,
        CHANGED_DT: now as unknown as any,
      },
    });
    console.log("createds", created)
    return mapRowDbToDto(created);
  },

  // Update aplikasi
  // Mapping status tetap sama seperti create
  async update(id: string, updates: Partial<ApplicationRow>, auditUser: string) {
    const now = await getDbNow();
    try {
      const updated = await prisma.tB_M_APPLICATION.update({
        where: { APPLICATION_ID: id },
        data: {
          APPLICATION_NAME: updates.APPLICATION_NAME as any,
          DIVISION_ID_OWNER: updates.DIVISION_ID_OWNER ? Number(updates.DIVISION_ID_OWNER) : undefined,
          NOREG_SYSTEM_OWNER: updates.NOREG_SYSTEM_OWNER as any,
          NOREG_SYSTEM_CUST: updates.NOREG_SYSTEM_CUST as any,
          SECURITY_CENTER: updates.SECURITY_CENTER as unknown as string,
          APPLICATION_STATUS: updates.APPLICATION_STATUS
            ? (updates.APPLICATION_STATUS === "Active" ? "0" : "1")
            : undefined,
          CHANGED_BY: auditUser,
          CHANGED_DT: now as unknown as any,
        },
      });
      return mapRowDbToDto(updated);
    } catch {
      return null;
    }
  },

  // ---------- master lookups ----------
  // Ambil user by NOREG (snapshot terbaru berdasarkan VALID_TO)
  // Eligibility sederhana: true untuk owner & custodian (aturan detail bisa ditambahkan nanti)
  async getUserByNoreg(noreg: string): Promise<SystemUser | null> {
    const row = await prisma.tB_M_EMPLOYEE.findFirst({
      where: { NOREG: noreg },
      orderBy: { VALID_TO: "desc" },
      select: {
        NOREG: true,
        DIVISION_ID: true,
        PERSONNEL_NAME: true,
        DIVISION_NAME: true,
        MAIL: true,
        DEPARTMENT_NAME: true,
      },
    });
    if (!row) return null;
    return {
      NOREG: row.NOREG,
      DIVISION_ID: row.DIVISION_ID ?? undefined,
      PERSONAL_NAME: row.PERSONNEL_NAME ?? "",
      DIVISION_NAME: row.DIVISION_NAME ?? "",
      MAIL: row.MAIL ?? "",
      DEPARTEMENT_NAME: row.DEPARTMENT_NAME ?? "",
      canBeOwner: true,
      canBeCustodian: true,
    };
  },
  // List user untuk dropdown FE: distinct berdasarkan NOREG
  // Pencarian by NOREG/NAME, sort by PERSONNEL_NAME
  async listUsers(p?: { q?: string; limit?: number; offset?: number }) {
    const q = (p?.q ?? "").trim();
    const limit = Math.min(p?.limit ?? 10, 50);
    const offset = p?.offset ?? 0;

    const where = q
      ? {
        OR: [
          { NOREG: { contains: q } },
          { PERSONNEL_NAME: { contains: q } },
        ],
      }
      : undefined;

    const [rows, total] = await Promise.all([
      prisma.tB_M_EMPLOYEE.findMany({
        where,
        distinct: ["NOREG"],
        orderBy: { PERSONNEL_NAME: "asc" },
        skip: offset,
        take: limit,
        select: {
          DIVISION_ID: true,
          NOREG: true,
          PERSONNEL_NAME: true,
          DIVISION_NAME: true,
          MAIL: true,
          DEPARTMENT_NAME: true,
        },
      }),
      prisma.tB_M_EMPLOYEE.count({ where }),
    ]);

    const items: SystemUser[] = rows.map((r) => ({
      NOREG: r.NOREG,
      DIVISION_ID: r.DIVISION_ID,
      PERSONAL_NAME: r.PERSONNEL_NAME ?? "",
      DIVISION_NAME: r.DIVISION_NAME ?? "",
      MAIL: r.MAIL ?? "",
      DEPARTEMENT_NAME: r.DEPARTMENT_NAME ?? "",
      canBeOwner: true,
      canBeCustodian: true,
    }));
    // console.log("items", items)
    return { items, total };
  },
  // Validasi Security Center: minimal sudah pernah digunakan oleh satu aplikasi
  async isValidSecurityCenter(sc: string): Promise<boolean> {
    const count = await prisma.tB_M_APPLICATION.count({ where: { SECURITY_CENTER: sc as any } });
    return count > 0;
  },
  // Daftar Security Center (distinct), dengan optional filter contains
  async listSecurityCenters(p?: { q?: string; limit?: number; offset?: number }) {
    const q = (p?.q ?? "").trim().toLowerCase();
    const limit = Math.min(p?.limit ?? 10, 100);
    const offset = p?.offset ?? 0;

    const rows = await prisma.tB_M_APPLICATION.findMany({
      distinct: ["SECURITY_CENTER"],
      select: { SECURITY_CENTER: true },
      orderBy: { SECURITY_CENTER: "asc" },
    });
    let all = rows.map((r) => String(r.SECURITY_CENTER ?? "")).filter(Boolean);
    if (q) all = all.filter((s) => s.toLowerCase().includes(q));
    const items = all.slice(offset, offset + limit);
    return { items, total: all.length };
  }
};


