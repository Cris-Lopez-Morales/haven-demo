import { activeParticipant, lifeFor, calculateLife, emptyDecisionHome, exampleBudget, newParticipant, assessFit, tourQuestions, validBudget, validLife, validStress, validPriorities, stages, stressNames, lifeLimits } from './decision-engine.js';
import { budgetForm, participantForm, lifeResults } from './decision-views.js';
import { escapeHTML as e, money, icon, toast, uid, downloadFile } from './ui.js';
import { toCSV } from './finance.js';
export function mountDecisionWorkspace(env) {
    const { state: s } = env;
    const d = () => s.workspace.decisions;
    const person = () => activeParticipant(d());
    const current = () => env.properties().find(p => p.id === d().currentPropertyId) || env.properties()[0];
    const home = () => d().homes[current().id] ??= emptyDecisionHome();
    const save = (message) => { env.commit(message); env.render(); };
    const select = (id) => { if (!env.properties().some(x => x.id === id))
        return; d().currentPropertyId = id; env.commit(); env.navigate('decision'); };
    const open = (id) => { if (!env.properties().some(x => x.id === id))
        return; d().currentPropertyId = id; env.commit(); env.navigate('decision'); };
    const formError = (form, message) => { const el = form.querySelector('.decision-error'); if (el)
        el.textContent = message;
    else
        toast(message, true); };
    function questionDialog(id) {
        const q = tourQuestions(current(), person().priorities, home()).find(q => q.id === id);
        if (!q)
            return;
        env.openDialog(`<form id="decision-answer-form" data-id="${e(id)}"><div class="modal-heading"><span class="eyebrow">A QUESTION WORTH ASKING</span><h2 id="dialog-title">${q.resolved ? 'Revisit the answer.' : 'Fill in a blank.'}</h2><p>${e(q.text)}</p></div><label class="form-field"><span>What did you learn?</span><textarea name="answer" rows="4" maxlength="4000" placeholder="Record the answer without treating it as independently verified.">${e(q.answer)}</textarea></label><label class="form-field"><span>Source or reference</span><input name="source" maxlength="500" value="${e(q.source)}" placeholder="e.g. Seller’s note, inspection page 4, your tour observation"><small>Free-text reference only. Documents and links are not fetched or uploaded.</small></label><label class="decision-checkbox"><input type="checkbox" name="resolved" ${q.resolved ? 'checked' : ''}><span>Mark as answered (requires an answer and source)</span></label><p class="decision-disclosure">Answers are shared with local participants. A recorded answer is not a professional verification.</p><p class="decision-error" role="alert"></p><div class="modal-actions">${q.custom ? `<button type="button" class="text-button" data-action="decision-delete-question" data-id="${e(id)}">Delete question</button>` : ''}<button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn primary">Save answer ${icon('check')}</button></div></form>`);
    }
    function syncLife(saveInputs = true) {
        if (s.page !== 'decision' || s.decisionTab !== 'life')
            return true;
        const inputs = [...document.querySelectorAll('[data-life]')];
        if (!inputs.length)
            return true;
        const a = { ...lifeFor(current(), person()) };
        let bad;
        inputs.forEach(input => { const key = input.dataset.life; const val = input.value.trim() ? Number(input.value) : NaN; a[key] = val; const valid = Number.isFinite(val) && val >= lifeLimits[key][0] && val <= lifeLimits[key][1] && (key !== 'years' || Number.isInteger(val)); input.setAttribute('aria-invalid', String(!valid)); if (!valid && !bad)
            bad = input; });
        const stressInput = document.querySelector('#decision-stress-value');
        const stress = { ...d().stressInputs };
        if (stressInput) {
            const key = s.decisionStress === 'income' ? 'incomeDrop' : s.decisionStress === 'expenses' ? 'expenseIncrease' : 'repairCost';
            stress[key] = stressInput.value.trim() ? Number(stressInput.value) : NaN;
            stressInput.setAttribute('aria-invalid', String(!validStress(stress)));
            if (!validStress(stress) && !bad)
                bad = stressInput;
        }
        const valid = validLife(a) && validStress(stress);
        const err = document.querySelector('#decision-life-error');
        if (err) {
            err.hidden = valid;
            err.textContent = valid ? '' : 'Enter a valid value in each highlighted field. Results below retain the last valid inputs; saving and exporting are paused.';
        }
        document.getElementById('decision-life-results')?.classList.toggle('results-stale', !valid);
        document.querySelectorAll('[data-action="decision-save-snapshot"], [data-action="decision-export-life"]').forEach(x => x.disabled = !valid);
        if (!valid)
            return false;
        if (saveInputs) {
            person().life[current().id] = a;
            d().stressInputs = stress;
            env.commit();
        }
        const el = document.querySelector('#decision-life-results');
        if (el)
            el.innerHTML = lifeResults(s, current(), person());
        // Keep the selected row in the shortlist comparison numerically fresh without replacing inputs.
        const rows = document.querySelectorAll('.life-compare tbody tr');
        const b = person().budget;
        if (b && rows.length) {
            const sorted = env.properties().filter(x => s.workspace.savedIds.includes(x.id)).map(p => ({ p, m: calculateLife(p.price, b, lifeFor(p, person())) })).sort((a, b) => b.m.leftover - a.m.leftover);
            const body = document.querySelector('.life-compare tbody');
            if (body)
                body.innerHTML = sorted.map(({ p, m }) => `<tr><td><strong>${e(p.name)}</strong><small>${e(p.city)} · ${money(p.price)}</small></td><td>${money(m.housing)}</td><td class="${m.leftover < 0 ? 'decision-negative' : ''}">${money(m.leftover)}</td><td class="${m.cashRemaining < 0 ? 'decision-negative' : ''}">${money(m.cashRemaining)}</td><td><button class="text-button" data-action="decision-open" data-id="${e(p.id)}">Explore ${icon('arrow')}</button></td></tr>`).join('');
        }
        return true;
    }
    function exportLife() {
        if (!syncLife() || !person().budget)
            return;
        const p = current(), b = person().budget, a = lifeFor(p, person()), m = calculateLife(p.price, b, a, s.decisionStress, d().stressInputs);
        const rows = [['HAVEN — YOUR LIFE HERE'], ['Data', p.custom ? 'User-entered property; unverified' : 'Fictional demo property'], ['Property', p.name], ['City', p.city], ['Generated', new Date().toISOString()], ['Profile', person().name], ['Budget source', b.example ? 'Explicit sample budget' : 'User-entered budget'], ['Privacy', 'This file contains budget details. It is not the shared tour brief.'], ['Disclaimer', 'Illustrative owner-occupant model, not financial advice or loan approval. No rent, tax savings, appreciation, or financing to cover cash shortfalls is assumed.'], ['Scenario', stressNames[s.decisionStress]], ['Price ($)', p.price], [], ['HOUSEHOLD BUDGET'], ...Object.entries(b).map(([key, value]) => [key, String(value)]), [], ['OWNERSHIP INPUTS'], ...Object.entries(a).map(([key, v]) => [key, v]), [], ['STRESS INPUTS — only the selected scenario applies'], ...Object.entries(d().stressInputs).map(([key, v]) => [key, v]), [], ['RESULTS'], ...Object.entries(m).map(([key, v]) => [key, v])];
        downloadFile(`haven-life-${p.id}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
        toast('Life scenario exported. This file includes budget details.');
    }
    function exportTour() {
        const p = current(), w = person(), h = home(), qs = tourQuestions(p, w.priorities, h), fit = assessFit(p, w.priorities);
        const content = [`HAVEN · KNOW BEFORE YOU TOUR`, p.name, `${p.city}, ${p.state} · ${p.address}`, `Source: ${p.custom ? 'user-entered property, unverified' : 'fictional demo listing'}`, `Asking price: ${money(p.price)} | ${p.beds} beds | ${p.sqft} sq ft${p.type === 'Duplex' ? ' (combined across units; not per unit)' : ''}`, `Generated: ${new Date().toISOString()}`, `Priorities profile: ${w.name}`, `Shared stage: ${h.stage}`, '', 'WHY IT FITS / TRADE-OFFS / UNKNOWNS', ...(fit.length ? fit.map(x => `${x.status.toUpperCase()}: ${x.detail}`) : ['No priorities entered. No personal fit conclusion.']), 'Roof age, building condition, system ages, and actual utility bills are not provided.', '', 'QUESTIONS & USER-RECORDED ANSWERS', ...qs.flatMap(q => [`${q.resolved ? '[Recorded answer]' : '[Open]'} ${q.text}`, `Answer: ${q.answer || 'Not recorded'}`, `Source: ${q.source || 'Unknown'}`, `Recorded by: ${d().participants.find(p => p.id === q.updatedBy)?.name || 'Not recorded'}`, '']), 'VISIT NOTES', `Planned visit (local time as entered; not a booking): ${h.visit.date || 'Not scheduled'}`, h.visit.notes || 'No visit notes.', '', 'This brief excludes household budgets and budget scenarios. Answers are recorded by users, not independently verified. No inspection or professional advice is implied.'].join('\n');
        downloadFile(`haven-tour-${p.id}.txt`, content, 'text/plain;charset=utf-8');
        toast('Tour brief exported without household budgets.');
    }
    let pendingSnapshot = null;
    const actions = {
        'decision-open': b => open(b.dataset.id || current().id),
        'decision-tab': b => { const tab = b.dataset.tab; if (!['life', 'together', 'tour'].includes(tab))
            return; s.decisionTab = tab; env.render(); document.getElementById(`decision-tab-${tab}`)?.focus({ preventScroll: true }); },
        'decision-budget': () => env.openDialog(budgetForm(person())),
        'decision-example': () => { person().budget = exampleBudget(); save('Sample household budget loaded. Replace these values with your own when ready.'); },
        'decision-reset-inputs': () => { delete person().life[current().id]; save('Restored the fictional listing inputs and sample ownership assumptions.'); },
        'decision-stress': b => { if (!syncLife())
            return toast('Correct the highlighted inputs before changing scenarios.', true); s.decisionStress = b.dataset.kind; env.render(); document.querySelector(`[data-action="decision-stress"][data-kind="${s.decisionStress}"]`)?.focus({ preventScroll: true }); },
        'decision-export-life': exportLife,
        'decision-save-snapshot': () => {
            if (!syncLife() || !person().budget)
                return;
            if (d().snapshots.length >= 50)
                return toast('This workspace can hold 50 life scenarios. Remove one first.', true);
            env.openDialog(`<form id="decision-snapshot-form"><div class="modal-heading"><span class="eyebrow">KEEP THIS PERSPECTIVE</span><h2 id="dialog-title">Save your life here.</h2><p>This snapshot includes your budget, purchase price, ownership inputs, and selected what-if. It is not shared in Together.</p></div><label class="form-field"><span>Scenario name</span><input name="name" required maxlength="100" value="${e(`${current().name} · ${stressNames[s.decisionStress]}`.slice(0, 100))}"></label><p class="decision-error" role="alert"></p><div class="modal-actions"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn primary" type="submit">Save scenario</button></div></form>`);
        },
        'decision-load-snapshot': b => { const x = d().snapshots.find(x => x.id === b.dataset.id && x.participantId === person().id); if (!x)
            return; pendingSnapshot = x; const m = calculateLife(x.price, x.budget, x.inputs, x.stress, x.stressInputs), p = env.properties().find(p => p.id === x.propertyId); env.openDialog(`<div class="modal-heading"><span class="eyebrow">A SAVED PERSPECTIVE</span><h2 id="dialog-title">${e(x.name)}</h2><p>This exact snapshot uses a ${money(x.price)} purchase price and leaves ${money(m.leftover)} each month, with ${money(m.cashRemaining)} cash remaining.</p><p>Applying it replaces this profile’s household budget and the home’s ownership inputs. The live planner will use the home’s <strong>current ${money(p?.price || x.price)} price</strong>, which may differ from this snapshot.</p></div><div class="modal-actions"><button class="btn" data-action="close-dialog">Keep current inputs</button><button class="btn primary" data-action="decision-apply-snapshot">Apply to current home</button></div>`); },
        'decision-apply-snapshot': () => { const x = pendingSnapshot; if (!x || x.participantId !== person().id)
            return; person().budget = structuredClone(x.budget); person().life[x.propertyId] = structuredClone(x.inputs); d().currentPropertyId = x.propertyId; d().stressInputs = structuredClone(x.stressInputs); s.decisionStress = x.stress; s.decisionTab = 'life'; pendingSnapshot = null; env.closeDialog(); save('Saved inputs applied. The current property price is used.'); },
        'decision-delete-snapshot': b => { const x = d().snapshots.find(x => x.id === b.dataset.id && x.participantId === person().id); if (!x)
            return; env.openDialog(`<div class="modal-heading"><h2 id="dialog-title">Remove this perspective?</h2><p>${e(x.name)} will be permanently removed. Your current household plan is unchanged.</p></div><div class="modal-actions"><button class="btn" data-action="close-dialog">Keep it</button><button class="btn" data-action="decision-confirm-snapshot-delete" data-id="${e(x.id)}">Remove scenario</button></div>`); },
        'decision-confirm-snapshot-delete': b => { d().snapshots = d().snapshots.filter(x => x.id !== b.dataset.id || x.participantId !== person().id); env.closeDialog(); save('Life scenario removed.'); },
        'decision-add-person': () => { if (d().participants.length >= 8)
            return toast('Up to eight local profiles are supported.', true); env.openDialog(participantForm(undefined, [...new Set(env.properties().map(p => p.city))].sort())); },
        'decision-edit-person': b => { const w = d().participants.find(x => x.id === b.dataset.id); if (w)
            env.openDialog(participantForm(w, [...new Set(env.properties().map(p => p.city))].sort())); },
        'decision-remove-person': b => { const w = d().participants.find(x => x.id === b.dataset.id); if (!w || d().participants.length <= 1)
            return; env.openDialog(`<div class="modal-heading"><h2 id="dialog-title">Remove ${e(w.name)}’s profile?</h2><p>Their priorities, budget, ownership scenarios, and home reviews will be removed. Shared tour answers and notes are kept without the removed author attribution. Export a full workspace backup first to keep a copy.</p></div><div class="modal-actions"><button class="btn" data-action="close-dialog">Keep profile</button><button class="btn" data-action="decision-confirm-person-delete" data-id="${e(w.id)}">Remove profile</button></div>`); },
        'decision-confirm-person-delete': b => { const id = b.dataset.id; if (!id || d().participants.length <= 1)
            return; d().participants = d().participants.filter(x => x.id !== id); if (d().activeParticipantId === id)
            d().activeParticipantId = d().participants[0].id; d().snapshots = d().snapshots.filter(x => x.participantId !== id); Object.values(d().homes).forEach(h => { delete h.reviews[id]; Object.values(h.questions).forEach(q => { if (q.updatedBy === id)
            q.updatedBy = ''; }); if (h.visit.author === id)
            h.visit.author = ''; }); env.closeDialog(); save('Local profile removed.'); },
        'decision-clear-review': () => { delete home().reviews[person().id]; save('Your take was removed for this home.'); },
        'decision-question': b => questionDialog(b.dataset.id),
        'decision-delete-question': b => { const q = home().questions[b.dataset.id]; if (!q?.custom)
            return; env.openDialog(`<div class="modal-heading"><h2 id="dialog-title">Remove this question?</h2><p>${e(q.text)} and its recorded answer will be removed.</p></div><div class="modal-actions"><button class="btn" data-action="close-dialog">Keep question</button><button class="btn" data-action="decision-confirm-question-delete" data-id="${e(q.id)}">Remove question</button></div>`); },
        'decision-confirm-question-delete': b => { if (home().questions[b.dataset.id]?.custom)
            delete home().questions[b.dataset.id]; env.closeDialog(); save('Question removed.'); },
        'decision-export-tour': exportTour
    };
    document.addEventListener('click', event => { const b = event.target instanceof Element ? event.target.closest('[data-action]') : null; if (!b || b instanceof HTMLButtonElement && b.disabled)
        return; const action = actions[b.dataset.action]; if (action) {
        event.preventDefault();
        action(b);
    } });
    document.addEventListener('input', event => { const input = event.target; if (input instanceof HTMLInputElement && (input.dataset.life || input.id === 'decision-stress-value'))
        syncLife(); });
    document.addEventListener('change', event => {
        const el = event.target;
        if (!(el instanceof HTMLSelectElement || el instanceof HTMLInputElement))
            return;
        if (el.id === 'decision-person' && d().participants.some(x => x.id === el.value)) {
            d().activeParticipantId = el.value;
            save();
        }
        if (el.id === 'decision-stage' && stages.includes(el.value)) {
            home().stage = el.value;
            save('Shared stage updated.');
        }
        if (el.id === 'decision-share-budget' && el instanceof HTMLInputElement && person().budget) {
            person().shareBudget = el.checked;
            save(el.checked ? 'Only your calculated budget summary is now visible in Together.' : 'Your budget summary is no longer shown in Together.');
        }
    });
    document.addEventListener('keydown', event => { const el = event.target; if (!(el instanceof HTMLElement) || !el.matches('.decision-tabs [role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
        return; event.preventDefault(); const tabs = ['life', 'together', 'tour']; const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabs.indexOf(s.decisionTab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3; s.decisionTab = tabs[index]; env.render(); document.getElementById(`decision-tab-${s.decisionTab}`)?.focus({ preventScroll: true }); });
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || !form.id.startsWith('decision-'))
            return;
        event.preventDefault();
        if (!form.reportValidity())
            return;
        const fd = new FormData(form), str = (k) => String(fd.get(k) || '').trim(), num = (k) => str(k) === '' ? 0 : Number(str(k)), bool = (k) => fd.get(k) === 'on';
        if (form.id === 'decision-budget-form') {
            const b = { income: num('income'), expenses: num('expenses'), savings: num('savings'), cash: num('cash'), cushion: num('cushion'), example: bool('example') };
            if (!validBudget(b))
                return formError(form, 'Check all budget amounts. Use nonnegative, finite numbers.');
            person().budget = b;
            env.closeDialog();
            save('Household plan saved for this profile.');
        }
        if (form.id === 'decision-participant-form') {
            if (!str('name'))
                return formError(form, 'Add a name for this local profile.');
            const req = { city: str('city'), type: str('type'), maxPrice: num('maxPrice'), minBeds: num('minBeds'), minSqft: num('minSqft'), outdoor: bool('outdoor'), light: bool('light'), notes: str('notes') };
            if (!validPriorities(req))
                return formError(form, 'Check your priorities and numeric limits.');
            let w = d().participants.find(x => x.id === form.dataset.id);
            if (!w) {
                if (d().participants.length >= 8)
                    return;
                w = newParticipant('person-' + uid(), str('name'));
                d().participants.push(w);
            }
            w.name = str('name');
            w.priorities = req;
            env.closeDialog();
            save('Local participant priorities saved.');
        }
        if (form.id === 'decision-review-form') {
            home().reviews[person().id] = { stance: str('stance'), note: str('note'), updatedAt: Date.now() };
            save('Your take is saved for this home.');
        }
        if (form.id === 'decision-question-add') {
            if (!str('question'))
                return toast('Write a question first.', true);
            if (Object.keys(home().questions).length >= 70)
                return toast('This home has reached its custom question limit.', true);
            const id = 'question-' + uid();
            home().questions[id] = { id, text: str('question'), answer: '', source: '', resolved: false, updatedBy: person().id, updatedAt: Date.now(), custom: true };
            save('Question added to this home’s checklist.');
            document.querySelector('#decision-question-add input')?.focus({ preventScroll: true });
        }
        if (form.id === 'decision-answer-form') {
            const q = tourQuestions(current(), person().priorities, home()).find(q => q.id === form.dataset.id);
            if (!q)
                return;
            if (bool('resolved') && (!str('answer') || !str('source')))
                return formError(form, 'Add both an answer and a source before marking this question answered.');
            home().questions[q.id] = { ...q, answer: str('answer'), source: str('source'), resolved: bool('resolved'), updatedBy: person().id, updatedAt: Date.now() };
            env.closeDialog();
            save('Answer recorded. Its source remains user-supplied.');
        }
        if (form.id === 'decision-visit-form') {
            home().visit = { date: str('date'), notes: str('notes'), author: person().id };
            save('Tour notes saved locally. No booking or invitation was sent.');
        }
        if (form.id === 'decision-snapshot-form') {
            if (!str('name'))
                return formError(form, 'Give this scenario a name.');
            if (!person().budget || d().snapshots.length >= 50)
                return;
            d().snapshots.unshift({ id: 'life-' + uid(), name: str('name'), propertyId: current().id, participantId: person().id, savedAt: Date.now(), price: current().price, budget: structuredClone(person().budget), inputs: structuredClone(lifeFor(current(), person())), stress: s.decisionStress, stressInputs: { ...d().stressInputs } });
            env.closeDialog();
            save('Your life scenario is saved.');
        }
    });
    return { open, select };
}
