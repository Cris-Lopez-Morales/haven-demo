export function normalizeSearch(value) {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/single[ -]?family/g, 'single family house').replace(/townhomes?/g, 'townhouse')
        .replace(/apartments?/g, 'condo').replace(/[^a-z0-9]+/g, ' ').trim();
}
/** Prefix and token matching is synchronous: all 60 entries update per keystroke. */
export function searchPropertyOptions(properties, query) {
    const q = normalizeSearch(query);
    if (!q)
        return [...properties];
    const tokens = q.split(/\s+/);
    return properties.map((property, index) => {
        const name = normalizeSearch(property.name), city = normalizeSearch(property.city);
        const haystack = normalizeSearch(`${property.name} ${property.city} ${property.state} ${property.neighborhood} ${property.address} ${property.type} ${property.price} ${property.sqft}`);
        const match = tokens.every(token => haystack.includes(token));
        return { property, index, score: match ? (name.startsWith(q) ? 30 : name.includes(q) ? 20 : city.startsWith(q) ? 15 : 1) : 0 };
    }).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).map(row => row.property);
}
