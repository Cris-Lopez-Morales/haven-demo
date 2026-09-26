import { mortgagePayment } from './finance.js';
export const stages = ['Considering', 'Want to tour', 'Need answers', 'Final shortlist'];
export const stressNames = { baseline: 'My everyday plan', income: 'Less income', expenses: 'Higher expenses', repair: 'Unexpected repair' };
export const emptyPriorities = () => ({ city: '', type: '', maxPrice: 0, minBeds: 0, minSqft: 0, outdoor: false, light: false, notes: '' });
export const newParticipant = (id = 'person-me', name = 'You') => ({ id, name, budget: null, priorities: emptyPriorities(), shareBudget: false, life: {} });
export const freshDecisions = () => ({ version: 1, currentPropertyId: 'sample-1', activeParticipantId: 'person-me', participants: [newParticipant()], homes: {}, stressInputs: { incomeDrop: 20, expenseIncrease: 300, repairCost: 5000 }, snapshots: [] });
export const emptyDecisionHome = () => ({ stage: 'Considering', reviews: {}, questions: {}, visit: { date: '', notes: '', author: '' } });
export const activeParticipant = (d) => d.participants.find(p => p.id === d.activeParticipantId) || d.participants[0];
export const exampleBudget = () => ({ income: 7000, expenses: 1600, savings: 800, cash: 110000, cushion: 600, example: true });
export const defaultLifeInputs = (p) => ({ downPercent: 20, interestRate: 6.5, years: 30, closingPercent: 3, taxAnnual: p.taxAnnual, insuranceMonthly: p.insuranceMonthly, hoaMonthly: p.hoaMonthly, mortgageInsurance: 0, utilities: 250, maintenance: Math.round(p.price * .01 / 12), moving: 1500, repairs: 0 });
export const lifeFor = (p, who) => who.life[p.id] || defaultLifeInputs(p);
const numeric = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const record = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 100) => typeof value === 'string' && value.length <= max;
const safeKey = (key) => /^[a-zA-Z0-9][a-zA-Z0-9-]{0,149}$/.test(key) && !['constructor', 'prototype', '__proto__'].includes(key);
const finiteFields = (v, limits) => Object.entries(limits).every(([k, [min, max]]) => numeric(v[k], min, max));
export const lifeLimits = { downPercent: [0, 100], interestRate: [0, 30], years: [1, 50], closingPercent: [0, 30], taxAnnual: [0, 1000000], insuranceMonthly: [0, 100000], hoaMonthly: [0, 100000], mortgageInsurance: [0, 100000], utilities: [0, 100000], maintenance: [0, 100000], moving: [0, 10000000], repairs: [0, 10000000] };
export function validBudget(v) { return record(v) && finiteFields(v, { income: [0, 1000000], expenses: [0, 1000000], savings: [0, 1000000], cash: [0, 1000000000], cushion: [0, 1000000] }) && typeof v.example === 'boolean'; }
export function validLife(v) { return record(v) && finiteFields(v, lifeLimits) && Number.isInteger(v.years); }
export function validStress(v) { return record(v) && finiteFields(v, { incomeDrop: [0, 100], expenseIncrease: [0, 1000000], repairCost: [0, 100000000] }); }
export function validPriorities(v) { return record(v) && text(v.city, 100) && ['', 'Single-family', 'Condo', 'Townhouse', 'Duplex'].includes(String(v.type)) && finiteFields(v, { maxPrice: [0, 100000000], minBeds: [0, 100], minSqft: [0, 1000000] }) && typeof v.outdoor === 'boolean' && typeof v.light === 'boolean' && text(v.notes, 2000); }
/** Pure, unrounded owner-occupant model. No rental income, tax savings, appreciation, or eligibility claims. */
export function calculateLife(price, b, a, kind = 'baseline', stress = { incomeDrop: 20, expenseIncrease: 300, repairCost: 5000 }) {
    if (!numeric(price, 1, 100000000) || !validBudget(b) || !validLife(a) || !validStress(stress) || !Object.hasOwn(stressNames, kind))
        throw new RangeError('Check the household budget and ownership assumptions.');
    const down = price * a.downPercent / 100, closing = price * a.closingPercent / 100;
    const mortgage = mortgagePayment(price - down, a.interestRate, a.years);
    const pmi = down === price ? 0 : a.mortgageInsurance;
    const tax = a.taxAnnual / 12;
    const housing = mortgage + tax + a.insuranceMonthly + a.hoaMonthly + pmi + a.utilities + a.maintenance;
    const incomeLoss = kind === 'income' ? b.income * stress.incomeDrop / 100 : 0;
    const expenseStress = kind === 'expenses' ? stress.expenseIncrease : 0;
    const repairStress = kind === 'repair' ? stress.repairCost : 0;
    const income = b.income - incomeLoss, expenses = b.expenses + expenseStress;
    const leftover = income - housing - expenses - b.savings;
    const upfront = down + closing + a.moving + a.repairs;
    return { mortgage, tax, insurance: a.insuranceMonthly, hoa: a.hoaMonthly, pmi, utilities: a.utilities, maintenance: a.maintenance, housing, income, expenses, savings: b.savings, leftover, cushionGap: leftover - b.cushion, down, closing, moving: a.moving, initialRepairs: a.repairs, upfront, cashRemaining: b.cash - upfront - repairStress, repairStress, expenseStress, incomeLoss };
}
/** An absent feature means unverified, not false. Aggregate duplex figures never prove per-unit capacity. */
export function assessFit(p, req) {
    const out = [];
    const add = (label, fit, detail) => out.push({ label, status: fit ? 'fits' : 'tradeoff', detail });
    if (req.maxPrice)
        add('Purchase price', p.price <= req.maxPrice, `$${p.price.toLocaleString('en-US')} asking price against your $${req.maxPrice.toLocaleString('en-US')} limit.`);
    if (req.city)
        add('City', p.city.toLowerCase() === req.city.trim().toLowerCase(), `${p.city}, ${p.state}; requested ${req.city}.`);
    if (req.type)
        add('Property type', p.type === req.type, `${p.type}; requested ${req.type}.`);
    if (req.minBeds) {
        if (p.type === 'Duplex')
            out.push({ label: 'Bedrooms per unit', status: 'unknown', detail: `${p.beds} bedrooms combined across the duplex; your ${req.minBeds}-bedroom requirement cannot be verified for one unit.` });
        else
            add('Bedrooms', p.beds >= req.minBeds, `${p.beds} bedrooms; you requested at least ${req.minBeds}.`);
    }
    if (req.minSqft) {
        if (p.type === 'Duplex')
            out.push({ label: 'Floor area per unit', status: 'unknown', detail: `${p.sqft.toLocaleString('en-US')} sq ft combined; no per-unit size to check against your ${req.minSqft.toLocaleString('en-US')} sq ft minimum.` });
        else
            add('Floor area', p.sqft >= req.minSqft, `${p.sqft.toLocaleString('en-US')} sq ft; you requested at least ${req.minSqft.toLocaleString('en-US')}.`);
    }
    const tags = p.tags.join(' ').toLowerCase();
    if (req.outdoor)
        out.push(/outdoor|garden|terrace/.test(tags) ? { label: 'Outdoor space', status: 'fits', detail: `Listed feature: ${p.tags.filter(x => /outdoor|garden|terrace/i.test(x)).join(', ')}. Condition and exclusive use are not verified.` } : { label: 'Outdoor space', status: 'unknown', detail: 'Outdoor space is not specified in this listing; ask before relying on it.' });
    if (req.light)
        out.push(/natural light|light-filled/.test(tags) ? { label: 'Natural light', status: 'fits', detail: 'The demo listing mentions natural light. Verify the light during your visit.' } : { label: 'Natural light', status: 'unknown', detail: 'Natural light is not specified in this listing.' });
    if (req.notes.trim())
        out.push({ label: 'Other priorities', status: 'unknown', detail: `Review manually: ${req.notes.trim()}` });
    return out;
}
export function sharedFit(p, people) {
    const sets = people.map(w => assessFit(p, w.priorities));
    if (sets.some(s => !s.length))
        return { met: false, status: 'Add priorities', detail: 'Every participant needs at least one priority before common fit can be checked.' };
    const all = sets.flat(), bad = all.filter(s => s.status === 'tradeoff').length, unknown = all.filter(s => s.status === 'unknown').length;
    if (bad)
        return { met: false, status: 'Trade-offs to discuss', detail: `${bad} stated requirement${bad === 1 ? ' is' : 's are'} not met${unknown ? `; ${unknown} still need checking` : ''}.` };
    if (unknown)
        return { met: false, status: 'Needs verification', detail: `${unknown} requirement${unknown === 1 ? ' is' : 's are'} unverified; known numerical requirements are met.` };
    return { met: true, status: 'Matches stated priorities', detail: `Meets the recorded criteria for all ${people.length} participant${people.length === 1 ? '' : 's'}. This is not an overall home rating.` };
}
const baseQuestions = [
    ['roof', 'When was the roof last replaced or inspected, and are records available?'],
    ['systems', 'How old are the heating, cooling, plumbing, and electrical systems?'],
    ['condition', 'Are there inspection reports, known defects, water intrusion, or major past repairs?'],
    ['utilities', 'Can you provide recent utility bills and explain what they include?'],
    ['costs', 'What taxes, insurance, fees, and upfront costs should I verify for this purchase?']
];
export function tourQuestions(p, req, home) {
    const items = [...baseQuestions];
    if (p.hoaMonthly > 0 || p.type === 'Condo' || p.type === 'Townhouse')
        items.push(['hoa', 'What do the association fees cover, and are there rules, reserves, or upcoming assessments?']);
    if (req.outdoor || p.tags.some(x => /outdoor|garden|terrace/i.test(x)))
        items.push(['outdoor', 'Is the outdoor space private or shared, and who handles its maintenance?']);
    if (req.light)
        items.push(['light', 'How does natural light change throughout the day? Can I visit at another time?']);
    if (p.type === 'Duplex')
        items.push(['units', 'What are the bedrooms, floor area, entrances, and occupancy details for each individual unit?']);
    if (req.notes.trim())
        items.push(['priorities', `Can we verify these additional priorities: ${req.notes.trim()}?`]);
    const questions = items.map(([id, question]) => home.questions[id] || { id, text: question, answer: '', source: '', resolved: false, updatedBy: '', updatedAt: 0, custom: false });
    // Preserve answered or custom questions when a participant changes their priorities.
    Object.values(home.questions).forEach(q => { if (!questions.some(x => x.id === q.id))
        questions.push(q); });
    return questions;
}
export function pruneDecisions(d, propertyIds) {
    d.currentPropertyId = propertyIds.has(d.currentPropertyId) ? d.currentPropertyId : 'sample-1';
    d.homes = Object.fromEntries(Object.entries(d.homes).filter(([id]) => propertyIds.has(id)));
    d.participants.forEach(p => p.life = Object.fromEntries(Object.entries(p.life).filter(([id]) => propertyIds.has(id))));
    d.snapshots = d.snapshots.filter(s => propertyIds.has(s.propertyId));
    return d;
}
/** Strictly validate untrusted backup data; missing extension is migrated from Haven 1.0–1.3. */
export function parseDecisions(value) {
    if (value === undefined)
        return freshDecisions();
    const fail = () => { throw new Error('The backup contains invalid home-decision data.'); };
    if (!record(value) || value.version !== 1 || !text(value.currentPropertyId, 150) || !safeKey(value.currentPropertyId) || !text(value.activeParticipantId, 150) || !validStress(value.stressInputs))
        return fail();
    if (!Array.isArray(value.participants) || value.participants.length < 1 || value.participants.length > 8)
        return fail();
    for (const p of value.participants) {
        if (!record(p) || !text(p.id, 150) || !safeKey(p.id) || !text(p.name, 40) || !p.name.trim() || !(p.budget === null || validBudget(p.budget)) || !validPriorities(p.priorities) || typeof p.shareBudget !== 'boolean' || !record(p.life) || Object.keys(p.life).length > 560)
            return fail();
        if (!Object.entries(p.life).every(([k, v]) => safeKey(k) && validLife(v)))
            return fail();
    }
    const personIds = new Set(value.participants.map(p => p.id));
    if (personIds.size !== value.participants.length || !personIds.has(value.activeParticipantId))
        return fail();
    if (!record(value.homes) || Object.keys(value.homes).length > 560)
        return fail();
    for (const [key, home] of Object.entries(value.homes)) {
        if (!safeKey(key) || !record(home) || !stages.includes(home.stage) || !record(home.reviews) || Object.keys(home.reviews).length > 8 || !record(home.questions) || Object.keys(home.questions).length > 80 || !record(home.visit) || !text(home.visit.date, 16) || !/^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/.test(home.visit.date) || !text(home.visit.notes, 5000) || !text(home.visit.author, 150) || home.visit.author !== '' && !personIds.has(home.visit.author))
            return fail();
        for (const [id, r] of Object.entries(home.reviews)) {
            if (!personIds.has(id) || !record(r) || !['Interested', 'Unsure', 'Not for me'].includes(String(r.stance)) || !text(r.note, 3000) || !numeric(r.updatedAt, 0, Number.MAX_SAFE_INTEGER))
                return fail();
        }
        for (const [id, q] of Object.entries(home.questions)) {
            if (!safeKey(id) || !record(q) || q.id !== id || !text(q.text, 2200) || !q.text.trim() || !text(q.answer, 4000) || !text(q.source, 500) || typeof q.resolved !== 'boolean' || typeof q.custom !== 'boolean' || !text(q.updatedBy, 150) || q.updatedBy !== '' && !personIds.has(q.updatedBy) || !numeric(q.updatedAt, 0, Number.MAX_SAFE_INTEGER) || q.resolved && (!q.answer.trim() || !q.source.trim()))
                return fail();
        }
    }
    if (!Array.isArray(value.snapshots) || value.snapshots.length > 50)
        return fail();
    for (const s of value.snapshots) {
        if (!record(s) || !text(s.id, 150) || !safeKey(s.id) || !text(s.name, 100) || !s.name.trim() || !text(s.propertyId, 150) || !safeKey(s.propertyId) || !personIds.has(s.participantId) || !numeric(s.savedAt, 0, Number.MAX_SAFE_INTEGER) || !numeric(s.price, 1, 100000000) || !validBudget(s.budget) || !validLife(s.inputs) || !Object.hasOwn(stressNames, String(s.stress)) || !validStress(s.stressInputs))
            return fail();
    }
    if (new Set(value.snapshots.map(s => s.id)).size !== value.snapshots.length)
        return fail();
    return structuredClone(value);
}
