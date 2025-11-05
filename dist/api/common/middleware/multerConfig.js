// src/api/common/middleware/multerConfig.ts
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import fs from 'node:fs';
import path from 'node:path';
const defaultAllowed = ['.pdf', '.png', '.jpg', '.jpeg'];
export default fp(async function uploadPlugin(app, opts) {
    await app.register(multipart, {
        // batas size default 2MB (bisa dioverride dari opts)
        limits: { fileSize: opts?.limits?.fileSize ?? 2 * 1024 * 1024 },
    });
    const allowed = opts?.allowedTypes ?? defaultAllowed;
    const baseDir = opts?.diskBaseDir;
    function createUploadHandler(field) {
        return async function (req, reply) {
            // ✅ ini method bawaan dari @fastify/multipart
            const mp = await req.file();
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
            let filepath;
            if (baseDir) {
                if (!fs.existsSync(baseDir))
                    fs.mkdirSync(baseDir, { recursive: true });
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
