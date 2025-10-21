import { AuditAction } from './auditActions.js';

type Status = 'success' | 'failure' | 'warning';

export interface AuditLogEntry {
  userId?: string;
  userName?: string;
  userRole?: string;

  action: AuditAction;
  module?: string;
  description?: string;

  timestamp: string;
  ipAddress?: string;
  userAgent?: string;

  targetId?: string;
  targetType?: string;
  oldValue?: unknown;
  newValue?: unknown;

  status: Status;
  errorCode?: string;
  errorMessage?: string;

  requestId?: string;
  sessionId?: string;
}

const inMemoryAudit: AuditLogEntry[] = [];

export const AuditLogger = {
  log(action: AuditAction, partial: Partial<AuditLogEntry>) {
    const entry: AuditLogEntry = {
      action,
      status: partial.status ?? 'success',
      timestamp: new Date().toISOString(),
      description: partial.description,
      userId: partial.userId,
      userName: partial.userName,
      userRole: partial.userRole,
      targetId: partial.targetId,
      targetType: partial.targetType,
      oldValue: partial.oldValue,
      newValue: partial.newValue,
      errorCode: partial.errorCode,
      errorMessage: partial.errorMessage,
      requestId: partial.requestId,
      sessionId: partial.sessionId,
      ipAddress: partial.ipAddress,
      userAgent: partial.userAgent,
      module: partial.module
    };
    inMemoryAudit.push(entry);
    // Untuk DEV: tulis ke console
    // (Produksi: kirim ke DB, SIEM, atau message queue)
    // eslint-disable-next-line no-console
    // console.info('[AUDIT]', JSON.stringify(entry));
  },

  logSuccess(action: AuditAction, details: Partial<AuditLogEntry>) {
    this.log(action, { ...details, status: 'success' });
  },

  logFailure(action: AuditAction, errorCode: string, details: Partial<AuditLogEntry>) {
    this.log(action, { ...details, status: 'failure', errorCode });
  },

  _getAll() {
    return inMemoryAudit;
  },

  _clear() {
    inMemoryAudit.splice(0, inMemoryAudit.length);
  }
};
