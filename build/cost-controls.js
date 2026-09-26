import { inputRules, defaultCalculatorAssumptions, resolvedOwnershipCosts } from './finance.js';
import { escapeHTML as e, icon, money } from './ui.js';
export const preciseMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value) < .005 ? 0 : value);
const rateLabel = (value) => value.toLocaleString('en-US', { maximumFractionDigits: 3 });
/** Help is available on hover, keyboard focus, and tap; not a mouse-only title. */
export function costHelp(id, label, explanation) {
    return `<span class="cost-help-wrap"><button type="button" class="cost-help" data-cost-help="why-${id}" aria-label="Why this default: ${e(label)}" aria-expanded="false" aria-controls="why-${id}">${icon('info')}</button><span class="cost-tooltip" id="why-${id}" role="tooltip" hidden>${e(explanation)}</span></span>`;
}
export function assumptionField(a, key, label, unit, why, step = 'any') {
    return `<div class="calc-field"><div class="cost-field-heading"><label for="calc-${key}">${e(label)}</label>${costHelp(key, label, why)}</div><span class="input-unit ${unit === '$' ? 'prefix' : ''}">${unit === '$' ? '<b aria-hidden="true">$</b>' : ''}<input data-calc="${key}" id="calc-${key}" type="number" inputmode="decimal" min="${inputRules[key].min}" max="${inputRules[key].max}" step="${step}" required value="${a[key]}" aria-label="${e(label)}" aria-describedby="why-${key}">${unit !== '$' ? `<b aria-hidden="true">${unit}</b>` : ''}</span></div>`;
}
export function ownershipFields(p, a, s) {
    const c = a.costs, defaults = defaultCalculatorAssumptions(p).costs;
    const source = p.custom ? 'your unverified property entry' : 'this fictional property record';
    const field = (key, label, unit, max, why, hint, extra = '') => `<div class="calc-field cost-field ${extra}"><div class="cost-field-heading"><label for="cost-${key}">${label}</label>${costHelp(key, label, why)}</div><span class="input-unit ${unit === '$' ? 'prefix' : ''}">${unit === '$' ? '<b aria-hidden="true">$</b>' : ''}<input id="cost-${key}" data-cost="${key}" type="number" inputmode="decimal" min="0" max="${max}" step="any" required value="${c[key]}" aria-describedby="why-${key} hint-${key}">${unit !== '$' ? `<b aria-hidden="true">${unit}</b>` : ''}</span><p id="hint-${key}" class="cost-equivalent">${hint}</p></div>`;
    const values = costHints(a);
    return `<section class="ownership-inputs" aria-labelledby="ownership-input-title">
    <h3 class="form-section-title" id="ownership-input-title">02 <span>Ownership costs, without the guesswork.</span></h3>
    <p class="cost-disclosure">Editable estimates, not quotes. Tap ${icon('info')} to see where each default comes from.</p>
    <div class="calc-fields cost-field-grid">
      ${field('taxRatePercent', 'Property tax rate', '% / year', 100_000_000, `${rateLabel(defaults.taxRatePercent)}% — the annual tax in ${source}, divided by its asking price and rounded to 0.001 percentage point. Applied to your purchase price, not assessed value. This is not a national average or a local tax quote.`, values.taxRatePercent)}
      ${field('insuranceAnnual', 'Annual insurance estimate', '$', 1_200_000, `${money(defaults.insuranceAnnual)} per year — the monthly insurance input in ${source}, multiplied by 12. Edit for your own estimate; no insurer or coverage quote is connected.`, values.insuranceAnnual)}
    </div>
    <div class="cost-unit-setting"><label for="cost-maintenance-basis">Maintenance reserve basis</label><select id="cost-maintenance-basis" data-cost-basis="maintenanceBasis" data-requires-valid aria-describedby="maintenance-basis-note"><option value="monthly" ${c.maintenanceBasis === 'monthly' ? 'selected' : ''}>Dollars per month</option><option value="home-value" ${c.maintenanceBasis === 'home-value' ? 'selected' : ''}>% of home value / year</option></select></div>
    <p id="maintenance-basis-note" class="cost-basis-note">A reserve for routine upkeep. Changing units preserves the amount; rent changes do not change this reserve.</p>
    ${field('maintenanceValue', c.maintenanceBasis === 'monthly' ? 'Maintenance reserve ($ / month)' : 'Maintenance reserve (% of home value / year)', c.maintenanceBasis === 'monthly' ? '$' : '% / year', c.maintenanceBasis === 'monthly' ? 1_000_000 : 100_000_000, `${preciseMoney(defaults.maintenanceValue)} per month — carried forward from this home's existing sample maintenance allowance (5% of sample gross rent). It now starts as a fixed monthly reserve, not a rent percentage. Switching to annual % uses your purchase price. Review separately from the larger-repair capital reserve below.`, values.maintenanceValue, 'cost-wide')}
    <div class="cost-hoa-setting"><label for="cost-hoa-applicable"><input type="checkbox" id="cost-hoa-applicable" data-cost-flag="hoaApplicable" ${c.hoaApplicable ? 'checked' : ''}><span>This home has an HOA</span></label>${costHelp('hoaApplicable', 'HOA applicability', p.hoaMonthly > 0 ? `On because ${source} contains a ${money(p.hoaMonthly)} monthly association fee. Verify whether a fee applies.` : `Off because ${source} contains $0 in HOA fees. This is not verification that there is no HOA. Turn it on to model a fee.`)}</div>
    <div id="cost-hoa-field" ${c.hoaApplicable ? '' : 'hidden'}>${assumptionField(a, 'hoaMonthly', 'HOA fee ($ / month)', '$', `${money(p.hoaMonthly)} per month — from ${source}, not an association statement. Turn HOA off to exclude it; your entered amount is retained for switching it back on.`)}</div>
    <p id="cost-hoa-note" class="cost-basis-note">${c.hoaApplicable ? 'The monthly association fee is included in the total.' : 'HOA is excluded. Turn it on to enter a monthly fee.'}</p>
    <div class="cost-one-time-header"><span class="cost-badge">ONE-TIME</span><h4>Closing costs</h4></div>
    <div class="cost-unit-setting"><label for="cost-closing-basis">Enter closing costs as</label><select id="cost-closing-basis" data-cost-basis="closingBasis" data-requires-valid><option value="percent" ${c.closingBasis === 'percent' ? 'selected' : ''}>% of purchase price</option><option value="amount" ${c.closingBasis === 'amount' ? 'selected' : ''}>One-time dollar amount</option></select></div>
    ${field('closingValue', c.closingBasis === 'percent' ? 'Estimated closing costs (% · one-time)' : 'Estimated closing costs ($ · one-time)', c.closingBasis === 'percent' ? '%' : '$', c.closingBasis === 'percent' ? 30 : 100_000_000, '3% of the purchase price — the existing illustrative planning allowance, not a lender quote or national average. It excludes your down payment and initial repairs. Closing costs are paid once, never added to the monthly total.', values.closingValue, 'cost-wide')}
    <p id="cost-saving-status" class="cost-save-status" role="status">${s.storageAvailable ? (s.workspace.calculator.drafts[p.id] ? 'Saved for this home in this browser.' : 'Edits save automatically for this home in this browser.') : 'Session only. Export a backup to keep your edits.'}</p>
  </section>`;
}
export function costHints(a) {
    const m = resolvedOwnershipCosts(a), c = a.costs;
    return {
        taxRatePercent: `${preciseMoney(m.tax * 12)} / year · ${preciseMoney(m.tax)} / month`,
        insuranceAnnual: `Annual estimate ÷ 12 = ${preciseMoney(m.insurance)} / month`,
        maintenanceValue: c.maintenanceBasis === 'monthly' ? `${preciseMoney(m.maintenance)} / month · ${preciseMoney(m.maintenance * 12)} / year` : `Purchase price × ${rateLabel(c.maintenanceValue)}% ÷ 12 ≈ ${preciseMoney(m.maintenance)} / month`,
        closingValue: `${preciseMoney(m.closing)} once at purchase. Not a monthly charge.`
    };
}
/** Update only derived captions, leaving the typed field and caret untouched. */
export function refreshCostControls(a, available) {
    for (const [key, text] of Object.entries(costHints(a))) {
        const hint = document.getElementById(`hint-${key}`);
        if (hint)
            hint.textContent = text;
    }
    const hoa = document.getElementById('cost-hoa-field');
    if (hoa) {
        hoa.hidden = !a.costs.hoaApplicable;
        hoa.querySelectorAll('input').forEach(el => el.disabled = hoa.hidden);
    }
    const note = document.getElementById('cost-hoa-note');
    if (note)
        note.textContent = a.costs.hoaApplicable ? 'The monthly association fee is included in the total.' : 'HOA is excluded. Turn it on to enter a monthly fee.';
    const status = document.getElementById('cost-saving-status');
    if (status) {
        status.textContent = available ? 'Saved for this home in this browser.' : 'Session only. Export a backup to keep your edits.';
        status.classList.toggle('cost-session-only', !available);
    }
}
/** No network or global finance state. Tooltip placement is clamped to the viewport. */
export function mountCostTooltips() {
    let active = null;
    let pinned = false;
    let hideTimer;
    const hide = () => {
        clearTimeout(hideTimer);
        document.querySelectorAll('.cost-tooltip').forEach(el => el.hidden = true);
        document.querySelectorAll('[data-cost-help]').forEach(el => el.setAttribute('aria-expanded', 'false'));
        active = null;
        pinned = false;
    };
    const show = (button) => {
        clearTimeout(hideTimer);
        if (active !== button)
            hide();
        const tip = document.getElementById(button.dataset.costHelp);
        if (!tip)
            return;
        active = button;
        tip.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        const rect = button.getBoundingClientRect();
        const width = Math.min(320, Math.max(180, window.innerWidth - 24));
        tip.style.width = width + 'px';
        tip.style.left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)) + 'px';
        const height = tip.getBoundingClientRect().height;
        tip.style.top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12)) + 'px';
    };
    const buttonFor = (target) => target instanceof Element ? target.closest('[data-cost-help]') : null;
    document.addEventListener('pointerover', event => {
        if (event.pointerType === 'touch')
            return;
        const button = buttonFor(event.target);
        if (button)
            show(button);
        if (event.target instanceof Element && event.target.closest('.cost-tooltip'))
            clearTimeout(hideTimer);
    });
    document.addEventListener('pointerout', event => {
        if (pinned || document.activeElement === active)
            return;
        if (buttonFor(event.target) || event.target instanceof Element && event.target.closest('.cost-tooltip'))
            hideTimer = setTimeout(hide, 140);
    });
    document.addEventListener('focusin', event => { const button = buttonFor(event.target); if (button)
        show(button);
    else
        hide(); });
    document.addEventListener('click', event => {
        const button = buttonFor(event.target);
        if (button) {
            event.preventDefault();
            if (active === button && pinned)
                hide();
            else {
                show(button);
                pinned = true;
            }
        }
        else if (!(event.target instanceof Element && event.target.closest('.cost-tooltip')))
            hide();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) {
        event.preventDefault();
        hide();
    } });
    window.addEventListener('scroll', () => {
        if (!active)
            return;
        const rect = active.getBoundingClientRect();
        if (!active.isConnected || rect.bottom < 0 || rect.top > window.innerHeight)
            hide();
        else
            show(active);
    }, true);
    window.addEventListener('resize', hide);
}
