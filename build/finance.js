/** Fixed-rate, fully amortizing monthly principal and interest. Rate is a percent. */
export function mortgagePayment(principal, annualRate, years) {
    if (![principal, annualRate, years].every(Number.isFinite) || principal < 0 || annualRate < 0 || years <= 0) {
        throw new RangeError('Principal and rate must be nonnegative, and the loan term must be positive.');
    }
    if (principal === 0)
        return 0;
    const months = Math.round(years * 12);
    if (months < 1)
        throw new RangeError('The loan term must be at least one month.');
    const rate = annualRate / 1200;
    if (rate === 0)
        return principal / months;
    // This form avoids overflowing (1 + r)^n for large terms.
    return principal * rate / (-Math.expm1(-months * Math.log1p(rate)));
}
export const inputRules = {
    price: { min: 1, max: 100_000_000, label: 'Purchase price' },
    downPercent: { min: 0, max: 100, label: 'Down payment' },
    interestRate: { min: 0, max: 30, label: 'Interest rate' },
    years: { min: 1, max: 50, label: 'Loan term' },
    rent: { min: 0, max: 1_000_000, label: 'Monthly rent' },
    taxAnnual: { min: 0, max: 1_000_000, label: 'Annual property tax' },
    insuranceMonthly: { min: 0, max: 100_000, label: 'Monthly insurance' },
    hoaMonthly: { min: 0, max: 100_000, label: 'Monthly HOA' },
    vacancyPercent: { min: 0, max: 100, label: 'Vacancy allowance' },
    maintenancePercent: { min: 0, max: 100, label: 'Maintenance allowance' },
    managementPercent: { min: 0, max: 100, label: 'Management fee' },
    capexPercent: { min: 0, max: 100, label: 'Capital reserve' },
    closingPercent: { min: 0, max: 30, label: 'Closing costs' },
    initialRepairs: { min: 0, max: 10_000_000, label: 'Initial repairs' },
    mortgageInsuranceMonthly: { min: 0, max: 100_000, label: 'Monthly mortgage insurance' }
};
export function validateAssumptions(a) {
    const errors = Object.keys(inputRules).flatMap(key => {
        const { min, max, label } = inputRules[key];
        if (key === 'years' && Number.isFinite(a[key]) && !Number.isInteger(a[key]))
            return ['Loan term must use whole years.'];
        return typeof a[key] !== 'number' || !Number.isFinite(a[key]) || a[key] < min || a[key] > max
            ? [`${label} must be between ${min.toLocaleString('en-US')} and ${max.toLocaleString('en-US')}.`] : [];
    });
    if (a.costs !== undefined)
        errors.push(...validateOwnershipCosts(a.costs));
    return errors;
}
export function defaultAssumptions(p) {
    return {
        price: p.price, downPercent: 20, interestRate: 6.5, years: 30,
        rent: p.rent, taxAnnual: p.taxAnnual, insuranceMonthly: p.insuranceMonthly,
        hoaMonthly: p.hoaMonthly, vacancyPercent: 5, maintenancePercent: 5,
        managementPercent: 8, capexPercent: 3, closingPercent: 3,
        initialRepairs: 0, mortgageInsuranceMonthly: 0
    };
}
/** Ownership controls are an additive layer: old assumptions retain their old semantics. */
export function validateOwnershipCosts(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return ['Ownership cost inputs must be an object.'];
    const c = value;
    const errors = [];
    const number = (key, label, max) => {
        if (typeof c[key] !== 'number' || !Number.isFinite(c[key]) || Number(c[key]) < 0 || Number(c[key]) > max)
            errors.push(`${label} must be between 0 and ${max.toLocaleString('en-US')}.`);
    };
    number('taxRatePercent', 'Annual property tax rate (%)', 100_000_000);
    // The wide tax bound keeps valid legacy extreme-price scenarios importable.
    // Values above 10% receive a visible review warning; no value is silently clamped.
    number('insuranceAnnual', 'Annual insurance estimate ($)', 1_200_000);
    if (!['monthly', 'home-value'].includes(String(c.maintenanceBasis)))
        errors.push('Choose dollars per month or percent of home value per year for maintenance.');
    number('maintenanceValue', c.maintenanceBasis === 'monthly' ? 'Monthly maintenance reserve ($)' : 'Annual maintenance reserve (%)', c.maintenanceBasis === 'monthly' ? 1_000_000 : 100_000_000);
    if (typeof c.hoaApplicable !== 'boolean')
        errors.push('HOA applicability must be on or off.');
    if (!['percent', 'amount'].includes(String(c.closingBasis)))
        errors.push('Choose percent of price or a one-time dollar amount for closing costs.');
    number('closingValue', c.closingBasis === 'amount' ? 'One-time closing costs ($)' : 'One-time closing costs (%)', c.closingBasis === 'amount' ? 100_000_000 : 30);
    return errors;
}
/** Preserve each legacy result when opening a snapshot; never mutate the snapshot. */
export function withOwnershipCosts(a) {
    const errors = validateAssumptions(a);
    if (errors.length)
        throw new RangeError(errors.join(' '));
    return { ...a, costs: a.costs ? { ...a.costs } : {
            taxRatePercent: a.taxAnnual / a.price * 100,
            insuranceAnnual: a.insuranceMonthly * 12,
            maintenanceBasis: 'monthly', maintenanceValue: a.rent * a.maintenancePercent / 100,
            hoaApplicable: a.hoaMonthly > 0,
            closingBasis: 'percent', closingValue: a.closingPercent
        } };
}
/** Initial rate is derived from the fictional entry, rounded to 0.001 percentage point. */
export function defaultCalculatorAssumptions(p) {
    const a = withOwnershipCosts(defaultAssumptions(p));
    a.costs.taxRatePercent = Math.round(a.costs.taxRatePercent * 1000) / 1000;
    return a;
}
export function cloneAssumptions(a) {
    return { ...a, ...(a.costs ? { costs: { ...a.costs } } : {}) };
}
/** Pure conversion between equivalent display units; no rounding or double-counting. */
export function changeCostBasis(a, field, basis) {
    const next = withOwnershipCosts(a), c = next.costs;
    if (field === 'maintenanceBasis') {
        if (basis !== 'monthly' && basis !== 'home-value')
            throw new RangeError('Unknown maintenance unit.');
        const monthly = c.maintenanceBasis === 'monthly' ? c.maintenanceValue : a.price * c.maintenanceValue / 1200;
        c.maintenanceValue = basis === 'monthly' ? monthly : monthly * 1200 / a.price;
        c.maintenanceBasis = basis;
    }
    else {
        if (basis !== 'percent' && basis !== 'amount')
            throw new RangeError('Unknown closing-cost unit.');
        const amount = c.closingBasis === 'amount' ? c.closingValue : a.price * c.closingValue / 100;
        c.closingValue = basis === 'amount' ? amount : amount / a.price * 100;
        c.closingBasis = basis;
    }
    const errors = validateAssumptions(next);
    if (errors.length)
        throw new RangeError('This amount cannot be represented in the selected units: ' + errors[0]);
    return next;
}
export function resolvedOwnershipCosts(a) {
    const c = a.costs;
    return c ? {
        tax: a.price * c.taxRatePercent / 1200,
        insurance: c.insuranceAnnual / 12,
        maintenance: c.maintenanceBasis === 'monthly' ? c.maintenanceValue : a.price * c.maintenanceValue / 1200,
        hoa: c.hoaApplicable ? a.hoaMonthly : 0,
        closing: c.closingBasis === 'amount' ? c.closingValue : a.price * c.closingValue / 100
    } : {
        tax: a.taxAnnual / 12, insurance: a.insuranceMonthly,
        maintenance: a.rent * a.maintenancePercent / 100, hoa: a.hoaMonthly,
        closing: a.price * a.closingPercent / 100
    };
}
/** Unlevered NOI excludes debt service and capital reserves; cash flow includes both. */
export function calculate(a) {
    const errors = validateAssumptions(a);
    if (errors.length)
        throw new RangeError(errors.join(' '));
    const downPayment = a.price * a.downPercent / 100;
    const loan = a.price - downPayment;
    const mortgage = mortgagePayment(loan, a.interestRate, a.years);
    const vacancy = a.rent * a.vacancyPercent / 100;
    const effectiveRent = a.rent - vacancy;
    const costs = resolvedOwnershipCosts(a);
    const tax = costs.tax, maintenance = costs.maintenance;
    const management = effectiveRent * a.managementPercent / 100;
    const capex = a.rent * a.capexPercent / 100;
    const operatingExpenses = tax + costs.insurance + costs.hoa + maintenance + management;
    const noiMonthly = effectiveRent - operatingExpenses;
    const mortgageInsurance = loan > 0 ? a.mortgageInsuranceMonthly : 0;
    const totalOutflow = operatingExpenses + mortgage + capex + mortgageInsurance;
    const cashflow = effectiveRent - totalOutflow;
    const cashInvested = downPayment + costs.closing + a.initialRepairs;
    return {
        loan, downPayment, mortgage, vacancy, effectiveRent, tax,
        insurance: costs.insurance, hoa: costs.hoa, maintenance, management,
        capex, operatingExpenses, noiMonthly, totalOutflow, cashflow,
        capRate: noiMonthly * 12 / a.price * 100, cashInvested,
        closingCosts: costs.closing, firstYearOutlay: cashInvested + totalOutflow * 12,
        cashOnCash: cashInvested > 0 ? cashflow * 12 / cashInvested * 100 : null
    };
}
export function amortization(a) {
    const m = calculate(a);
    if (m.loan === 0)
        return [];
    const result = [];
    let balance = m.loan, principal = 0, interest = 0;
    const months = Math.round(a.years * 12);
    for (let month = 1; month <= months; month++) {
        const interestPayment = balance * a.interestRate / 1200;
        const principalPayment = Math.min(balance, Math.max(0, m.mortgage - interestPayment));
        balance = Math.max(0, balance - principalPayment);
        principal += principalPayment;
        interest += interestPayment;
        if (month % 12 === 0 || month === months) {
            result.push({ year: Math.ceil(month / 12), principal, interest, balance: balance < 0.01 ? 0 : balance });
            principal = 0;
            interest = 0;
        }
    }
    return result;
}
export const defaultFilters = { query: '', city: '', type: '', maxPrice: 0, minBeds: 0, minSqft: 0, positiveOnly: false };
export function filterProperties(properties, filters, sort = 'featured') {
    const terms = filters.query.trim().toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean);
    const cache = new Map();
    const metrics = (p) => {
        if (!cache.has(p.id))
            cache.set(p.id, calculate(defaultAssumptions(p)));
        return cache.get(p.id);
    };
    const result = properties.filter(p => {
        const text = [p.name, p.address, p.city, p.state, p.neighborhood, p.type].join(' ').toLocaleLowerCase('en-US');
        return terms.every(term => text.includes(term)) && (!filters.city || p.city === filters.city)
            && (!filters.type || p.type === filters.type) && (!filters.maxPrice || p.price <= filters.maxPrice)
            && p.beds >= filters.minBeds && p.sqft >= filters.minSqft
            && (!filters.positiveOnly || metrics(p).cashflow >= 0);
    });
    const comparators = {
        recommended: (a, b) => b.addedAt - a.addedAt,
        featured: (a, b) => b.addedAt - a.addedAt,
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        cashflow: (a, b) => metrics(b).cashflow - metrics(a).cashflow,
        caprate: (a, b) => metrics(b).capRate - metrics(a).capRate
    };
    return result.sort(comparators[sort]);
}
export function median(values) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/** Mitigate formula execution when a spreadsheet opens exported user-supplied text. */
export function csvCell(value) {
    const text = String(value);
    const safe = typeof value === 'string' && /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
}
export function toCSV(rows) {
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
