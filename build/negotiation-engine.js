import { median } from './finance.js';
import { NEGOTIATION_SNAPSHOT, listingHistories, soldComparables } from './negotiation-data.js';
/** Explicit demo selection policy; no inferred neighborhood quality or seller motives. */
export const COMPARABLE_POLICY = Object.freeze({ maxAgeDays: 180, maxSizeDifference: 0.20, maxBedroomDifference: 1, minCount: 3, maxCount: 5 });
const DAY_MS = 86_400_000;
const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const positive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
/** UTC calendar dates only. Rejects rollover dates such as 2026-02-30. No wall clock. */
export function dayNumber(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return null;
    const ms = Date.parse(date + 'T00:00:00.000Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date ? ms / DAY_MS : null;
}
export function elapsedDays(start, end) {
    const a = dayNumber(start), b = dayNumber(end);
    return a !== null && b !== null && b >= a ? b - a : null;
}
export function displayDate(date) {
    return dayNumber(date) === null ? 'Date unavailable' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
}
/** Refuse inconsistent history rather than silently repair it to match the asking price. */
export function summarizeHistory(p, h, snapshot = NEGOTIATION_SNAPSHOT) {
    if (p.custom || !h || h.propertyId !== p.id || h.address !== p.address || h.city !== p.city || h.state !== p.state || !positive(p.price))
        return null;
    const days = elapsedDays(h.listedOn, snapshot);
    if (days === null || !Array.isArray(h.events) || h.events.length === 0 || h.events[0].date !== h.listedOn)
        return null;
    if (h.events[h.events.length - 1].price !== p.price)
        return null;
    const events = [];
    let priorDate = null, priorPrice = 0;
    for (const event of h.events) {
        const day = dayNumber(event.date);
        if (day === null || !positive(event.price) || elapsedDays(event.date, snapshot) === null || (priorDate !== null && day <= priorDate))
            return null;
        const change = priorDate === null ? 0 : event.price - priorPrice;
        events.push({ ...event, change, changePercent: priorDate === null ? 0 : change / priorPrice * 100 });
        priorDate = day;
        priorPrice = event.price;
    }
    return { listedOn: h.listedOn, daysOnMarket: days, originalPrice: events[0].price, currentPrice: p.price,
        dropCount: events.filter(x => x.change < 0).length, totalReductions: events.reduce((n, x) => n + Math.max(0, -x.change), 0), events };
}
function eligibleSale(p, s, snapshot) {
    if (!s || !s.id || typeof s.address !== 'string' || !s.address.trim() || !s.city || !s.state || !s.neighborhood)
        return false;
    if (s.id === p.id || normalize(s.city) !== normalize(p.city) || normalize(s.state) !== normalize(p.state) || normalize(s.neighborhood) !== normalize(p.neighborhood) || s.type !== p.type)
        return false;
    if (normalize(s.address) === normalize(p.address) || !positive(s.price) || !positive(s.sqft) || !Number.isInteger(s.beds) || s.beds < 0)
        return false;
    const age = elapsedDays(s.soldOn, snapshot);
    return age !== null && age <= COMPARABLE_POLICY.maxAgeDays && Math.abs(s.sqft - p.sqft) <= p.sqft * COMPARABLE_POLICY.maxSizeDifference + 1e-8 && Math.abs(s.beds - p.beds) <= COMPARABLE_POLICY.maxBedroomDifference;
}
/** Select by size similarity, never by a favorable sale price. Display newest first. */
export function selectComparableSales(p, sales, snapshot = NEGOTIATION_SNAPSHOT) {
    if (p.custom || !positive(p.sqft) || !Number.isInteger(p.beds) || p.beds < 0 || !p.city?.trim() || !p.state?.trim() || !p.neighborhood?.trim() || dayNumber(snapshot) === null)
        return [];
    const idCounts = new Map();
    for (const sale of sales)
        if (sale?.id)
            idCounts.set(sale.id, (idCounts.get(sale.id) || 0) + 1);
    const addresses = new Map();
    for (const sale of sales) {
        // Conflicting duplicate IDs are not extra evidence. A repeated address counts once.
        if (!eligibleSale(p, sale, snapshot) || idCounts.get(sale.id) !== 1)
            continue;
        const address = normalize(sale.address), previous = addresses.get(address);
        if (!previous || sale.soldOn > previous.soldOn || sale.soldOn === previous.soldOn && sale.id < previous.id)
            addresses.set(address, sale);
    }
    return [...addresses.values()].sort((a, b) => Math.abs(a.sqft - p.sqft) - Math.abs(b.sqft - p.sqft) || b.soldOn.localeCompare(a.soldOn) || a.id.localeCompare(b.id))
        .slice(0, COMPARABLE_POLICY.maxCount).sort((a, b) => b.soldOn.localeCompare(a.soldOn) || a.id.localeCompare(b.id));
}
/** Median of individual $/sq ft ratios, not ratio of medians or average prices. */
export function compareSales(p, sales) {
    if (!positive(p.price) || !positive(p.sqft) || sales.length < COMPARABLE_POLICY.minCount || sales.length > COMPARABLE_POLICY.maxCount || sales.some(s => !positive(s.price) || !positive(s.sqft)))
        return null;
    const askingPerSqft = p.price / p.sqft, medianSoldPerSqft = median(sales.map(s => s.price / s.sqft));
    const differencePercent = (askingPerSqft / medianSoldPerSqft - 1) * 100;
    if (!positive(askingPerSqft) || !positive(medianSoldPerSqft) || !Number.isFinite(differencePercent))
        return null;
    const displayedPercent = Math.round(Math.abs(differencePercent) * 10) / 10;
    return { count: sales.length, askingPerSqft, medianSoldPerSqft, differencePercent, displayedPercent,
        direction: displayedPercent === 0 ? 'similar' : differencePercent < 0 ? 'below' : 'above' };
}
export function comparisonTakeaway(comparison) {
    if (!comparison)
        return 'Not enough comparable sample sales to calculate a price comparison.';
    return comparison.direction === 'similar'
        ? 'Asking price per sq ft is within 0.1% of this sample’s median sold price per sq ft.'
        : `Asking about ${comparison.displayedPercent.toFixed(1)}% ${comparison.direction} this sample’s median sold price per sq ft.`;
}
export function negotiationReport(p, histories = listingHistories, sales = soldComparables, snapshot = NEGOTIATION_SNAPSHOT) {
    const h = Object.hasOwn(histories, p.id) ? histories[p.id] : undefined;
    if (p.custom || !h || h.propertyId !== p.id || h.address !== p.address || h.city !== p.city || h.state !== p.state || dayNumber(snapshot) === null) {
        return { snapshot, status: 'no-fixture', history: null, sales: [], comparison: null, takeaway: 'No sample history or comparable sales are attached to this property.' };
    }
    const history = summarizeHistory(p, h, snapshot), selected = selectComparableSales(p, sales, snapshot), comparison = compareSales(p, selected);
    return { snapshot, status: comparison ? 'available' : 'insufficient', history, sales: selected, comparison, takeaway: comparisonTakeaway(comparison) };
}
