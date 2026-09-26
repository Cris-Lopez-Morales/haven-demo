import test from 'node:test';
import assert from 'node:assert/strict';
import {seedProperties} from '../build/data.js';
import {NEGOTIATION_SNAPSHOT as SNAP,listingHistories,soldComparables} from '../build/negotiation-data.js';
import {COMPARABLE_POLICY,dayNumber,elapsedDays,displayDate,summarizeHistory,selectComparableSales,compareSales,comparisonTakeaway,negotiationReport} from '../build/negotiation-engine.js';
import {negotiationSection} from '../build/negotiation-views.js';
import {freshWorkspace,parseWorkspace} from '../build/storage.js';
import {defaultCalculatorAssumptions} from '../build/finance.js';
const home=seedProperties[0], original=listingHistories[home.id];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const h=(patch={})=>({...structuredClone(original),...patch});
const subject=(patch={})=>({...home,price:190000,sqft:1000,beds:3,...patch});
const sale=(id='a',patch={})=>({id,address:`${id} Example Lane`,city:home.city,state:home.state,neighborhood:home.neighborhood,type:home.type,beds:3,sqft:1000,price:200000,soldOn:'2026-09-01',...patch});
const trio=()=>[sale('a',{price:100000}),sale('b',{price:200000}),sale('c',{price:300000})];

test('negotiation dates use UTC day arithmetic and a frozen explicit snapshot',()=>{assert.equal(SNAP,'2026-09-26');assert.equal(elapsedDays('2026-09-02',SNAP),24);assert.equal(elapsedDays(SNAP,SNAP),0);assert.equal(displayDate(SNAP),'Sep 26, 2026');});
test('negotiation dates handle leap years and daylight-saving boundaries',()=>{assert.equal(elapsedDays('2024-02-28','2024-03-01'),2);assert.equal(elapsedDays('2026-03-07','2026-03-09'),2);});
for(const value of ['2026-02-30','2026-02-29','not a date','2026-09-26T00:00:00Z','2026-9-26','',null,undefined])test(`negotiation rejects invalid calendar date ${String(value)}`,()=>{assert.equal(dayNumber(value),null);assert.equal(elapsedDays(value,SNAP),null);assert.equal(displayDate(value),'Date unavailable');});
test('negotiation elapsed time does not make future dates negative days on market',()=>assert.equal(elapsedDays('2026-09-27',SNAP),null));

test('negotiation history calculates actual days, original ask and dollar/percentage reduction',()=>{const r=summarizeHistory(home,original);assert.equal(r.daysOnMarket,24);assert.equal(r.originalPrice,330500);assert.equal(r.currentPrice,325000);assert.equal(r.dropCount,1);assert.equal(r.totalReductions,5500);close(r.events[1].changePercent,-5500/330500*100);});
test('negotiation no-cut fixture explicitly has zero recorded reductions',()=>{const p=seedProperties[1],r=summarizeHistory(p,listingHistories[p.id]);assert.equal(r.dropCount,0);assert.equal(r.events.length,1);assert.equal(r.totalReductions,0);});
test('negotiation history supports multiple cuts and counts each only once',()=>{const p=seedProperties[2],r=summarizeHistory(p,listingHistories[p.id]);assert.equal(r.dropCount,2);close(r.totalReductions,r.originalPrice-p.price);});
test('negotiation history does not mislabel an increase as a drop',()=>{const r=summarizeHistory(home,h({events:[{date:'2026-09-02',price:320000},{date:'2026-09-14',price:325000}]}));assert.equal(r.dropCount,0);assert.equal(r.totalReductions,0);assert.equal(r.events[1].change,5000);});
test('negotiation history separates sum of cuts from net change after an increase',()=>{const r=summarizeHistory(home,h({events:[{date:'2026-09-02',price:320000},{date:'2026-09-10',price:340000},{date:'2026-09-14',price:325000}]}));assert.equal(r.totalReductions,15000);assert.equal(r.currentPrice-r.originalPrice,5000);});
test('negotiation history keeps same-price events without inventing a cut',()=>{const r=summarizeHistory(home,h({events:[{date:'2026-09-02',price:325000},{date:'2026-09-14',price:325000}]}));assert.equal(r.dropCount,0);assert.equal(r.events[1].change,0);});
for(const [label,patch] of [
 ['future listed date',{listedOn:'2026-10-01'}],['invalid date',{listedOn:'2026-02-30'}],['no events',{events:[]}],
 ['wrong first date',{events:[{date:'2026-09-03',price:325000}]}],['history ends at a different asking price',{events:[{date:'2026-09-02',price:300000}]}],
 ['duplicate dates',{events:[{date:'2026-09-02',price:330000},{date:'2026-09-02',price:325000}]}],
 ['reverse chronology',{events:[{date:'2026-09-02',price:330000},{date:'2026-09-01',price:325000}]}],
 ['future event',{events:[{date:'2026-09-02',price:330000},{date:'2026-09-27',price:325000}]}],
 ['nonpositive price',{events:[{date:'2026-09-02',price:0},{date:'2026-09-14',price:325000}]}],
 ['infinite price',{events:[{date:'2026-09-02',price:Infinity},{date:'2026-09-14',price:325000}]}],
 ['wrong property ID',{propertyId:'elsewhere'}],['wrong address',{address:'Different address'}],['wrong city',{city:'Elsewhere'}],['wrong state',{state:'ZZ'}]
])test(`negotiation history rejects ${label}`,()=>assert.equal(summarizeHistory(home,h(patch)),null));
test('negotiation history is unavailable for custom input even with a borrowed fixture ID',()=>assert.equal(summarizeHistory({...home,custom:true},original),null));
test('negotiation history cannot borrow a mismatched fixture or a changed asking price',()=>{assert.equal(summarizeHistory({...home,price:320000},original),null);assert.equal(summarizeHistory(home,undefined),null);});

test('negotiation comp policy is explicit and bounded',()=>assert.deepEqual(COMPARABLE_POLICY,{maxAgeDays:180,maxSizeDifference:.2,maxBedroomDifference:1,minCount:3,maxCount:5}));
test('negotiation eligibility includes exact size, age and bedroom boundaries',()=>{const s=[sale('a',{sqft:800,beds:2,soldOn:'2026-03-30'}),sale('b',{sqft:1200,beds:4,soldOn:SNAP})];assert.equal(elapsedDays('2026-03-30',SNAP),180);assert.equal(selectComparableSales(subject(),s).length,2);});
for(const [label,patch] of [
 ['different city',{city:'Omaha'}],['different state',{state:'CA'}],['different fictional neighborhood',{neighborhood:'Elsewhere'}],['different type',{type:'Condo'}],
 ['too small',{sqft:799}],['too large',{sqft:1201}],['too many bedrooms',{beds:5}],['too few bedrooms',{beds:1}],['noninteger bedrooms',{beds:2.5}],
 ['sale older than 180 days',{soldOn:'2026-03-29'}],['future sold date',{soldOn:'2026-09-27'}],['invalid sold date',{soldOn:'2026-02-30'}],
 ['zero price',{price:0}],['negative price',{price:-1}],['infinite price',{price:Infinity}],['zero size',{sqft:0}],['blank address',{address:'  '}],['subject address',{address:home.address}],['subject ID',{id:home.id}]
])test(`negotiation selection excludes ${label} without relaxing criteria`,()=>assert.equal(selectComparableSales(subject(),[sale('a',patch)]).length,0));
test('negotiation neighborhood labels ignore only casing and whitespace, not geography',()=>assert.equal(selectComparableSales(subject(),[sale('a',{city:' LINCOLN ',state:'ne',neighborhood:'Near   South'})]).length,1));
test('negotiation duplicate IDs are excluded instead of double-weighting',()=>assert.equal(selectComparableSales(subject(),[sale('a'),sale('a',{price:250000}),sale('b')]).length,1));
test('negotiation repeated address counts once using most recent eligible sale',()=>{const r=selectComparableSales(subject(),[sale('a',{address:'1 Test St',soldOn:'2026-08-01'}),sale('b',{address:' 1 test st ',soldOn:'2026-09-01'})]);assert.deepEqual(r.map(s=>s.id),['b']);});
test('negotiation selects five closest by size, not five most favorable prices',()=>{const s=Array.from({length:7},(_,i)=>sale(String(i),{sqft:1000+i*20,price:i>4?10000:200000}));assert.deepEqual(selectComparableSales(subject(),s).map(s=>s.id),['0','1','2','3','4']);});
test('negotiation recency breaks equal-size ties and displayed records are newest first',()=>{const r=selectComparableSales(subject(),Array.from({length:6},(_,i)=>sale(String(i),{soldOn:`2026-09-0${i+1}`})));assert.deepEqual(r.map(s=>s.id),['5','4','3','2','1']);});
test('negotiation input order cannot change ties or comparisons',()=>{const s=[sale('c'),sale('a'),sale('b')];assert.deepEqual(selectComparableSales(subject(),s),selectComparableSales(subject(),[...s].reverse()));});
test('negotiation current asking price never filters or changes the chosen sales',()=>assert.deepEqual(selectComparableSales(subject({price:100}),trio()),selectComparableSales(subject({price:1e8}),trio())));
test('negotiation no sale or empty neighborhood produces no invented matches',()=>{assert.deepEqual(selectComparableSales(subject(),[]),[]);assert.deepEqual(selectComparableSales(subject({neighborhood:''}),trio()),[]);});
test('negotiation custom properties and invalid subjects cannot get fabricated comparisons',()=>{for(const p of [subject({custom:true}),subject({sqft:0}),subject({sqft:NaN}),subject({beds:NaN}),subject({beds:-1})])assert.deepEqual(selectComparableSales(p,trio()),[]);});

test('negotiation below-median takeaway derives from the selected price-per-foot data',()=>{const r=compareSales(subject(),trio());assert.equal(r.medianSoldPerSqft,200);close(r.differencePercent,-5);assert.equal(comparisonTakeaway(r),'Asking about 5.0% below this sample’s median sold price per sq ft.');});
test('negotiation higher asking price computes an above-median statement, not a hardcoded favorable verdict',()=>{const r=compareSales(subject({price:220000}),trio());close(r.differencePercent,10);assert.equal(r.direction,'above');assert.match(comparisonTakeaway(r),/10.0% above/);});
test('negotiation median is not an average or a pooled price-to-area ratio',()=>{const s=[sale('a',{sqft:800,price:80000}),sale('b',{sqft:1000,price:200000}),sale('c',{sqft:1200,price:1200000})];assert.equal(compareSales(subject(),s).medianSoldPerSqft,200);});
test('negotiation even-size sample uses middle-pair median',()=>{const s=[sale('a',{price:100000}),sale('b',{price:200000}),sale('c',{price:300000}),sale('d',{price:900000})];assert.equal(compareSales(subject(),s).medianSoldPerSqft,250);});
test('negotiation identical benchmark displays neutral context instead of 0.0% below',()=>{const r=compareSales(subject({price:200000}),trio());assert.equal(r.direction,'similar');assert.match(comparisonTakeaway(r),/within 0.1%/);});
test('negotiation tiny unrounded differences do not invent an above/below advantage',()=>{for(const price of [199999,200001])assert.equal(compareSales(subject({price}),trio()).direction,'similar');});
test('negotiation percentage is computed before currency rounding',()=>{const s=[sale('a',{sqft:1111,price:211222}),sale('b',{sqft:1111,price:211222}),sale('c',{sqft:1111,price:211222})],p=subject({price:215123,sqft:1123}),r=compareSales(p,s);close(r.differencePercent,(p.price/p.sqft/(211222/1111)-1)*100);});
test('negotiation insufficient evidence shows no computed percentage',()=>{assert.equal(compareSales(subject(),[]),null);assert.equal(compareSales(subject(),trio().slice(0,2)),null);assert.match(comparisonTakeaway(null),/Not enough/);});
test('negotiation rejects oversized or invalid comparison input instead of NaN UI',()=>{assert.equal(compareSales(subject(),Array.from({length:6},(_,i)=>sale(String(i)))),null);assert.equal(compareSales(subject({price:0}),trio()),null);assert.equal(compareSales(subject(),[sale('a',{price:NaN}),sale('b'),sale('c')]),null);});
test('negotiation changing one sale changes the median outcome, not a stored verdict',()=>{const s=trio(),before=compareSales(subject(),s);s[1]={...s[1],price:250000};assert.notEqual(compareSales(subject(),s).differencePercent,before.differencePercent);});

test('negotiation all 60 original homes have consistent history and 3–5 eligible sales',()=>{for(const p of seedProperties){const r=negotiationReport(p);assert.equal(r.status,'available',p.id);assert.ok(r.history,p.id);assert.ok(r.sales.length>=3&&r.sales.length<=5,p.id);assert.equal(r.history.currentPrice,p.price);assert.ok(Number.isFinite(r.comparison.differencePercent));for(const s of r.sales){assert.equal(s.type,p.type);assert.equal(s.neighborhood,p.neighborhood);assert.ok(elapsedDays(s.soldOn,SNAP)<=180);}assert.deepEqual(r.sales.map(s=>s.soldOn),r.sales.map(s=>s.soldOn).sort().reverse());}});
test('negotiation fixtures are immutable and separate from the 60 active homes',()=>{assert.equal(seedProperties.length,60);assert.equal(Object.keys(listingHistories).length,60);assert.equal(soldComparables.length,240);assert.equal(new Set(soldComparables.map(s=>s.id)).size,240);assert.equal(new Set(soldComparables.map(s=>`${s.city}|${s.state}|${s.address}`)).size,240);assert.ok(Object.isFrozen(soldComparables)&&Object.isFrozen(soldComparables[0])&&Object.isFrozen(listingHistories)&&Object.isFrozen(original.events[0]));});
test('negotiation report does not mutate properties, sales, histories or workspace plans',()=>{const before=JSON.stringify({seedProperties,soldComparables,listingHistories});for(const p of seedProperties)negotiationReport(p);assert.equal(JSON.stringify({seedProperties,soldComparables,listingHistories}),before);});
test('negotiation old backups need no migration or extra personal data',()=>{const w=freshWorkspace(),before=JSON.stringify(w);negotiationReport(home);assert.equal(JSON.stringify(w),before);assert.deepEqual(parseWorkspace(before),w);assert.ok(!Object.keys(w).some(k=>k.includes('negotiation')));});
test('negotiation calculator what-ifs cannot overwrite the asking price or reference sales',()=>{const w=freshWorkspace(),r=negotiationReport(home);w.calculator.drafts[home.id]=defaultCalculatorAssumptions(home);w.calculator.drafts[home.id].price=999000;assert.deepEqual(negotiationReport(home),r);});
test('negotiation custom or unrecognized fixture IDs return an honest no-data state',()=>{for(const p of [{...home,custom:true},{...home,id:'custom-1'},{...home,id:'__proto__'},{...home,address:'Different'}]){const r=negotiationReport(p);assert.equal(r.status,'no-fixture');assert.equal(r.history,null);assert.deepEqual(r.sales,[]);assert.equal(r.comparison,null);}});
test('negotiation report refuses a snapshot with invalid dates',()=>assert.equal(negotiationReport(home,listingHistories,soldComparables,'invalid').status,'no-fixture'));
test('negotiation report distinguishes insufficient sales from missing history',()=>{const r=negotiationReport(home,listingHistories,[]);assert.equal(r.status,'insufficient');assert.ok(r.history);assert.equal(r.comparison,null);});
test('negotiation inconsistent history does not poison otherwise eligible sold context',()=>{const r=negotiationReport({...home,price:home.price+10000});assert.equal(r.history,null);assert.equal(r.status,'available');assert.notEqual(r.comparison.differencePercent,negotiationReport(home).comparison.differencePercent);});
test('negotiation display depends on fixed snapshot, not the computer clock',()=>{const before=negotiationReport(home),now=Date.now;try{Date.now=()=>Date.parse('2040-01-01');assert.deepEqual(negotiationReport(home),before);}finally{Date.now=now;}});
test('negotiation rendered panel starts collapsed with a native keyboard disclosure',()=>{const html=negotiationSection(home);assert.match(html,/<details class="negotiation-panel" id="negotiation-panel">/);assert.match(html,/<summary class="negotiation-toggle">/);assert.doesNotMatch(html,/<details class="negotiation-panel"[^>]*\sopen/);});
test('negotiation render exposes source, arithmetic, selection and limitations without fake action links',()=>{const html=negotiationSection(home);for(const phrase of ['Fictional','Fixed demo snapshot','180 days','±20%','±1 bedroom','median(each sold price','unrounded ratios','not a valuation','not measured proximity','seller motivation'])assert.ok(html.includes(phrase),phrase);assert.doesNotMatch(html,/<a\b|<img\b|<script\b|https?:\/\//);});
test('negotiation duplex UI consistently identifies whole-building sale areas and bedrooms',()=>assert.match(negotiationSection(seedProperties[2]),/Duplex prices, areas and bedrooms cover both units/));
test('negotiation missing custom data cannot produce invented sale rows or a value claim',()=>{const html=negotiationSection({...home,custom:true,name:'<img src=x onerror=alert(1)>'});assert.match(html,/No history is better than invented history/);assert.doesNotMatch(html,/data-comp-id|class="negotiation-takeaway"|<img/);});
