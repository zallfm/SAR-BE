// UI Components

import { copyToClipboard, formatCode } from './utils.js';

export function createCodeBlock(code, language = 'typescript', title = '') {
    const codeBlock = document.createElement('div');
    codeBlock.className = 'code-block';
    
    const header = document.createElement('div');
    header.className = 'code-header';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copyToClipboard(code);
    header.innerHTML = `<span>${title || language}</span>`;
    header.appendChild(copyBtn);
    
    const content = document.createElement('div');
    content.className = 'code-content';
    const pre = document.createElement('pre');
    pre.className = `language-${language}`;
    pre.innerHTML = formatCode(code);
    content.appendChild(pre);
    
    codeBlock.appendChild(header);
    codeBlock.appendChild(content);
    
    return codeBlock;
}

export function createTestCaseCard(scenario, phase) {
    const card = document.createElement('div');
    card.className = 'test-scenario';
    
    const header = document.createElement('div');
    header.className = 'test-scenario-header';
    header.innerHTML = `
        <div>
            <h3 class="test-scenario-title">${scenario.name}</h3>
            <span class="badge badge-phase-${phase.toLowerCase()}">${phase}</span>
        </div>
        <span class="toggle-icon">▼</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'test-scenario-content';
    
    if (scenario.description) {
        const desc = document.createElement('p');
        desc.textContent = scenario.description;
        desc.style.marginBottom = '1rem';
        content.appendChild(desc);
    }
    
    // Given section
    if (scenario.given) {
        const givenSection = createScenarioSection('Given', scenario.given);
        content.appendChild(givenSection);
    }
    
    // When section
    if (scenario.when) {
        const whenSection = createScenarioSection('When', scenario.when);
        content.appendChild(whenSection);
    }
    
    // Then section
    if (scenario.then) {
        const thenSection = createScenarioSection('Then', scenario.then);
        content.appendChild(thenSection);
    }
    
    // Test code
    if (scenario.testCode) {
        const codeSection = document.createElement('div');
        codeSection.className = 'scenario-section';
        codeSection.innerHTML = '<h4>Complete Test Code</h4>';
        if (createCodeBlock) {
            try {
                codeSection.appendChild(createCodeBlock(scenario.testCode, 'typescript', 'Test Code'));
            } catch (error) {
                console.error('Error creating code block:', error);
                // Fallback
                const pre = document.createElement('pre');
                pre.innerHTML = `<code class="language-typescript">${formatCode(scenario.testCode)}</code>`;
                codeSection.appendChild(pre);
            }
        } else {
            // Fallback if createCodeBlock not available
            const pre = document.createElement('pre');
            pre.innerHTML = `<code class="language-typescript">${formatCode ? formatCode(scenario.testCode) : scenario.testCode}</code>`;
            codeSection.appendChild(pre);
        }
        content.appendChild(codeSection);
    }
    
    // Implementation notes
    if (scenario.implementationNotes) {
        const notes = document.createElement('div');
        notes.className = 'scenario-section';
        notes.innerHTML = `
            <h4>Implementation Notes</h4>
            <p>${scenario.implementationNotes}</p>
        `;
        content.appendChild(notes);
    }
    
    // Toggle functionality
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
        content.classList.toggle('expanded');
        const icon = header.querySelector('.toggle-icon');
        icon.textContent = content.classList.contains('expanded') ? '▲' : '▼';
    });
    
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
}

function createScenarioSection(title, data) {
    const section = document.createElement('div');
    section.className = 'scenario-section';
    
    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    section.appendChild(titleEl);
    
    if (typeof data === 'string') {
        const p = document.createElement('p');
        p.textContent = data;
        section.appendChild(p);
    } else if (data.setup) {
        const p = document.createElement('p');
        p.textContent = data.setup;
        section.appendChild(p);
        
        if (data.code) {
            try {
                section.appendChild(createCodeBlock(data.code, 'typescript', 'Setup Code'));
            } catch (error) {
                const pre = document.createElement('pre');
                pre.innerHTML = `<code class="language-typescript">${formatCode ? formatCode(data.code) : data.code}</code>`;
                section.appendChild(pre);
            }
        }
    } else if (data.action) {
        const p = document.createElement('p');
        p.textContent = data.action;
        section.appendChild(p);
        
        if (data.code) {
            try {
                section.appendChild(createCodeBlock(data.code, 'typescript', 'Action Code'));
            } catch (error) {
                const pre = document.createElement('pre');
                pre.innerHTML = `<code class="language-typescript">${formatCode ? formatCode(data.code) : data.code}</code>`;
                section.appendChild(pre);
            }
        }
    } else if (data.expectedReturn) {
        const p = document.createElement('p');
        p.textContent = 'Expected return value and side effects';
        section.appendChild(p);
        
        if (data.code) {
            try {
                section.appendChild(createCodeBlock(data.code, 'typescript', 'Expected Result'));
            } catch (error) {
                const pre = document.createElement('pre');
                pre.innerHTML = `<code class="language-typescript">${formatCode ? formatCode(data.code) : data.code}</code>`;
                section.appendChild(pre);
            }
        }
    }
    
    return section;
}

export function createFunctionSignature(signature) {
    const container = document.createElement('div');
    container.className = 'signature-container';
    try {
        container.appendChild(createCodeBlock(signature, 'typescript', 'Function Signature'));
    } catch (error) {
        console.error('Error creating function signature:', error);
        const pre = document.createElement('pre');
        pre.innerHTML = `<code class="language-typescript">${formatCode ? formatCode(signature) : signature}</code>`;
        container.appendChild(pre);
    }
    return container;
}

export function createPhaseTabs(phases, activePhase, onPhaseChange) {
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'phase-tabs';
    
    phases.forEach(phase => {
        const tab = document.createElement('button');
        tab.className = `phase-tab ${phase.toLowerCase()}`;
        tab.textContent = phase;
        if (phase === activePhase) {
            tab.classList.add('active');
        }
        tab.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.phase-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            onPhaseChange(phase);
        });
        tabsContainer.appendChild(tab);
    });
    
    return tabsContainer;
}

export function createImplementationGuide(steps) {
    const guide = document.createElement('div');
    guide.className = 'implementation-guide';
    guide.innerHTML = '<h3 class="section-title">Implementation Guide</h3>';
    
    steps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'implementation-step';
        stepEl.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div>
                <h4>${step.title}</h4>
                <p>${step.description}</p>
            </div>
        `;
        guide.appendChild(stepEl);
    });
    
    return guide;
}

export function createTDDInfoBox() {
    const container = document.createElement('div');
    container.className = 'tdd-info-box';
    
    container.innerHTML = `
        <div class="tdd-info-header">
            <h2>📚 Understanding TDD Phases</h2>
            <p class="tdd-info-subtitle">Test-Driven Development follows a Red-Green-Refactor cycle</p>
        </div>
        
        <div class="tdd-phases-grid">
            <div class="tdd-phase-card phase-red">
                <div class="phase-header">
                    <div class="phase-icon">🔴</div>
                    <h3>RED Phase</h3>
                </div>
                <div class="phase-content">
                    <p class="phase-description"><strong>Write a failing test first</strong></p>
                    <ul class="phase-details">
                        <li>Write test case for the feature you want to build</li>
                        <li>Test must <strong>FAIL</strong> because implementation doesn't exist yet</li>
                        <li>Test defines the expected behavior</li>
                        <li>Run test → See RED (test fails)</li>
                    </ul>
                    <div class="phase-example">
                        <strong>Example:</strong>
                        <pre><code>it('should return token when login succeeds', async () => {
  const result = await authService.login(app, 'user', 'pass');
  expect(result.token).toBeDefined(); 
  // ❌ FAIL - login() doesn't exist yet
});</code></pre>
                    </div>
                </div>
            </div>
            
            <div class="tdd-phase-card phase-green">
                <div class="phase-header">
                    <div class="phase-icon">🟢</div>
                    <h3>GREEN Phase</h3>
                </div>
                <div class="phase-content">
                    <p class="phase-description"><strong>Write minimal code to make test pass</strong></p>
                    <ul class="phase-details">
                        <li>Write the simplest implementation</li>
                        <li>Don't over-engineer - just make the test pass</li>
                        <li>Focus only on what the test requires</li>
                        <li>Run test → See GREEN (test passes)</li>
                    </ul>
                    <div class="phase-example">
                        <strong>Example:</strong>
                        <pre><code>async login(app, username, password) {
  return {
    token: 'dummy-token',
    expiresIn: '1h',
    user: { username }
  };
}
// ✅ PASS - test now succeeds</code></pre>
                    </div>
                </div>
            </div>
            
            <div class="tdd-phase-card phase-blue">
                <div class="phase-header">
                    <div class="phase-icon">🔵</div>
                    <h3>REFACTOR Phase</h3>
                </div>
                <div class="phase-content">
                    <p class="phase-description"><strong>Improve code without changing behavior</strong></p>
                    <ul class="phase-details">
                        <li>Clean up and optimize the code</li>
                        <li>Remove duplication</li>
                        <li>Improve readability and maintainability</li>
                        <li>Tests must still PASS after refactoring</li>
                    </ul>
                    <div class="phase-example">
                        <strong>Example:</strong>
                        <pre><code>// Extract helper functions
// Improve naming
// Add error handling
// All tests still pass ✅</code></pre>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tdd-workflow">
            <h3>🔄 TDD Workflow Cycle</h3>
            <div class="workflow-diagram">
                <div class="workflow-step">
                    <div class="workflow-number">1</div>
                    <div class="workflow-text">RED<br><small>Write failing test</small></div>
                </div>
                <div class="workflow-arrow">→</div>
                <div class="workflow-step">
                    <div class="workflow-number">2</div>
                    <div class="workflow-text">GREEN<br><small>Make it pass</small></div>
                </div>
                <div class="workflow-arrow">→</div>
                <div class="workflow-step">
                    <div class="workflow-number">3</div>
                    <div class="workflow-text">REFACTOR<br><small>Improve code</small></div>
                </div>
                <div class="workflow-arrow">→</div>
                <div class="workflow-step">
                    <div class="workflow-number">4</div>
                    <div class="workflow-text">Repeat<br><small>Next feature</small></div>
                </div>
            </div>
        </div>
        
        <div class="tdd-benefits">
            <h3>✨ Why RED first?</h3>
            <ul>
                <li>✅ Ensures test actually tests the behavior (not false positives)</li>
                <li>✅ Proves the test would catch bugs if implementation is wrong</li>
                <li>✅ Forces you to think about requirements before coding</li>
                <li>✅ Guarantees test is meaningful and drives implementation</li>
            </ul>
        </div>
    `;
    
    return container;
}

export function createTodoList(todos) {
    const container = document.createElement('div');
    container.className = 'todo-list-container';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Implementation Todo List';
    container.appendChild(title);
    
    // Group todos by priority
    const grouped = {
        high: todos.filter(t => t.priority === 'high'),
        medium: todos.filter(t => t.priority === 'medium'),
        low: todos.filter(t => t.priority === 'low')
    };
    
    ['high', 'medium', 'low'].forEach(priority => {
        if (grouped[priority].length === 0) return;
        
        const prioritySection = document.createElement('div');
        prioritySection.className = `todo-priority-section priority-${priority}`;
        
        const priorityTitle = document.createElement('h3');
        priorityTitle.className = 'todo-priority-title';
        priorityTitle.textContent = `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${grouped[priority].length})`;
        prioritySection.appendChild(priorityTitle);
        
        const todoList = document.createElement('div');
        todoList.className = 'todo-list';
        
        grouped[priority].forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item todo-${todo.status}`;
            todoItem.dataset.todoId = todo.id;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.status === 'completed';
            checkbox.id = `todo-${todo.id}`;
            checkbox.addEventListener('change', (e) => {
                todo.status = e.target.checked ? 'completed' : 'pending';
                todoItem.className = `todo-item todo-${todo.status}`;
            });
            
            const label = document.createElement('label');
            label.htmlFor = `todo-${todo.id}`;
            label.className = 'todo-label';
            
            const taskTitle = document.createElement('span');
            taskTitle.className = 'todo-task';
            taskTitle.textContent = todo.task;
            
            const taskDesc = document.createElement('span');
            taskDesc.className = 'todo-description';
            taskDesc.textContent = todo.description || '';
            
            label.appendChild(taskTitle);
            if (todo.description) {
                label.appendChild(document.createElement('br'));
                label.appendChild(taskDesc);
            }
            
            todoItem.appendChild(checkbox);
            todoItem.appendChild(label);
            todoList.appendChild(todoItem);
        });
        
        prioritySection.appendChild(todoList);
        container.appendChild(prioritySection);
    });
    
    return container;
}

export function createBDDScenarios(bddScenarios) {
    const container = document.createElement('div');
    container.className = 'bdd-scenarios-container';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'BDD (Behavior-Driven Development) Scenarios';
    container.appendChild(title);
    
    bddScenarios.forEach(feature => {
        const featureCard = document.createElement('div');
        featureCard.className = 'bdd-feature';
        
        const featureHeader = document.createElement('div');
        featureHeader.className = 'bdd-feature-header';
        featureHeader.innerHTML = `
            <h3>${feature.name}</h3>
            <p class="bdd-feature-description">${feature.description}</p>
        `;
        featureCard.appendChild(featureHeader);
        
        if (feature.scenarios && feature.scenarios.length > 0) {
            feature.scenarios.forEach(scenario => {
                const scenarioCard = document.createElement('div');
                scenarioCard.className = 'bdd-scenario';
                
                const scenarioHeader = document.createElement('div');
                scenarioHeader.className = 'bdd-scenario-header';
                scenarioHeader.innerHTML = `
                    <h4>${scenario.name}</h4>
                    <span class="bdd-scenario-toggle">▼</span>
                `;
                
                const scenarioContent = document.createElement('div');
                scenarioContent.className = 'bdd-scenario-content';
                
                // Given section
                if (scenario.given && scenario.given.length > 0) {
                    const givenSection = document.createElement('div');
                    givenSection.className = 'bdd-section bdd-given';
                    const givenTitle = document.createElement('h5');
                    givenTitle.className = 'bdd-section-title';
                    givenTitle.innerHTML = '<span class="bdd-keyword">Given</span>';
                    givenSection.appendChild(givenTitle);
                    
                    const givenList = document.createElement('ul');
                    scenario.given.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item;
                        givenList.appendChild(li);
                    });
                    givenSection.appendChild(givenList);
                    scenarioContent.appendChild(givenSection);
                }
                
                // When section
                if (scenario.when && scenario.when.length > 0) {
                    const whenSection = document.createElement('div');
                    whenSection.className = 'bdd-section bdd-when';
                    const whenTitle = document.createElement('h5');
                    whenTitle.className = 'bdd-section-title';
                    whenTitle.innerHTML = '<span class="bdd-keyword">When</span>';
                    whenSection.appendChild(whenTitle);
                    
                    const whenList = document.createElement('ul');
                    scenario.when.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item;
                        whenList.appendChild(li);
                    });
                    whenSection.appendChild(whenList);
                    scenarioContent.appendChild(whenSection);
                }
                
                // Then section
                if (scenario.then && scenario.then.length > 0) {
                    const thenSection = document.createElement('div');
                    thenSection.className = 'bdd-section bdd-then';
                    const thenTitle = document.createElement('h5');
                    thenTitle.className = 'bdd-section-title';
                    thenTitle.innerHTML = '<span class="bdd-keyword">Then</span>';
                    thenSection.appendChild(thenTitle);
                    
                    const thenList = document.createElement('ul');
                    scenario.then.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item;
                        thenList.appendChild(li);
                    });
                    thenSection.appendChild(thenList);
                    scenarioContent.appendChild(thenSection);
                }
                
                // Test code
                if (scenario.testCode) {
                    const testCodeSection = document.createElement('div');
                    testCodeSection.className = 'bdd-test-code';
                    testCodeSection.innerHTML = '<h5>Test Code</h5>';
                    try {
                        if (createCodeBlock) {
                            testCodeSection.appendChild(createCodeBlock(scenario.testCode, 'typescript', 'BDD Test Code'));
                        } else {
                            const pre = document.createElement('pre');
                            pre.innerHTML = `<code class="language-typescript">${formatCode ? formatCode(scenario.testCode) : scenario.testCode}</code>`;
                            testCodeSection.appendChild(pre);
                        }
                    } catch (error) {
                        const pre = document.createElement('pre');
                        pre.innerHTML = `<code class="language-typescript">${scenario.testCode}</code>`;
                        testCodeSection.appendChild(pre);
                    }
                    scenarioContent.appendChild(testCodeSection);
                }
                
                // Toggle functionality
                scenarioHeader.style.cursor = 'pointer';
                scenarioHeader.addEventListener('click', () => {
                    scenarioCard.classList.toggle('expanded');
                    scenarioContent.classList.toggle('expanded');
                    const toggle = scenarioHeader.querySelector('.bdd-scenario-toggle');
                    if (toggle) {
                        toggle.textContent = scenarioCard.classList.contains('expanded') ? '▲' : '▼';
                    }
                });
                
                // Initially collapsed
                scenarioCard.classList.remove('expanded');
                scenarioContent.classList.remove('expanded');
                
                scenarioCard.appendChild(scenarioHeader);
                scenarioCard.appendChild(scenarioContent);
                featureCard.appendChild(scenarioCard);
            });
        }
        
        container.appendChild(featureCard);
    });
    
    return container;
}

export function createHowToUseGuide() {
    const container = document.createElement('div');
    container.className = 'how-to-use-guide';
    
    // Helper untuk create code block safely
    const createCodeBlockSafe = (code, lang, title) => {
        try {
            if (typeof createCodeBlock === 'function') {
                return createCodeBlock(code, lang, title).outerHTML;
            }
        } catch (e) {
            console.warn('createCodeBlock not available, using fallback');
        }
        // Fallback
        return `<div class="code-block">
            <div class="code-header"><span>${title || lang}</span></div>
            <div class="code-content">
                <pre class="language-${lang}"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
        </div>`;
    };
    
    container.innerHTML = `
        <div class="guide-header">
            <h2 class="section-title">📚 How to Use TDD Documentation</h2>
            <p class="guide-subtitle">Step-by-step guide untuk implementasi TDD di project ini</p>
        </div>
        
        <div class="guide-steps">
            <!-- Step 1: RED Phase -->
            <div class="guide-step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h3 class="step-title">RED Phase - Write Failing Test</h3>
                    <p class="step-description">Mulai dengan menulis test case yang akan fail. Ini memastikan kita menulis test yang benar sebelum implementasi.</p>
                    
                    <div class="step-example">
                        <h4>Example: Test untuk login function</h4>
                        ${createCodeBlockSafe(`// src/tests/unit/auth.service.spec.ts
describe('authService.login', () => {
  it('should return token when credentials are valid', async () => {
    const app = await buildApp();
    const result = await authService.login(
      app, 
      'testuser', 
      'password123', 
      'req-1'
    );
    
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('expiresIn');
    expect(result.user.username).toBe('testuser');
  });
});`, 'typescript', 'Test Code (RED Phase)')}
                    </div>
                    
                    <div class="step-output">
                        <h4>Expected Output (Test Failed):</h4>
                        <div class="test-output failed">
                            <div class="output-header">
                                <span class="status-badge fail">✗ FAIL</span>
                                <span>authService.login › should return token when credentials are valid</span>
                            </div>
                            <div class="output-content">
                                <pre><code>Error: Function not implemented yet

    at authService.login (src/modules/auth/auth.service.ts:93)
    at Object.<anonymous> (src/tests/unit/auth.service.spec.ts:8)</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step 2: GREEN Phase -->
            <div class="guide-step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h3 class="step-title">GREEN Phase - Make Test Pass</h3>
                    <p class="step-description">Implementasi code minimal untuk membuat test pass. Jangan khawatir tentang code quality dulu.</p>
                    
                    <div class="step-example">
                        <h4>Example: Implementasi minimal</h4>
                        ${createCodeBlockSafe(`// src/modules/auth/auth.service.ts
export const authService = {
  async login(app: FastifyInstance, username: string, password: string, requestId?: string) {
    // Minimal implementation untuk pass test
    const user = await userRepository.login(username, password);
    const valid = !!user && safeCompare(password, user.password);
    
    if (!valid) {
      throw new ApplicationError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        {},
        requestId,
        401
      );
    }
    
    const payload = { sub: user.username, role: user.role, name: user.name };
    const token = app.jwt.sign(payload, { expiresIn: env.TOKEN_EXPIRES_IN });
    
    return { 
      token, 
      expiresIn: env.TOKEN_EXPIRES_IN, 
      user: { username: user.username, name: user.name, role: user.role }
    };
  }
};`, 'typescript', 'Implementation Code (GREEN Phase)')}
                    </div>
                    
                    <div class="step-output">
                        <h4>Expected Output (Test Passed):</h4>
                        <div class="test-output passed">
                            <div class="output-header">
                                <span class="status-badge pass">✓ PASS</span>
                                <span>authService.login › should return token when credentials are valid</span>
                            </div>
                            <div class="output-content">
                                <pre><code>✓ authService.login › should return token when credentials are valid (45ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        2.345 s</code></pre>
                                <div class="coverage-info">
                                    <span class="coverage-badge">Coverage: 85%</span>
                                    <span class="coverage-detail">Statements: 85% | Branches: 80% | Functions: 90% | Lines: 85%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step 3: REFACTOR Phase -->
            <div class="guide-step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h3 class="step-title">REFACTOR Phase - Improve Code Quality</h3>
                    <p class="step-description">Setelah test pass, perbaiki code quality tanpa mengubah behavior. Test tetap harus pass.</p>
                    
                    <div class="step-example">
                        <h4>Example: Refactored code dengan error handling & audit logging</h4>
                        ${createCodeBlockSafe(`// src/modules/auth/auth.service.ts (Refactored)
export const authService = {
  async login(app: FastifyInstance, username: string, password: string, requestId?: string) {
    // Check account lock
    if (isLocked(username)) {
      const info = getLockInfo(username);
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_ACCOUNT_LOCKED, {
        userId: username,
        requestId,
        description: 'Account locked'
      });
      throw new ApplicationError(ERROR_CODES.AUTH_ACCOUNT_LOCKED, ...);
    }
    
    // Authenticate
    const user = await userRepository.login(username, password);
    const valid = !!user && safeCompare(password, user.password);
    
    if (!valid) {
      recordFailure(username);
      AuditLogger.logFailure(AuditAction.LOGIN_FAILED, ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
        userId: username,
        requestId
      });
      throw new ApplicationError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, ...);
    }
    
    // Success
    resetAttempts(username);
    const payload = { sub: user.username, role: user.role, name: user.name };
    const token = app.jwt.sign(payload, { expiresIn: env.TOKEN_EXPIRES_IN });
    
    AuditLogger.logSuccess(AuditAction.LOGIN_SUCCESS, {
      userId: user.username,
      requestId
    });
    
    return { token, expiresIn: env.TOKEN_EXPIRES_IN, user: publicUser };
  }
};`, 'typescript', 'Refactored Code (REFACTOR Phase)')}
                    </div>
                    
                    <div class="step-output">
                        <h4>Expected Output (Test Still Passed):</h4>
                        <div class="test-output passed">
                            <div class="output-header">
                                <span class="status-badge pass">✓ PASS</span>
                                <span>All tests passing after refactoring</span>
                            </div>
                            <div class="output-content">
                                <pre><code>✓ authService.login › should return token when credentials are valid (42ms)
✓ authService.login › should throw error on invalid credentials (38ms)
✓ authService.login › should lock account after max attempts (51ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Coverage:    92%</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step 4: Real Implementation -->
            <div class="guide-step">
                <div class="step-number">4</div>
                <div class="step-content">
                    <h3 class="step-title">Implementasi ke Real Code</h3>
                    <p class="step-description">Setelah test pass dan code di-refactor, implementasi sudah siap. Lihat function detail untuk melihat test scenarios lengkap.</p>
                    
                    <div class="step-actions">
                        <button onclick="window.router && window.router.navigate('/modules/auth/login')" class="action-btn primary">
                            📖 Lihat Function Detail: auth.login
                        </button>
                        <p class="action-hint">Klik untuk melihat test scenarios lengkap, todos, dan BDD scenarios untuk function login</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="guide-tips">
            <h3>💡 Tips & Best Practices</h3>
            <ul>
                <li><strong>Selalu mulai dengan RED:</strong> Tulis test dulu sebelum implementasi</li>
                <li><strong>GREEN minimal:</strong> Implementasi minimal untuk pass test, jangan over-engineer</li>
                <li><strong>REFACTOR dengan confidence:</strong> Test suite memastikan behavior tetap sama</li>
                <li><strong>Test scenarios:</strong> Lihat function detail untuk melihat semua test scenarios yang harus diimplementasi</li>
                <li><strong>Evidence tracking:</strong> Test results akan otomatis muncul sebagai evidence di function detail</li>
            </ul>
        </div>
    `;
    
    return container;
}

export function createEvidenceDisplay(evidence) {
    if (!evidence) {
        const empty = document.createElement('div');
        empty.className = 'evidence-empty';
        empty.innerHTML = `
            <p>No evidence available yet. Run tests with coverage to generate evidence.</p>
            <code>npm run test:coverage</code>
        `;
        return empty;
    }
    
    const container = document.createElement('div');
    container.className = 'evidence-display';
    
    // Overall status
    const statusBadgeClass = {
        'PASS': 'pass',
        'FAIL': 'fail',
        'SKIP': 'skip',
        'PENDING': 'pending'
    }[evidence.testStatus] || 'pending';
    
    container.innerHTML = `
        <div class="evidence-header">
            <h2 class="section-title">📊 Test Evidence</h2>
            <div class="evidence-status">
                <span class="status-badge ${statusBadgeClass}">${evidence.testStatus}</span>
                <span class="evidence-timestamp">Last run: ${new Date(evidence.lastTestRun).toLocaleString()}</span>
            </div>
        </div>
        
        <div class="evidence-coverage">
            <h3>Coverage</h3>
            <div class="coverage-grid">
                <div class="coverage-item">
                    <div class="coverage-label">Statements</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${evidence.coverage.statements}%"></div>
                    </div>
                    <div class="coverage-value">${evidence.coverage.statements.toFixed(1)}%</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-label">Branches</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${evidence.coverage.branches}%"></div>
                    </div>
                    <div class="coverage-value">${evidence.coverage.branches.toFixed(1)}%</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-label">Functions</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${evidence.coverage.functions}%"></div>
                    </div>
                    <div class="coverage-value">${evidence.coverage.functions.toFixed(1)}%</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-label">Lines</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${evidence.coverage.lines}%"></div>
                    </div>
                    <div class="coverage-value">${evidence.coverage.lines.toFixed(1)}%</div>
                </div>
            </div>
        </div>
        
        <div class="evidence-scenarios">
            <h3>Test Scenarios Status</h3>
            <div class="scenarios-list">
                ${evidence.testScenarios.map(scenario => {
                    const scenarioStatusClass = 
                        scenario.status === 'PASS' ? 'pass' : 
                        scenario.status === 'FAIL' ? 'fail' : 
                        scenario.status === 'SKIP' ? 'skip' : 
                        'pending';
                    return `
                        <div class="evidence-scenario-card">
                            <div class="scenario-header">
                                <span class="scenario-id">${scenario.scenarioId}</span>
                                <span class="badge badge-phase-${scenario.phase.toLowerCase()}">${scenario.phase}</span>
                                <span class="status-badge ${scenarioStatusClass}">${scenario.status}</span>
                            </div>
                            <div class="scenario-meta">
                                <span class="scenario-file">${scenario.testFile}</span>
                                <span class="scenario-time">${new Date(scenario.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div class="evidence-output">
            <h3>Test Output</h3>
            <div class="output-container">
                <pre><code>${evidence.evidence.testOutput || 'No output available'}</code></pre>
            </div>
        </div>
        
        ${evidence.evidence.codeSnippets && evidence.evidence.codeSnippets.length > 0 ? `
            <div class="evidence-code">
                <h3>Code Snippets</h3>
                ${evidence.evidence.codeSnippets.map((snippet, idx) => {
                    try {
                        if (typeof createCodeBlock === 'function') {
                            return createCodeBlock(snippet, 'typescript', `Snippet ${idx + 1}`).outerHTML;
                        }
                    } catch (e) {
                        console.warn('Error creating code block:', e);
                    }
                    return `<pre><code>${snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
                }).join('')}
            </div>
        ` : ''}
    `;
    
    return container;
}

export function createDODDisplay(dod) {
    if (!dod) {
        return null;
    }
    
    const container = document.createElement('div');
    container.className = 'dod-display';
    
    container.innerHTML = `
        <h2 class="section-title">✅ Definition of Done (DOD) & Acceptance Criteria</h2>
        
        ${dod.criteria && dod.criteria.length > 0 ? `
            <div class="dod-criteria">
                <h3>DOD Criteria</h3>
                <ul class="dod-checklist">
                    ${dod.criteria.map(criteria => {
                        const statusClass = {
                            'PENDING': 'pending',
                            'IN_PROGRESS': 'in-progress',
                            'COMPLETED': 'completed',
                            'VERIFIED': 'verified'
                        }[criteria.status] || 'pending';
                        
                        return `
                            <li class="dod-item ${statusClass}">
                                <div class="dod-checkbox">
                                    <input type="checkbox" ${criteria.status === 'COMPLETED' || criteria.status === 'VERIFIED' ? 'checked' : ''} disabled>
                                    <span class="dod-status-icon"></span>
                                </div>
                                <div class="dod-content">
                                    <div class="dod-description">${criteria.description}</div>
                                    ${criteria.evidence ? `<div class="dod-evidence">Evidence: ${criteria.evidence}</div>` : ''}
                                </div>
                                <span class="dod-status-badge ${statusClass}">${criteria.status}</span>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${dod.acceptanceCriteria && dod.acceptanceCriteria.length > 0 ? `
            <div class="acceptance-criteria">
                <h3>Acceptance Criteria</h3>
                <ul class="ac-checklist">
                    ${dod.acceptanceCriteria.map(ac => {
                        const statusClass = ac.status === 'PASS' ? 'pass' : ac.status === 'FAIL' ? 'fail' : 'pending';
                        
                        return `
                            <li class="ac-item ${statusClass}">
                                <div class="ac-checkbox">
                                    <input type="checkbox" ${ac.status === 'PASS' ? 'checked' : ''} disabled>
                                    <span class="ac-status-icon"></span>
                                </div>
                                <div class="ac-content">
                                    <div class="ac-description">${ac.description}</div>
                                    ${ac.testScenarioId ? `<a href="#scenario-${ac.testScenarioId}" class="ac-scenario-link">View Test Scenario: ${ac.testScenarioId}</a>` : ''}
                                </div>
                                <span class="ac-status-badge ${statusClass}">${ac.status}</span>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    return container;
}

// Make copyToClipboard available globally
window.copyToClipboard = copyToClipboard;

