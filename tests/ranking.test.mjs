import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedProperties as properties} from '../build/data.js';
import {freshPreferences,interpretMessage,nextReply,matchesPreferences,validPreferences} from '../build/assistant-engine.js';
import {rankingKeys,rankingRules,rankProperties,detectRanking} from '../build/ranking.js';
import {effectiveTheme} from '../build/theme.js';
const ask=(message,p=freshPreferences(),q='criteria',data=properties,context=[])=>{
  const parsed=interpretMessage(message,p,q,data,context);
  return {p:parsed.preferences,parsed,reply:nextReply(parsed.preferences,data,parsed)};
};
const examples=[
 ['show me the cheapest house','price','sample-19'],
 ['the cheapest home','price','sample-9'],
 ['the biggest place','size','sample-15'],
 ['something affordable','price','sample-9'],
 ['most bedrooms','beds','sample-15'],
 ['most bathrooms','baths','sample-42'],
 ['least expensive house','price','sample-19'],
 ['less expensive homes','price','sample-9'],
 ['the highest-priced property','price-desc','sample-58'],
 ['most expensive house','price-desc','sample-58'],
 ['more space','size','sample-15'],
 ['something spacious','size','sample-15'],
 ['a compact place','size-asc','sample-23'],
 ['the smallest home','size-asc','sample-23'],
 ['fewest bedrooms','beds-asc','sample-23'],
 ['fewest bathrooms','baths-asc','sample-9'],
 ['newest construction','newest','sample-32'],
 ['the oldest place','oldest','sample-8'],
 ['lowest HOA fee','hoa','sample-19'],
 ['highest HOA fees','hoa-desc','sample-59'],
 ['lowest annual property taxes','tax','sample-50'],
 ['highest sample rent','rent','sample-15'],
 ['best value','price-per-sqft','sample-8'],
 ['most space for my money','price-per-sqft','sample-8'],
 ['lowest price per sq ft','price-per-sqft','sample-8'],
 ['highest price per sq ft','price-per-sqft-desc','sample-59'],
];
for(const [text,sort,winner] of examples)test(`Direct data query: ${text}`,()=>{
 const {p,reply}=ask(text);assert.equal(p.sort,sort);assert.equal(p.cities,null);assert.equal(reply.question,null);
 assert.equal(reply.matches[0]?.property.id,winner);assert.equal(reply.matches.length,3);
 assert.ok(reply.text.includes(reply.matches[0].property.name));assert.match(reply.text,/fictional/i);
 assert.ok(reply.matches[0].reasons[0].includes('#1'));assert.ok(reply.matches.every(x=>properties.includes(x.property)));
});
for(const text of ['cheapest','the biggest place','something affordable','most bedrooms','the lowest price per square foot'])test(`No literal-city pollution while waiting for a city: ${text}`,()=>{
 const {p,reply}=ask(text,freshPreferences(),'city');assert.equal(p.cities,null);assert.equal(reply.question,null);assert.ok(reply.matches.length);
});
test('Known filters alone are sufficient; no city required',()=>{
 const {p,reply}=ask('A condo under $350k');assert.equal(reply.question,null);assert.equal(reply.total,11);assert.ok(reply.matches.every(m=>matchesPreferences(m.property,p)));
});
test('Combined city, type, price and minimum area constrain the ranking',()=>{
 const {p,reply}=ask('The biggest single-family house in Lincoln under $350k with at least 3 bedrooms');
 assert.equal(p.sort,'size');assert.equal(reply.question,null);assert.equal(reply.matches[0].property.id,'sample-1');assert.equal(reply.total,2);
});
test('At least is a constraint, not a fewest-bedrooms request',()=>assert.equal(ask('At least 3 bedrooms').p.sort,'relevance'));
test('At most is a maximum, not a most-bedrooms request',()=>{const {p,reply}=ask('At most 2 bedrooms');assert.equal(p.sort,'relevance');assert.equal(p.maxBeds,2);assert.ok(reply.matches.every(m=>m.property.beds<=2));});
test('Exact, strict maximum and strict minimum floor-space criteria',()=>{
 for(const [text,min,max] of [['exactly 2 bedrooms',2,2],['fewer than 3 bedrooms',null,2],['more than 3 bedrooms',4,null]]) {
  const {p,reply}=ask(text);assert.equal(p.minBeds,min);assert.equal(p.maxBeds,max);assert.ok(reply.matches.every(m=>matchesPreferences(m.property,p)));
 }
 const {p,reply}=ask('under 1500 square feet');assert.equal(p.maxSqft,1499);assert.ok(reply.matches.every(m=>m.property.sqft<1500));
});
test('Cheapest with no HOA ranks by price, not by the HOA amount',()=>{const {p,reply}=ask('cheapest house with no HOA');assert.equal(p.sort,'price');assert.equal(reply.matches[0].property.id,'sample-19');});
test('Ranking changes retain explicitly stated filters',()=>{
 const a=ask('Chicago under $500k');const b=ask('biggest place',a.p);
 assert.deepEqual(b.p.cities,['Chicago']);assert.equal(b.p.maxPrice,500000);assert.equal(b.reply.matches[0].property.id,'sample-14');
});
test('All 60 explicitly resets previous narrowing before a new query',()=>{
 const a=ask('Lincoln house under $300k with 3 bedrooms');const b=ask('most bedrooms across all 60 listings',a.p);
 assert.deepEqual(b.p.cities,[]);assert.deepEqual(b.p.types,[]);assert.equal(b.p.maxPrice,null);assert.equal(b.reply.total,60);assert.equal(b.reply.matches[0].property.id,'sample-15');
});
test('Any city only removes the city, not the active type or budget',()=>{const a=ask('Chicago house under $400k'),b=ask('cheapest in any city',a.p);assert.deepEqual(b.p.cities,[]);assert.deepEqual(b.p.types,['Single-family']);assert.equal(b.p.maxPrice,400000);});
test('No matching ranking does not silently widen constraints',()=>{const {reply,p}=ask('largest house in Seattle under $300k');assert.equal(reply.matches.length,0);assert.equal(p.maxPrice,300000);assert.match(reply.text,/haven’t stretched/);});
test('Relative cheaper-than reference compares actual asking prices',()=>{
 const {p,reply}=ask('cheaper than The Willow House');assert.equal(p.maxPrice,324999);assert.ok(reply.matches.every(m=>m.property.price<325000));
});
test('Relative bigger-than-that references the prior recommendation',()=>{
 const {p,reply}=ask('bigger than that',freshPreferences(),'criteria',properties,['sample-1']);assert.equal(p.minSqft,1841);assert.ok(reply.matches.every(m=>m.property.sqft>1840));
});
test('A pronoun without a reference asks only the genuine clarification',()=>{const {reply}=ask('cheaper than that');assert.equal(reply.question,'criteria');assert.match(reply.text,/Which home/);});
for(const query of ['closest to downtown','which is nearest to the city centre?','the home closest to downtown in Lincoln'])test(`Missing-distance query is honest: ${query}`,()=>{
 const {reply}=ask(query);assert.equal(reply.question,null);assert.equal(reply.matches.length,0);assert.match(reply.text,/no coordinates/);assert.doesNotMatch(reply.text,/which city|city are you/i);
});
test('Subjective good house asks a criterion rather than assuming a ranking',()=>{const {reply}=ask('a good house');assert.equal(reply.question,'criteria');assert.equal(reply.matches.length,0);assert.match(reply.text,/What would make/);});
test('A specified physical feature makes even a good-house query answerable',()=>{const {reply}=ask('a good house with a private garden');assert.equal(reply.question,null);assert.ok(reply.matches.length);});
test('Unrecorded amenities are never advertised as verified',()=>{const {reply}=ask('cheapest house with a garage');assert.ok(reply.matches.every(m=>m.caveats.some(c=>c.includes('Parking'))));assert.match(reply.text,/not recorded/);});
test('Duplex ranking explicitly explains combined unit totals',()=>assert.match(ask('most bedrooms').reply.matches[0].reasons.join(' '),/both units together/));
test('Every rank is a numerical comparison, stable under catalogue shuffling',()=>{
 for(const key of rankingKeys){
  const rule=rankingRules[key],copy=[...properties],sorted=rankProperties(copy,key);assert.deepEqual(copy,properties);
  assert.deepEqual(sorted.map(p=>p.id),rankProperties([...properties].reverse(),key).map(p=>p.id));
  for(let i=1;i<sorted.length;i++){const a=rule.value(sorted[i-1]),b=rule.value(sorted[i]);assert.ok(rule.descending?a>=b:a<=b);}
 }
});
test('Winners are computed from supplied numbers, not hard-coded IDs or answers',()=>{
 const changed=properties.map(p=>p.id==='sample-60'?{...p,price:50000,sqft:9000,beds:12}:p);
 for(const message of ['cheapest home','biggest place','most bedrooms'])assert.equal(ask(message,freshPreferences(),'criteria',changed).reply.matches[0].property.id,'sample-60');
});
test('Prices tied at first are disclosed and tie-broken deterministically',()=>{
 const data=properties.map(p=>p.id==='sample-23'?{...p,price:198000}:p),{reply}=ask('cheapest home',freshPreferences(),'criteria',data);
 assert.match(reply.text,/2 homes share/);assert.match(reply.matches[0].reasons[0],/Tied at #1/);assert.equal(reply.matches[0].property.id,'sample-9');
});
test('Pagination retains rank order without duplicating first-page results',()=>{
 const {p,reply}=ask('most bedrooms');const second=nextReply(p,properties,{more:true,offset:reply.offset});
 assert.equal(second.matches[0].property.id,rankProperties(properties,'beds')[3].id);assert.ok(!second.matches.some(x=>reply.matches.some(y=>x.property.id===y.property.id)));
});
for(const [query,sort] of [['highest cash flow','cashflow'],['best cap rate','caprate'],['highest gross rental yield','yield']])test(`Derived metric includes model assumptions: ${query}`,()=>{
 const {p,reply}=ask(query);assert.equal(p.sort,sort);assert.equal(reply.matches[0].property.id,rankProperties(properties,sort)[0].id);assert.match(reply.text,/default|excludes/i);
});
test('All metric enum values and new numeric bounds validate',()=>{for(const sort of rankingKeys)assert.ok(validPreferences({...freshPreferences(),sort}));assert.equal(validPreferences({...freshPreferences(),maxBeds:100}),false);assert.equal(validPreferences({...freshPreferences(),sort:'downtown'}),false);});
test('Theme resolver respects explicit choices and system default',()=>{assert.equal(effectiveTheme('dark',false),'dark');assert.equal(effectiveTheme('light',true),'light');assert.equal(effectiveTheme('system',true),'dark');assert.equal(effectiveTheme('system',false),'light');});
test('Specific price-per-area metric takes precedence over price adjective',()=>assert.equal(detectRanking('cheapest price per sq ft'),'price-per-sqft'));

test('Unknown city before a budget is not silently ignored',()=>{const {p,reply}=ask('Test City under $500k, any property type, no must-haves');assert.deepEqual(p.cities,['Test City']);assert.equal(reply.matches.length,0);assert.match(reply.text,/Test City isn/);});

for(const [query,key] of [['lowest cash flow','cashflow-asc'],['lowest cap rate','caprate-asc'],['lowest gross rental yield','yield-asc'],['lowest sample rent','rent-asc'],['highest property tax','tax-desc'],['lowest monthly insurance','insurance'],['highest property insurance','insurance-desc']])test(`Numerical direction is respected: ${query}`,()=>{const {p,reply}=ask(query);assert.equal(p.sort,key);assert.equal(reply.question,null);assert.equal(reply.matches[0].property.id,rankProperties(properties,key)[0].id);});
test('Competing unweighted objectives get a targeted trade-off question',()=>{const {reply}=ask('the cheapest and biggest home');assert.equal(reply.question,'criteria');assert.equal(reply.matches.length,0);assert.match(reply.text,/Which should come first/);});


test('Every semantic CSS token is defined, including the shared motion easing',()=>{
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 const definitions=new Set([...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(x=>x[1]));
 const references=new Set([...css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map(x=>x[1]));
 assert.deepEqual([...references].filter(x=>!definitions.has(x)),[]);
 assert.match(css,/--motion-ease\s*:\s*cubic-bezier/);
});
