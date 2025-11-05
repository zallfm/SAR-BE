// Main Application
// Note: Using dynamic imports to handle ES modules in browser

let fetchJSON, createCodeBlock, createTestCaseCard, createFunctionSignature, createPhaseTabs, createImplementationGuide, createTodoList, createBDDScenarios, createTDDInfoBox, router;

// Load modules dynamically
async function loadModules() {
    try {
        const utilsModule = await import('./utils.js');
        fetchJSON = utilsModule.fetchJSON;
        
        const componentsModule = await import('./components.js');
        createCodeBlock = componentsModule.createCodeBlock;
        createTestCaseCard = componentsModule.createTestCaseCard;
        createFunctionSignature = componentsModule.createFunctionSignature;
        createPhaseTabs = componentsModule.createPhaseTabs;
        createImplementationGuide = componentsModule.createImplementationGuide;
        createTodoList = componentsModule.createTodoList;
        createBDDScenarios = componentsModule.createBDDScenarios;
        createTDDInfoBox = componentsModule.createTDDInfoBox;
        
        const routerModule = await import('./router.js');
        router = routerModule.router;
        
        // Initialize app after modules are loaded
        await initApp();
    } catch (error) {
        console.error('Failed to load modules:', error);
        document.body.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1>Error Loading TDD Documentation</h1><p>Please check the console for details.</p></div>';
    }
}

async function initApp() {
    console.log('Initializing app...');
    await loadModulesData();
    
    // Wait a bit to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setupRouter();
    router.init(); // Initialize router after routes are registered
    
    // Make router available globally
    window.router = router;
    window.renderFunctionDetail = renderFunctionDetail;
    window.renderModuleDetail = renderModuleDetail;
    
    renderHomePage();
    setupSearch();
    
    console.log('App initialized. Modules loaded:', Object.keys(modulesData).length);
}

let modulesData = {};
let currentFunction = null;

async function loadModulesData() {
    try {
        console.log('Loading modules...');
        const response = await fetchJSON('/tdd/api/modules');
        console.log('Modules response:', response);
        const modules = response.modules;
        
        if (!modules || modules.length === 0) {
            console.error('No modules found in response');
            return;
        }
        
        // Load data for each module
        for (const module of modules) {
            try {
                console.log(`Loading module data for: ${module.name}`);
                const data = await fetchJSON(`/tdd/api/modules/${module.name}`);
                console.log(`Module ${module.name} data:`, data);
                modulesData[module.name] = { ...module, ...data };
                
                // Check if functions exist
                if (data.functions) {
                    console.log(`Module ${module.name} has ${data.functions.length} functions`);
                } else {
                    console.warn(`Module ${module.name} has no functions`);
                }
            } catch (error) {
                console.error(`Failed to load module ${module.name}:`, error);
            }
        }
        
        console.log('All modules loaded:', modulesData);
        renderModulesList();
        renderModulesGrid();
        updateStats();
    } catch (error) {
        console.error('Failed to load modules:', error);
        const modulesList = document.getElementById('modulesList');
        if (modulesList) {
            modulesList.innerHTML = '<div class="loading">Failed to load modules. Check console for details.</div>';
        }
    }
}

function setupRouter() {
    // Clear existing routes
    router.routes.clear();
    
    router.register('/', () => {
        console.log('Route: Home');
        showPage('homePage');
        renderHomePage();
    });
    
    router.register('/modules/:module', (moduleName) => {
        console.log('Route: Module detail', moduleName);
        showPage('homePage');
        renderModuleDetail(moduleName);
    });
    
    router.register('/modules/:module/:function', (moduleName, functionName) => {
        console.log('Route: Function detail', moduleName, functionName);
        showPage('functionPage');
        renderFunctionDetail(moduleName, functionName);
    });
    
    router.register('*', () => {
        console.log('Route: Fallback to home');
        router.navigate('/');
    });
    
    // Handle initial route
    router.handleRoute();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

function renderHomePage() {
    // Remove module detail container if exists
    const moduleDetailContainer = document.getElementById('moduleDetailContainer');
    if (moduleDetailContainer) {
        moduleDetailContainer.remove();
    }
    
    // Show modules grid again
    const modulesGrid = document.getElementById('modulesGrid');
    if (modulesGrid) {
        modulesGrid.style.display = 'grid';
    }
    
    // Add TDD Info Box at the top
    const homePage = document.getElementById('homePage');
    const existingInfoBox = homePage.querySelector('.tdd-info-box');
    if (!existingInfoBox && createTDDInfoBox) {
        const infoBox = createTDDInfoBox();
        const hero = homePage.querySelector('.hero');
        const statsGrid = homePage.querySelector('.stats-grid');
        if (hero && statsGrid) {
            homePage.insertBefore(infoBox, statsGrid);
        }
    }
    
    // Add How-to Use Guide
    const existingGuide = homePage.querySelector('.how-to-use-guide');
    if (!existingGuide) {
        // Dynamic import createHowToUseGuide
        import('./components.js').then(({ createHowToUseGuide }) => {
            if (createHowToUseGuide) {
                try {
                    const guide = createHowToUseGuide();
                    const modulesGrid = homePage.querySelector('.modules-grid');
                    if (modulesGrid && modulesGrid.parentNode) {
                        modulesGrid.parentNode.insertBefore(guide, modulesGrid);
                    }
                } catch (err) {
                    console.error('Error creating how-to guide:', err);
                }
            }
        }).catch(err => console.error('Error loading how-to guide:', err));
    }
    
    // Add export button to homepage
    const existingExportBtn = homePage.querySelector('.homepage-export-btn');
    if (!existingExportBtn) {
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        exportContainer.style.cssText = 'justify-content: center; margin: var(--space-xl) 0;';
        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn homepage-export-btn';
        exportBtn.innerHTML = '📥 Export All Evidence to Excel';
        exportBtn.onclick = () => {
            window.open('/tdd/api/evidence/export', '_blank');
        };
        exportContainer.appendChild(exportBtn);
        const modulesGrid = homePage.querySelector('.modules-grid');
        if (modulesGrid && modulesGrid.parentNode) {
            modulesGrid.parentNode.insertBefore(exportContainer, modulesGrid);
        }
    }
    
    renderModulesGrid();
    updateStats();
}

function renderModulesList() {
    const modulesList = document.getElementById('modulesList');
    modulesList.innerHTML = '';
    
    Object.values(modulesData).forEach(module => {
        const item = document.createElement('div');
        item.className = 'module-item';
        item.innerHTML = `
            <h3>${module.displayName || module.name}</h3>
            <p>${module.description || ''}</p>
        `;
        item.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Module item clicked:', module.name);
            document.querySelectorAll('.module-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            window.router.navigate(`/modules/${module.name}`);
        });
        modulesList.appendChild(item);
    });
}

function renderModulesGrid() {
    const grid = document.getElementById('modulesGrid');
    if (!grid) {
        console.error('modulesGrid element not found');
        return;
    }
    grid.innerHTML = '';
    
    const modules = Object.values(modulesData);
    console.log(`Rendering ${modules.length} modules`);
    
    if (modules.length === 0) {
        grid.innerHTML = '<p>No modules available. Please check the console for errors.</p>';
        return;
    }
    
    modules.forEach(module => {
        const card = document.createElement('div');
        card.className = 'module-card';
        const functionCount = module.functions?.length || 0;
        card.innerHTML = `
            <h2>${module.displayName || module.name}</h2>
            <p>${module.description || ''}</p>
            <div class="module-meta">
                <span>${functionCount} function${functionCount !== 1 ? 's' : ''}</span>
            </div>
        `;
        card.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Module card clicked:', module.name);
            window.router.navigate(`/modules/${module.name}`);
        });
        grid.appendChild(card);
    });
}

function renderModuleDetail(moduleName) {
    console.log('renderModuleDetail called with:', moduleName);
    const module = modulesData[moduleName];
    if (!module) {
        console.error('Module not found:', moduleName);
        console.log('Available modules:', Object.keys(modulesData));
        router.navigate('/');
        return;
    }
    
    console.log('Rendering module detail for:', module);
    
    // Show homePage and hide functionPage
    showPage('homePage');
    
    // Hide modules grid
    const modulesGrid = document.getElementById('modulesGrid');
    if (modulesGrid) {
        modulesGrid.style.display = 'none';
    }
    
    // Get main content
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('mainContent not found');
        return;
    }
    
    // Remove existing module detail container if exists
    let moduleDetailContainer = document.getElementById('moduleDetailContainer');
    if (moduleDetailContainer) {
        moduleDetailContainer.remove();
    }
    
    // Create module detail container
    moduleDetailContainer = document.createElement('div');
    moduleDetailContainer.id = 'moduleDetailContainer';
    moduleDetailContainer.className = 'module-detail-container';
    moduleDetailContainer.innerHTML = `
        <div class="breadcrumb">
            <a href="#" id="breadcrumb-home">Home</a>
            <span class="breadcrumb-separator">/</span>
            <span>${module.displayName}</span>
        </div>
        <div class="function-hero">
            <h1 class="function-title">${module.displayName}</h1>
            <p class="function-description">${module.description || ''}</p>
        </div>
        <h2 class="section-title">Functions</h2>
        <div id="functionsList" class="functions-grid"></div>
    `;
    
    // Add event listener for breadcrumb
    const breadcrumbHome = moduleDetailContainer.querySelector('#breadcrumb-home');
    if (breadcrumbHome) {
        breadcrumbHome.addEventListener('click', (e) => {
            e.preventDefault();
            window.router.navigate('/');
        });
    }
    
    // Insert after homePage
    const homePage = document.getElementById('homePage');
    if (homePage && homePage.parentNode) {
        homePage.parentNode.insertBefore(moduleDetailContainer, homePage.nextSibling);
    } else {
        mainContent.appendChild(moduleDetailContainer);
    }
    
    const functionsList = document.getElementById('functionsList');
    if (!functionsList) {
        console.error('functionsList element not found');
        return;
    }
    
    console.log(`Rendering functions for module ${moduleName}:`, module.functions);
    
    if (module.functions && module.functions.length > 0) {
        module.functions.forEach(func => {
            const card = document.createElement('div');
            card.className = 'function-card';
            card.innerHTML = `
                <div class="function-header">
                    <div>
                        <h3 class="function-name">${func.name}</h3>
                        <span class="badge badge-module">${module.name}</span>
                    </div>
                </div>
                <p>${func.description || ''}</p>
            `;
            card.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Function card clicked: ${moduleName}/${func.name}`);
                window.router.navigate(`/modules/${moduleName}/${func.name}`);
            });
            functionsList.appendChild(card);
        });
    } else {
        functionsList.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-secondary);">No functions found for this module.</p>';
        console.warn(`Module ${moduleName} has no functions:`, module);
    }
}

async function renderFunctionDetail(moduleName, functionName) {
    console.log('renderFunctionDetail called with:', moduleName, functionName);
    const module = modulesData[moduleName];
    if (!module) {
        console.error('Module not found:', moduleName);
        router.navigate('/');
        return;
    }
    
    console.log('Module found:', module);
    console.log('Looking for function:', functionName);
    console.log('Available functions:', module.functions?.map(f => f.name));
    
    const func = module.functions?.find(f => f.name === functionName);
    if (!func) {
        console.error('Function not found:', functionName, 'in module:', moduleName);
        router.navigate(`/modules/${moduleName}`);
        return;
    }
    
    console.log('Function found:', func);
    currentFunction = func;
    
    // Show functionPage and hide homePage
    showPage('functionPage');
    
    const functionContent = document.getElementById('functionContent');
    if (!functionContent) {
        console.error('functionContent element not found');
        return;
    }
    
    functionContent.innerHTML = `
        <div class="function-detail">
            <div class="breadcrumb">
                <a href="#" id="breadcrumb-home-func">Home</a>
                <span class="breadcrumb-separator">/</span>
                <a href="#" id="breadcrumb-module-func">${module.displayName}</a>
                <span class="breadcrumb-separator">/</span>
                <span>${functionName}</span>
            </div>
            
            <div class="function-hero">
                <div style="display: flex; align-items: start; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <h1 class="function-title">${functionName}</h1>
                        <p class="function-description">${func.description || ''}</p>
                    </div>
                    <span class="badge badge-module" style="align-self: flex-start;">${module.name}</span>
                </div>
                ${func.method && func.endpoint ? `
                    <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--divider);">
                        <span style="font-size: 0.875rem; color: var(--text-muted);">Method:</span>
                        <span class="badge" style="margin-left: var(--space-sm); background: rgba(99, 102, 241, 0.15); color: var(--accent-primary); border: 1px solid rgba(99, 102, 241, 0.3);">${func.method}</span>
                        <span style="font-size: 0.875rem; color: var(--text-muted); margin-left: var(--space-md);">Endpoint:</span>
                        <code style="margin-left: var(--space-sm); padding: var(--space-xs) var(--space-sm); background: var(--bg-elevated); border-radius: 4px; font-size: 0.875rem;">${func.endpoint}</code>
                    </div>
                ` : ''}
            </div>
            
            <div id="functionDetails"></div>
        </div>
    `;
    
    // Add event listeners for breadcrumbs
    const breadcrumbHomeFunc = functionContent.querySelector('#breadcrumb-home-func');
    if (breadcrumbHomeFunc) {
        breadcrumbHomeFunc.addEventListener('click', (e) => {
            e.preventDefault();
            window.router.navigate('/');
        });
    }
    
    const breadcrumbModuleFunc = functionContent.querySelector('#breadcrumb-module-func');
    if (breadcrumbModuleFunc) {
        breadcrumbModuleFunc.addEventListener('click', (e) => {
            e.preventDefault();
            window.router.navigate(`/modules/${moduleName}`);
        });
    }
    
    const detailsContainer = document.getElementById('functionDetails');
    if (!detailsContainer) {
        console.error('functionDetails element not found');
        return;
    }
    
    // Add TDD Info Box at the top of function details
    if (createTDDInfoBox) {
        const existingInfoBox = detailsContainer.querySelector('.tdd-info-box');
        if (!existingInfoBox) {
            const infoBox = createTDDInfoBox();
            // Make it collapsible
            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'tdd-info-toggle';
            collapseBtn.textContent = '📚 Show TDD Phases Info';
            collapseBtn.onclick = () => {
                infoBox.classList.toggle('collapsed');
                collapseBtn.textContent = infoBox.classList.contains('collapsed') 
                    ? '📚 Show TDD Phases Info' 
                    : '📚 Hide TDD Phases Info';
            };
            detailsContainer.appendChild(collapseBtn);
            detailsContainer.appendChild(infoBox);
            // Collapse by default in function detail view
            infoBox.classList.add('collapsed');
        }
    }
    
    // Function signature
    if (func.signature && createFunctionSignature) {
        try {
            detailsContainer.appendChild(createFunctionSignature(func.signature));
        } catch (error) {
            console.error('Error creating function signature:', error);
            const signatureEl = document.createElement('div');
            signatureEl.className = 'code-block';
            signatureEl.innerHTML = `<pre><code>${func.signature}</code></pre>`;
            detailsContainer.appendChild(signatureEl);
        }
    }
    
    // Parameters
    if (func.parameters && func.parameters.length > 0) {
        const paramsSection = document.createElement('div');
        paramsSection.className = 'parameters-section';
        const paramsTitle = document.createElement('h2');
        paramsTitle.className = 'section-title';
        paramsTitle.textContent = 'Parameters';
        paramsSection.appendChild(paramsTitle);
        
        const paramsList = document.createElement('ul');
        paramsList.className = 'paramsList';
        func.parameters.forEach(param => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${param.name}</strong>: <code>${param.type}</code>${param.description ? ` - ${param.description}` : ''}`;
            paramsList.appendChild(li);
        });
        paramsSection.appendChild(paramsList);
        detailsContainer.appendChild(paramsSection);
    }
    
    // Test Scenarios with Phase Tabs
    if (func.testScenarios && func.testScenarios.length > 0) {
        console.log('Rendering test scenarios:', func.testScenarios.length);
        const phases = ['RED', 'GREEN', 'REFACTOR'];
        let activePhase = 'RED';
        
        const titleEl = document.createElement('h2');
        titleEl.className = 'section-title';
        titleEl.textContent = 'Test Scenarios';
        detailsContainer.appendChild(titleEl);
        
        if (createPhaseTabs) {
            try {
                const tabsContainer = createPhaseTabs(phases, activePhase, (phase) => {
                    activePhase = phase;
                    renderTestScenarios(detailsContainer, func.testScenarios, phase);
                });
                detailsContainer.appendChild(tabsContainer);
                
                const scenariosContainer = document.createElement('div');
                scenariosContainer.id = 'scenariosContainer';
                detailsContainer.appendChild(scenariosContainer);
                
                renderTestScenarios(detailsContainer, func.testScenarios, activePhase);
            } catch (error) {
                console.error('Error creating phase tabs:', error);
                // Fallback: show all scenarios
                func.testScenarios.forEach(scenario => {
                    if (createTestCaseCard) {
                        try {
                            detailsContainer.appendChild(createTestCaseCard(scenario, scenario.phase || 'RED'));
                        } catch (e) {
                            console.error('Error creating test case card:', e);
                        }
                    }
                });
            }
        } else {
            console.error('createPhaseTabs not available');
        }
    } else {
        console.warn('No test scenarios found for function:', func.name);
    }
    
    // Todo List
    if (func.todos && func.todos.length > 0 && createTodoList) {
        try {
            detailsContainer.appendChild(createTodoList(func.todos));
        } catch (error) {
            console.error('Error creating todo list:', error);
        }
    }
    
    // BDD Scenarios
    if (func.bddScenarios && func.bddScenarios.length > 0 && createBDDScenarios) {
        try {
            detailsContainer.appendChild(createBDDScenarios(func.bddScenarios));
        } catch (error) {
            console.error('Error creating BDD scenarios:', error);
        }
    }
    
    // Implementation Guide
    if (func.implementationGuide && func.implementationGuide.steps && createImplementationGuide) {
        try {
            detailsContainer.appendChild(createImplementationGuide(func.implementationGuide.steps));
        } catch (error) {
            console.error('Error creating implementation guide:', error);
        }
    }
    
    // Load and display evidence
    import('./components.js').then(({ createEvidenceDisplay }) => {
        if (createEvidenceDisplay) {
            fetch(`/tdd/api/evidence/${moduleName}/${functionName}`)
                .then(res => res.ok ? res.json() : null)
                .then(evidence => {
                    if (evidence) {
                        const evidenceDisplay = createEvidenceDisplay(evidence);
                        // Insert evidence after test scenarios
                        const testScenariosSection = detailsContainer.querySelector('#scenariosContainer');
                        if (testScenariosSection && testScenariosSection.parentNode) {
                            testScenariosSection.parentNode.insertBefore(evidenceDisplay, testScenariosSection.nextSibling);
                        } else {
                            detailsContainer.appendChild(evidenceDisplay);
                        }
                    }
                })
                .catch(err => console.warn('Could not load evidence:', err));
        }
    }).catch(err => console.warn('Could not load evidence component:', err));
    
    // Load and display DOD
    if (func.dod) {
        import('./components.js').then(({ createDODDisplay }) => {
            if (createDODDisplay) {
                const dodDisplay = createDODDisplay(func.dod);
                if (dodDisplay) {
                    detailsContainer.appendChild(dodDisplay);
                }
            }
        }).catch(err => console.warn('Could not load DOD component:', err));
    }
    
    // Add export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-btn';
    exportBtn.innerHTML = '📥 Export Evidence to Excel';
    exportBtn.onclick = () => {
        const url = `/tdd/api/evidence/export?module=${moduleName}`;
        window.open(url, '_blank');
    };
    
    // Insert export button at the top of function details
    const functionHero = functionContent.querySelector('.function-hero');
    if (functionHero && functionHero.parentNode) {
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        exportContainer.appendChild(exportBtn);
        functionHero.parentNode.insertBefore(exportContainer, functionHero.nextSibling);
    }
}

function renderTestScenarios(container, scenarios, phase) {
    let scenariosContainer = document.getElementById('scenariosContainer');
    if (!scenariosContainer) {
        // Create if doesn't exist
        scenariosContainer = document.createElement('div');
        scenariosContainer.id = 'scenariosContainer';
        // Find phase tabs container and insert after it
        const phaseTabs = container.querySelector('.phase-tabs');
        if (phaseTabs && phaseTabs.parentNode) {
            phaseTabs.parentNode.insertBefore(scenariosContainer, phaseTabs.nextSibling);
        } else {
            container.appendChild(scenariosContainer);
        }
    }
    
    scenariosContainer.innerHTML = '';
    
    if (!scenarios || scenarios.length === 0) {
        scenariosContainer.innerHTML = '<p>No test scenarios available.</p>';
        return;
    }
    
    const filteredScenarios = scenarios.filter(s => s.phase === phase);
    console.log(`Rendering ${filteredScenarios.length} scenarios for phase ${phase}`);
    
    if (filteredScenarios.length === 0) {
        scenariosContainer.innerHTML = `<p>No test scenarios for ${phase} phase.</p>`;
        return;
    }
    
    filteredScenarios.forEach(scenario => {
        try {
            if (createTestCaseCard) {
                scenariosContainer.appendChild(createTestCaseCard(scenario, phase));
            } else {
                console.error('createTestCaseCard not available');
                // Fallback: create simple card
                const card = document.createElement('div');
                card.className = 'test-scenario';
                card.innerHTML = `
                    <h3>${scenario.name}</h3>
                    <p>${scenario.description || ''}</p>
                    ${scenario.testCode ? `<pre><code>${scenario.testCode}</code></pre>` : ''}
                `;
                scenariosContainer.appendChild(card);
            }
        } catch (error) {
            console.error('Error creating test case card:', error, scenario);
        }
    });
}

function updateStats() {
    let totalFunctions = 0;
    let totalTests = 0;
    
    Object.values(modulesData).forEach(module => {
        if (module.functions) {
            totalFunctions += module.functions.length;
            module.functions.forEach(func => {
                if (func.testScenarios) {
                    totalTests += func.testScenarios.length;
                }
            });
        }
    });
    
    document.getElementById('totalFunctions').textContent = totalFunctions;
    document.getElementById('totalModules').textContent = Object.keys(modulesData).length;
    document.getElementById('totalTests').textContent = totalTests;
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterModules(query);
        });
    }
}

function filterModules(query) {
    const items = document.querySelectorAll('.module-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
    });
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadModules);
} else {
    loadModules();
}

