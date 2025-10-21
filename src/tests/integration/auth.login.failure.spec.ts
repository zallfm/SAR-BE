import { createTestApp } from './app.factory';
import { env } from '../../config/env';

describe('POST /api/auth/login - failure', () => {
  it('returns AUTH-ERR-001 for invalid credentials', async () => {
    const app = await createTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: env.MOCK_USER_ADMIN_USERNAME,
        password: 'wrongpass'
      },
      headers: { 'x-request-id': 'test-req-2' }
    });

    expect(res.statusCode).toBe(401);
    const body = res.json() as any;
    expect(body.code).toBe('AUTH-ERR-001');
    expect(body.requestId).toBe('test-req-2');
  });
});
