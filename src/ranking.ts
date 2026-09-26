import type { Property } from './types.js';
import { calculate, defaultAssumptions } from './finance.js';

/** Every supported superlative maps to a concrete field or a disclosed formula. */
export const rankingKeys = ['relevance','price','price-desc','size','size-asc','beds','beds-asc','baths','baths-asc','newest','oldest','price-per-sqft','price-per-sqft-desc','hoa','hoa-desc','tax','rent','yield','cashflow','caprate','rent-asc','tax-desc','insurance','insurance-desc','yield-asc','cashflow-asc','caprate-asc'] as const;
export type Ranking = typeof rankingKeys[number];
interface RankingRule {
  label: string;
  field: string;
  value: (p: Property) => number;
  descending: boolean;
  format: (n: number) => string;
  explanation?: string;
}
const money = (n: number): string => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const preciseMoney = (n: number): string => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const number = (n: number): string => n.toLocaleString('en-US');
const modeled = (p: Property) => calculate(defaultAssumptions(p));
export const rankingRules: Record<Ranking, RankingRule> = {
  relevance: {label:'Lower prices first',field:'asking price',value:p=>p.price,descending:false,format:money},
  price: {label:'Lowest asking price',field:'asking price',value:p=>p.price,descending:false,format:money,explanation:'“Affordable” here means a lower fictional asking price, not a judgment about what you can afford.'},
  'price-desc': {label:'Highest asking price',field:'asking price',value:p=>p.price,descending:true,format:money},
  size: {label:'Most floor space',field:'floor area',value:p=>p.sqft,descending:true,format:n=>`${number(n)} sq ft`},
  'size-asc': {label:'Least floor space',field:'floor area',value:p=>p.sqft,descending:false,format:n=>`${number(n)} sq ft`},
  beds: {label:'Most bedrooms',field:'bedroom count',value:p=>p.beds,descending:true,format:n=>`${number(n)} bedrooms`},
  'beds-asc': {label:'Fewest bedrooms',field:'bedroom count',value:p=>p.beds,descending:false,format:n=>`${number(n)} bedrooms`},
  baths: {label:'Most bathrooms',field:'bathroom count',value:p=>p.baths,descending:true,format:n=>`${number(n)} bathrooms`},
  'baths-asc': {label:'Fewest bathrooms',field:'bathroom count',value:p=>p.baths,descending:false,format:n=>`${number(n)} bathrooms`},
  newest: {label:'Newest construction',field:'year built',value:p=>p.yearBuilt,descending:true,format:n=>`built in ${n}`},
  oldest: {label:'Oldest construction',field:'year built',value:p=>p.yearBuilt,descending:false,format:n=>`built in ${n}`},
  'price-per-sqft': {label:'Lowest price per sq ft',field:'asking price ÷ floor area',value:p=>p.price/p.sqft,descending:false,format:n=>`${preciseMoney(n)} / sq ft`,explanation:'Price per sq ft is asking price divided by listed floor area; it is not a valuation or a measure of condition.'},
  'price-per-sqft-desc': {label:'Highest price per sq ft',field:'asking price ÷ floor area',value:p=>p.price/p.sqft,descending:true,format:n=>`${preciseMoney(n)} / sq ft`},
  hoa: {label:'Lowest HOA fee',field:'monthly HOA fee',value:p=>p.hoaMonthly,descending:false,format:n=>`${money(n)} / month HOA`},
  'hoa-desc': {label:'Highest HOA fee',field:'monthly HOA fee',value:p=>p.hoaMonthly,descending:true,format:n=>`${money(n)} / month HOA`},
  tax: {label:'Lowest property tax',field:'annual property-tax input',value:p=>p.taxAnnual,descending:false,format:n=>`${money(n)} / year tax`},
  rent: {label:'Highest sample rent',field:'sample monthly rent',value:p=>p.rent,descending:true,format:n=>`${money(n)} / month rent`,explanation:'Rent is a fictional input, not a market estimate. Duplex rents and bedroom counts are combined across both units.'},
  yield: {label:'Highest gross rental yield',field:'12 × monthly rent ÷ asking price',value:p=>12*p.rent/p.price*100,descending:true,format:n=>`${n.toFixed(2)}% gross yield`,explanation:'Gross yield uses fictional rent × 12 ÷ price. It excludes all costs, vacancies and financing; duplex rent is combined across both units.'},
  cashflow: {label:'Highest modelled cash flow',field:'modelled monthly cash flow',value:p=>modeled(p).cashflow,descending:true,format:n=>`${money(n)} / month cash flow`,explanation:'Cash flow uses the calculator’s default assumptions, not your saved scenario: 20% down, 6.5% interest and a 30-year loan, with default costs and reserves. Open “Run numbers” to inspect or change them. These are not market or lending quotes.'},
  'rent-asc': {label:'Lowest sample rent',field:'sample monthly rent',value:p=>p.rent,descending:false,format:n=>`${money(n)} / month rent`,explanation:'These are purchase listings, not rentals. The rent field is a fictional potential-income input; duplex rent combines both units.'},
  'tax-desc': {label:'Highest property tax',field:'annual property-tax input',value:p=>p.taxAnnual,descending:true,format:n=>`${money(n)} / year tax`},
  insurance: {label:'Lowest property insurance',field:'monthly property-insurance input',value:p=>p.insuranceMonthly,descending:false,format:n=>`${money(n)} / month insurance`,explanation:'Insurance amounts are fictional property inputs, not insurance quotes.'},
  'insurance-desc': {label:'Highest property insurance',field:'monthly property-insurance input',value:p=>p.insuranceMonthly,descending:true,format:n=>`${money(n)} / month insurance`,explanation:'Insurance amounts are fictional property inputs, not insurance quotes.'},
  'yield-asc': {label:'Lowest gross rental yield',field:'12 × monthly rent ÷ asking price',value:p=>12*p.rent/p.price*100,descending:false,format:n=>`${n.toFixed(2)}% gross yield`,explanation:'Gross yield uses fictional rent × 12 ÷ price and excludes all costs, vacancy and financing.'},
  'cashflow-asc': {label:'Lowest modelled cash flow',field:'modelled monthly cash flow',value:p=>modeled(p).cashflow,descending:false,format:n=>`${money(n)} / month cash flow`,explanation:'Cash flow uses the calculator’s default 20% down, 6.5% interest, 30-year loan and operating assumptions, not your saved scenario. All inputs are fictional.'},
  'caprate-asc': {label:'Lowest modelled cap rate',field:'annual net operating income ÷ asking price',value:p=>modeled(p).capRate,descending:false,format:n=>`${n.toFixed(2)}% cap rate`,explanation:'Cap rate uses default operating costs and vacancy. It excludes financing and capital reserves. Inputs are fictional.'},
  caprate: {label:'Highest modelled cap rate',field:'annual net operating income ÷ asking price',value:p=>modeled(p).capRate,descending:true,format:n=>`${n.toFixed(2)}% cap rate`,explanation:'Cap rate uses the calculator’s default vacancy and operating costs. It excludes financing and capital reserves. All inputs are fictional; this is not an investment recommendation.'}
};

/** More specific metrics win over words such as "cheapest" in "cheapest per sq ft". */
export function detectRanking(t: string): Ranking | null {
  const low = /\b(lowest|lower|least|fewest|smallest|minimum|ascending)\b/.test(t);
  const high = /\b(highest|most expensive|largest|greatest|maximum|descending)\b/.test(t);
  if(/\b(price|cost|dollars?)\s*(?:per|\/)\s*(?:sq\.?\s*ft\.?|sqft|square (?:foot|feet))\b|\b(?:space|square (?:footage|feet)) (?:for (?:the |my )?money|per dollar)\b|\bbest value\b/.test(t))return high?'price-per-sqft-desc':'price-per-sqft';
  if(/\b(cash ?flow|cash-flow)\b/.test(t))return low?'cashflow-asc':'cashflow';
  if(/\bcap(?:italization)? rate\b/.test(t))return low?'caprate-asc':'caprate';
  if(/\b(?:gross (?:rental )?yield|rental yield|rent[- ]to[- ]price)\b/.test(t))return low?'yield-asc':'yield';
  if(/\b(?:highest|most|maximum|best|lowest|least|minimum)\b.*\b(?:sample )?(?:rent|rental income)\b/.test(t))return low?'rent-asc':'rent';
  if(/\b(?:lowest|least|cheap(?:est|er)?|highest|most|lower|smallest)\s+(?:monthly )?(?:hoa|association fees?)\b/.test(t))return high?'hoa-desc':'hoa';
  if(/\b(?:lowest|least|lower|smallest|highest|most|largest)\s+(?:(?:annual|property) )*(?:tax|taxes)\b/.test(t))return high?'tax-desc':'tax';
  if(/\b(?:lowest|least|lower|smallest|highest|most|largest)\s+(?:(?:monthly|property) )*insurance\b/.test(t))return high?'insurance-desc':'insurance';
  if(/\b(?:most|more|maximum|highest|greatest|fewest|fewer|least|lowest)\s+(?:(?:number|count) of )?(?:bedrooms?|beds?|br)\b/.test(t))return /\b(?:fewest|fewer|least|lowest)\b/.test(t)?'beds-asc':'beds';
  if(/\b(?:most|more|maximum|highest|greatest|fewest|fewer|least|lowest)\s+(?:(?:number|count) of )?(?:bathrooms?|baths?|ba)\b/.test(t))return /\b(?:fewest|fewer|least|lowest)\b/.test(t)?'baths-asc':'baths';
  if(/\b(?:newest|newer|most recent(?:ly built)?|latest built|new construction)\b/.test(t))return 'newest';
  if(/\b(?:oldest|older|earliest built)\b/.test(t))return 'oldest';
  if(/\b(?:smallest|smaller|compact|cozy|cosy|(?:least|lowest) (?:space|square footage)|minimum (?:space|size))\b/.test(t))return 'size-asc';
  if(/\b(?:biggest|bigger|largest|larger|spacious|roomiest|(?:most|highest) (?:space|room|square footage)|more (?:space|room)|maximum (?:space|size))\b/.test(t))return 'size';
  if(/\b(?:cheap(?:est|er)?|affordable|affordability|budget[- ]friendly|budget conscious|low[- ]cost|lowest[- ]priced?|lowest (?:asking )?(?:price|cost)|least expensive|less expensive|inexpensive|lower price)\b/.test(t))return 'price';
  if(/\b(?:most expensive|priciest|highest[- ]priced?|highest (?:asking )?price|expensive|luxur(?:y|ious)|premium)\b/.test(t))return 'price-desc';
  return null;
}
export function rankProperties(properties: Property[], ranking: Ranking): Property[] {
  const rule = rankingRules[ranking];
  // Stable, documented tie-breaks. Never mutate the catalogue or input array.
  return [...properties].sort((a,b)=>(rule.value(a)-rule.value(b))*(rule.descending?-1:1)||a.price-b.price||b.sqft-a.sqft||a.id.localeCompare(b.id));
}
export function rankReason(p: Property, ranking: Ranking, candidates: Property[]): string {
  const rule=rankingRules[ranking],value=rule.value(p);
  const ahead=candidates.filter(x=>(rule.value(x)-value)*(rule.descending?-1:1)<0).length;
  const ties=candidates.filter(x=>rule.value(x)===value).length;
  return `${ties>1?'Tied at #':'#'}${ahead+1} of ${candidates.length} matching listings by ${rule.field}: ${rule.format(value)}.${ties>1?' Ties use lower price, then more floor space.':''}`;
}
