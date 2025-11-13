/**
 * TDD Documentation Auto-Generator
 * Scans routes files and generates TDD documentation JSON files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface RouteInfo {
    method: string;
    path: string;
    handler: string;
    module: string;
    functionName: string;
}

interface ModuleInfo {
    name: string;
    displayName: string;
    description: string;
    functions: FunctionInfo[];
}

interface FunctionInfo {
    name: string;
    description: string;
    signature: string;
    method: string;
    endpoint: string;
    testScenarios: any[];
    todos: any[];
    bddScenarios: any[];
    dod?: {
        criteria: Array<{
            id: string;
            description: string;
            status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
            evidence?: string;
        }>;
        acceptanceCriteria: Array<{
            id: string;
            description: string;
            testScenarioId: string;
            status: 'PENDING' | 'PASS' | 'FAIL';
        }>;
    };
}

// Module metadata mapping
const MODULE_METADATA: Record<string, { displayName: string; description: string }> = {
    auth: {
        displayName: 'Authentication',
        description: 'User authentication and authorization'
    },
    application: {
        displayName: 'Application',
        description: 'Application master data management'
    },
    schedule: {
        displayName: 'Schedule',
        description: 'Schedule management'
    },
    uarpic: {
        displayName: 'UAR PIC',
        description: 'UAR Person in Charge management'
    },
    master_config: {
        displayName: 'Master Config',
        description: 'System configuration management'
    },
    log_monitoring: {
        displayName: 'Log Monitoring',
        description: 'Logging and monitoring'
    },
    uar_division: {
        displayName: 'UAR Division',
        description: 'UAR Division management'
    },
    uar_generate: {
        displayName: 'UAR Generate',
        description: 'UAR generation process'
    },
    batch: {
        displayName: 'Batch Services',
        description: 'Batch processing services'
    }
};

async function extractRoutesFromFile(filePath: string): Promise<RouteInfo[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const routes: RouteInfo[] = [];
    
    // Extract module name from path
    const pathParts = filePath.split(path.sep);
    const moduleIndex = pathParts.findIndex(p => p === 'api');
    let moduleName = 'unknown';
    
    if (moduleIndex !== -1 && pathParts[moduleIndex + 1]) {
        moduleName = pathParts[moduleIndex + 1];
        // Handle nested modules
        if (moduleName === 'master_data' && pathParts[moduleIndex + 2]) {
            moduleName = pathParts[moduleIndex + 2];
        }
    }
    
    // Match route patterns: app.get('/path', ...), app.post('/path', ...), etc.
    const routePatterns = [
        /app\.(get|post|put|patch|delete|options)\s*<[^>]*>?\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /app\.(get|post|put|patch|delete|options)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];
    
    for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const routePath = match[2];
            
            // Extract function name from handler
            const handlerMatch = content.substring(match.index).match(/(?:controller|handler)\.(\w+)/);
            const functionName = handlerMatch ? handlerMatch[1] : routePath.replace(/[^a-zA-Z0-9]/g, '');
            
            routes.push({
                method,
                path: routePath,
                handler: handlerMatch ? handlerMatch[0] : '',
                module: moduleName,
                functionName: functionName || routePath.split('/').pop() || 'unknown'
            });
        }
    }
    
    return routes;
}

function generateFunctionDoc(route: RouteInfo, existingDoc?: any): FunctionInfo {
    const functionName = route.functionName;
    
    // Generate signature based on method and path
    const signature = `${route.method} ${route.path}`;
    
    // Use existing description if available, otherwise generate one
    const description = existingDoc?.description || 
        `Handles ${route.method} request to ${route.path}`;
    
    // Use existing test scenarios if available, otherwise create empty structure
    const testScenarios = existingDoc?.testScenarios || [
        {
            phase: 'RED',
            description: `Test ${functionName} should fail initially`,
            testCode: `it('should ${functionName}', async () => {\n  // TODO: Implement test\n});`,
            expectedResult: 'Test should fail'
        },
        {
            phase: 'GREEN',
            description: `Test ${functionName} should pass after implementation`,
            testCode: `it('should ${functionName}', async () => {\n  // TODO: Implement test\n});`,
            expectedResult: 'Test should pass'
        },
        {
            phase: 'REFACTOR',
            description: `Refactor ${functionName} implementation`,
            testCode: `// TODO: Refactor code\n// All tests should still pass`,
            expectedResult: 'Code refactored, tests still pass'
        }
    ];
    
    // Use existing todos if available, otherwise create default structure
    const todos = existingDoc?.todos || [
        {
            id: '1',
            task: `Implement ${functionName} function`,
            status: 'pending',
            priority: 'high',
            description: `Create implementation for ${functionName}`
        }
    ];
    
    // Use existing BDD scenarios if available, otherwise create default structure
    const bddScenarios = existingDoc?.bddScenarios || [
        {
            feature: `${functionName} Feature`,
            description: `As a developer, I want to ${functionName} so that I can handle the request`,
            scenarios: [
                {
                    name: `${functionName} Success Scenario`,
                    given: `Given I have valid request`,
                    when: `When I call ${functionName}`,
                    then: `Then I should receive successful response`,
                    testCode: `// TODO: Implement BDD test`
                }
            ]
        }
    ];
    
    // Auto-generate DOD from test scenarios
    const dod = existingDoc?.dod || {
        criteria: [
            {
                id: 'dod-1',
                description: 'All test scenarios implemented and passing',
                status: 'PENDING',
                evidence: ''
            },
            {
                id: 'dod-2',
                description: 'Code coverage meets minimum threshold (70%)',
                status: 'PENDING',
                evidence: ''
            },
            {
                id: 'dod-3',
                description: 'Error handling implemented for all error cases',
                status: 'PENDING',
                evidence: ''
            },
            {
                id: 'dod-4',
                description: 'Code reviewed and approved',
                status: 'PENDING',
                evidence: ''
            },
            {
                id: 'dod-5',
                description: 'Documentation updated',
                status: 'PENDING',
                evidence: ''
            }
        ],
        acceptanceCriteria: testScenarios.map((scenario, idx) => ({
            id: `ac-${idx + 1}`,
            description: scenario.description || `Test scenario ${idx + 1} should pass`,
            testScenarioId: scenario.id || `${functionName}-scenario-${idx + 1}`,
            status: 'PENDING' as 'PENDING' | 'PASS' | 'FAIL'
        }))
    };
    
    return {
        name: functionName,
        description,
        signature,
        method: route.method,
        endpoint: route.path,
        testScenarios,
        todos,
        bddScenarios,
        dod
    };
}

async function generateModuleDoc(moduleName: string, routes: RouteInfo[], existingDoc?: any): Promise<ModuleInfo> {
    const metadata = MODULE_METADATA[moduleName] || {
        displayName: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
        description: `Module for ${moduleName}`
    };
    
    // Group routes by function name
    const functionsMap = new Map<string, FunctionInfo>();
    
    // Load existing functions if available
    if (existingDoc?.functions) {
        existingDoc.functions.forEach((func: FunctionInfo) => {
            functionsMap.set(func.name, func);
        });
    }
    
    // Update or add functions from routes
    routes.forEach(route => {
        const existingFunction = functionsMap.get(route.functionName);
        const functionDoc = generateFunctionDoc(route, existingFunction);
        functionsMap.set(route.functionName, functionDoc);
    });
    
    return {
        name: moduleName,
        displayName: metadata.displayName,
        description: metadata.description,
        functions: Array.from(functionsMap.values())
    };
}

async function main() {
    console.log('🔍 Scanning routes files...');
    
    // Find all route files
    const routeFiles = await glob('src/api/**/*.routes.ts', {
        cwd: projectRoot,
        absolute: true
    });
    
    console.log(`📁 Found ${routeFiles.length} route files`);
    
    // Group routes by module
    const routesByModule = new Map<string, RouteInfo[]>();
    
    for (const filePath of routeFiles) {
        try {
            const routes = await extractRoutesFromFile(filePath);
            routes.forEach(route => {
                if (!routesByModule.has(route.module)) {
                    routesByModule.set(route.module, []);
                }
                routesByModule.get(route.module)!.push(route);
            });
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error);
        }
    }
    
    // Generate or update documentation
    const tddDocsDir = path.join(projectRoot, 'tdd-docs', 'src', 'data');
    
    // Ensure directory exists
    if (!fs.existsSync(tddDocsDir)) {
        fs.mkdirSync(tddDocsDir, { recursive: true });
    }
    
    console.log(`📝 Generating documentation for ${routesByModule.size} modules...`);
    
    for (const [moduleName, routes] of routesByModule.entries()) {
        try {
            const existingDocPath = path.join(tddDocsDir, `${moduleName}.json`);
            let existingDoc: any = null;
            
            // Load existing documentation if it exists
            if (fs.existsSync(existingDocPath)) {
                const existingContent = fs.readFileSync(existingDocPath, 'utf-8');
                existingDoc = JSON.parse(existingContent);
            }
            
            // Generate module documentation
            const moduleDoc = await generateModuleDoc(moduleName, routes, existingDoc);
            
            // Write to file
            const outputPath = path.join(tddDocsDir, `${moduleName}.json`);
            fs.writeFileSync(
                outputPath,
                JSON.stringify(moduleDoc, null, 2),
                'utf-8'
            );
            
            console.log(`✅ Generated: ${moduleName}.json (${moduleDoc.functions.length} functions)`);
        } catch (error) {
            console.error(`❌ Error generating ${moduleName}:`, error);
        }
    }
    
    console.log('✨ Documentation generation complete!');
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('generate-tdd-docs') ||
                     process.argv[1]?.endsWith('generate-tdd-docs.ts');

if (isMainModule) {
    main().catch(console.error);
}

export { main as generateTDDDocs };

