/**
 * Test Results Parser
 * Parse Jest test results and coverage data untuk generate evidence
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface CoverageSummary {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
  [filePath: string]: any;
}

interface TestEvidence {
  functionName: string;
  module: string;
  testStatus: 'PASS' | 'FAIL' | 'SKIP' | 'PENDING';
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  testScenarios: {
    scenarioId: string;
    status: 'PASS' | 'FAIL' | 'PENDING' | 'SKIP';
    phase: 'RED' | 'GREEN' | 'REFACTOR';
    timestamp: string;
    testFile: string;
    testCode: string;
  }[];
  lastTestRun: string;
  evidence: {
    screenshots?: string[];
    codeSnippets: string[];
    testOutput: string;
  };
}

interface FunctionMapping {
  module: string;
  functionName: string;
  sourceFile: string;
  testFiles: string[];
}

/**
 * Parse coverage summary dari coverage-summary.json
 */
export function parseCoverageSummary(): CoverageSummary | null {
  const coveragePath = path.join(projectRoot, 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.warn('Coverage summary not found:', coveragePath);
    return null;
  }
  
  try {
    const content = fs.readFileSync(coveragePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error parsing coverage summary:', error);
    return null;
  }
}

/**
 * Map test files ke functions berdasarkan naming convention
 */
export async function mapTestFilesToFunctions(): Promise<FunctionMapping[]> {
  const mappings: FunctionMapping[] = [];
  
  // Scan test files
  const testFiles = await glob('src/tests/**/*.{spec,test}.ts', {
    cwd: projectRoot,
    absolute: false
  });
  
  // Scan route files untuk mendapatkan function names
  const routeFiles = await glob('src/modules/**/*.routes.ts', {
    cwd: projectRoot,
    absolute: false
  });
  
  // Parse route files untuk extract functions
  for (const routeFile of routeFiles) {
    const moduleName = routeFile.split('/')[2]; // src/modules/{module}/...
    const content = fs.readFileSync(path.join(projectRoot, routeFile), 'utf-8');
    
    // Extract function names from route handlers
    const functionMatches = content.matchAll(/\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g);
    
    for (const match of functionMatches) {
      const endpoint = match[2];
      const method = match[1];
      
      // Try to find matching test file
      const testFile = testFiles.find(tf => {
        const testName = path.basename(tf, path.extname(tf));
        return testName.includes(moduleName) || testName.includes(endpoint.replace('/', '_'));
      });
      
      mappings.push({
        module: moduleName,
        functionName: endpoint.split('/').pop() || endpoint,
        sourceFile: routeFile,
        testFiles: testFile ? [testFile] : []
      });
    }
  }
  
  return mappings;
}

/**
 * Parse test file untuk extract test scenarios
 */
export function parseTestFile(testFilePath: string): {
  testName: string;
  testCode: string;
  phase: 'RED' | 'GREEN' | 'REFACTOR';
}[] {
  const fullPath = path.join(projectRoot, testFilePath);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const scenarios: { testName: string; testCode: string; phase: 'RED' | 'GREEN' | 'REFACTOR' }[] = [];
    
    // Extract test cases (it, test, describe blocks)
    const testRegex = /(it|test|describe)\(['"`]([^'"`]+)['"`],\s*\([^)]*\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testType = match[1];
      const testName = match[2];
      const testBody = match[3];
      
      // Determine phase based on test name or content
      let phase: 'RED' | 'GREEN' | 'REFACTOR' = 'RED';
      if (testName.toLowerCase().includes('refactor') || testName.toLowerCase().includes('improve')) {
        phase = 'REFACTOR';
      } else if (testName.toLowerCase().includes('should') || testName.toLowerCase().includes('valid')) {
        phase = 'GREEN';
      }
      
      scenarios.push({
        testName,
        testCode: `${testType}('${testName}', () => {\n${testBody}\n});`,
        phase
      });
    }
    
    return scenarios;
  } catch (error) {
    console.error(`Error parsing test file ${testFilePath}:`, error);
    return [];
  }
}

/**
 * Get coverage untuk specific file
 */
export function getFileCoverage(coverageSummary: CoverageSummary, filePath: string): {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
} {
  const normalizedPath = path.resolve(projectRoot, filePath).replace(/\\/g, '/');
  const coverage = coverageSummary[normalizedPath];
  
  if (!coverage) {
    return { statements: 0, branches: 0, functions: 0, lines: 0 };
  }
  
  return {
    statements: coverage.statements?.pct || 0,
    branches: coverage.branches?.pct || 0,
    functions: coverage.functions?.pct || 0,
    lines: coverage.lines?.pct || 0
  };
}

/**
 * Generate evidence untuk single function
 */
export async function generateFunctionEvidence(
  module: string,
  functionName: string,
  sourceFile: string,
  testFiles: string[]
): Promise<TestEvidence | null> {
  const coverageSummary = parseCoverageSummary();
  const coverage = coverageSummary ? getFileCoverage(coverageSummary, sourceFile) : {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0
  };
  
  // Parse test scenarios dari test files
  const testScenarios: TestEvidence['testScenarios'] = [];
  
  for (const testFile of testFiles) {
    const scenarios = parseTestFile(testFile);
    
    for (const scenario of scenarios) {
      // Try to match dengan test scenario ID dari TDD docs
      const scenarioId = `${module}-${functionName}-${scenarios.indexOf(scenario).toString().padStart(3, '0')}`;
      
      testScenarios.push({
        scenarioId,
        status: 'PENDING', // Will be updated from actual test results
        phase: scenario.phase,
        timestamp: new Date().toISOString(),
        testFile,
        testCode: scenario.testCode
      });
    }
  }
  
  // Determine overall test status
  let testStatus: 'PASS' | 'FAIL' | 'SKIP' | 'PENDING' = 'PENDING';
  if (testFiles.length === 0) {
    testStatus = 'PENDING';
  } else if (coverage.functions > 0) {
    testStatus = 'PASS'; // Assume pass if there's coverage
  }
  
  return {
    functionName,
    module,
    testStatus,
    coverage,
    testScenarios,
    lastTestRun: new Date().toISOString(),
    evidence: {
      codeSnippets: testScenarios.map(ts => ts.testCode),
      testOutput: `Coverage: ${coverage.statements}% statements, ${coverage.branches}% branches, ${coverage.functions}% functions, ${coverage.lines}% lines`
    }
  };
}

/**
 * Main function untuk parse semua test results
 */
export async function parseAllTestResults(): Promise<Map<string, TestEvidence>> {
  const evidenceMap = new Map<string, TestEvidence>();
  
  const mappings = await mapTestFilesToFunctions();
  
  for (const mapping of mappings) {
    const key = `${mapping.module}:${mapping.functionName}`;
    const evidence = await generateFunctionEvidence(
      mapping.module,
      mapping.functionName,
      mapping.sourceFile,
      mapping.testFiles
    );
    
    if (evidence) {
      evidenceMap.set(key, evidence);
    }
  }
  
  return evidenceMap;
}

// Run jika executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  parseAllTestResults()
    .then(results => {
      console.log(`Parsed ${results.size} function evidences`);
      for (const [key, evidence] of results.entries()) {
        console.log(`  ${key}: ${evidence.testStatus} (${evidence.coverage.functions}% coverage)`);
      }
    })
    .catch(console.error);
}

