import { calculateLiving, parseCommute } from './living-engine.js';
import { livingSummary, utilityExplanation, workSettingsView } from './living-views.js';
import { preciseMoney } from './cost-controls.js';
export function mountLiving(host) {
    const { state } = host;
    let returnHome = '', returnNote = null;
    const get = (id) => host.properties().find(p => p.id === id);
    const back = () => {
        if (returnHome && get(returnHome)) {
            host.showDetails(returnHome);
            const notes = document.getElementById('property-notes');
            if (notes && returnNote !== null)
                notes.value = returnNote; // Unsaved notes stay unsaved, and are not lost.
            document.getElementById('living-cost-section')?.scrollIntoView({ block: 'start', behavior: 'instant' });
            document.querySelector('.living-commute [data-action="living-work"]')?.focus({ preventScroll: true });
        }
        else
            host.workspaceDialog();
        returnHome = '';
        returnNote = null;
    };
    const update = (p) => {
        const root = document.getElementById('living-cost-section');
        if (root?.dataset.property !== p.id)
            return;
        const expanded = !!document.querySelector('.living-math[open]');
        document.getElementById('living-results').innerHTML = livingSummary(p, state.workspace);
        if (expanded)
            document.querySelector('.living-math')?.setAttribute('open', '');
        document.getElementById('living-results').classList.remove('results-stale');
        document.getElementById('why-living-utility').textContent = utilityExplanation(p, state.workspace);
        const u = calculateLiving(p, state.workspace);
        document.getElementById('living-utility-source').textContent = u.utilities.manual ? 'Your entered estimate replaces the formula.' : 'Demo formula estimate. Editing makes this your own monthly assumption.';
        document.getElementById('living-utility-error').hidden = true;
        document.getElementById('living-utilities').setAttribute('aria-invalid', 'false');
        document.getElementById('living-save-status').textContent = state.storageAvailable ? 'Saved for this property on this device.' : 'Session only — export a backup to keep utility edits.';
        document.getElementById('living-announcement').textContent = `Estimated living-here monthly total: ${preciseMoney(u.ownerMonthly)}. ${state.storageAvailable ? 'Saved on this device.' : 'Session only.'}`;
    };
    document.addEventListener('input', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.dataset.livingUtility)
            return;
        const p = get(input.dataset.livingUtility);
        if (!p)
            return;
        const value = input.value.trim() ? Number(input.value) : NaN;
        if (!Number.isFinite(value) || value < 0 || value > 1000000) {
            input.setAttribute('aria-invalid', 'true');
            const err = document.getElementById('living-utility-error');
            err.hidden = false;
            err.textContent = 'Enter an estimate from $0 to $1,000,000 per month. These results still use your last valid value; this edit has not been saved.';
            document.getElementById('living-results').classList.add('results-stale');
            document.getElementById('living-save-status').textContent = 'Not saved — fix the utility estimate.';
            document.getElementById('living-announcement').textContent = 'Estimate paused. ' + err.textContent;
            return;
        }
        state.workspace.living.utilityOverrides[p.id] = value;
        host.commit();
        update(p);
    });
    document.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLSelectElement) || input.id !== 'living-work-mode')
            return;
        const fields = document.getElementById('living-work-fields');
        fields.hidden = input.value !== 'simulated';
        fields.disabled = fields.hidden;
        document.getElementById('living-work-error').hidden = true;
    });
    document.addEventListener('click', event => {
        const b = event.target instanceof Element ? event.target.closest('[data-action]') : null;
        if (!b)
            return;
        const action = b.dataset.action;
        if (!['living-work', 'living-work-back', 'living-utility-reset'].includes(action ?? ''))
            return;
        event.preventDefault();
        if (action === 'living-work') {
            returnHome = b.dataset.id ?? '';
            returnNote = returnHome ? document.getElementById('property-notes')?.value ?? null : null;
            host.openDialog(workSettingsView(state, host.properties(), get(returnHome)), 'info-modal living-settings-modal');
            document.getElementById('living-work-mode')?.focus();
        }
        if (action === 'living-work-back')
            back();
        if (action === 'living-utility-reset') {
            const p = get(b.dataset.id ?? '');
            if (!p)
                return;
            delete state.workspace.living.utilityOverrides[p.id];
            host.commit();
            document.getElementById('living-utilities').value = String(calculateLiving(p, state.workspace).utilities.monthly);
            update(p);
        }
    });
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || form.id !== 'living-work-form')
            return;
        event.preventDefault();
        const str = (id) => document.getElementById(id).value.trim();
        try {
            if (!form.reportValidity())
                throw new Error('Complete the highlighted fields. Nothing has been saved.');
            const mode = str('living-work-mode'), [city, region] = str('living-work-city').split('|');
            const next = parseCommute(mode === 'none' ? null : mode === 'remote' ? { mode: 'remote' } : { mode, label: str('living-work-label'), city, state: region, anchor: str('living-work-anchor'), speedMph: Number(str('living-work-speed')) });
            state.workspace.living.commute = next;
            host.commit('Work setup saved for this workspace.');
            host.onWorkChange?.();
            back();
        }
        catch (error) {
            const el = document.getElementById('living-work-error');
            el.hidden = false;
            el.textContent = error instanceof Error ? error.message : 'Work setup could not be saved.';
        }
    });
}
