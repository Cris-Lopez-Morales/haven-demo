import test from 'node:test';
import assert from 'node:assert/strict';
import {seedProperties as data} from '../build/data.js';
import {freshWorkspace,parseWorkspace,saveWorkspace,loadWorkspace} from '../build/storage.js';
import {freshRejections,parseRejections,passProperty,undoPass,learnedRules,rerankWithMemory,learningNarrative,ruleApplies,matchLearning,eligibleEvidence,distanceContext,pruneRejections} from '../build/rejection-engine.js';
import {freshPreferences,nextReply,interpretMessage} from '../build/assistant-engine.js';
import {defaultFilters,defaultCalculatorAssumptions} from '../build/finance.js';
import {browseResults,propertyCard} from '../build/views.js';
import {passDialog,preferencesDialog} from '../build/rejection-views.js';
// Render-only tests use the same minimal theme stub as the existing view suites.
globalThis.document={documentElement:{dataset:{}}};
const home=data[0];
const p=(id,changes={})=>({...home,id:'custom-'+id,custom:true,...changes});
const work=(changes={})=>({mode:'simulated',label:'My office',city:'Lincoln',state:'NE',anchor:'center',speedMph:25,...changes});
const pass=(m,property,reason='Price too high',note='',w=null)=>passProperty(m,property,reason,note,w,1234);
const pair=(reason='Price too high',a={},b={})=>pass(pass(freshRejections(),p('a',{price:400000,sqft:1000,hoaMonthly:200,...a}),reason),p('b',{price:600000,sqft:1500,hoaMonthly:400,...b}),reason);
const state=(memory=freshRejections(),changes={})=>({page:'discover',sort:'recommended',showPassed:false,filters:{...defaultFilters},layout:'grid',visibleCount:12,workspace:{...freshWorkspace(),rejections:memory},storageAvailable:true,...changes});
const pref=()=>({...freshPreferences(),cities:[],budgetKnown:true,types:[],mustHavesKnown:true});

test('memory: fresh and pre-1.7 backups start with no inferred preferences',()=>{assert.deepEqual(freshRejections(),{version:1,enabled:true,records:{}});const w=freshWorkspace();delete w.rejections;assert.deepEqual(parseWorkspace(JSON.stringify(w)).rejections,freshRejections());});
test('memory: old calculator, decision and living state survives migration unchanged',()=>{const w=freshWorkspace();w.calculator.drafts[home.id]=defaultCalculatorAssumptions(home);w.living.utilityOverrides[home.id]=345;w.decisions.participants[0].priorities.notes='keep';delete w.rejections;const x=parseWorkspace(JSON.stringify(w));assert.deepEqual(x.calculator,w.calculator);assert.deepEqual(x.decisions,w.decisions);assert.deepEqual(x.living,w.living);});
test('memory: passing preserves the source memory and original property',()=>{const m=freshRejections(),h=structuredClone(home);const next=pass(m,home);assert.deepEqual(m,freshRejections());assert.deepEqual(home,h);assert.equal(next.records[home.id].snapshot.price,home.price);});
test('memory: one pass does not activate a rule',()=>assert.equal(learnedRules(pass(freshRejections(),home),null).length,0));
test('memory: repeated passes on one home count once',()=>{let m=pass(freshRejections(),home);m=pass(m,home);assert.equal(Object.keys(m.records).length,1);assert.equal(learnedRules(m,null).length,0);});
test('memory: editing a reason removes the old evidence',()=>{const m=pass(pair(),p('a',{price:400000}),'Too small');assert.equal(learnedRules(m,null).length,0);assert.equal(m.records['custom-a'].reason,'Too small');});
test('memory: snapshots keep the listing values at pass time',()=>{const h=p('x',{price:300000}),m=pass(freshRejections(),h);h.price=100;assert.equal(m.records[h.id].snapshot.price,300000);});
test('memory: valid backups round-trip exactly',()=>{const w=freshWorkspace();w.rejections=pair();assert.deepEqual(parseWorkspace(JSON.stringify(w)),w);});
test('memory: undo one supporting pass disables a two-home rule',()=>{const m=undoPass(pair(),'custom-a');assert.equal(learnedRules(m,null).length,0);assert.equal(Object.keys(m.records).length,1);});
test('memory: undo missing ID is harmless and immutable',()=>{const m=pair();assert.deepEqual(undoPass(m,'not-here'),m);});
test('memory: custom deletion prunes feedback and its influence',()=>{const x=pruneRejections(pair(),new Set(['custom-a']));assert.equal(Object.keys(x.records).length,1);assert.equal(learnedRules(x,null).length,0);});
test('memory: pruning never changes the original object',()=>{const m=pair();pruneRejections(m,new Set());assert.equal(Object.keys(m.records).length,2);});
test('memory: Other requires an explicit note',()=>assert.throws(()=>pass(freshRejections(),home,'Other','   ')));
test('memory: free text never trains a hidden trait',()=>{const m=pass(pass(freshRejections(),p('a'),'Other','HOA too high, avoid expensive homes'),p('b'),'Other','price too high');assert.equal(learnedRules(m,null).length,0);});
test('memory: a note is context only even on measured reasons',()=>{let m=pair();m.records['custom-a'].note='prefer giant expensive condos';assert.equal(learnedRules(m,null)[0].reason,'Price too high');});
for(const [name,value] of [['null',null],['array',[]],['wrong version',{...freshRejections(),version:2}],['string enabled',{...freshRejections(),enabled:'yes'}],['no records',{version:1,enabled:true}],['array records',{...freshRejections(),records:[]}]])test('validation: rejects '+name,()=>assert.throws(()=>parseRejections(value)));
for(const [name,mutate] of [
 ['bad ID',x=>{x.records['__proto__']=x.records['custom-a'];Object.defineProperty(x.records,'constructor',{value:x.records['custom-a'],enumerable:true});}],
 ['unknown reason',x=>x.records['custom-a'].reason='secretly rich'],
 ['oversize note',x=>x.records['custom-a'].note='x'.repeat(501)],
 ['negative date',x=>x.records['custom-a'].rejectedAt=-1],
 ['infinite date',x=>x.records['custom-a'].rejectedAt=Infinity],
 ['invalid name',x=>x.records['custom-a'].snapshot.name=''],
 ['string price',x=>x.records['custom-a'].snapshot.price='400000'],
 ['NaN price',x=>x.records['custom-a'].snapshot.price=NaN],
 ['zero area',x=>x.records['custom-a'].snapshot.sqft=0],
 ['negative fee',x=>x.records['custom-a'].snapshot.hoaMonthly=-1],
 ['too high fee',x=>x.records['custom-a'].snapshot.hoaMonthly=100001],
 ['null snapshot',x=>x.records['custom-a'].snapshot=null],
 ['invalid distance',x=>x.records['custom-a'].snapshot.commute={city:'Lincoln',state:'NE',anchor:'center',miles:-1}],
 ['invalid anchor',x=>x.records['custom-a'].snapshot.commute={city:'Lincoln',state:'NE',anchor:'prototype',miles:5}],
 ['missing commute',x=>delete x.records['custom-a'].snapshot.commute]
])test('validation: rejects '+name,()=>{const m=pair();mutate(m);assert.throws(()=>parseRejections(m));});
test('validation: rejects more than 560 records',()=>{const m=pair();m.records=Object.fromEntries(Array.from({length:561},(_,i)=>['custom-'+i,m.records['custom-a']]));assert.throws(()=>parseRejections(m));});
test('validation: rejects unsafe property IDs in a parsed JSON record',()=>{const m=pair();const json=JSON.stringify(m).replace('custom-a','__proto__');assert.throws(()=>parseRejections(JSON.parse(json)));assert.equal({}.reason,undefined);});
test('validation: unrelated imported fields are not retained',()=>{const m=pair();m.records['custom-a'].snapshot.income=5000;m.records['custom-a'].secret='no';m.tracking=true;const r=parseRejections(m);assert.equal(r.tracking,undefined);assert.equal(r.records['custom-a'].secret,undefined);assert.equal(r.records['custom-a'].snapshot.income,undefined);});
for(const [reason,threshold,metric,values] of [['Price too high',500000,'price',[499999,500000]],['Too small',1250,'sqft',[1251,1250]],['HOA too high',300,'hoaMonthly',[299,300]]])test('learning: '+reason+' derives a median threshold and inclusive boundary',()=>{const rule=learnedRules(pair(reason),null)[0];assert.equal(rule.threshold,threshold);assert.equal(rule.count,2);assert.equal(ruleApplies(p('candidate',{[metric]:values[0]}),rule,null),false);assert.equal(ruleApplies(p('candidate',{[metric]:values[1]}),rule,null),true);});
test('learning: three observations use median rather than mean',()=>{const m=pass(pair(),p('outlier',{price:50000000}));assert.equal(learnedRules(m,null)[0].threshold,600000);});
test('learning: undo recomputes threshold instead of leaving stale weights',()=>{let m=pass(pair(),p('c',{price:900000}));assert.equal(learnedRules(m,null)[0].threshold,600000);m=undoPass(m,'custom-b');assert.equal(learnedRules(m,null)[0].threshold,650000);});
test('learning: zero-HOA passes remain recorded but cannot train high HOA',()=>{const m=pair('HOA too high',{hoaMonthly:0},{hoaMonthly:0});assert.equal(Object.keys(m.records).length,2);assert.equal(learnedRules(m,null).length,0);});
test('learning: zero-HOA plus positive-HOA still only one eligible observation',()=>assert.equal(learnedRules(pair('HOA too high',{hoaMonthly:0}),null).length,0));
test('learning: paused memories retain visible evidence but do not rerank',()=>{const m={...pair(),enabled:false},items=[p('expensive',{price:900000}),p('cheap',{price:100000})];assert.equal(learnedRules(m,null).length,1);assert.deepEqual(rerankWithMemory(items,m,null),items);});
test('learning: ranking is stable within equal penalty groups and immutable',()=>{const items=[p('a1',{price:800000}),p('b1',{price:100000}),p('c1',{price:200000}),p('d1',{price:700000})],copy=[...items];assert.deepEqual(rerankWithMemory(items,pair(),null).map(p=>p.id),['custom-b1','custom-c1','custom-a1','custom-d1']);assert.deepEqual(items,copy);});
test('learning: all traits have equal, explicit weights',()=>{let m=pair();m=pass(pass(m,p('small1',{sqft:1000}),'Too small'),p('small2',{sqft:1500}),'Too small');const candidates=[p('both',{price:800000,sqft:900}),p('one',{price:800000,sqft:2000}),p('none',{price:100000,sqft:2000})];assert.deepEqual(rerankWithMemory(candidates,m,null).map(x=>x.id),['custom-none','custom-one','custom-both']);});
test('learning: reranking never drops an otherwise matching home',()=>assert.equal(rerankWithMemory(data,pair(),null).length,60));
test('learning: no view/save/budget signal is used for rules',()=>{const s=state();s.workspace.savedIds=data.map(p=>p.id);s.workspace.notes[home.id]='Too small';assert.deepEqual(learnedRules(s.workspace.rejections,null),[]);});
test('learning: descriptions explain exact values and supporting count',()=>{const t=learningNarrative(pair('HOA too high'),null);assert.match(t,/deprioritized high-HOA/);assert.match(t,/300/);assert.match(t,/2 homes/);});
test('learning: explicit numerical sort is acknowledged, never misclaimed as personalized',()=>{const t=learningNarrative(pair(),null,true);assert.match(t,/numerical order takes priority/);assert.doesNotMatch(t,/I’ve deprioritized/);});
test('learning: match explanations identify a concrete favorable threshold',()=>assert.match(matchLearning(p('cheap',{price:200000}),pair(),null).reasons.join(),/below your learned \$500,000/));
test('learning: unfavorable result remains a disclosed soft match',()=>assert.match(matchLearning(p('expensive',{price:900000}),pair(),null).caveats.join(),/soft preference/));
const lincoln=data.filter(x=>x.city==='Lincoln');
const distancePair=()=>pass(pass(freshRejections(),lincoln[0],'Too far','',work()),lincoln[1],'Too far','',work());
test('distance: two comparable fictional routes activate a labeled rule',()=>{const rules=learnedRules(distancePair(),work());assert.equal(rules.length,1);assert.match(rules[0].detail,/Invented routes/);assert.ok(rules[0].threshold>0);});
test('distance: no commute setup means no inferred route',()=>{const m=pass(pass(freshRejections(),lincoln[0],'Too far'),lincoln[1],'Too far');assert.equal(learnedRules(m,work()).length,0);assert.equal(m.records[lincoln[0].id].snapshot.commute,null);});
test('distance: changing work position suspends prior distance evidence',()=>assert.equal(learnedRules(distancePair(),work({anchor:'east'})).length,0));
test('distance: changing work city suspends prior distance evidence',()=>assert.equal(learnedRules(distancePair(),work({city:'Omaha'})).length,0));
test('distance: returning to original setup reactivates comparable evidence',()=>{const m=distancePair();learnedRules(m,work({anchor:'east'}));assert.equal(learnedRules(m,work()).length,1);});
test('distance: speed and label changes do not change a distance-based rule',()=>assert.deepEqual(learnedRules(distancePair(),work({label:'New private label',speedMph:50})),learnedRules(distancePair(),work())));
test('distance: work from home turns off distance learning',()=>assert.equal(learnedRules(distancePair(),{mode:'remote'}).length,0));
test('distance: custom and outside-city homes receive no invented distance score',()=>{const r=learnedRules(distancePair(),work())[0];assert.equal(ruleApplies(p('new'),r,work()),null);assert.equal(ruleApplies(data.find(x=>x.city==='Omaha'),r,work()),null);});
test('distance: unknown distance caveat never claims a home is closer',()=>assert.match(matchLearning(p('new'),distancePair(),work()).caveats.join(),/does not mean it is nearer/));
test('distance: snapshot never stores the work label or speed',()=>{const m=distancePair(),saved=JSON.stringify(m);assert.doesNotMatch(saved,/My office|speedMph/);});
test('distance: contexts normalize city and state casing',()=>assert.equal(distanceContext(work()),distanceContext(work({city:'lincoln',state:'ne'}))));
test('distance: incomparable passes cannot combine to meet the threshold',()=>{const m=pass(pass(freshRejections(),lincoln[0],'Too far','',work()),lincoln[1],'Too far','',work({anchor:'east'}));assert.equal(eligibleEvidence(m,'Too far',work()).length,1);assert.equal(learnedRules(m,work()).length,0);});

test('assistant: general matches really rerank from catalogue data',()=>{const m=pair('Too small',{sqft:2000},{sqft:2200});const reply=nextReply(pref(),data,{memory:m});assert.ok(reply.matches.every(m=>m.property.sqft>2100));assert.match(reply.text,/deprioritized smaller homes/);});
test('assistant: cheapest keeps true price order despite learned size preference',()=>{const m=pair('Too small',{sqft:2000},{sqft:2200}),reply=nextReply({...pref(),sort:'price'},data,{memory:m});assert.deepEqual(reply.matches.map(m=>m.property.id),[...data].sort((a,b)=>a.price-b.price||b.sqft-a.sqft||a.id.localeCompare(b.id)).slice(0,3).map(p=>p.id));assert.match(reply.text,/numerical order takes priority/);});
test('assistant: biggest ignores contradictory learned price preference',()=>{const reply=nextReply({...pref(),sort:'size'},data,{memory:pair()});assert.equal(reply.matches[0].property.sqft,Math.max(...data.map(x=>x.sqft)));});
test('assistant: passed homes are excluded without mutating source',()=>{const cheapest=[...data].sort((a,b)=>a.price-b.price)[0],m=pass(freshRejections(),cheapest);const reply=nextReply({...pref(),sort:'price'},data,{memory:m});assert.ok(reply.matches.every(x=>x.property.id!==cheapest.id));assert.equal(reply.total,59);assert.match(reply.text,/1 home marked/);assert.equal(data.length,60);});
test('assistant: learned preferences never relax city, budget, or bedroom filters',()=>{const q={...pref(),cities:['Lincoln'],maxPrice:400000,minBeds:3};const r=nextReply(q,data,{memory:pair('Too small')});assert.ok(r.matches.length);assert.ok(r.matches.every(m=>m.property.city==='Lincoln'&&m.property.price<=400000&&m.property.beds>=3));});
test('assistant: all passed yields a review instruction, not misleading wider-budget advice',()=>{let m=freshRejections();for(const h of data)m=pass(m,h);const r=nextReply(pref(),data,{memory:m});assert.equal(r.matches.length,0);assert.match(r.text,/all been marked/);assert.match(r.text,/Your preferences/);});
test('assistant: learned preference request clears a prior ranking but retains constraints',()=>{const q={...pref(),sort:'price',cities:['Lincoln'],maxPrice:400000};const i=interpretMessage('Use my learned preferences',q,null,data);assert.equal(i.preferences.sort,'relevance');assert.deepEqual(i.preferences.cities,['Lincoln']);assert.equal(i.preferences.maxPrice,400000);});
test('assistant: learned preferences can answer without forcing a city',()=>{const r=nextReply(freshPreferences(),data,{memory:pair()});assert.ok(r.matches.length);assert.equal(r.question,null);});
test('assistant: ambiguous request still clarifies when no preference exists',()=>assert.equal(nextReply(freshPreferences(),data).question,'criteria'));
test('assistant: paused mode never says it is applying learned rules',()=>{const r=nextReply(pref(),data,{memory:{...pair(),enabled:false}});assert.match(r.text,/paused/);assert.doesNotMatch(r.text,/I’ve deprioritized/);});
test('assistant: pagination uses the complete reranked result set',()=>{const m=pair('Too small');const a=nextReply(pref(),data,{memory:m}),b=nextReply(pref(),data,{memory:m,more:true,offset:a.offset});assert.equal(b.offset,6);assert.ok(b.matches.every(x=>!a.matches.some(y=>y.property.id===x.property.id)));});

test('discovery: only Recommended uses learned scores',()=>{const m=pair('Too small',{sqft:2000},{sqft:2200});const sorted=browseResults(state(m));assert.ok(sorted[0].sqft>2100);const explicit=browseResults(state(m,{sort:'price-asc'}));assert.equal(explicit[0].price,Math.min(...data.map(p=>p.price)));});
test('discovery: hidden passes affect result count, not catalogue data',()=>{const m=pass(freshRejections(),home);assert.equal(browseResults(state(m)).length,59);assert.equal(browseResults(state(m,{showPassed:true})).length,60);});
test('discovery: saved homes remain saved and visible after passing',()=>{const s=state(pass(freshRejections(),home),{page:'saved'});s.workspace.savedIds=[home.id];assert.equal(browseResults(s)[0].id,home.id);});
test('discovery: recently added is not secretly personalized',()=>{const a=browseResults(state(pair(),{sort:'featured'})),b=browseResults(state(freshRejections(),{sort:'featured'}));assert.deepEqual(a,b);});
test('UI: property cards contain a distinct labeled pass action',()=>{const html=propertyCard(home,state());assert.match(html,/data-action="pass-open"/);assert.match(html,/data-action="save-toggle"/);});
test('UI: passed card has an undo action and visible label',()=>{const html=propertyCard(home,state(pass(freshRejections(),home)));assert.match(html,/Passed · Undo/);assert.match(html,/passed-property-badge/);});
test('UI: reason picker uses native labeled radios with all five choices',()=>{const html=passDialog(home,state());assert.equal((html.match(/type="radio"/g)||[]).length,5);assert.match(html,/<legend>What doesn’t fit/);assert.match(html,/maxlength="500"/);});
test('UI: supporting thresholds and controls are visible, with reset',()=>{const html=preferencesDialog(state(pair('HOA too high')));assert.match(html,/\$300/);assert.match(html,/Threshold = median/);assert.match(html,/Reset all passes/);assert.match(html,/learning-enabled/);});
test('UI: arbitrary notes are escaped, never executable HTML',()=>{const m=pass(freshRejections(),home,'Other','<img src=x onerror=alert(1)>');const html=preferencesDialog(state(m));assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x/);});
test('UI: missing commute is explicitly not an active preference',()=>{const m=pass(pass(freshRejections(),p('a'),'Too far'),p('b'),'Too far');assert.match(preferencesDialog(state(m)),/0 of 2 passes have a comparable/);});
test('UI: no financial profile values are exposed in preferences',()=>{const s=state();s.workspace.decisions.participants[0].budget={income:912345,expenses:2000,savings:500,cash:5000,cushion:500,example:false};assert.doesNotMatch(preferencesDialog(s),/912345/);});
test('storage: write failure keeps session memory exportable',()=>{const original=globalThis.localStorage;globalThis.localStorage={setItem(){throw Error('blocked');},getItem(){return null;},removeItem(){}};try{const w=freshWorkspace();w.rejections=pair();assert.equal(saveWorkspace(w),false);assert.deepEqual(parseWorkspace(JSON.stringify(w)).rejections,w.rejections);assert.equal(loadWorkspace().available,false);}finally{globalThis.localStorage=original;}});
