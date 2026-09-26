import { freshRejections, isRejectionReason, passProperty, undoPass } from './rejection-engine.js';
import { passDialog, preferencesDialog } from './rejection-views.js';
import { icon } from './ui.js';
export function mountRejections(c) {
    const open = () => c.openDialog(preferencesDialog(c.state), 'preferences-modal');
    const pass = (id) => { const p = c.properties().find(p => p.id === id); if (p)
        c.openDialog(passDialog(p, c.state), 'pass-modal'); };
    const refresh = (message) => { c.commit(message); c.render(); };
    const undo = (id) => {
        if (!c.state.workspace.rejections.records[id])
            return;
        const inPanel = !!document.querySelector('.preferences-modal[open]');
        c.state.workspace.rejections = undoPass(c.state.workspace.rejections, id);
        refresh('Pass undone. Its evidence is removed and recommendations are recalculated.');
        if (inPanel)
            open();
        // Update the existing property dialog without destroying unsaved notes or inputs.
        document.querySelectorAll(`.detail-modal [data-action="pass-undo"]`).forEach(b => { if (b.dataset.id === id) {
            b.dataset.action = 'pass-open';
            b.innerHTML = icon('x') + '<span>Not interested</span>';
            const p = c.properties().find(p => p.id === id);
            b.setAttribute('aria-label', `Not interested in ${p?.name || 'this home'}`);
        } });
    };
    document.addEventListener('click', event => {
        const b = event.target instanceof Element ? event.target.closest('[data-action]') : null;
        if (!b || b instanceof HTMLButtonElement && b.disabled)
            return;
        const action = b.dataset.action;
        if (!['preferences-open', 'pass-open', 'pass-undo', 'passes-toggle', 'preferences-reset', 'preferences-reset-confirm'].includes(action || ''))
            return;
        event.preventDefault();
        if (action === 'preferences-open')
            open();
        if (action === 'pass-open')
            pass(b.dataset.id);
        if (action === 'pass-undo')
            undo(b.dataset.id);
        if (action === 'passes-toggle') {
            c.state.showPassed = !c.state.showPassed;
            c.render();
            document.querySelector('[data-action="passes-toggle"]')?.focus();
        }
        if (action === 'preferences-reset')
            c.openDialog(`<div class="modal-heading"><span class="eyebrow">YOUR CHOICE, ALWAYS</span><h2 id="dialog-title">Forget these passes?</h2><p>This removes all rejection reasons, their notes, and learned rules, and restores passed homes to recommendations. Saved homes, budgets, calculator edits, tour answers, and work settings stay intact.</p></div><div class="modal-actions"><button class="btn" data-action="preferences-open">Keep my preferences</button><button class="btn primary" data-action="preferences-reset-confirm">Reset all passes</button></div>`, 'preference-reset-modal');
        if (action === 'preferences-reset-confirm') {
            c.state.workspace.rejections = freshRejections();
            c.state.showPassed = false;
            refresh('Preference memory cleared. Your other workspace data is unchanged.');
            open();
        }
    });
    document.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement))
            return;
        if (input.id === 'learning-enabled') {
            c.state.workspace.rejections.enabled = input.checked;
            refresh(input.checked ? 'Learned re-ranking resumed.' : 'Learned re-ranking paused. Individual passes are still remembered.');
            open();
            document.getElementById('learning-enabled')?.focus();
        }
        if (input.name === 'reason' && input.closest('#pass-form')) {
            const other = input.value === 'Other', note = document.getElementById('pass-note');
            if (other)
                document.querySelector('.pass-note-details').open = true;
            document.getElementById('pass-note-summary').innerHTML = (other ? 'Tell us why (required)' : 'Add context (optional)') + ' ' + icon('down');
            note.required = other;
            document.getElementById('pass-note-label').textContent = other ? 'What made it a pass? (required)' : 'A little context (optional)';
            document.getElementById('pass-reason-help').textContent = other ? 'Your note is remembered exactly as written. It will not train an automatic rule.' : 'This reason uses listing values. Two different homes are needed; repeat passes on the same home count once.';
            if (input.value === 'Too far')
                document.getElementById('pass-reason-help').textContent = 'Only comparable fictional commute distances can train this preference. No real routes are known. Open “How this pass is used” for this home’s data.';
        }
    });
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || form.id !== 'pass-form')
            return;
        event.preventDefault();
        const data = new FormData(form), reason = data.get('reason'), note = String(data.get('note') || '').trim();
        const error = document.getElementById('pass-error');
        if (!isRejectionReason(reason) || reason === 'Other' && !note || note.length > 500) {
            error.hidden = false;
            error.textContent = !isRejectionReason(reason) ? 'Choose one reason before passing.' : 'For Other, add a note of 1–500 characters.';
            return;
        }
        const p = c.properties().find(p => p.id === form.dataset.id);
        if (!p)
            return;
        try {
            c.state.workspace.rejections = passProperty(c.state.workspace.rejections, p, reason, note, c.state.workspace.living.commute);
        }
        catch (ex) {
            error.hidden = false;
            error.textContent = ex instanceof Error ? ex.message : 'Could not record this pass.';
            return;
        }
        c.closeDialog();
        refresh('Home passed. Review or undo it anytime in Your preferences.');
        // The original card may be gone: provide a visible, useful keyboard destination.
        (document.querySelector('#preference-panel [data-action="preferences-open"]') || document.querySelector('.nav-item[data-action="preferences-open"]'))?.focus({ preventScroll: true });
    });
    return { open, pass, undo };
}
