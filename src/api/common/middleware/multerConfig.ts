// src/api/common/middleware/multerConfig.ts
import fp from 'fastify-plugin';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify';
import multipart, { type MultipartFile } from '@fastify/multipart';
import fs from 'node:fs';
import path from 'node:path';

type UploadOpts = {
  limits?: {
    fileSize?: number; // default 2MB
  };
  allowedTypes?: string[]; // default ['.pdf', '.png', '.jpg', '.jpeg']
  diskBaseDir?: string; // kalau diisi, file juga disimpan ke disk
};

type UploadedFile = {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;      // simpan Buffer di sini
  filepath?: string;   // path di disk (jika disimpan)
};

declare module 'fastify' {
  interface FastifyRequest {
    // ❗ pakai nama lain, JANGAN 'file' karena sudah dipakai method oleh @fastify/multipart
    uploadedFile?: UploadedFile;
  }
  interface FastifyInstance {
    createUploadHandler: (field: string) => preHandlerHookHandler;
  }
}

const defaultAllowed = ['.pdf', '.png', '.jpg', '.jpeg'];

export default fp<UploadOpts>(async function uploadPlugin(app: FastifyInstance, opts) {
  await app.register(multipart, {
    // batas size default 2MB (bisa dioverride dari opts)
    limits: { fileSize: opts?.limits?.fileSize ?? 2 * 1024 * 1024 },
  });

  const allowed = opts?.allowedTypes ?? defaultAllowed;
  const baseDir = opts?.diskBaseDir;

  function createUploadHandler(field: string): preHandlerHookHandler {
    return async function (req: FastifyRequest, reply: FastifyReply) {
      // ✅ ini method bawaan dari @fastify/multipart
      const mp: MultipartFile | undefined = await (req as any).file();
      if (!mp || mp.fieldname !== field) {
        return reply.status(400).send({ error: `Field '${field}' is required` });
      }

      const ext = path.extname(mp.filename).toLowerCase();
      if (!allowed.includes(ext)) {
        return reply
          .status(400)
          .send({ error: `File type not allowed. Supported: ${allowed.join(', ')}` });
      }

      // Ambil buffer dari stream multipart
      const buffer = await mp.toBuffer();

      let filepath: string | undefined;
      if (baseDir) {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        filepath = path.join(baseDir, unique);
        fs.writeFileSync(filepath, buffer);
      }

      // ❗ taruh hasilnya di req.uploadedFile (bukan req.file)
      req.uploadedFile = {
        fieldname: mp.fieldname,
        filename: mp.filename,
        encoding: mp.encoding,
        mimetype: mp.mimetype,
        buffer,
        filepath,
      };
    };
  }

  app.decorate('createUploadHandler', createUploadHandler);
});
