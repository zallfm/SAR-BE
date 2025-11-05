import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { getFunctionEvidence, getModuleEvidence, getAllEvidence, exportEvidenceToExcel } from './tdd-evidence.controller.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function tddRoutes(app) {
    // Serve static files from tdd-docs/src
    const tddDocsPath = path.join(__dirname, '../../../tdd-docs/src');
    // API endpoint untuk JSON data (harus didaftarkan sebelum static files)
    app.get('/tdd/api/modules', async (request, reply) => {
        const modules = [
            { name: 'auth', displayName: 'Authentication', description: 'User authentication and authorization' },
            { name: 'application', displayName: 'Application', description: 'Application master data management' },
            { name: 'schedule', displayName: 'Schedule', description: 'Schedule management' },
            { name: 'uarpic', displayName: 'UAR PIC', description: 'UAR Person in Charge management' },
            { name: 'master_config', displayName: 'Master Config', description: 'System configuration management' },
            { name: 'log_monitoring', displayName: 'Log Monitoring', description: 'Logging and monitoring' },
            { name: 'uar_division', displayName: 'UAR Division', description: 'UAR Division management' },
            { name: 'uar_generate', displayName: 'UAR Generate', description: 'UAR generation process' },
            { name: 'batch', displayName: 'Batch Services', description: 'Batch processing services' },
        ];
        return reply.send({ modules });
    });
    // API endpoint untuk module specific data (harus didaftarkan sebelum static files)
    app.get('/tdd/api/modules/:moduleName', async (request, reply) => {
        const { moduleName } = request.params;
        const dataPath = path.join(__dirname, '../../../tdd-docs/src/data', `${moduleName}.json`);
        try {
            const data = await readFile(dataPath, 'utf-8');
            return reply.type('application/json').send(JSON.parse(data));
        }
        catch (error) {
            return reply.status(404).send({ error: `Module ${moduleName} not found` });
        }
    });
    // Evidence API endpoints
    app.get('/tdd/api/evidence/:module/:function', async (request, reply) => {
        const { module, function: functionName } = request.params;
        try {
            const evidence = await getFunctionEvidence(module, functionName);
            if (!evidence) {
                return reply.status(404).send({ error: `Evidence not found for ${module}/${functionName}` });
            }
            return reply.send(evidence);
        }
        catch (error) {
            return reply.status(500).send({ error: 'Failed to get evidence' });
        }
    });
    app.get('/tdd/api/evidence/:module', async (request, reply) => {
        const { module } = request.params;
        try {
            const evidence = await getModuleEvidence(module);
            if (!evidence) {
                return reply.status(404).send({ error: `Evidence not found for module ${module}` });
            }
            return reply.send(evidence);
        }
        catch (error) {
            return reply.status(500).send({ error: 'Failed to get evidence' });
        }
    });
    app.get('/tdd/api/evidence', async (request, reply) => {
        try {
            const allEvidence = await getAllEvidence();
            return reply.send({ evidence: allEvidence });
        }
        catch (error) {
            return reply.status(500).send({ error: 'Failed to get evidence' });
        }
    });
    app.get('/tdd/api/evidence/export', async (request, reply) => {
        const { module } = request.query;
        try {
            const buffer = await exportEvidenceToExcel(module);
            const dateStamp = new Date().toISOString().split('T')[0];
            const filename = module
                ? `TDD_Evidence_${module}_${dateStamp}.xlsx`
                : `TDD_Evidence_All_${dateStamp}.xlsx`;
            return reply
                .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .send(buffer);
        }
        catch (error) {
            console.error('Error exporting evidence:', error);
            return reply.status(500).send({ error: 'Failed to export evidence' });
        }
    });
    // Root route untuk /tdd
    app.get('/tdd', async (request, reply) => {
        const indexPath = path.join(tddDocsPath, 'index.html');
        try {
            const html = await readFile(indexPath, 'utf-8');
            return reply.type('text/html').send(html);
        }
        catch (error) {
            return reply.status(404).send({ error: 'TDD documentation not found' });
        }
    });
    // Serve static files manually untuk menghindari konflik route
    app.get('/tdd/*', async (request, reply) => {
        const url = request.url;
        // Skip API routes
        if (url.startsWith('/tdd/api/')) {
            return reply.callNotFound();
        }
        // Extract file path from URL
        const relativePath = url.replace('/tdd/', '') || 'index.html';
        const filePath = path.join(tddDocsPath, relativePath);
        // Check if file exists and is within tddDocsPath
        if (existsSync(filePath)) {
            try {
                const stats = await stat(filePath);
                if (stats.isFile()) {
                    const content = await readFile(filePath);
                    const ext = path.extname(filePath).toLowerCase();
                    // Set content type based on file extension
                    const contentTypeMap = {
                        '.html': 'text/html',
                        '.js': 'application/javascript',
                        '.css': 'text/css',
                        '.json': 'application/json',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.svg': 'image/svg+xml',
                        '.ico': 'image/x-icon',
                    };
                    return reply
                        .type(contentTypeMap[ext] || 'application/octet-stream')
                        .send(content);
                }
            }
            catch (error) {
                // Fall through to index.html
            }
        }
        // Fallback to index.html for SPA routing
        const indexPath = path.join(tddDocsPath, 'index.html');
        try {
            const html = await readFile(indexPath, 'utf-8');
            return reply.type('text/html').send(html);
        }
        catch (error) {
            return reply.status(404).send({ error: 'TDD documentation not found' });
        }
    });
}
