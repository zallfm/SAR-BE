
import { buildApp } from '../../app';

export async function createTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}
