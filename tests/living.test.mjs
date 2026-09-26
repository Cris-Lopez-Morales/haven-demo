import test from 'node:test';
import assert from 'node:assert/strict';
import { seedProperties } from '../build/data.js';
import { calculate, defaultCalculatorAssumptions, defaultAssumptions } from '../build/finance.js';
import { freshWorkspace, parseWorkspace } from '../build/storage.js';
import { calculateLiving, livingAssumptions, utilityEstimate, UTILITY_MODEL, COMMUTE_MODEL, freshLiving, parseLiving, parseCommute, pruneLiving, demoPoint, estimateCommute } from '../build/living-engine.js';
import { livingSection, utilityExplanation, commuteView, workSettingsView } from '../build/living-views.js';
const home=seedProperties[0];
const work=(changes={})=>({mode:'simulated',label:'My office',city:'Lincoln',state:'NE',anchor:'center',speedMph:25,...changes});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} ≠ ${expected}`);
const draft=(p=home)=>{const w=freshWorkspace();w.calculator.drafts[p.id]=defaultCalculatorAssumptions(p);return w;};

test('utilities: Willow size and age produce the documented $259 demo allowance',()=>{
 const m=utilityEstimate(home);assert.equal(m.age,28);close(m.factor,1.056);assert.equal(m.monthly,259);assert.equal(m.manual,false);
});
test('utilities: size scales only the variable component',()=>{
 const p={...home,yearBuilt:2026,sqft:1000};assert.equal(utilityEstimate(p).monthly,165);assert.equal(utilityEstimate({...p,sqft:2000}).monthly,265);
});
test('utilities: age scales the variable component, capped at 100 years',()=>{
 const p={...home,sqft:1000,yearBuilt:1926};assert.equal(utilityEstimate(p).monthly,185);assert.equal(utilityEstimate({...p,yearBuilt:1700}).monthly,185);
});
test('utilities: future construction year is flagged and never reduces below zero age',()=>{
 const m=utilityEstimate({...home,sqft:1000,yearBuilt:2030});assert.equal(m.age,0);assert.equal(m.monthly,165);assert.equal(m.futureYear,true);
});
test('utilities: fixed reference year makes old inputs reproducible',()=>assert.equal(UTILITY_MODEL.referenceYear,2026));
test('utilities: zero override is a valid explicit choice, not a missing value',()=>{const u=utilityEstimate(home,0);assert.equal(u.monthly,0);assert.equal(u.manual,true);assert.equal(u.formulaMonthly,259);});
test('utilities: decimal override replaces, rather than adds to, the formula',()=>assert.equal(utilityEstimate(home,172.34).monthly,172.34));
for(const v of [-1,Infinity,NaN,'200',1_000_001])test(`utilities reject ${String(v)} (${typeof v})`,()=>assert.throws(()=>utilityEstimate(home,v),RangeError));
test('utilities reject invalid property inputs',()=>{
 for(const p of [{...home,sqft:0},{...home,sqft:NaN},{...home,yearBuilt:0},{...home,yearBuilt:Infinity}])assert.throws(()=>utilityEstimate(p),RangeError);
});
test('utilities: the largest valid size and age still produce an editable bounded value',()=>assert.ok(utilityEstimate({...home,sqft:1_000_000,yearBuilt:1700}).monthly<=1_000_000));

test('living: default results extend the existing calculator exactly',()=>{
 const w=freshWorkspace(),x=calculateLiving(home,w),m=calculate(defaultCalculatorAssumptions(home));
 assert.deepEqual(x.metrics,m);close(x.ownerMonthly,m.totalOutflow-m.management+259);close(x.rentalAfterUtilities,m.cashflow-259);
});
test('living: per-property edits are resolved without using a different active home',()=>{
 const w=draft();w.calculator.drafts[home.id].costs.insuranceAnnual=2400;w.calculator.activePropertyId='sample-2';
 assert.equal(calculateLiving(home,w).metrics.insurance,200);assert.equal(calculateLiving(seedProperties[1],w).customized,false);
});
test('living: insurance edits change both views with opposite signs',()=>{
 const w=draft(),before=calculateLiving(home,w);w.calculator.drafts[home.id].costs.insuranceAnnual+=1200;const after=calculateLiving(home,w);
 close(after.ownerMonthly-before.ownerMonthly,100);close(before.rentalAfterUtilities-after.rentalAfterUtilities,100);
});
test('living: tax edits use the current purchase price',()=>{
 const w=draft(),a=w.calculator.drafts[home.id];a.price=400000;a.costs.taxRatePercent=2;close(calculateLiving(home,w).metrics.tax,400000*.02/12);
});
test('living: home-value maintenance and HOA applicability use the shared resolver',()=>{
 const w=draft(),a=w.calculator.drafts[home.id];a.costs.maintenanceBasis='home-value';a.costs.maintenanceValue=1.2;a.hoaMonthly=200;a.costs.hoaApplicable=false;
 close(calculateLiving(home,w).metrics.maintenance,325);assert.equal(calculateLiving(home,w).metrics.hoa,0);
 a.costs.hoaApplicable=true;assert.equal(calculateLiving(home,w).metrics.hoa,200);
});
test('living: one-time closing and repair costs never inflate recurring totals',()=>{
 const w=draft(),b=calculateLiving(home,w);w.calculator.drafts[home.id].costs.closingValue=9;w.calculator.drafts[home.id].initialRepairs=12345;
 const a=calculateLiving(home,w);assert.equal(a.ownerMonthly,b.ownerMonthly);assert.equal(a.rentalAfterUtilities,b.rentalAfterUtilities);assert.ok(a.metrics.cashInvested>b.metrics.cashInvested);
});
test('living: rental management is not charged in the owner-occupant view',()=>{
 const w=draft(),b=calculateLiving(home,w);w.calculator.drafts[home.id].managementPercent=25;const a=calculateLiving(home,w);
 close(a.ownerMonthly,b.ownerMonthly);assert.ok(a.rentalAfterUtilities<b.rentalAfterUtilities);
});
test('living: full rental income is never household income; retained capital reserve remains rent-based',()=>{
 const w=draft(),b=calculateLiving(home,w);w.calculator.drafts[home.id].rent+=1000;const a=calculateLiving(home,w);
 close(a.ownerMonthly-b.ownerMonthly,30); // only the disclosed 3% capital reserve changes
 assert.ok(a.rentalAfterUtilities>b.rentalAfterUtilities);
});
test('living: mortgage insurance is excluded for an all-cash purchase',()=>{
 const w=draft(),a=w.calculator.drafts[home.id];a.downPercent=100;a.mortgageInsuranceMonthly=100;const m=calculateLiving(home,w);
 assert.equal(m.metrics.mortgage,0);close(m.ownerBeforeUtilities,m.metrics.tax+m.metrics.insurance+m.metrics.hoa+m.metrics.maintenance+m.metrics.capex);
});
test('living: override impacts only its own property and never changes calculator cash flow',()=>{
 const w=draft(),b=calculateLiving(home,w);w.living.utilityOverrides[home.id]=300;const a=calculateLiving(home,w);
 close(a.ownerMonthly-b.ownerMonthly,41);close(a.rentalAfterUtilities-b.rentalAfterUtilities,-41);assert.equal(a.metrics.cashflow,b.metrics.cashflow);
 assert.equal(calculateLiving(seedProperties[1],w).utilities.manual,false);
});
test('living: old finance snapshots keep their old dollar result',()=>{
 const w=draft();w.calculator.drafts[home.id]=defaultAssumptions(home);close(calculateLiving(home,w).metrics.cashflow,calculate(defaultAssumptions(home)).cashflow);
});
test('living: calculating cannot mutate inputs or previous snapshots',()=>{
 const w=draft(),original=JSON.stringify(w);const a=livingAssumptions(home,w);a.costs.insuranceAnnual=9999;calculateLiving(home,w);
 assert.equal(JSON.stringify(w),original);
});
test('living: personal Your Life Here utility assumptions remain independent',()=>{
 const w=draft();w.decisions.participants[0].life[home.id]={utilities:987};
 assert.equal(calculateLiving(home,w).utilities.monthly,259);
});
test('living: all 60 catalog homes produce finite results without changing fixtures',()=>{
 const before=JSON.stringify(seedProperties),w=freshWorkspace();
 for(const p of seedProperties){const r=calculateLiving(p,w);assert.ok(Number.isFinite(r.ownerMonthly)&&Number.isFinite(r.rentalAfterUtilities));}
 assert.equal(seedProperties.length,60);assert.equal(JSON.stringify(seedProperties),before);
});

test('living storage: legacy backups migrate to empty settings',()=>{
 const w=freshWorkspace();delete w.living;assert.deepEqual(parseWorkspace(JSON.stringify(w)).living,freshLiving());
});
test('living storage: utility and one-time work settings round-trip with the existing backup',()=>{
 const w=freshWorkspace();w.living.commute=work();w.living.utilityOverrides[home.id]=222.22;assert.deepEqual(parseWorkspace(JSON.stringify(w)),w);
});
test('living storage: fresh instances do not share nested objects',()=>{const a=freshLiving(),b=freshLiving();a.utilityOverrides[home.id]=20;assert.deepEqual(b.utilityOverrides,{});});
for(const x of [null,[],{version:2,commute:null,utilityOverrides:{}},{version:1,commute:null,utilityOverrides:[]},{version:1,commute:null,utilityOverrides:{'sample-1':-1}},{version:1,commute:null,utilityOverrides:{'sample-1':'100'}},{version:1,commute:null,utilityOverrides:{'sample-1':Infinity}}]){
 test(`living storage rejects malformed settings ${JSON.stringify(x)}`,()=>assert.throws(()=>parseLiving(x)));
}
test('living storage rejects prototype keys and oversized maps',()=>{
 assert.throws(()=>parseLiving(JSON.parse('{"version":1,"commute":null,"utilityOverrides":{"__proto__":10}}')));
 assert.throws(()=>parseLiving({version:1,commute:null,utilityOverrides:Object.fromEntries(Array.from({length:561},(_,i)=>['sample-'+(i+1),1]))}));
});
test('living storage: deleting a property prunes only its override, preserving work setup',()=>{
 const x=freshLiving();x.commute=work();x.utilityOverrides={'sample-1':0,'custom-gone':99};const y=pruneLiving(x,new Set(['sample-1']));
 assert.deepEqual(y.utilityOverrides,{'sample-1':0});assert.deepEqual(y.commute,x.commute);assert.equal(x.utilityOverrides['custom-gone'],99);
});
test('commute storage: trims label and city, normalizes state, drops unknown fields',()=>{
 assert.deepEqual(parseCommute(work({label:' Office ',city:' Lincoln ',state:'ne',private:'not retained'})),work({label:'Office'}));
});
test('commute storage: remote mode strips any previous location',()=>assert.deepEqual(parseCommute({...work(),mode:'remote'}),{mode:'remote'}));
for(const patch of [{label:''},{label:' '.repeat(3)},{label:'a'.repeat(161)},{city:''},{state:'Nebraska'},{anchor:'__proto__'},{anchor:'downtown'},{speedMph:0},{speedMph:81},{speedMph:NaN},{mode:'route'}]){
 test(`commute storage rejects invalid ${JSON.stringify(patch)}`,()=>assert.throws(()=>parseCommute(work(patch))));
}

test('commute: no location means no invented zero-minute estimate',()=>assert.deepEqual(estimateCommute(home,null),{kind:'unset'}));
test('commute: remote is an explicit assumption, not an inferred work address',()=>assert.deepEqual(estimateCommute(home,{mode:'remote'}),{kind:'remote'}));
test('commute: same-city demo arithmetic uses unrounded distance for time',()=>{
 const m=estimateCommute(home,work());assert.equal(m.kind,'simulated');close(m.straightMiles,Math.hypot(3.5,2));close(m.roadMiles,Math.hypot(3.5,2)*1.3);assert.equal(m.minutes,18);
});
test('commute: changing work position changes the calculation, not the property fixture',()=>{
 const b=estimateCommute(home,work()),a=estimateCommute(home,work({anchor:'southeast'}));assert.ok(a.roadMiles>b.roadMiles);
});
test('commute: slower speed increases time without changing distance',()=>{
 const a=estimateCommute(home,work({speedMph:10})),b=estimateCommute(home,work());assert.equal(a.roadMiles,b.roadMiles);assert.ok(a.minutes>b.minutes);
});
test('commute: label text is not geocoded and cannot affect numbers',()=>assert.deepEqual(estimateCommute(home,work()),estimateCommute(home,work({label:'Any address, not looked up'}))));
test('commute: multiple homes reuse one work setup but get distinct demo distances',()=>{
 const w=work(),a=estimateCommute(home,w),b=estimateCommute(seedProperties[3],w);assert.notEqual(a.roadMiles,b.roadMiles);assert.deepEqual(w,work());
});
test('commute: intercity travel returns no numeric estimate',()=>assert.deepEqual(estimateCommute(seedProperties[1],work()),{kind:'outside-city'}));
test('commute: custom properties cannot be assigned an invented position by address',()=>assert.deepEqual(estimateCommute({...home,id:'custom-1',custom:true},work()),{kind:'no-position'}));
test('commute: a fixture ID paired with an unrelated city is not a demo point',()=>assert.equal(demoPoint({...home,city:'Omaha'}),null));
test('commute: all 60 fixtures support finite same-city demo comparisons',()=>{
 for(const p of seedProperties){const c=estimateCommute(p,work({city:p.city,state:p.state}));assert.equal(c.kind,'simulated');assert.ok(Number.isFinite(c.roadMiles)&&Number.isFinite(c.minutes));}
});
test('commute: distance coefficients remain explicit demo assumptions',()=>assert.deepEqual(COMMUTE_MODEL,{roadFactor:1.3,overheadMinutes:5,defaultSpeedMph:25}));

test('living copy: utility formula exposes inputs, age cap, limits and override basis',()=>{
 const w=freshWorkspace();w.living.utilityOverrides[home.id]=200;const text=utilityExplanation(home,w);
 for(const s of ['$65','$0.10','1,840','1998','2026','100','chosen demo','not measured','replaces'])assert.ok(text.includes(s),s);
});
test('living copy: no global location is required to view the cost section',()=>{
 const s={workspace:freshWorkspace(),storageAvailable:true};const html=livingSection(home,s);
 assert.ok(html.includes('What this actually costs to live here.'));assert.ok(html.includes('$2,651.40'));assert.ok(html.includes('Set up once'));
});
test('living copy: duplex costs are explicitly whole-building, not per occupied unit',()=>assert.match(livingSection(seedProperties[2],{workspace:freshWorkspace(),storageAvailable:true}),/Whole-building estimate/));
test('living copy: work labels are escaped in both settings and the property detail',()=>{
 const w=freshWorkspace();w.living.commute=work({label:'<img src=x onerror=alert(1)>'});
 for(const text of [commuteView(home,w),workSettingsView({workspace:w},seedProperties)]){assert.ok(!text.includes('<img src=x'));assert.ok(text.includes('&lt;img'));}
});
test('living copy: future year and low-down-payment assumptions are disclosed',()=>{
 const w=draft();w.calculator.drafts[home.id].downPercent=5;
 assert.match(livingSection({...home,yearBuilt:2030},{workspace:w,storageAvailable:true}),/Future construction year/);
 assert.match(livingSection(home,{workspace:w,storageAvailable:true}),/Mortgage insurance is currently \$0/);
});
