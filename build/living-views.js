import { calculateLiving, estimateCommute, UTILITY_MODEL, COMMUTE_MODEL, workAnchors } from './living-engine.js';
import { preciseMoney, costHelp } from './cost-controls.js';
import { escapeHTML as e, money, number, icon } from './ui.js';
const badge = (label = 'ESTIMATE') => `<span class="cost-badge">${label}</span>`;
const amount = (id, value) => `<strong id="${id}" data-value="${value}">${preciseMoney(value)}</strong>`;
const line = (label, value, id = '') => `<div class="living-line"><span>${label}</span>${id ? amount(id, value) : `<strong>${preciseMoney(value)}</strong>`}</div>`;
const help = (id, label, copy) => costHelp(id, label, copy).replace('Why this default:', 'How this estimate works:');
export function utilityExplanation(p, w) {
    const u = calculateLiving(p, w).utilities;
    return `${money(u.formulaMonthly)}/month — illustrative allowance for ${number(p.sqft)} sq ft, built ${p.yearBuilt}. ` +
        `Formula: $${UTILITY_MODEL.base} + ($${UTILITY_MODEL.perSqft.toFixed(2)} × ${number(p.sqft)} sq ft × ${u.factor.toFixed(3)}) = ${money(u.formulaMonthly)}/month, rounded to whole dollars. ` +
        `Age multiplier = 1 + ${UTILITY_MODEL.agePerYear} × min(max(${UTILITY_MODEL.referenceYear} − year built, 0), ${UTILITY_MODEL.ageCap}). This home uses ${u.ageUsed} years. ` +
        `The base, size rate, age multiplier and ${UTILITY_MODEL.referenceYear} reference year are chosen demo assumptions, not measured utility rates or efficiency data. ` +
        `${u.futureYear ? 'Future construction year: age is treated as zero. ' : ''}` +
        `Combined energy/water allowance; internet, local fees, climate, occupancy and renovations are not modeled. ` +
        (u.manual ? `Your entered ${preciseMoney(u.monthly)}/month replaces this formula; it is not added to it.` : 'Edit the amount when you have your own estimate.');
}
export function livingSummary(p, w) {
    const m = calculateLiving(p, w), a = m.assumptions, c = m.metrics;
    const pmi = c.loan > 0 ? a.mortgageInsuranceMonthly : 0;
    return `<div class="living-outcomes"><div class="living-primary"><span>Living here · no rental income</span>${amount('living-monthly-total', m.ownerMonthly)}<small>estimated per month, including utilities & reserves</small></div>
    <div class="living-rental"><span>Rental scenario · owner pays utilities</span>${amount('living-rental-adjusted', m.rentalAfterUtilities)}<small>${m.rentalAfterUtilities < 0 ? 'estimated monthly shortfall' : 'estimated monthly cash remaining'}</small></div></div>
    <div class="living-flow-equation">${line('Calculator rental cash flow', c.cashflow, 'living-base-cashflow')}${line('Less utility estimate', -m.utilities.monthly)}<p>Utilities are subtracted once. ${p.type === 'Duplex' ? 'The rental scenario assumes both units are rented; it is not an owner-occupied duplex estimate.' : 'Rental income is not used to reduce the living-here total.'}</p></div>
    <details class="living-math"><summary>See exactly what is included ${icon('down')}</summary><div class="living-math-body">
      ${line('Mortgage principal & interest', c.mortgage)}${line('Property tax', c.tax)}${line('Home insurance', c.insurance)}${c.hoa ? line('HOA', c.hoa) : ''}${line('Mortgage insurance', pmi)}${line('Routine maintenance reserve', c.maintenance)}${line('Capital reserve', c.capex)}${line('Ownership subtotal, before utilities', m.ownerBeforeUtilities, 'living-owner-subtotal')}${line('Utility estimate', m.utilities.monthly, 'living-utility-amount')}${line('Living-here monthly total', m.ownerMonthly)}
      <p><strong>Living here:</strong> calculator costs & reserves (${preciseMoney(c.totalOutflow)}) − rental management (${preciseMoney(c.management)}) + utilities (${preciseMoney(m.utilities.monthly)}). Rental income and vacancy are not household income or expenses in this view.</p>
      <p><strong>Rental cash flow:</strong> rent after vacancy (${preciseMoney(c.effectiveRent)}) − calculator costs & reserves (${preciseMoney(c.totalOutflow)}) − utilities (${preciseMoney(m.utilities.monthly)}). The calculator itself is unchanged.</p>
      <p>The capital reserve is retained at ${a.capexPercent}% of the calculator’s gross rent input; that is the existing demo convention, even in the no-rent view. Routine maintenance ${a.costs?.maintenanceBasis === 'home-value' ? 'uses your percentage of home value.' : 'uses your monthly dollar input.'} Reserves are planned savings, not bills. Loan principal builds equity; this is cash outlay, not a pure expense total.</p>
      <p>Excluded: one-time closing/down-payment/repair costs, moving, commute costs, internet, food, other household expenses and any unentered premium. For a personalized household budget use <button class="text-button" data-action="decision-open" data-id="${e(p.id)}">Your Life Here ${icon('arrow')}</button>. Its saved profile inputs stay separate.</p>
      ${a.downPercent < 20 && c.loan > 0 && pmi === 0 ? '<p class="living-warning">Mortgage insurance is currently $0 with less than 20% down. Any applicable premium must be entered in the calculator; it is not known here.</p>' : ''}
    </div></details>`;
}
export function commuteView(p, w) {
    const work = w.living.commute, result = estimateCommute(p, work);
    const action = `<button class="text-button" data-action="living-work" data-id="${e(p.id)}">${work ? 'Edit work setup' : 'Set up once'} ${icon('arrow')}</button>`;
    let body = '';
    if (result.kind === 'unset')
        body = '<p>Add a work label and a position on a fictional city grid in your workspace. Reuse that setup across homes—no repeated address entry.</p>';
    if (result.kind === 'remote')
        body = `<div class="living-remote">${icon('home')}<strong>Work from home</strong></div><p>No routine work trip assumed, based on your workspace choice. Other travel is not estimated.</p>`;
    if (result.kind === 'outside-city')
        body = `<p><strong>No comparable local estimate.</strong> This home is outside ${work?.mode === 'simulated' ? e(work.city) + ', ' + e(work.state) : 'your work city'}. The demo does not model travel between cities.</p>`;
    if (result.kind === 'no-position')
        body = '<p><strong>No commute estimate for this property.</strong> Custom entries have no position in the demo grid. An address alone is not enough; Haven does not geocode it.</p>';
    if (result.kind === 'simulated' && work?.mode === 'simulated') {
        const formula = `Fictional grid points only: home (${result.home.x}, ${result.home.y}), work (${result.work.x}, ${result.work.y}), in mile units. Straight-line distance = √((home x − work x)² + (home y − work y)²) = ${result.straightMiles.toFixed(2)} mi. Assumed road distance = straight-line × ${COMMUTE_MODEL.roadFactor} = ${result.roadMiles.toFixed(2)} mi. Time = ceil(distance ÷ ${result.speedMph} mph × 60 + ${COMMUTE_MODEL.overheadMinutes} min allowance) = ${result.minutes} min. Uses unrounded distance for time. The road multiplier, speed and allowance are illustrative; no traffic, transit, map, or real route is checked.`;
        body = `<p class="living-destination">To <strong>${e(work.label)}</strong> · ${e(work.city)}, ${e(work.state)} · ${e(workAnchors[work.anchor].label)} demo position</p><div class="living-commute-numbers"><div><strong id="living-commute-minutes" data-value="${result.minutes}">~${result.minutes}<small>min</small></strong><span>one-way demo estimate</span></div><div><strong id="living-commute-miles" data-value="${result.roadMiles}">~${result.roadMiles.toFixed(1)}<small>mi</small></strong><span>simulated road distance</span></div>${help('living-commute', 'Commute formula', formula)}</div><p class="living-commute-disclaimer"><strong>Invented positions, not a real route.</strong> Your label is not looked up. These numbers only demonstrate the comparison experience; don’t use them for travel or property decisions.</p>`;
    }
    return `<section class="living-commute" aria-labelledby="living-commute-heading"><div class="living-row-heading"><h4 id="living-commute-heading">Your work trip <span>Optional</span></h4>${action}</div>${body}<p class="living-caption">${work?.mode === 'simulated' ? 'Same-city fictional homes only. ' : ''}No commute dollars are included in the monthly total. Settings stay in this browser.</p></section>`;
}
export function livingSection(p, s) {
    const m = calculateLiving(p, s.workspace), u = m.utilities;
    return `<section class="living-section" id="living-cost-section" data-property="${e(p.id)}" aria-labelledby="living-heading"><div class="living-heading"><div><span class="eyebrow">A CLEARER EVERYDAY</span><h3 id="living-heading">What this actually costs to live here.</h3></div>${badge()}</div>
    <p class="living-intro">A starting point, not a quote. Monthly ownership cash outlay plus a utility allowance, with every assumption visible.</p>
    <div class="living-source"><span>${m.customized ? 'Uses your last valid calculator edits for this home.' : 'Uses this home’s default calculator assumptions.'}</span><button class="text-button" data-action="analyze" data-id="${e(p.id)}">Edit costs ${icon('arrow')}</button></div>
    ${p.type === 'Duplex' ? '<p class="living-warning">Whole-building estimate: size, costs and utility allowance cover both units. This does not assume you can occupy one unit and collect all of the rent.</p>' : ''}
    <div id="living-results">${livingSummary(p, s.workspace)}</div>
    <section class="living-utilities" aria-labelledby="living-utilities-heading"><div class="living-row-heading"><h4 id="living-utilities-heading">A utility estimate you can question.</h4>${help('living-utility', 'Utility formula', utilityExplanation(p, s.workspace))}</div>
      <p>Energy & water, estimated for ${number(p.sqft)} sq ft and a ${p.yearBuilt} construction year. Hover, focus or tap the info button for the formula.</p>
      <div class="living-utility-controls"><div class="form-field"><label for="living-utilities">Estimated utilities ($ / month)</label><input id="living-utilities" type="number" inputmode="decimal" required min="0" max="1000000" step="any" value="${u.monthly}" aria-describedby="living-utility-source why-living-utility living-utility-error" data-living-utility="${e(p.id)}"></div><button class="btn small" data-action="living-utility-reset" data-id="${e(p.id)}">Use size & age estimate</button></div>
      <p id="living-utility-source" class="living-caption">${u.manual ? 'Your entered estimate replaces the formula.' : 'Demo formula estimate. Editing makes this your own monthly assumption.'}</p><p id="living-utility-error" class="form-error" role="alert" hidden></p><p id="living-save-status" class="living-save-status">${s.storageAvailable ? 'Valid utility edits save for this property on this device.' : 'Session only — export a backup to keep utility edits.'}</p>
    </section>${commuteView(p, s.workspace)}<p class="sr-only" id="living-announcement" role="status" aria-atomic="true"></p></section>`;
}
export function workSettingsView(s, properties, context) {
    const work = s.workspace.living.commute, mode = work?.mode ?? 'none', custom = work?.mode === 'simulated' ? work : null;
    const cities = [...new Map(properties.filter(p => !p.custom).map(p => [p.city + '|' + p.state, { city: p.city, state: p.state }])).values()].sort((a, b) => a.city.localeCompare(b.city));
    if (custom && !cities.some(x => x.city === custom.city && x.state === custom.state))
        cities.unshift({ city: custom.city, state: custom.state });
    const selected = custom ? custom.city + '|' + custom.state : context && !context.custom ? context.city + '|' + context.state : 'Lincoln|NE';
    return `<form id="living-work-form" novalidate><div class="modal-heading"><span class="eyebrow">ONE SETUP · YOUR WORKSPACE</span><h2 id="dialog-title">Your work trip.</h2><p>Optional, local and reusable. Set this once, then see the same assumptions on every home.</p></div>
    <label class="form-field"><span>Work setup</span><select id="living-work-mode"><option value="none" ${mode === 'none' ? 'selected' : ''}>No commute estimate</option><option value="remote" ${mode === 'remote' ? 'selected' : ''}>I work from home</option><option value="simulated" ${mode === 'simulated' ? 'selected' : ''}>Explore a fictional commute</option></select></label>
    <fieldset id="living-work-fields" ${mode !== 'simulated' ? 'hidden disabled' : ''}><legend class="sr-only">Fictional commute inputs</legend><div class="living-work-disclosure">${badge('DEMO ONLY')}<p><strong>No mapping service is connected.</strong> The work label is not geocoded. Both home positions and the work position use an invented local grid—not the geography of the named city.</p></div>
      <label class="form-field"><span>Work location / label</span><input id="living-work-label" autocomplete="off" required maxlength="160" value="${e(custom?.label ?? '')}" placeholder="e.g. My office or a location label"><small>A nickname is enough. No address is needed or looked up.</small></label>
      <div class="living-work-grid"><label class="form-field"><span>Work city (demo area)</span><select id="living-work-city">${cities.map(x => `<option value="${e(x.city + '|' + x.state)}" ${selected === x.city + '|' + x.state ? 'selected' : ''}>${e(x.city)}, ${e(x.state)}</option>`).join('')}</select></label>
      <label class="form-field"><span>Position on the invented grid</span><select id="living-work-anchor">${Object.entries(workAnchors).map(([key, v]) => `<option value="${key}" ${(custom?.anchor ?? 'center') === key ? 'selected' : ''}>${v.label} (demo grid)</option>`).join('')}</select></label></div>
      <label class="form-field"><span>Assumed driving speed (mph)</span><input id="living-work-speed" type="number" inputmode="decimal" required min="5" max="80" step="any" value="${custom?.speedMph ?? COMMUTE_MODEL.defaultSpeedMph}"><small>25 mph is a chosen demo assumption, not traffic data. Road distance = grid distance × 1.3; one-way minutes = distance ÷ speed × 60 + 5 minutes, rounded up.</small></label>
    </fieldset><p id="living-work-error" class="form-error" role="alert" hidden></p><p class="small-print">This is one workspace-wide setting, not a private participant account. Anyone using this browser or a full backup can read the label. It is never sent to the assistant or any service. Choosing no estimate or work from home removes a previously saved location.</p>
    <div class="modal-actions"><button type="button" class="btn" data-action="living-work-back">Cancel</button><button type="submit" class="btn primary">Save work setup ${icon('check')}</button></div></form>`;
}
