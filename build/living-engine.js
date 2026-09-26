import { calculate, defaultCalculatorAssumptions, withOwnershipCosts } from './finance.js';
import { seedProperties } from './data.js';
// Chosen demo coefficients, NOT empirical rates or local energy/route information.
// Fixed reference year makes the same saved inputs reproducible across sessions.
export const UTILITY_MODEL = { referenceYear: 2026, base: 65, perSqft: 0.10, agePerYear: 0.002, ageCap: 100 };
export const COMMUTE_MODEL = { roadFactor: 1.3, overheadMinutes: 5, defaultSpeedMph: 25 };
export const workAnchors = {
    center: { label: 'Center', x: 0, y: 0 }, north: { label: 'North', x: 0, y: 5 }, northeast: { label: 'Northeast', x: 5, y: 5 },
    east: { label: 'East', x: 5, y: 0 }, southeast: { label: 'Southeast', x: 5, y: -5 }, south: { label: 'South', x: 0, y: -5 },
    southwest: { label: 'Southwest', x: -5, y: -5 }, west: { label: 'West', x: -5, y: 0 }, northwest: { label: 'Northwest', x: -5, y: 5 }
};
export const freshLiving = () => ({ version: 1, commute: null, utilityOverrides: {} });
const record = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const bounded = (x, min, max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const text = (x, max) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const safeId = (x) => /^(?:sample-[0-9]+|custom-[A-Za-z0-9-]+)$/.test(x) && x.length <= 150;
export function parseCommute(x) {
    if (x === null)
        return null;
    if (!record(x))
        throw new Error('Work setup must be a local commute choice.');
    // Reconstruct the permitted fields: remote mode never retains an old address.
    if (x.mode === 'remote')
        return { mode: 'remote' };
    if (x.mode !== 'simulated' || !text(x.label, 160) || !text(x.city, 100) || typeof x.state !== 'string' || !/^[A-Za-z]{2}$/.test(x.state)
        || typeof x.anchor !== 'string' || !Object.hasOwn(workAnchors, x.anchor) || !bounded(x.speedMph, 5, 80))
        throw new Error('Enter a work label, city, demo position, and assumed speed from 5 to 80 mph.');
    return { mode: 'simulated', label: x.label.trim(), city: x.city.trim(), state: x.state.toUpperCase(), anchor: x.anchor, speedMph: x.speedMph };
}
/** Backward-compatible with all pre-1.6 workspace backups. */
export function parseLiving(x) {
    if (x === undefined)
        return freshLiving();
    if (!record(x) || x.version !== 1 || !record(x.utilityOverrides) || Object.keys(x.utilityOverrides).length > 560)
        throw new Error('The backup contains invalid cost-of-living settings.');
    for (const [id, v] of Object.entries(x.utilityOverrides))
        if (!safeId(id) || !bounded(v, 0, 1_000_000))
            throw new Error('Utility estimates must use valid property IDs and amounts from $0 to $1,000,000 per month.');
    return { version: 1, commute: parseCommute(x.commute), utilityOverrides: { ...x.utilityOverrides } };
}
export function pruneLiving(x, ids) {
    return { ...x, utilityOverrides: Object.fromEntries(Object.entries(x.utilityOverrides).filter(([id]) => ids.has(id))) };
}
export function utilityEstimate(p, override) {
    if (!bounded(p.sqft, 1, 1_000_000) || !bounded(p.yearBuilt, 1700, 2200))
        throw new RangeError('A valid size and construction year are required for the utility estimate.');
    if (override !== undefined && !bounded(override, 0, 1_000_000))
        throw new RangeError('Utility estimate must be between $0 and $1,000,000 per month.');
    const age = Math.max(0, UTILITY_MODEL.referenceYear - p.yearBuilt);
    const ageUsed = Math.min(age, UTILITY_MODEL.ageCap);
    const factor = 1 + ageUsed * UTILITY_MODEL.agePerYear;
    const formulaMonthly = Math.round(UTILITY_MODEL.base + UTILITY_MODEL.perSqft * p.sqft * factor);
    return { monthly: override ?? formulaMonthly, formulaMonthly, age, ageUsed, factor, manual: override !== undefined, futureYear: p.yearBuilt > UTILITY_MODEL.referenceYear };
}
/** Resolve the SAME last-valid per-property calculator plan, never a different home's active inputs. */
export function livingAssumptions(p, w) {
    const draft = w.calculator.drafts[p.id];
    return draft ? withOwnershipCosts(draft) : defaultCalculatorAssumptions(p);
}
export function calculateLiving(p, w) {
    const assumptions = livingAssumptions(p, w), metrics = calculate(assumptions);
    const utilities = utilityEstimate(p, w.living.utilityOverrides[p.id]);
    // Owner occupancy cannot count full rental income. Management is a rental-only
    // expense. Keep the existing maintenance and capital reserves, disclosing their bases.
    const ownerBeforeUtilities = metrics.totalOutflow - metrics.management;
    return { assumptions, metrics, utilities, customized: !!w.calculator.drafts[p.id], ownerBeforeUtilities,
        ownerMonthly: ownerBeforeUtilities + utilities.monthly,
        rentalAfterUtilities: metrics.cashflow - utilities.monthly };
}
// Every city uses its own invented, mile-unit coordinate grid. These points do
// NOT encode an address, neighborhood position, proximity, or geographical fact.
const demoPoints = [{ x: -3.5, y: 2 }, { x: 1.2, y: -4.2 }, { x: 5, y: 1.5 }, { x: -5, y: -3 }, { x: 2.5, y: 3.7 }, { x: -1.8, y: 6.1 }];
export function demoPoint(p) {
    if (p.custom)
        return null;
    const group = seedProperties.filter(x => x.city === p.city && x.state === p.state);
    const index = group.findIndex(x => x.id === p.id);
    return index < 0 ? null : { ...demoPoints[index % demoPoints.length] };
}
export function estimateCommute(p, work) {
    const choice = parseCommute(work);
    if (!choice)
        return { kind: 'unset' };
    if (choice.mode === 'remote')
        return { kind: 'remote' };
    if (p.city.toLowerCase() !== choice.city.toLowerCase() || p.state.toUpperCase() !== choice.state)
        return { kind: 'outside-city' };
    const home = demoPoint(p);
    if (!home)
        return { kind: 'no-position' };
    const target = workAnchors[choice.anchor];
    const straightMiles = Math.hypot(home.x - target.x, home.y - target.y);
    const roadMiles = straightMiles * COMMUTE_MODEL.roadFactor;
    const minutes = roadMiles === 0 ? 0 : Math.ceil(roadMiles / choice.speedMph * 60 + COMMUTE_MODEL.overheadMinutes);
    return { kind: 'simulated', straightMiles, roadMiles, minutes, home, work: { x: target.x, y: target.y }, speedMph: choice.speedMph };
}
