/**
 * Watch Test Results
 * Watch mode untuk auto-generate evidence saat test selesai
 */

import { watch } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateAllEvidence } from './generate-test-evidence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const coverageDir = path.join(projectRoot, 'coverage');
const testDir = path.join(projectRoot, 'src', 'tests');

let isGenerating = false;

/**
 * Debounce function
 */
function debounce(func: () => void, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  return () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

/**
 * Generate evidence dengan debounce
 */
const debouncedGenerate = debounce(async () => {
  if (isGenerating) {
    console.log('⏳ Evidence generation already in progress...');
    return;
  }
  
  isGenerating = true;
  console.log('\n🔄 Test results changed, generating evidence...');
  
  try {
    await generateAllEvidence();
    console.log('✅ Evidence generation completed\n');
  } catch (error) {
    console.error('❌ Error generating evidence:', error);
  } finally {
    isGenerating = false;
  }
}, 2000); // Wait 2 seconds after last change

/**
 * Watch coverage directory
 */
function watchCoverage() {
  if (!fs.existsSync(coverageDir)) {
    console.log('⚠️  Coverage directory not found, will watch when it appears...');
    
    // Watch parent directory to catch when coverage is created
    const parentWatcher = watch(path.dirname(coverageDir), (eventType, filename) => {
      if (filename === 'coverage' && eventType === 'rename') {
        console.log('📁 Coverage directory detected, starting watch...');
        watchCoverage();
        parentWatcher.close();
      }
    });
    
    return;
  }
  
  console.log(`👀 Watching coverage directory: ${coverageDir}`);
  
  watch(coverageDir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.json') || filename.endsWith('.html'))) {
      console.log(`📝 Coverage file changed: ${filename}`);
      debouncedGenerate();
    }
  });
}

/**
 * Watch test directory
 */
function watchTests() {
  console.log(`👀 Watching test directory: ${testDir}`);
  
  watch(testDir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
      console.log(`📝 Test file changed: ${filename}`);
      // Note: Test file changes don't trigger evidence generation immediately
      // Evidence is generated after tests run and coverage is updated
    }
  });
}

/**
 * Initial generation
 */
async function start() {
  console.log('🚀 Starting test evidence watcher...\n');
  
  // Generate initial evidence
  try {
    await generateAllEvidence();
  } catch (error) {
    console.warn('⚠️  Initial evidence generation failed:', error);
    console.log('   Will retry when coverage files are available...\n');
  }
  
  // Start watching
  watchCoverage();
  watchTests();
  
  console.log('\n✅ Watcher started. Waiting for test results...\n');
  console.log('   Run tests with: npm run test:coverage');
  console.log('   Or use watch mode: npm run test:tdd\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down watcher...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down watcher...');
  process.exit(0);
});

// Start watcher
start().catch(console.error);

