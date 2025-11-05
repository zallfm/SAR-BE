const inMemoryAudit = [];
export const AuditLogger = {
    log(action, partial) {
        const entry = {
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
    logSuccess(action, details) {
        this.log(action, { ...details, status: 'success' });
    },
    logFailure(action, errorCode, details) {
        this.log(action, { ...details, status: 'failure', errorCode });
    },
    _getAll() {
        return inMemoryAudit;
    },
    _clear() {
        inMemoryAudit.splice(0, inMemoryAudit.length);
    }
};
