/**
 * Generate Test Evidence JSON Files
 * Auto-generate evidence JSON files dari test results dan coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseAllTestResults, type TestEvidence } from './parse-test-results.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const evidenceDir = path.join(projectRoot, 'tdd-docs', 'src', 'data', 'evidence');

/**
 * Ensure evidence directory exists
 */
function ensureEvidenceDir() {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
}

/**
 * Save evidence untuk module
 */
function saveModuleEvidence(module: string, evidences: TestEvidence[]) {
  const moduleFile = path.join(evidenceDir, `${module}.json`);
  
  const moduleData = {
    module,
    generatedAt: new Date().toISOString(),
    functions: evidences.map(ev => ({
      functionName: ev.functionName,
      testStatus: ev.testStatus,
      coverage: ev.coverage,
      testScenarios: ev.testScenarios,
      lastTestRun: ev.lastTestRun,
      evidence: ev.evidence
    }))
  };
  
  fs.writeFileSync(moduleFile, JSON.stringify(moduleData, null, 2), 'utf-8');
  console.log(`✓ Generated evidence for module: ${module} (${evidences.length} functions)`);
}

/**
 * Save all evidence files
 */
async function generateAllEvidence() {
  console.log('Generating test evidence...');
  
  ensureEvidenceDir();
  
  const evidenceMap = await parseAllTestResults();
  
  // Group by module
  const moduleMap = new Map<string, TestEvidence[]>();
  
  for (const [key, evidence] of evidenceMap.entries()) {
    const module = evidence.module;
    if (!moduleMap.has(module)) {
      moduleMap.set(module, []);
    }
    moduleMap.get(module)!.push(evidence);
  }
  
  // Save per module
  for (const [module, evidences] of moduleMap.entries()) {
    saveModuleEvidence(module, evidences);
  }
  
  // Save summary
  const summary = {
    generatedAt: new Date().toISOString(),
    totalFunctions: evidenceMap.size,
    modules: Array.from(moduleMap.keys()),
    summary: Array.from(evidenceMap.entries()).map(([key, ev]) => ({
      key,
      module: ev.module,
      function: ev.functionName,
      status: ev.testStatus,
      coverage: ev.coverage.functions
    }))
  };
  
  const summaryFile = path.join(evidenceDir, '_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
  
  console.log(`\n✓ Generated ${evidenceMap.size} function evidences across ${moduleMap.size} modules`);
  console.log(`✓ Summary saved to: ${summaryFile}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllEvidence().catch(console.error);
}

export { generateAllEvidence, saveModuleEvidence };

