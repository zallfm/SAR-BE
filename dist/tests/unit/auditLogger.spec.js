import { AuditLogger } from '../../../src/core/audit/auditLogger';
import { AuditAction } from '../../../src/core/audit/auditActions';
describe('AuditLogger', () => {
    afterEach(() => AuditLogger._clear());
    it('records success entry without sensitive data', () => {
        AuditLogger.logSuccess(AuditAction.LOGIN_SUCCESS, {
            userId: 'admin',
            requestId: 'r1',
            description: 'ok'
        });
        const all = AuditLogger._getAll();
        expect(all.length).toBe(1);
        expect(all[0].status).toBe('success');
        expect(all[0].userId).toBe('admin');
        expect(all[0].requestId).toBe('r1');
    });
    it('records failure with error code', () => {
        AuditLogger.logFailure(AuditAction.LOGIN_FAILED, 'AUTH-ERR-001', {
            userId: 'admin',
            requestId: 'r2'
        });
        const all = AuditLogger._getAll();
        expect(all[0].errorCode).toBe('AUTH-ERR-001');
        expect(all[0].status).toBe('failure');
    });
});
