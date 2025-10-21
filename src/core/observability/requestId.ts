import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

export const requestIdPlugin = fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const incoming = (req.headers['x-request-id'] as string) || randomUUID();
    // Simpan ke request id Fastify (untuk logger) dan kirim kembali
    (req as any).id = incoming;
    reply.header('x-request-id', incoming);
  });
});
