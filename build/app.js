import { decisionView } from './decision-views.js';
import { mountDecisionWorkspace } from './decision-workspace.js';
import { pruneDecisions } from './decision-engine.js';
import { initializeAppearance } from './theme.js';
import { bindPropertyPicker } from './property-picker.js';
import { mountAssistant } from './assistant-widget.js';
import { seedProperties } from './data.js';
import { defaultFilters, defaultAssumptions, calculate, validateAssumptions, filterProperties, toCSV, amortization } from './finance.js';
import { loadWorkspace, saveWorkspace, freshWorkspace, parseWorkspace, validProperty } from './storage.js';
import { escapeHTML as e, signedMoney, icon, toast, downloadFile, uid, bindImageFallbacks } from './ui.js';
import { shell, allProperties, browseView, compareView, detailView, propertyForm, findProperty, browseSource, propertyResults, propertyCard, resultsPagination, PAGE_SIZE, modelAssumptionsRows } from './views.js';
import { calculatorView, calculatorResults } from './calculator.js';
import { bindCardMotion, revealedCards, pageMotion, dialogMotion, trayMotion, favoriteMotion, filterMotion, motionAllowed } from './motion.js';
initializeAppearance();
const initial = loadWorkspace();
const pages = ['discover', 'saved', 'compare', 'calculator', 'custom', 'decision'];
const initialPage = location.hash.slice(1);
const state = {
    page: pages.includes(initialPage) ? initialPage : 'discover',
    filters: { ...defaultFilters }, sort: 'featured', layout: 'grid', moreFilters: false, visibleCount: PAGE_SIZE,
    calculatorPropertyId: seedProperties[0].id, assumptions: defaultAssumptions(seedProperties[0]),
    workspace: initial.workspace, storageAvailable: initial.available, storageNotice: initial.notice,
    scenarioName: '', decisionTab: 'life', decisionStress: 'baseline'
};
let decisionWorkspace = null;
let assistant = null;
let pendingImport = null;
let pendingDeleteId = '';
let detailId = '';
let calculatorValid = true;
let lastFocus = null;
function normalizeWorkspace(w) {
    const ids = new Set([...seedProperties, ...w.customProperties].map(p => p.id));
    return {
        ...w, decisions: pruneDecisions(w.decisions, ids), savedIds: w.savedIds.filter(id => ids.has(id)), compareIds: w.compareIds.filter(id => ids.has(id)).slice(0, 3),
        scenarios: w.scenarios.filter(s => ids.has(s.propertyId)),
        notes: Object.fromEntries(Object.entries(w.notes).filter(([id]) => ids.has(id)))
    };
}
state.workspace = normalizeWorkspace(state.workspace);
function render(intent = 'update') {
    const keep = intent === 'update' ? revealedCards() : new Set();
    const hadTray = !!document.querySelector('.compare-tray');
    if (intent === 'page' || intent === 'results')
        state.visibleCount = PAGE_SIZE;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Restore only controls that existed in the old app, never steal dialog focus.
    const focusKey = active?.closest('#app') ? {
        id: active.id, action: active.dataset.action, value: active.dataset.id,
        type: active.dataset.type, layout: active.dataset.layout, filter: active.dataset.filter
    } : null;
    calculatorValid = validateAssumptions(state.assumptions).length === 0;
    const view = state.page === 'decision' ? decisionView(state, allProperties(state)) : state.page === 'compare' ? compareView(state) : state.page === 'calculator' ? calculatorView(state) : browseView(state);
    document.getElementById('app').innerHTML = shell(state, view);
    document.body.classList.toggle('has-tray', state.workspace.compareIds.length > 0 && ['discover', 'saved', 'custom'].includes(state.page));
    bindImageFallbacks();
    bindPropertyPicker(allProperties(state), findProperty(state, state.page === 'decision' ? state.workspace.decisions.currentPropertyId : state.calculatorPropertyId), id => state.page === 'decision' ? decisionWorkspace?.select(id) : analyze(id));
    assistant?.refresh();
    updateMobileNavigation();
    bindCardMotion(keep);
    if (intent === 'page')
        pageMotion();
    if (!hadTray)
        trayMotion();
    if (focusKey && intent !== 'page') {
        const replacement = focusKey.id ? document.getElementById(focusKey.id) : [...document.querySelectorAll('#app [data-action], #app [data-filter]')].find(el => el.dataset.action === focusKey.action && el.dataset.id === focusKey.value && el.dataset.type === focusKey.type && el.dataset.layout === focusKey.layout && el.dataset.filter === focusKey.filter);
        replacement?.focus({ preventScroll: true });
    }
    document.title = `Haven · ${state.page === 'decision' ? 'Your home decision' : state.page === 'calculator' ? 'Deal calculator' : state.page === 'saved' ? 'Saved homes' : state.page === 'compare' ? 'Compare properties' : state.page === 'custom' ? 'My properties' : 'Good places. Better possibilities.'}`;
}
function updateMobileNavigation() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar)
        sidebar.inert = window.innerWidth <= 780 && !document.body.classList.contains('menu-open');
}
function updateResults() {
    state.visibleCount = PAGE_SIZE;
    const el = document.getElementById('property-results');
    if (!el) {
        render();
        return;
    }
    el.innerHTML = propertyResults(state);
    const summary = document.getElementById('result-summary');
    const count = filterProperties(browseSource(state), state.filters, state.sort).length;
    if (summary)
        summary.innerHTML = `${count} ${count === 1 ? 'property' : 'properties'}<span> · ${state.page === 'custom' ? 'Your own property data' : 'Fictional listings for exploring the app'}</span>`;
    bindImageFallbacks();
    bindCardMotion();
}
function commit(message) {
    state.storageAvailable = saveWorkspace(state.workspace);
    if (!state.storageAvailable) {
        state.storageNotice = 'Browser storage is unavailable or full. Changes last for this session only; export a backup to keep them.';
        toast((message ? message + ' ' : '') + 'Session only — export a backup to keep your changes.', true);
    }
    else {
        if (state.storageNotice.includes('storage is unavailable'))
            state.storageNotice = '';
        if (message)
            toast(message);
    }
}
function navigate(page) {
    if (!pages.includes(page))
        return;
    if (page !== state.page && page !== 'calculator')
        state.filters = { ...defaultFilters };
    state.page = page;
    closeDialog();
    document.body.classList.remove('menu-open');
    if (location.hash !== '#' + page)
        history.pushState(null, '', '#' + page);
    render('page');
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
}
function analyze(id) {
    const p = findProperty(state, id);
    if (!p)
        return;
    state.calculatorPropertyId = id;
    state.assumptions = defaultAssumptions(p);
    calculatorValid = true;
    state.scenarioName = '';
    navigate('calculator');
}
function openDialog(content, className = '') {
    closeDialog();
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = document.getElementById('dialog-host');
    host.innerHTML = `<dialog class="modal ${className}" aria-labelledby="dialog-title"><button class="modal-close icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('x')}</button>${content}</dialog>`;
    const dialog = host.querySelector('dialog');
    dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); if (lastFocus?.isConnected)
        lastFocus.focus(); });
    dialog.addEventListener('click', ev => {
        if (ev.target !== dialog)
            return;
        const rect = dialog.getBoundingClientRect();
        if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom)
            closeDialog();
    });
    dialog.showModal();
    document.body.classList.add('dialog-open');
    bindImageFallbacks();
    dialogMotion(dialog);
    const input = dialog.querySelector('input:not([type="checkbox"])');
    if (input)
        input.focus({ preventScroll: true });
}
function closeDialog() {
    const dialog = document.querySelector('#dialog-host dialog');
    if (dialog?.open)
        dialog.close();
    document.body.classList.remove('dialog-open');
}
function showDetails(id) {
    const p = findProperty(state, id);
    if (!p)
        return;
    detailId = id;
    openDialog(detailView(p, state), 'detail-modal');
}
function aboutDialog() {
    openDialog(`<div class="modal-heading"><span class="eyebrow">MEET HAVEN</span><h2 id="dialog-title">A little more perspective.</h2><p>A local-first property workspace, built to explore the whole decision — not just the asking price.</p></div><div class="about-sections"><section><h3>A real app. A sample world.</h3><p>The ${seedProperties.length} starter properties span ${new Set(seedProperties.map(p => p.city)).size} cities. Their addresses, neighborhood labels, prices, rents, and costs are fictional fixtures. City names provide context only. Artwork and optional photography are illustrative. There is no live listing feed, valuation model, authentication, or connected bank account.</p></section><section><h3>Open assumptions. No mystery scores.</h3><p>Listing cards and comparisons use 20% down, 6.5% sample interest, 30 years, 5% vacancy, 5% maintenance, 8% management, 3% capital reserves, and 3% closing costs. Initial repairs and mortgage insurance start at zero. Taxes, property insurance, HOA, and rent come from each entry.</p><p><strong>NOI</strong> is rent after vacancy, less operating expenses. It excludes financing and capital reserves. <strong>Cap rate</strong> is annual NOI divided by purchase price. <strong>Cash flow</strong> also subtracts mortgage principal and interest, mortgage insurance, and capital reserves. <strong>Cash-on-cash return</strong> divides annual cash flow by the down payment, closing costs, and initial repairs.</p></section><section><h3>One browser. Your workspace.</h3><p>Saved properties, comparisons, custom entries, notes, searches, and saved scenarios stay in browser storage. Nothing is synced to an account. Private browsing, clearing storage, or using a different URL may remove or separate saved data. Export a backup for portability.</p></section><section><h3>A little help finding home</h3><p>Ask Haven is available from every page. Its local demo matcher asks about city, purchase budget, property type, and must-haves, then explains matches from the 60 fictional starter homes. It is not a live AI model in local mode. An optional server-side AI connection can be enabled through the chat disclosure when configured. Unverified features stay labeled unverified; chat clears on refresh, while saved homes remain in your workspace.</p><p>The calculator property picker supports typing, live suggestions, and keyboard navigation. It searches both demo and custom properties; your scenario changes only after you choose a property.</p></section><section><h3>A place for the whole decision</h3><p>Your Life Here models a household budget and ownership costs, with explicit sample assumptions and one-at-a-time stress tests. Together uses local participant profiles, not secure accounts or online collaboration. Before You Tour tracks unknowns, answers, sources, and visit notes. Budgets are not shown in Together unless you explicitly share a calculated summary. Anyone with this browser or a full workspace backup can access all profiles.</p><p>Live AI remains optional and is not activated. New decision-workspace data is not added to AI requests. No real listing feed, bank connection, invitation, or booking service is provided.</p></section><section><h3>The edges of the model</h3><p>The calculator assumes a fixed-rate, fully amortizing loan. It does not model tax benefits, appreciation, rent growth, selling costs, variable rates, financing eligibility, zoning, or lender-specific rules. It is educational software, not financial advice.</p></section><label class="photo-toggle"><input type="checkbox" id="use-photos" ${document.documentElement.dataset.photos === 'true' ? 'checked' : ''}><span>Use illustrative photography<small>Optional Unsplash images need an internet connection. Loading them contacts the image provider; property inputs are not sent. Original artwork remains the offline fallback.</small></span></label></div><div class="modal-actions"><button class="btn" data-action="workspace">Manage workspace</button><button class="btn primary" data-action="close-dialog">Back to exploring ${icon('arrow')}</button></div>`, 'info-modal');
}
function workspaceDialog() {
    openDialog(`<div class="modal-heading"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2 id="dialog-title">Your workspace.</h2><p>${state.storageAvailable ? 'Your changes are stored in this browser. A backup lets you take them with you.' : 'Browser storage is unavailable. Export a backup before closing this page.'}</p></div><div class="workspace-stats"><div><strong>${state.workspace.savedIds.length}</strong><span>saved homes</span></div><div><strong>${state.workspace.customProperties.length}</strong><span>your properties</span></div><div><strong>${state.workspace.scenarios.length}</strong><span>scenarios</span></div></div><div class="workspace-options"><button data-action="export-backup">${icon('download')}<span><strong>Export a backup</strong><small>Download your workspace as a JSON file.</small></span>${icon('chevron')}</button><button data-action="import-backup">${icon('upload')}<span><strong>Import a backup</strong><small>Restore a Haven file. Review it before replacing anything.</small></span>${icon('chevron')}</button><button data-action="reset-workspace" class="danger">${icon('reset')}<span><strong>Start fresh</strong><small>Clear this workspace, leaving the sample listings intact.</small></span>${icon('chevron')}</button></div><p class="small-print">A full backup includes every local profile’s household budget, priorities, reviews, life scenarios, tour answers, custom properties, saved homes, notes, searches, and investment scenarios. Treat it as sensitive. Tour brief exports omit household budgets. Unsaved investment calculator edits are not included.</p>`, 'info-modal');
}
function updateCalculator() {
    const next = { ...state.assumptions };
    document.querySelectorAll('[data-calc]').forEach(input => {
        next[input.dataset.calc] = input.value.trim() ? Number(input.value) : NaN;
    });
    const errors = validateAssumptions(next);
    calculatorValid = errors.length === 0;
    document.querySelectorAll('[data-calc]').forEach(input => input.setAttribute('aria-invalid', String(!input.validity.valid)));
    const errorHost = document.getElementById('calc-error');
    errorHost.hidden = !errors.length;
    errorHost.textContent = errors.length ? errors[0] + ' Results below still show your last valid inputs.' : '';
    document.querySelectorAll('[data-requires-valid]').forEach(button => button.disabled = !calculatorValid);
    document.getElementById('calc-results').classList.toggle('results-stale', !calculatorValid);
    if (!calculatorValid)
        return;
    state.assumptions = next;
    document.getElementById('calc-results').innerHTML = calculatorResults(next);
}
function exportReport() {
    if (!calculatorValid)
        return toast('Correct the highlighted assumptions before exporting.', true);
    const a = state.assumptions, m = calculate(a), p = findProperty(state, state.calculatorPropertyId);
    const rows = [
        ['HAVEN — PROPERTY SCENARIO REPORT'], ['Property', p.name], ['City', p.city], ['Data', p.custom ? 'User-supplied inputs; not verified' : 'Fictional sample property'],
        ['Generated', new Date().toISOString()], ['Disclaimer', 'Illustrative fixed-rate model; not financial advice. No tax benefits, appreciation, rent growth, or selling costs.'], [],
        ['ASSUMPTIONS', 'VALUE'], ...modelAssumptionsRows(a), [], ['RESULTS', 'VALUE'],
        ['Loan amount ($)', m.loan], ['Mortgage principal and interest ($/month)', m.mortgage], ['Rent after vacancy ($/month)', m.effectiveRent],
        ['Operating expenses ($/month)', m.operatingExpenses], ['NOI ($/year; excludes debt and capital reserves)', m.noiMonthly * 12],
        ['Capital reserve ($/month)', m.capex], ['Cash flow ($/month)', m.cashflow], ['Cash flow ($/year)', m.cashflow * 12],
        ['Cap rate (%)', m.capRate], ['Initial cash invested ($)', m.cashInvested], ['Cash-on-cash return (%)', m.cashOnCash ?? 'N/A'], [],
        ['AMORTIZATION', 'Principal ($)', 'Interest ($)', 'Ending balance ($)'], ...amortization(a).map(row => [row.year, row.principal, row.interest, row.balance]), [],
        ['RENT / RATE SENSITIVITY', 'Monthly rent ($)', 'Interest (%)', 'Monthly cash flow ($)']
    ];
    [Math.max(0, a.interestRate - 1), a.interestRate, Math.min(30, a.interestRate + 1)].forEach(rate => [a.rent * .9, a.rent, Math.min(1_000_000, a.rent * 1.1)].forEach(rent => rows.push(['Scenario', rent, rate, calculate({ ...a, rent, interestRate: rate }).cashflow])));
    downloadFile(`haven-scenario-${p.id}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    toast('Your scenario report is ready.');
}
function exportComparison() {
    const properties = state.workspace.compareIds.map(id => findProperty(state, id)).filter((p) => !!p);
    const rows = [
        ['HAVEN — PROPERTY COMPARISON'], ['Disclaimer', 'Fictional sample or user-entered properties. Illustrative model, not financial advice.'],
        ['Shared assumptions', '20% down; 6.5% sample interest; 30 years; 5% vacancy; 5% maintenance; 8% management of collected rent; 3% capex; 3% closing; no repairs or PMI.'], [],
        ['Property', 'City', 'Type', 'Price ($)', 'Beds', 'Baths', 'Square feet', 'Gross rent ($/month)', 'Tax ($/year)', 'Insurance ($/month)', 'HOA ($/month)', 'NOI ($/year)', 'Principal & interest ($/month)', 'Capital reserves ($/month)', 'Cash flow ($/month)', 'Cap rate (%)', 'Cash invested ($)', 'Cash-on-cash (%)'],
        ...properties.map(p => { const m = calculate(defaultAssumptions(p)); return [p.name, p.city, p.type, p.price, p.beds, p.baths, p.sqft, p.rent, p.taxAnnual, p.insuranceMonthly, p.hoaMonthly, m.noiMonthly * 12, m.mortgage, m.capex, m.cashflow, m.capRate, m.cashInvested, m.cashOnCash ?? 'N/A']; })
    ];
    downloadFile('haven-property-comparison.csv', toCSV(rows), 'text/csv;charset=utf-8');
    toast('Your comparison is ready.');
}
const actions = {
    navigate: b => navigate(b.dataset.page),
    discover: () => navigate('discover'),
    menu: () => { document.body.classList.toggle('menu-open'); updateMobileNavigation(); document.querySelector('.sidebar .nav-item')?.focus(); },
    'close-menu': () => { document.body.classList.remove('menu-open'); updateMobileNavigation(); document.querySelector('.mobile-menu')?.focus(); },
    'close-dialog': () => closeDialog(),
    about: () => aboutDialog(),
    workspace: () => workspaceDialog(),
    details: b => showDetails(b.dataset.id),
    analyze: b => analyze(b.dataset.id),
    'add-property': () => {
        if (state.workspace.customProperties.length >= 500)
            return toast('This workspace supports up to 500 custom properties.', true);
        openDialog(propertyForm(), 'form-modal');
    },
    'edit-property': b => { const p = findProperty(state, b.dataset.id); if (p?.custom)
        openDialog(propertyForm(p), 'form-modal'); },
    'delete-property': b => {
        const p = findProperty(state, b.dataset.id);
        if (!p?.custom)
            return;
        pendingDeleteId = p.id;
        openDialog(`<div class="modal-heading"><span class="eyebrow">A SMALL CHECK FIRST</span><h2 id="dialog-title">Remove ${e(p.name)}?</h2><p>This also removes its notes, saved scenarios, and place in your shortlist. This cannot be undone.</p></div><div class="modal-actions"><button class="btn" data-action="close-dialog">Keep property</button><button class="btn danger-fill" data-action="confirm-delete">Remove property</button></div>`);
    },
    'confirm-delete': () => {
        const id = pendingDeleteId;
        if (!state.workspace.customProperties.some(p => p.id === id))
            return;
        state.workspace.customProperties = state.workspace.customProperties.filter(p => p.id !== id);
        state.workspace = normalizeWorkspace(state.workspace);
        if (state.calculatorPropertyId === id) {
            state.calculatorPropertyId = seedProperties[0].id;
            state.assumptions = defaultAssumptions(seedProperties[0]);
        }
        closeDialog();
        commit('Property removed.');
        render();
    },
    'save-toggle': b => {
        const id = b.dataset.id;
        if (!findProperty(state, id))
            return;
        const present = state.workspace.savedIds.includes(id);
        state.workspace.savedIds = present ? state.workspace.savedIds.filter(x => x !== id) : [...state.workspace.savedIds, id];
        commit(present ? 'Removed from your saved homes.' : 'A good find, saved for later.');
        render();
        favoriteMotion(id);
        const dialog = document.querySelector('#dialog-host dialog[open]');
        if (dialog && detailId === id) {
            const button = dialog.querySelector('[data-action="save-toggle"]');
            if (button) {
                button.innerHTML = icon('heart') + (present ? 'Save property' : 'Saved');
                button.classList.toggle('is-on', !present);
            }
        }
    },
    'compare-toggle': b => {
        const id = b.dataset.id;
        if (!findProperty(state, id))
            return;
        if (state.workspace.compareIds.includes(id))
            state.workspace.compareIds = state.workspace.compareIds.filter(x => x !== id);
        else {
            if (state.workspace.compareIds.length >= 3)
                return toast('Three makes a good comparison. Remove one property to add another.', true);
            state.workspace.compareIds.push(id);
        }
        commit();
        render();
    },
    'clear-compare': () => { state.workspace.compareIds = []; commit(); render(); },
    'clear-filters': () => { state.filters = { ...defaultFilters }; render('results'); },
    'more-filters': () => { state.moreFilters = !state.moreFilters; render(); if (state.moreFilters)
        filterMotion(); },
    'type-filter': b => { state.filters.type = b.dataset.type; render('results'); },
    layout: b => { state.layout = b.dataset.layout; render(); },
    'load-more': () => {
        const grid = document.querySelector('.property-grid');
        if (!grid)
            return;
        const result = filterProperties(browseSource(state), state.filters, state.sort);
        const previousCount = Math.min(state.visibleCount, result.length);
        const keep = revealedCards();
        state.visibleCount = Math.min(state.visibleCount + PAGE_SIZE, result.length);
        grid.insertAdjacentHTML('beforeend', result.slice(previousCount, state.visibleCount).map(p => propertyCard(p, state)).join(''));
        document.getElementById('results-pagination')?.remove();
        grid.insertAdjacentHTML('afterend', resultsPagination(state));
        bindImageFallbacks();
        bindCardMotion(keep);
        // Focus the first newly added home rather than jumping to the new footer.
        const first = grid.children[previousCount]?.querySelector('.property-title');
        first?.focus({ preventScroll: true });
        grid.children[previousCount]?.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'instant', block: 'start' });
    },
    'save-note': b => {
        const id = b.dataset.id, input = document.querySelector('#property-notes');
        if (!input || !findProperty(state, id))
            return;
        if (input.value.length > 10000)
            return toast('Keep your note under 10,000 characters.', true);
        if (input.value.trim())
            state.workspace.notes[id] = input.value;
        else
            delete state.workspace.notes[id];
        commit('Your note is saved.');
    },
    'save-search': () => {
        if (state.workspace.searches.length >= 50)
            return toast('You can keep up to 50 saved searches. Remove one to make room.', true);
        const name = state.filters.query || [state.filters.city, state.filters.type].filter(Boolean).join(' · ') || 'My property search';
        openDialog(`<form id="search-form"><div class="modal-heading"><span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2 id="dialog-title">Keep this search close.</h2><p>Your current filters will be saved as a shortcut across the full workspace.</p></div><label class="form-field"><span>Search name</span><input name="name" required maxlength="100" value="${e(name.slice(0, 100))}"></label><div class="modal-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button class="btn primary" type="submit">Save search ${icon('check')}</button></div></form>`);
    },
    'load-search': b => { const search = state.workspace.searches.find(x => x.id === b.dataset.id); if (!search)
        return; state.filters = { ...search.filters }; state.page = 'discover'; history.pushState(null, '', '#discover'); render('results'); document.getElementById('explore')?.scrollIntoView({ block: 'start' }); },
    'delete-search': b => { state.workspace.searches = state.workspace.searches.filter(x => x.id !== b.dataset.id); commit('Search removed.'); render(); },
    'reset-calculator': () => { state.assumptions = defaultAssumptions(findProperty(state, state.calculatorPropertyId)); calculatorValid = true; render(); toast('Back to the property’s sample assumptions.'); },
    shortcut: b => {
        if (b.dataset.kind === 'cash')
            state.assumptions = { ...state.assumptions, downPercent: 100, mortgageInsuranceMonthly: 0 };
        if (b.dataset.kind === 'standard')
            state.assumptions = { ...state.assumptions, downPercent: 20 };
        if (b.dataset.kind === 'self')
            state.assumptions = { ...state.assumptions, managementPercent: 0 };
        calculatorValid = true;
        render();
    },
    'save-scenario': () => {
        if (!calculatorValid)
            return toast('Enter valid assumptions before saving.', true);
        if (state.workspace.scenarios.length >= 100)
            return toast('You can save up to 100 scenarios. Remove one to make room.', true);
        const p = findProperty(state, state.calculatorPropertyId);
        const name = `${p.name} · ${state.assumptions.downPercent}% down`;
        openDialog(`<form id="scenario-form"><div class="modal-heading"><span class="eyebrow">MAKE ROOM FOR A WHAT-IF</span><h2 id="dialog-title">Keep this perspective.</h2><p>Save a snapshot of every input, so you can return to this exact scenario.</p></div><label class="form-field"><span>Scenario name</span><input name="name" required maxlength="100" value="${e(name.slice(0, 100))}"></label><div class="scenario-preview"><span>Modelled monthly cash flow</span><strong>${signedMoney(calculate(state.assumptions).cashflow)}</strong></div><div class="modal-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn primary">Save scenario ${icon('check')}</button></div></form>`);
    },
    'load-scenario': b => { const scenario = state.workspace.scenarios.find(x => x.id === b.dataset.id); if (!scenario)
        return; state.calculatorPropertyId = scenario.propertyId; state.assumptions = { ...scenario.assumptions }; state.scenarioName = scenario.name; calculatorValid = true; render(); toast(`Loaded “${scenario.name}”.`); window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'instant' }); },
    'delete-scenario': b => { state.workspace.scenarios = state.workspace.scenarios.filter(x => x.id !== b.dataset.id); commit('Scenario removed.'); render(); },
    'export-report': () => exportReport(),
    'export-comparison': () => exportComparison(),
    'export-backup': () => { downloadFile('haven-workspace-backup.json', JSON.stringify(state.workspace, null, 2), 'application/json'); toast('Your workspace backup is ready.'); },
    'import-backup': () => document.getElementById('backup-input').click(),
    'confirm-import': () => {
        if (!pendingImport)
            return;
        state.workspace = normalizeWorkspace(pendingImport);
        pendingImport = null;
        state.decisionTab = 'life';
        state.decisionStress = 'baseline';
        state.calculatorPropertyId = seedProperties[0].id;
        state.assumptions = defaultAssumptions(seedProperties[0]);
        calculatorValid = true;
        closeDialog();
        commit('Your workspace has been restored.');
        render();
    },
    'reset-workspace': () => openDialog(`<div class="modal-heading"><span class="eyebrow">A FRESH START</span><h2 id="dialog-title">Clear your workspace?</h2><p>All local profiles, budgets, priorities, reviews, tour answers, life scenarios, saved homes, comparisons, notes, custom properties, searches, and investment scenarios will be removed. The fictional starter listings will stay. Export a backup first to keep a copy.</p></div><div class="modal-actions"><button class="btn" data-action="export-backup">Export backup</button><button class="btn" data-action="close-dialog">Cancel</button><button class="btn danger-fill" data-action="confirm-reset">Clear workspace</button></div>`),
    'confirm-reset': () => { state.workspace = freshWorkspace(); state.decisionTab = 'life'; state.decisionStress = 'baseline'; state.assumptions = defaultAssumptions(seedProperties[0]); state.calculatorPropertyId = seedProperties[0].id; state.filters = { ...defaultFilters }; calculatorValid = true; commit('A fresh start. Your sample properties are ready.'); navigate('discover'); }
};
document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target || target instanceof HTMLButtonElement && target.disabled)
        return;
    const action = actions[target.dataset.action];
    if (action) {
        event.preventDefault();
        action(target);
    }
});
document.addEventListener('input', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement))
        return;
    if (input.id === 'property-search') {
        state.filters.query = input.value;
        updateResults();
    }
    if (input.dataset.calc)
        updateCalculator();
});
document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement))
        return;
    if (input.dataset.filter) {
        const key = input.dataset.filter;
        if (key === 'city')
            state.filters.city = input.value;
        if (key === 'maxPrice' || key === 'minBeds' || key === 'minSqft')
            state.filters[key] = Number(input.value);
        if (key === 'positiveOnly' && input instanceof HTMLInputElement)
            state.filters.positiveOnly = input.checked;
        render('results');
    }
    if (input.id === 'sort-select') {
        state.sort = input.value;
        updateResults();
    }
    if (input.id === 'use-photos' && input instanceof HTMLInputElement) {
        document.documentElement.dataset.photos = String(input.checked);
        render();
    }
});
document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement))
        return;
    if (!['property-form', 'search-form', 'scenario-form'].includes(form.id))
        return;
    event.preventDefault();
    if (!form.reportValidity())
        return;
    const data = new FormData(form);
    const str = (name) => String(data.get(name) || '').trim();
    const num = (name) => Number(data.get(name));
    if (form.id === 'property-form') {
        const existing = findProperty(state, form.dataset.id || '');
        const p = {
            id: existing?.id || 'custom-' + uid(), name: str('name'), address: str('address'), city: str('city'), state: str('state').toUpperCase(), neighborhood: str('neighborhood') || 'Your listing',
            type: str('type'), price: num('price'), beds: num('beds'), baths: num('baths'), sqft: num('sqft'), rent: num('rent'),
            taxAnnual: num('taxAnnual'), insuranceMonthly: num('insuranceMonthly'), hoaMonthly: num('hoaMonthly'), yearBuilt: num('yearBuilt'),
            description: str('description') || 'Your own property entry. Adjust the assumptions in the calculator to explore its potential.',
            tags: existing?.tags || ['Your own inputs', 'Room to explore'], photo: existing?.photo || '', art: existing?.art ?? state.workspace.customProperties.length % 12,
            addedAt: existing?.addedAt || Date.now(), custom: true
        };
        if (!p.name || !p.address || !p.city || !/^[A-Z]{2}$/.test(p.state) || !validProperty(p)) {
            document.getElementById('property-form-error').textContent = 'Check your property details. Name, address, city, state, and valid numbers are required.';
            return;
        }
        if (existing)
            state.workspace.customProperties = state.workspace.customProperties.map(x => x.id === p.id ? p : x);
        else
            state.workspace.customProperties.unshift(p);
        state.filters = { ...defaultFilters };
        closeDialog();
        commit(existing ? 'Your property is updated.' : 'A new possibility, added to your workspace.');
        render();
    }
    if (form.id === 'search-form') {
        if (!str('name'))
            return toast('Give your search a name.', true);
        state.workspace.searches.push({ id: uid(), name: str('name'), filters: { ...state.filters } });
        closeDialog();
        commit('Your search is saved.');
        render();
    }
    if (form.id === 'scenario-form') {
        if (!str('name'))
            return toast('Give your scenario a name.', true);
        state.workspace.scenarios.push({ id: uid(), name: str('name'), propertyId: state.calculatorPropertyId, assumptions: { ...state.assumptions }, savedAt: Date.now() });
        closeDialog();
        commit('This perspective is saved.');
        render();
    }
});
document.getElementById('backup-input').addEventListener('change', async (event) => {
    const input = event.target, file = input.files?.[0];
    input.value = '';
    if (!file)
        return;
    if (file.size > 3_000_000)
        return toast('Choose a workspace backup smaller than 3 MB.', true);
    try {
        pendingImport = parseWorkspace(await file.text());
        openDialog(`<div class="modal-heading"><span class="eyebrow">WELCOME BACK</span><h2 id="dialog-title">Restore this workspace?</h2><p>This backup has ${pendingImport.customProperties.length} custom properties, ${pendingImport.savedIds.length} saved homes, and ${pendingImport.scenarios.length} saved scenarios.</p><p><strong>Importing replaces your current workspace.</strong> Export your current workspace first to keep both.</p></div><div class="modal-actions"><button class="btn" data-action="export-backup">Back up current</button><button class="btn" data-action="close-dialog">Cancel</button><button class="btn primary" data-action="confirm-import">Restore backup ${icon('arrow')}</button></div>`);
    }
    catch (error) {
        pendingImport = null;
        toast(error instanceof Error ? error.message : 'This backup could not be read.', true);
    }
});
window.addEventListener('resize', updateMobileNavigation);
document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('menu-open') || document.querySelector('dialog[open]'))
        return;
    if (event.key === 'Escape') {
        document.body.classList.remove('menu-open');
        updateMobileNavigation();
        document.querySelector('.mobile-menu')?.focus();
    }
    if (event.key === 'Tab') {
        const buttons = [...document.querySelectorAll('.sidebar button')];
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    }
});
window.addEventListener('popstate', () => { const page = location.hash.slice(1); if (pages.includes(page) && page !== state.page) {
    state.page = page;
    state.filters = { ...defaultFilters };
    closeDialog();
    render('page');
} });
decisionWorkspace = mountDecisionWorkspace({ state, properties: () => allProperties(state), render: () => render(), commit, navigate, openDialog, closeDialog });
render('page');
assistant = mountAssistant({ properties: seedProperties, isSaved: id => state.workspace.savedIds.includes(id), details: showDetails, analyze, explore: id => decisionWorkspace?.open(id), save: id => { const button = document.createElement('button'); button.dataset.id = id; actions['save-toggle'](button); } });
