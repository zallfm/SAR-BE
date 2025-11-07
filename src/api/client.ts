export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const genReqId = () =>
  (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now();

export type HttpError = {
  status: number;
  code?: string;
  message: string;
  requestId?: string;
  details?: Record<string, any>;
};

const emit = (name: 'http:unauthorized' | 'http:forbidden', detail?: any) => {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch { }
};

type HttpOptions = {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: 'json' | 'blob';
};

function buildUrl(path: string) {
  try {
    return new URL(path).toString();
  } catch {
    const base = API_BASE.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, String(v)));
    } else if (value instanceof Date) {
      query.append(key, value.toISOString());
    } else {
      query.append(key, String(value));
    }
  });

  const q = query.toString();
  return q ? `?${q}` : '';
}

function getTokenFallback(): string | null {
  try {
    const raw = localStorage.getItem('auth-store');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}


export async function http<T>(opts: HttpOptions): Promise<T> {
  const url = buildUrl(opts.path) + buildQuery(opts.params);

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
    'x-request-id': genReqId(),
    ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
  };

  if (opts.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (opts.responseType === 'blob') {
    headers['Accept'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const json = (() => { try { return JSON.parse(text); } catch { return null; } })();

    const err: HttpError = {
      status: res.status,
      code: json?.code,
      message: json.message ? json.message : text || 'Request failed',
      requestId: json?.requestId,
      details: json?.details,
    };
    if (res.status === 401) emit('http:unauthorized', err);
    if (res.status === 403) emit('http:forbidden', err);
    throw err;
  }

  if (opts.responseType === 'blob') {
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
    const filename = m ? decodeURIComponent(m[1].replace(/"/g, '')) : undefined;

    return { blob, filename } as T;
  }

  const json = await res.json().catch(() => ({}));
  return json as T;
}
