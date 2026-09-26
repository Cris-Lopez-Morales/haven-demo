import test from 'node:test';
import assert from 'node:assert/strict';
import { seedProperties } from '../build/data.js';
import { defaultFilters, defaultAssumptions, filterProperties, calculate } from '../build/finance.js';
import { freshWorkspace, validProperty, parseWorkspace } from '../build/storage.js';
import { propertyResults, resultsPagination, PAGE_SIZE } from '../build/views.js';
import { houseArt } from '../build/ui.js';

const state = (patch={}) => ({page:'discover',workspace:freshWorkspace(),filters:{...defaultFilters},sort:'featured',layout:'grid',moreFilters:false,visibleCount:PAGE_SIZE,assumptions:defaultAssumptions(seedProperties[0]),calculatorPropertyId:'sample-1',storageAvailable:true,storageNotice:'',scenarioName:'',...patch});
// View tests only need the opt-in photograph flag; no browser APIs are mocked
// for the finance, filtering, schema, or workspace tests.
globalThis.document = {documentElement:{dataset:{}}};
const cardCount = html => (html.match(/<article class="property-card"/g)||[]).length;

test('catalog contains exactly 60 fictional properties in 20 cities',()=>{
 assert.equal(seedProperties.length,60);assert.equal(new Set(seedProperties.map(p=>p.city)).size,20);
});
test('all catalog properties satisfy the import and property schemas',()=>seedProperties.forEach(p=>assert.ok(validProperty(p),p.name)));
test('catalog IDs, names and addresses are unique',()=>{
 for(const key of ['id','name','address'])assert.equal(new Set(seedProperties.map(p=>p[key])).size,60,key);
});
test('original saved IDs and all original financial inputs stay compatible',()=>{
 const original=[[325000,2800,4800,125,0],[389000,3150,5400,135,0],[285000,3100,3600,135,0],[248000,2450,3600,100,120],[415000,3000,2900,75,320],[269000,2600,3900,110,0],[359000,3250,5100,145,0],[239000,2850,3200,130,0],[198000,1850,2400,65,220],[575000,3700,4100,165,0],[225000,2200,2700,90,85],[295000,2750,4300,120,0]];
 original.forEach((expected,i)=>{const p=seedProperties[i];assert.equal(p.id,`sample-${i+1}`);assert.deepEqual([p.price,p.rent,p.taxAnnual,p.insuranceMonthly,p.hoaMonthly],expected)});
});
test('all four property types have at least twelve useful examples',()=>{
 for(const type of ['Single-family','Condo','Townhouse','Duplex'])assert.ok(seedProperties.filter(p=>p.type===type).length>=12);
});
test('new cities are searchable without loading earlier pages',()=>{
 for(const city of ['Chicago','Austin','Seattle','San Diego','Tampa','Portland'])assert.equal(filterProperties(seedProperties,{...defaultFilters,city}).length,3);
 const found=filterProperties(seedProperties,{...defaultFilters,query:'Seaglass'});assert.equal(found[0].id,'sample-59');
});
test('complete-catalog descending sort includes the last-page highest price',()=>{
 const found=filterProperties(seedProperties,defaultFilters,'price-desc');assert.equal(found[0].id,'sample-58');assert.equal(found[0].price,895000);
});
test('every fictional fixture produces finite financial metrics',()=>{
 for(const p of seedProperties)for(const value of Object.values(calculate(defaultAssumptions(p))))assert.ok(value===null||Number.isFinite(value),p.name);
});
test('separate-entrance tags are used only for duplexes',()=>{
 seedProperties.filter(p=>p.tags.includes('Separate entrances')).forEach(p=>assert.equal(p.type,'Duplex'));
});
test('first browse page renders 12 cards and a correct progress indicator',()=>{
 const html=propertyResults(state());assert.equal(cardCount(html),12);assert.ok(html.includes('Show 12 more places'));assert.ok(html.includes('of <strong>60</strong>'));
});
test('progressive rendering grows without dropping the first page',()=>{
 const html=propertyResults(state({visibleCount:36}));assert.equal(cardCount(html),36);assert.ok(html.includes('data-property="sample-1"'));assert.ok(html.includes('data-property="sample-36"'));assert.ok(!html.includes('data-property="sample-37"'));
});
test('pagination applies after filtering and sorting',()=>{
 const html=propertyResults(state({filters:{...defaultFilters,city:'San Diego'},sort:'price-asc'}));assert.equal(cardCount(html),3);assert.ok(html.includes('sample-60'));assert.ok(!html.includes('data-action="load-more"'));assert.ok(html.indexOf('sample-59')<html.indexOf('sample-60'));
});
test('the final page has no show-more button or misleading count',()=>{
 const html=propertyResults(state({visibleCount:72}));assert.equal(cardCount(html),60);assert.ok(!html.includes('data-action="load-more"'));assert.ok(html.includes('Showing <strong>60</strong> of <strong>60</strong>'));
});
test('an empty match set has an actionable empty state and no pagination',()=>{
 const s=state({filters:{...defaultFilters,query:'does-not-exist-zzyy'}});assert.equal(cardCount(propertyResults(s)),0);assert.equal(resultsPagination(s),'');assert.ok(propertyResults(s).includes('data-action="clear-filters"'));
});
test('old and new favorite IDs round-trip in the existing backup format',()=>{
 const w={...freshWorkspace(),savedIds:['sample-1','sample-59'],notes:{'sample-1':'Existing note','sample-59':'New note'}};assert.deepEqual(parseWorkspace(JSON.stringify(w)),w);
});
test('new facade illustrations are deterministic and type-specific',()=>{
 assert.equal(houseArt(13,false,'Townhouse'),houseArt(13,false,'Townhouse'));
 assert.notEqual(houseArt(13,false,'Townhouse'),houseArt(13,false,'Duplex'));
 for(const type of ['Single-family','Townhouse','Condo','Duplex'])assert.ok(decodeURIComponent(houseArt(13,false,type)).includes('<svg'));
});
