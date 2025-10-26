import {
  mockApplications,
  systemUsers,
  securityCenters,
  type ApplicationRow,
  type SystemUser,
} from "./mocks.js";

type SortField = "APPLICATION_ID" | "APPLICATION_NAME" | "CREATED_DT" | "CHANGED_DT";
type SortOrder = "asc" | "desc";

// ===== Helpers =====
function yyyymmdd(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function generateIdForDate(dateKey: string, seq: number) {
  return `SARAPPLICATION${dateKey}${pad4(seq)}`;
}

/**
 * Normalisasi ID mock ke format SARAPPLICATIONYYYYMMDD#### (berdasarkan CREATED_DT),
 * dengan sequence reset per tanggal.
 */
function normalizeMockIds(rows: ApplicationRow[]): ApplicationRow[] {
  // urutkan dulu agar konsisten penomoran
  const sorted = [...rows].sort((a, b) => a.CREATED_DT.localeCompare(b.CREATED_DT));
  const dailySeq = new Map<string, number>();
  const out: ApplicationRow[] = [];

  for (const r of sorted) {
    const key = yyyymmdd(new Date(r.CREATED_DT));
    const next = (dailySeq.get(key) ?? 0) + 1;
    dailySeq.set(key, next);
    out.push({ ...r, APPLICATION_ID: generateIdForDate(key, next) });
  }
  return out;
}

let apps: ApplicationRow[] = normalizeMockIds(mockApplications);

// Ambil sequence harian berikutnya dari state apps saat ini
function nextDailySequence(dateKey: string): number {
  const prefix = `SARAPPLICATION${dateKey}`;
  const seqs = apps
    .filter(a => a.APPLICATION_ID.startsWith(prefix))
    .map(a => Number(a.APPLICATION_ID.slice(prefix.length)))
    .filter(Number.isFinite);
  return (seqs.length ? Math.max(...seqs) : 0) + 1;
}

export const applicationRepository = {
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortField: SortField;
    sortOrder: SortOrder;
  }) {
    let rows = [...apps];

    if (params.search && params.search.trim()) {
      const s = params.search.toLowerCase();
      rows = rows.filter((r) =>
        r.APPLICATION_ID.toLowerCase().includes(s) ||
        r.APPLICATION_NAME.toLowerCase().includes(s) ||
        r.DIVISION_ID_OWNER.toLowerCase().includes(s)
      );
    }

    // Default (schema & controller) sudah set CREATED_DT desc
    const sortField = params.sortField ?? "CREATED_DT";
    const sortOrder = params.sortOrder ?? "desc";

    rows.sort((a, b) => {
      let cmp = 0;

      if (sortField === "CREATED_DT" || sortField === "CHANGED_DT") {
        const at = new Date((a as any)[sortField] ?? 0).getTime();
        const bt = new Date((b as any)[sortField] ?? 0).getTime();
        cmp = at === bt ? 0 : (at < bt ? -1 : 1);
      } else {
        const av = String((a as any)[sortField] ?? "");
        const bv = String((b as any)[sortField] ?? "");
        cmp = av.localeCompare(bv);
      }

      return sortOrder === "asc" ? cmp : -cmp; // desc = terbesar duluan
    });


    const total = rows.length;
    const start = (params.page - 1) * params.limit;
    const data = rows.slice(start, start + params.limit);
    return { data, total };
  },

  async findById(id: string) {
    return apps.find((x) => x.APPLICATION_ID === id) ?? null;
  },

  async findByCode(code: string) {
    return apps.find((x) => x.APPLICATION_ID === code) ?? null;
  },

  async create(payload: Omit<ApplicationRow, "CREATED_BY" | "CREATED_DT" | "CHANGED_BY" | "CHANGED_DT">) {
    const now = new Date();
    const key = yyyymmdd(now);
    const seq = nextDailySequence(key);
    const nowIso = now.toISOString();

    const newRow: ApplicationRow = {
      ...payload,
      CREATED_BY: "system",
      CREATED_DT: nowIso,
      CHANGED_BY: "system",
      CHANGED_DT: nowIso,
    };

    // paling baru di atas
    apps.unshift(newRow);
    return newRow;
  },

  async update(id: string, updates: Partial<ApplicationRow>) {
    const idx = apps.findIndex((x) => x.APPLICATION_ID === id);
    if (idx === -1) return null;
    const nowIso = new Date().toISOString();
    apps[idx] = {
      ...apps[idx],
      ...updates,
      CHANGED_BY: "system",
      CHANGED_DT: nowIso,
    };
    return apps[idx];
  },

  // ---------- master lookups ----------
  async getUserByNoreg(noreg: string): Promise<SystemUser | null> {
    return systemUsers.find((u) => u.NOREG === noreg) ?? null;
  },
  async listUsers(p?: { q?: string; limit?: number; offset?: number }) {
    const q = (p?.q ?? "").toLowerCase();
    const limit = Math.min(p?.limit ?? 10, 50);
    const offset = p?.offset ?? 0;

    const all = q
      ? systemUsers.filter(u =>
        (u.NOREG + " " + u.PERSONAL_NAME).toLowerCase().includes(q)
      )
      : systemUsers;

    return {
      items: all.slice(offset, offset + limit),
      total: all.length,
    };
  },
  async isValidSecurityCenter(sc: string): Promise<boolean> {
    return securityCenters.includes(sc);
  },
  async listSecurityCenters(p?: { q?: string; limit?: number; offset?: number }) {
    const q = (p?.q ?? "").toLowerCase().trim();
    const limit = Math.min(p?.limit ?? 10, 100);
    const offset = p?.offset ?? 0;

    // securityCenters: string[]
    const all = q
      ? securityCenters.filter(sc => sc.toLowerCase().includes(q))
      : securityCenters;

    return {
      items: all.slice(offset, offset + limit),
      total: all.length,
    };
  }
};

// --- di bawah export const applicationRepository = { ... } tambahkan:
export const __testing = {
  resetDefaults() {
    // re-import seed, lalu normalisasi lagi
    // NOTE: gunakan dynamic import agar tidak tersangkut cache saat test watch
    return import("./mocks.js").then((m) => {
      // gunakan fungsi normalize yang sama dengan init
      // (copas kalau fungsi normalize tidak berada di scope export)
      const sorted = [...m.mockApplications].sort((a, b) =>
        a.CREATED_DT.localeCompare(b.CREATED_DT)
      );
      const dailySeq = new Map<string, number>();
      const yyyymmdd = (d: Date) =>
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
          d.getDate()
        ).padStart(2, "0")}`;
      const pad4 = (n: number) => String(n).padStart(4, "0");
      const gen = (key: string, seq: number) => `SARAPPLICATION${key}${pad4(seq)}`;

      // @ts-ignore - apps ada di module scope
      apps = sorted.map((r) => {
        const key = yyyymmdd(new Date(r.CREATED_DT));
        const next = (dailySeq.get(key) ?? 0) + 1;
        dailySeq.set(key, next);
        return { ...r, ID: gen(key, next) };
      });
    });
  },
  getAll() {
    // @ts-ignore
    return apps;
  },
};

