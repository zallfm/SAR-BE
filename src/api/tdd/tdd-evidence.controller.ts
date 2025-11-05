/**
 * TDD Evidence Controller
 * Handles evidence data retrieval and Excel export
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const evidenceDir = path.join(projectRoot, 'tdd-docs', 'src', 'data', 'evidence');
const tddDataDir = path.join(projectRoot, 'tdd-docs', 'src', 'data');

interface EvidenceData {
  module: string;
  generatedAt: string;
  functions: Array<{
    functionName: string;
    testStatus: 'PASS' | 'FAIL' | 'SKIP' | 'PENDING';
    coverage: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    testScenarios: Array<{
      scenarioId: string;
      status: 'PASS' | 'FAIL' | 'PENDING' | 'SKIP';
      phase: 'RED' | 'GREEN' | 'REFACTOR';
      timestamp: string;
      testFile: string;
      testCode: string;
    }>;
    lastTestRun: string;
    evidence: {
      screenshots?: string[];
      codeSnippets: string[];
      testOutput: string;
    };
  }>;
}

/**
 * Get evidence untuk specific module and function
 */
export async function getFunctionEvidence(
  moduleName: string,
  functionName: string
): Promise<EvidenceData['functions'][0] | null> {
  const evidenceFile = path.join(evidenceDir, `${moduleName}.json`);
  
  if (!existsSync(evidenceFile)) {
    return null;
  }
  
  try {
    const content = await readFile(evidenceFile, 'utf-8');
    const data: EvidenceData = JSON.parse(content);
    return data.functions.find(f => f.functionName === functionName) || null;
  } catch (error) {
    console.error(`Error reading evidence for ${moduleName}/${functionName}:`, error);
    return null;
  }
}

/**
 * Get all evidence untuk module
 */
export async function getModuleEvidence(moduleName: string): Promise<EvidenceData | null> {
  const evidenceFile = path.join(evidenceDir, `${moduleName}.json`);
  
  if (!existsSync(evidenceFile)) {
    return null;
  }
  
  try {
    const content = await readFile(evidenceFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading evidence for module ${moduleName}:`, error);
    return null;
  }
}

/**
 * Get all evidence
 */
export async function getAllEvidence(): Promise<EvidenceData[]> {
  if (!existsSync(evidenceDir)) {
    return [];
  }
  
  try {
    const files = await readdir(evidenceDir);
    const evidenceFiles = files.filter(f => f.endsWith('.json') && f !== '_summary.json');
    
    const allEvidence: EvidenceData[] = [];
    
    for (const file of evidenceFiles) {
      try {
        const content = await readFile(path.join(evidenceDir, file), 'utf-8');
        const data: EvidenceData = JSON.parse(content);
        allEvidence.push(data);
      } catch (error) {
        console.error(`Error reading evidence file ${file}:`, error);
      }
    }
    
    return allEvidence;
  } catch (error) {
    console.error('Error reading evidence directory:', error);
    return [];
  }
}

/**
 * Export evidence to Excel
 */
export async function exportEvidenceToExcel(
  moduleName?: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  
  // Load TDD data untuk merge dengan evidence
  const loadTDDData = async (module: string) => {
    const dataFile = path.join(tddDataDir, `${module}.json`);
    if (existsSync(dataFile)) {
      try {
        const content = await readFile(dataFile, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        return null;
      }
    }
    return null;
  };
  
  // Sheet 1: Functions Overview
  const wsOverview = wb.addWorksheet('Functions Overview');
  wsOverview.columns = [
    { header: 'Module', key: 'module', width: 15 },
    { header: 'Function', key: 'function', width: 25 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Coverage Statements', key: 'coverageStatements', width: 18 },
    { header: 'Coverage Branches', key: 'coverageBranches', width: 18 },
    { header: 'Coverage Functions', key: 'coverageFunctions', width: 18 },
    { header: 'Coverage Lines', key: 'coverageLines', width: 15 },
    { header: 'Last Test Run', key: 'lastTestRun', width: 20 },
    { header: 'Test Scenarios Count', key: 'testScenariosCount', width: 18 }
  ];
  
  // Sheet 2: Test Scenarios Detail
  const wsScenarios = wb.addWorksheet('Test Scenarios');
  wsScenarios.columns = [
    { header: 'Module', key: 'module', width: 15 },
    { header: 'Function', key: 'function', width: 25 },
    { header: 'Scenario ID', key: 'scenarioId', width: 20 },
    { header: 'Phase', key: 'phase', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Test File', key: 'testFile', width: 40 },
    { header: 'Timestamp', key: 'timestamp', width: 20 }
  ];
  
  // Sheet 3: Evidence Data
  const wsEvidence = wb.addWorksheet('Evidence Data');
  wsEvidence.columns = [
    { header: 'Module', key: 'module', width: 15 },
    { header: 'Function', key: 'function', width: 25 },
    { header: 'Test Output', key: 'testOutput', width: 50 },
    { header: 'Code Snippets Count', key: 'codeSnippetsCount', width: 18 },
    { header: 'Screenshots Count', key: 'screenshotsCount', width: 18 }
  ];
  
  // Sheet 4: DOD & Acceptance Criteria (akan diisi dari TDD data)
  const wsDOD = wb.addWorksheet('DOD & Acceptance Criteria');
  wsDOD.columns = [
    { header: 'Module', key: 'module', width: 15 },
    { header: 'Function', key: 'function', width: 25 },
    { header: 'Criteria Type', key: 'criteriaType', width: 20 },
    { header: 'Criteria ID', key: 'criteriaId', width: 20 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Evidence', key: 'evidence', width: 30 }
  ];
  
  // Sheet 5: Coverage Summary
  const wsCoverage = wb.addWorksheet('Coverage Summary');
  wsCoverage.columns = [
    { header: 'Module', key: 'module', width: 15 },
    { header: 'Function', key: 'function', width: 25 },
    { header: 'Statements %', key: 'statements', width: 15 },
    { header: 'Branches %', key: 'branches', width: 15 },
    { header: 'Functions %', key: 'functions', width: 15 },
    { header: 'Lines %', key: 'lines', width: 15 },
    { header: 'Overall Coverage', key: 'overall', width: 15 }
  ];
  
  // Load evidence data
  const allEvidence = moduleName
    ? (await getModuleEvidence(moduleName) ? [await getModuleEvidence(moduleName)!] : [])
    : await getAllEvidence();
  
  // Populate sheets
  for (const moduleEvidence of allEvidence) {
    if (!moduleEvidence) continue;
    
    const tddData = await loadTDDData(moduleEvidence.module);
    
    for (const funcEvidence of moduleEvidence.functions) {
      // Functions Overview
      wsOverview.addRow({
        module: moduleEvidence.module,
        function: funcEvidence.functionName,
        status: funcEvidence.testStatus,
        coverageStatements: `${funcEvidence.coverage.statements.toFixed(2)}%`,
        coverageBranches: `${funcEvidence.coverage.branches.toFixed(2)}%`,
        coverageFunctions: `${funcEvidence.coverage.functions.toFixed(2)}%`,
        coverageLines: `${funcEvidence.coverage.lines.toFixed(2)}%`,
        lastTestRun: funcEvidence.lastTestRun,
        testScenariosCount: funcEvidence.testScenarios.length
      });
      
      // Test Scenarios
      for (const scenario of funcEvidence.testScenarios) {
        wsScenarios.addRow({
          module: moduleEvidence.module,
          function: funcEvidence.functionName,
          scenarioId: scenario.scenarioId,
          phase: scenario.phase,
          status: scenario.status,
          testFile: scenario.testFile,
          timestamp: scenario.timestamp
        });
      }
      
      // Evidence Data
      wsEvidence.addRow({
        module: moduleEvidence.module,
        function: funcEvidence.functionName,
        testOutput: funcEvidence.evidence.testOutput,
        codeSnippetsCount: funcEvidence.evidence.codeSnippets.length,
        screenshotsCount: funcEvidence.evidence.screenshots?.length || 0
      });
      
      // DOD & Acceptance Criteria (dari TDD data jika ada)
      if (tddData) {
        const func = tddData.functions?.find((f: any) => f.name === funcEvidence.functionName);
        if (func?.dod) {
          // DOD Criteria
          if (func.dod.criteria) {
            for (const criteria of func.dod.criteria) {
              wsDOD.addRow({
                module: moduleEvidence.module,
                function: funcEvidence.functionName,
                criteriaType: 'DOD',
                criteriaId: criteria.id,
                description: criteria.description,
                status: criteria.status,
                evidence: criteria.evidence || ''
              });
            }
          }
          
          // Acceptance Criteria
          if (func.dod.acceptanceCriteria) {
            for (const ac of func.dod.acceptanceCriteria) {
              wsDOD.addRow({
                module: moduleEvidence.module,
                function: funcEvidence.functionName,
                criteriaType: 'Acceptance Criteria',
                criteriaId: ac.id,
                description: ac.description,
                status: ac.status,
                evidence: ac.testScenarioId || ''
              });
            }
          }
        }
      }
      
      // Coverage Summary
      const overall = (
        funcEvidence.coverage.statements +
        funcEvidence.coverage.branches +
        funcEvidence.coverage.functions +
        funcEvidence.coverage.lines
      ) / 4;
      
      wsCoverage.addRow({
        module: moduleEvidence.module,
        function: funcEvidence.functionName,
        statements: `${funcEvidence.coverage.statements.toFixed(2)}%`,
        branches: `${funcEvidence.coverage.branches.toFixed(2)}%`,
        functions: `${funcEvidence.coverage.functions.toFixed(2)}%`,
        lines: `${funcEvidence.coverage.lines.toFixed(2)}%`,
        overall: `${overall.toFixed(2)}%`
      });
    }
  }
  
  // Style headers
  [wsOverview, wsScenarios, wsEvidence, wsDOD, wsCoverage].forEach(ws => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

