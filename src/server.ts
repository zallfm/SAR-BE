import 'dotenv/config';
import { buildApp } from './app';
import { SECURITY_CONFIG } from './config/security';

const port = Number(process.env.PORT || 3000);
// console.log(port)

const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on http://0.0.0.0:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();