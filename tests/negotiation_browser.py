"""Feature #4: native disclosures, actual fixture arithmetic, and UI regressions.
No network. Storage is an explicit in-memory adapter, not real persistence.
Expected comparisons below are computed independently in Python from raw fixture records.
"""
from pathlib import Path
import ast,datetime,json,math,shutil,statistics,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
RAW=json.loads(subprocess.check_output(['node','--input-type=module','-e',
 'import {seedProperties} from "./build/data.js";import {listingHistories,soldComparables,NEGOTIATION_SNAPSHOT} from "./build/negotiation-data.js";console.log(JSON.stringify({homes:seedProperties,histories:listingHistories,sales:soldComparables,snapshot:NEGOTIATION_SNAPSHOT}));'],cwd=ROOT))
HOMES={p['id']:p for p in RAW['homes']};SNAP=datetime.date.fromisoformat(RAW['snapshot'])
checks=[];errors=[];requests=[];audits=[];pages=[]
STORAGE="""(seed)=>{const v=new Map(Object.entries(seed||{}));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>v.get(k)??null,setItem:(k,x)=>v.set(k,String(x)),removeItem:k=>v.delete(k),clear:()=>v.clear()}});window.__fetches=[];window.fetch=(...args)=>{window.__fetches.push(String(args[0]));return Promise.reject(new Error('Network disabled'));};}"""
CONTRAST=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tests/ranking_theme_browser.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CONTRAST' for t in n.targets))
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True);assert ok,name

def expected(id):
 p=HOMES[id]
 sales=[s for s in RAW['sales'] if s['city']==p['city'] and s['state']==p['state'] and s['neighborhood']==p['neighborhood'] and s['type']==p['type'] and abs(s['sqft']-p['sqft'])<=p['sqft']*.2+1e-8 and abs(s['beds']-p['beds'])<=1 and 0<=(SNAP-datetime.date.fromisoformat(s['soldOn'])).days<=180]
 sales=sorted(sales,key=lambda s:(abs(s['sqft']-p['sqft']),-datetime.date.fromisoformat(s['soldOn']).toordinal(),s['id']))[:5]
 sales.sort(key=lambda s:(-datetime.date.fromisoformat(s['soldOn']).toordinal(),s['id']))
 mid=statistics.median(s['price']/s['sqft'] for s in sales);difference=(p['price']/p['sqft']/mid-1)*100
 if round(abs(difference),1)==0:takeaway='Asking price per sq ft is within 0.1% of this sample’s median sold price per sq ft.'
 else:takeaway=f'Asking about {abs(difference):.1f}% {"below" if difference<0 else "above"} this sample’s median sold price per sq ft.'
 return sales,takeaway

def store(p):return p.evaluate('JSON.parse(localStorage.getItem("haven.workspace.v1")||"{}")')
def close(p):
 if p.locator('dialog[open]').count():p.locator('.modal-close').click()
def nav(p,target):
 close(p)
 if p.viewport_size['width']<=780:p.locator('[data-action="menu"]').click()
 p.locator(f'.nav-item[data-page="{target}"]').click()
def details(p,id='sample-1'):
 close(p);p.locator('#property-search').fill(HOMES[id]['name']);p.locator('.property-title').first.click()
def expand(p):
 p.locator('.negotiation-toggle').click()
def align(p):p.locator('.detail-modal').evaluate('d=>{d.scrollTop=d.querySelector(".negotiation-panel").offsetTop-24}')
def audit(p,label):
 x=p.evaluate(CONTRAST);audits.append({'name':label,**x})
 if x['failures']:print(json.dumps(x['failures'],indent=2),flush=True)
 check(label+' contrast',x['count']>0 and not x['failures'])
def fit(p):return p.evaluate('document.documentElement.scrollWidth<=innerWidth+1 && [...document.querySelectorAll("dialog[open],.negotiation-panel,.negotiation-body")].filter(e=>e.getBoundingClientRect().height).every(e=>e.scrollWidth<=e.clientWidth+1)')
def choose(p,mode):
 close(p);p.locator('[data-appearance-toggle]').click();p.locator(f'button[data-appearance="{mode}"]').click()
def money(n):return f'${n:,.0f}'

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1200},reduced_motion='reduce',accept_downloads=True)
 ctx.route('**/*',lambda route:(requests.append(route.request.url),route.abort()))
 def load(seed=None,width=1440,height=1200,denied=False):
  p=ctx.new_page();pages.append(p);p.set_viewport_size({'width':width,'height':height});p.set_default_timeout(7000);p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate(STORAGE,seed)
  if denied:p.evaluate('() => {localStorage.setItem=()=>{throw new Error("Storage denied for test")}}')
  p.set_content(HTML,wait_until='load');return p
 p=load()
 try:
  check('Discovery remains the original 60 active homes',p.locator('#stat-properties').inner_text()=='60' and p.locator('.property-card').count()==12)
  details(p);before=store(p)
  check('Property details now have exactly one native negotiation disclosure',p.locator('details#negotiation-panel').count()==1)
  check('Negotiation starts collapsed to keep detail browsing uncluttered',not p.locator('.negotiation-body').is_visible() and p.locator('#negotiation-panel').get_attribute('open') is None)
  check('Collapsed heading visibly labels its data fictional','Fictional' in p.locator('.negotiation-toggle').inner_text())
  p.locator('.negotiation-toggle').focus();p.keyboard.press('Enter')
  check('Enter opens the native disclosure without a mouse',p.locator('#negotiation-panel[open]').count()==1)
  check('Opening the panel preserves focus on its control',p.locator('.negotiation-toggle').evaluate('e=>document.activeElement===e'))
  check('Disclosure keyboard focus has a visible outline',p.locator('.negotiation-toggle').evaluate('e=>getComputedStyle(e).outlineStyle!="none"'))
  p.keyboard.press('Space');check('Space collapses the native disclosure',not p.locator('.negotiation-body').is_visible())
  p.keyboard.press('Enter')
  check('Reading negotiation context performs no workspace write',store(p)==before)
  check('Fixed fictional snapshot and non-current-data disclosure are visible',all(t in p.locator('.negotiation-disclosure').inner_text() for t in ['Invented','Sep 26, 2026','Not current market evidence']))
  p.locator('.negotiation-method summary').focus();p.keyboard.press('Space')
  method=p.locator('.negotiation-method').inner_text()
  check('Nested calculation method supports keyboard disclosure',p.locator('.negotiation-method[open]').count()==1)
  check('Selection rules name 180 days, same type and neighborhood, ±20% size and ±1 bed',all(t in method for t in ['180 days','property type','neighborhood','±20%','±1 bedroom']))
  check('Selection is by size rather than price and never widens insufficient criteria',all(t in method for t in ['closest by size','Asking price is not a selection filter','never widened','minimum of 3']))
  check('Visible formula specifies median of individual unrounded sold ratios',all(t in method for t in ['median(each sold price','unrounded ratios','one decimal place']))
  check('Nearby is explicitly not a geographic distance claim','not measured proximity' in method and 'No coordinates' in method)
  check('Context does not assert a valuation, seller motives, or an offer recommendation',all(t in method for t in ['not an appraisal','offer recommendation','seller motivation','condition','concessions','sale timing']))
  check('Showing the method still performs no workspace writes',store(p)==before)
  p.locator('.negotiation-method summary').click()
  for id in ['sample-1','sample-2','sample-3','sample-5','sample-9','sample-15','sample-19','sample-48','sample-60']:
   details(p,id);expand(p);home=HOMES[id];hist=RAW['histories'][id];sales,takeaway=expected(id)
   label=home['name'];events=hist['events'];drops=sum(b['price']<a['price'] for a,b in zip(events,events[1:]))
   check(label+': actual selected comparable IDs match independent computation',p.locator('.negotiation-comp').evaluate_all('es=>es.map(e=>e.dataset.compId)')==[s['id'] for s in sales])
   check(label+': takeaway matches independent median-per-foot calculation',p.locator('.negotiation-takeaway p').inner_text()==takeaway)
   check(label+': dates and days-on-market derive from fixed history',p.locator('.negotiation-stats>div').nth(1).locator('strong').inner_text()==str((SNAP-datetime.date.fromisoformat(hist['listedOn'])).days)+' days' and p.locator('.negotiation-timeline time').evaluate_all('es=>es.map(e=>e.dateTime)')==[e['date'] for e in events])
   check(label+': zero, one or multiple price reductions are correctly identified',p.locator('.negotiation-stats>div').nth(2).locator('strong').inner_text()==(str(drops) if drops else 'None') and p.locator('.negotiation-timeline li').count()==len(events))
   check(label+': every sale displays price, area and its actual sold date',all(money(s['price']) in p.locator('.negotiation-comp').nth(i).inner_text() and f'{s["sqft"]:,} sq ft' in p.locator('.negotiation-comp').nth(i).inner_text() and p.locator('.negotiation-comp').nth(i).locator('time').get_attribute('datetime')==s['soldOn'] for i,s in enumerate(sales)))
   if home['type']=='Duplex':check(label+': whole-building rather than per-unit context is explicit','both units of the whole building' in p.locator('.negotiation-sales').inner_text())
  details(p);expand(p);baseline=p.locator('.negotiation-panel').inner_text()
  p.locator('.detail-actions [data-action="save-toggle"]').click()
  check('Saving a home preserves the open panel and all evidence',p.locator('#negotiation-panel[open]').count()==1 and p.locator('.negotiation-panel').inner_text()==baseline and 'sample-1' in store(p)['savedIds'])
  p.locator('#property-notes').fill('Ask about condition; the sample comparison is not a valuation.');p.locator('[data-action="save-note"]').click()
  check('Reading and saving notes do not overwrite costs or comparison data',store(p)['notes']['sample-1'].startswith('Ask about condition') and p.locator('.negotiation-panel').inner_text()==baseline)
  p.locator('.detail-actions [data-action="analyze"]').click();p.locator('#calc-price').fill('450000')
  check('Calculator editing remains live and retains its independent price input',store(p)['calculator']['drafts']['sample-1']['price']==450000)
  nav(p,'discover');details(p);expand(p)
  check('A $450k calculator what-if cannot rewrite the $325k asking price or price history',p.locator('.negotiation-panel').inner_text()==baseline)
  close(p);p.locator('[data-action="workspace"]').click()
  with p.expect_download(timeout=7000) as pending:p.locator('.info-modal [data-action="export-backup"]').click()
  exported=Path(pending.value.path()).read_text(encoding='utf-8-sig');backup=json.loads(exported)
  check('Backup keeps existing saved homes, notes and finance inputs',backup['notes']['sample-1'].startswith('Ask about condition') and backup['calculator']['drafts']['sample-1']['price']==450000)
  check('Read-only fixture history adds no personal state to backups',not any('negotiation' in k or 'comparable' in k for k in backup))
  restored=load({'haven.workspace.v1':exported});details(restored);expand(restored)
  check('Existing workspace JSON restores without a schema migration',store(restored)['savedIds']==backup['savedIds'] and restored.locator('#property-notes').input_value()==backup['notes']['sample-1'])
  check('Restoring personal data does not alter the fixed comparison',restored.locator('.negotiation-panel').inner_text()==baseline)
  close(p);nav(p,'custom');p.locator('[data-action="add-property"]').first.click()
  form=p.locator('#property-form');form.locator('[name="name"]').fill('Custom <b>not a fixture</b>');form.locator('[name="address"]').fill('123 User Input Lane');form.locator('[name="city"]').fill('Lincoln');form.locator('[name="state"]').fill('NE');form.locator('button[type="submit"]').click()
  p.locator('.property-title').first.click();expand(p)
  check('Custom property shows an honest no-sample-history state','No history is better than invented history' in p.locator('.negotiation-panel').inner_text())
  check('Custom data has no fabricated comparable rows, day count or percentage verdict',p.locator('.negotiation-comp,.negotiation-stats,.negotiation-takeaway').count()==0)
  check('Custom text remains escaped and cannot create markup',p.locator('#dialog-title b').count()==0 and p.locator('#dialog-title').inner_text()=='Custom <b>not a fixture</b>')
  for theme in ['light','dark']:
   choose(p,theme);p.locator('.property-title').first.click();expand(p);audit(p,theme+' custom unavailable panel')
  denied=load(denied=True);details(denied);expand(denied)
  check('Read-only comparisons work when browser storage rejects writes',denied.locator('.negotiation-takeaway p').inner_text()==expected('sample-1')[1])
  frozen=load();frozen.evaluate('Date.now=()=>Date.parse("2040-01-01")');details(frozen);expand(frozen)
  check('An advanced computer clock does not turn the demo snapshot into live history',frozen.locator('.negotiation-panel').inner_text()==baseline)
  visual=load()
  for theme in ['light','dark']:
   for width in [320,390,768,1024,1440]:
    visual.set_viewport_size({'width':width,'height':1200 if width>780 else 900});choose(visual,theme);details(visual)
    check(f'{theme} {width}px collapsed panel fits without horizontal overflow',fit(visual));audit(visual,f'{theme} {width}px collapsed detail')
    expand(visual)
    check(f'{theme} {width}px expanded evidence and sold records fit',fit(visual));audit(visual,f'{theme} {width}px expanded negotiation')
    check(f'{theme} {width}px disclosure controls retain adequate touch height',visual.locator('.negotiation-toggle').bounding_box()['height']>=44 and visual.locator('.negotiation-method summary').bounding_box()['height']>=44)
    align(visual)
    if width==1440:visual.screenshot(path=str(ROOT/f'docs/negotiation-{theme}.png'))
    if width==390:visual.screenshot(path=str(ROOT/f'docs/negotiation-mobile-{theme}.png'))
    visual.locator('.negotiation-method summary').click()
    check(f'{theme} {width}px formula and limitations wrap without overflow',fit(visual));audit(visual,f'{theme} {width}px expanded method')
    if width==390 and theme=='dark':visual.locator('.negotiation-method').scroll_into_view_if_needed();visual.screenshot(path=str(ROOT/'docs/negotiation-method-mobile-dark.png'))
    visual.locator('.negotiation-toggle').focus();visual.keyboard.press('Space')
    check(f'{theme} {width}px outer keyboard collapse keeps focus and hides content',not visual.locator('.negotiation-body').is_visible() and visual.locator('.negotiation-toggle').evaluate('e=>document.activeElement===e'))
  expand(visual);check('Reduced motion removes disclosure transitions',visual.locator('.negotiation-chevron').evaluate('e=>getComputedStyle(e).transitionDuration')=='0s')
  visual.emulate_media(reduced_motion='no-preference');check('Normal motion keeps a subtle chevron transition',visual.locator('.negotiation-chevron').evaluate('e=>getComputedStyle(e).transitionDuration')!='0s')
  visual.emulate_media(reduced_motion='reduce');check('Live reduced-motion changes immediately remove transitions',visual.locator('.negotiation-chevron').evaluate('e=>getComputedStyle(e).transitionDuration')=='0s')
  visual.locator('.negotiation-toggle').focus();visual.keyboard.press('Escape')
  check('Escape still dismisses the original property dialog',visual.locator('dialog[open]').count()==0)
  check('No uncaught JavaScript exceptions in negotiation workflows',not errors)
  fetches=[x for page in pages for x in page.evaluate('window.__fetches||[]')]
  check('All negotiation workflows make zero fetches and zero external resource requests',not fetches and not requests)
 finally:
  if checks and not checks[-1]['passed']:
   try:p.screenshot(path=str(ROOT/'docs/negotiation-test-failure.png'))
   except Exception:pass
  (ROOT/'docs/negotiation-browser-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'requests':requests,'contrast':audits,'storage':'isolated in-memory adapter; not native persistence'},indent=2))
  print(f"\n{sum(c['passed'] for c in checks)} passed; {sum(not c['passed'] for c in checks)} failed",flush=True)
  browser.close()
