import { createTestApp } from './app.factory';
import { env } from '../../config/env';

describe('POST /api/auth/logout', () => {
  it('should logout successfully when Bearer token is provided', async () => {
    const app = await createTestApp();

    // Login dulu untuk dapat token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: env.MOCK_USER_ADMIN_USERNAME,
        password: env.MOCK_USER_ADMIN_PASSWORD,
      },
      headers: { 'x-request-id': 'logout-test-1' },
    });
    expect(loginRes.statusCode).toBe(200);

    const { data } = loginRes.json() as any;
    const token = data.token;
    expect(token).toBeTruthy();

    // Logout pakai token
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-request-id': 'logout-test-1',
      },
    });

    expect(logoutRes.statusCode).toBe(200);
    const body = logoutRes.json() as any;
    expect(body.code).toBe('OK');
    expect(body.message).toBe('LOGOUT_SUCCESS');
    expect(body.requestId).toBe('logout-test-1');

    await app.close();
  });

  it('should return 400 when Authorization header is missing', async () => {
    const app = await createTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { 'x-request-id': 'logout-test-2' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as any;
    expect(body.code).toBe('AUTH-ERR-001');
    expect(body.message).toBe('Missing or invalid Authorization header');
    expect(body.requestId).toBe('logout-test-2');

    await app.close();
  });

  it('should return 400 when Authorization header format is invalid', async () => {
    const app = await createTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: 'Token fakeToken', // format salah
        'x-request-id': 'logout-test-3',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json() as any;
    expect(body.code).toBe('AUTH-ERR-001');
    expect(body.message).toBe('Missing or invalid Authorization header');
    expect(body.requestId).toBe('logout-test-3');

    await app.close();
  });
});
