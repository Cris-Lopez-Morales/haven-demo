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
    return Object.keys(inputRules).flatMap(key => {
        const { min, max, label } = inputRules[key];
        if (key === 'years' && Number.isFinite(a[key]) && !Number.isInteger(a[key]))
            return ['Loan term must use whole years.'];
        return typeof a[key] !== 'number' || !Number.isFinite(a[key]) || a[key] < min || a[key] > max
            ? [`${label} must be between ${min.toLocaleString('en-US')} and ${max.toLocaleString('en-US')}.`] : [];
    });
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
    const tax = a.taxAnnual / 12;
    const maintenance = a.rent * a.maintenancePercent / 100;
    const management = effectiveRent * a.managementPercent / 100;
    const capex = a.rent * a.capexPercent / 100;
    const operatingExpenses = tax + a.insuranceMonthly + a.hoaMonthly + maintenance + management;
    const noiMonthly = effectiveRent - operatingExpenses;
    const mortgageInsurance = loan > 0 ? a.mortgageInsuranceMonthly : 0;
    const totalOutflow = operatingExpenses + mortgage + capex + mortgageInsurance;
    const cashflow = effectiveRent - totalOutflow;
    const cashInvested = downPayment + a.price * a.closingPercent / 100 + a.initialRepairs;
    return {
        loan, downPayment, mortgage, vacancy, effectiveRent, tax,
        insurance: a.insuranceMonthly, hoa: a.hoaMonthly, maintenance, management,
        capex, operatingExpenses, noiMonthly, totalOutflow, cashflow,
        capRate: noiMonthly * 12 / a.price * 100, cashInvested,
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
