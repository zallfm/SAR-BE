import { buildApp } from '../../app';
import { authService } from '../../modules/auth/auth.service';
import { env } from '../../config/env';
describe('authService', () => {
    it('login returns token for valid credentials', async () => {
        const app = await buildApp();
        const result = await authService.login(app, env.MOCK_USER_ADMIN_USERNAME, env.MOCK_USER_ADMIN_PASSWORD, 'unit-req-1');
        expect(result.token).toBeDefined();
        expect(result.user.username).toBe(env.MOCK_USER_ADMIN_USERNAME);
    });
    it('login throws for invalid password', async () => {
        const app = await buildApp();
        await expect(authService.login(app, env.MOCK_USER_ADMIN_USERNAME, 'bad', 'unit-req-2')).rejects.toHaveProperty('code', 'AUTH-ERR-001');
    });
});
