"""Feature #2: actual DOM workflows, isolated storage, blocked network.
This is not verification of native cross-session storage, real routes, or utility bills.
"""
from pathlib import Path
import ast, json, math, shutil, subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
DATA=json.loads(subprocess.check_output(['node','--input-type=module','-e','import {seedProperties} from "./build/data.js";console.log(JSON.stringify(seedProperties));'],cwd=ROOT))
HOMES={p['id']:p for p in DATA}
checks=[];errors=[];audits=[];requests=[];pages=[]
STORAGE="""(seed)=>{const v=new Map(Object.entries(seed||{}));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>v.get(k)??null,setItem:(k,x)=>v.set(k,String(x)),removeItem:k=>v.delete(k),clear:()=>v.clear()}});window.__fetches=[];window.fetch=(...args)=>{window.__fetches.push(String(args[0]));return Promise.reject(new Error('Network disabled in living test'));};}"""
CONTRAST=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tests/ranking_theme_browser.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CONTRAST' for t in n.targets))
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True);assert ok,name
def store(p):return p.evaluate('JSON.parse(localStorage.getItem("haven.workspace.v1")||"{}")')
def value(p,id):return float(p.locator('#'+id).get_attribute('data-value'))
def close(a,b):return abs(a-b)<1e-6
def nav(p,key):
 if p.locator('dialog[open]').count():p.locator('.modal-close').click()
 if p.viewport_size['width']<=780:p.locator('[data-action="menu"]').click()
 p.locator(f'.nav-item[data-page="{key}"]').click()
def detail(p,id='sample-1'):
 nav(p,'discover');p.locator('#property-search').fill(HOMES[id]['name']);p.locator(f'.property-title[data-id="{id}"]').click()
def options(p):p.locator('.living-commute [data-action="living-work"]').click()
def savework(p):p.locator('#living-work-form button[type="submit"]').click()
def config(p,label='My office',city='Lincoln|NE',anchor='center',speed='25'):
 options(p);p.locator('#living-work-mode').select_option('simulated');p.locator('#living-work-label').fill(label);p.locator('#living-work-city').select_option(city);p.locator('#living-work-anchor').select_option(anchor);p.locator('#living-work-speed').fill(speed);savework(p)
def download(p,selector):
 with p.expect_download(timeout=6000) as pending:p.locator(selector).click()
 return Path(pending.value.path()).read_text(encoding='utf-8-sig')
def backup(p):
 if p.locator('dialog[open]').count():p.locator('.modal-close').click()
 if p.viewport_size['width']<=780:p.locator('[data-action="menu"]').click()
 p.locator('[data-action="workspace"]').click();return download(p,'dialog[open] [data-action="export-backup"]')
def audit(p,name):
 a=p.evaluate(CONTRAST);audits.append({'name':name,**a})
 if a['failures']:print(json.dumps(a['failures'],indent=2),flush=True)
 check(name+' text contrast',a['count']>0 and not a['failures'])
def expected(a,utilities):
 c=a['costs'];loan=a['price']*(1-a['downPercent']/100);rate=a['interestRate']/1200;months=a['years']*12
 mort=(loan/months if not rate else loan*rate/(1-(1+rate)**(-months))) if loan else 0
 tax=a['price']*c['taxRatePercent']/1200;ins=c['insuranceAnnual']/12;hoa=a['hoaMonthly'] if c['hoaApplicable'] else 0
 maint=c['maintenanceValue'] if c['maintenanceBasis']=='monthly' else a['price']*c['maintenanceValue']/1200
 capex=a['rent']*a['capexPercent']/100;pmi=a['mortgageInsuranceMonthly'] if loan else 0
 owner=mort+tax+ins+hoa+maint+capex+pmi;effective=a['rent']*(1-a['vacancyPercent']/100)
 flow=effective-owner-effective*a['managementPercent']/100
 return owner+utilities,flow,flow-utilities

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,reduced_motion='reduce')
 context.route('**/*',lambda route:(requests.append(route.request.url),route.abort()))
 def load(seed=None,width=1440,height=1100):
  p=context.new_page();pages.append(p);p.set_viewport_size({'width':width,'height':height});p.set_default_timeout(7000);p.on('pageerror',lambda err:errors.append(str(err)));p.evaluate(STORAGE,seed);p.set_content(HTML,wait_until='load');return p
 p=load()
 try:
  detail(p)
  check('Plainly titled estimate section appears in property details',p.locator('#living-heading').inner_text()=='What this actually costs to live here.' and p.locator('.living-heading .cost-badge').inner_text()=='ESTIMATE')
  check('Property detail initially focuses close, not a financial input',p.locator('.modal-close').evaluate('e=>e===document.activeElement'))
  check('Utility default uses the existing size and construction-year data',p.locator('#living-utilities').input_value()=='259' and '1,840' in p.locator('.living-utilities').inner_text() and '1998' in p.locator('.living-utilities').inner_text())
  baseline=value(p,'living-monthly-total');baseflow=value(p,'living-base-cashflow')
  check('Living-here and rental scenarios are separate visible results',close(baseline,260000*(6.5/1200)/(1-(1+6.5/1200)**(-360))+325000*1.477/1200+125+140+84+259) and close(value(p,'living-rental-adjusted'),baseflow-259))
  check('Work setup is optional and no fake zero-minute result appears',p.locator('#living-commute-minutes').count()==0 and 'Set up once' in p.locator('.living-commute').inner_text())
  check('Provenance distinguishes defaults from saved edits','default calculator' in p.locator('.living-source').inner_text())
  help=p.locator('[data-cost-help="why-living-utility"]');help.hover()
  check('Hover reveals the complete utility formula and limitations',p.locator('#why-living-utility').is_visible() and all(t in p.locator('#why-living-utility').inner_text() for t in ['$65','$0.10','2026','chosen demo','not measured']))
  help.focus();p.keyboard.press('Escape')
  check('Tooltip works with keyboard focus and Escape without closing the home',p.locator('#why-living-utility').is_hidden() and p.locator('.detail-modal[open]').count()==1)
  p.locator('.living-math summary').click();p.locator('#living-utilities').fill('300.25')
  check('Utility edits recalculate live without replacing the input or its focus',close(value(p,'living-monthly-total'),baseline+41.25) and p.locator('#living-utilities').evaluate('e=>e===document.activeElement'))
  check('The same edit subtracts utilities once from calculator cash flow',close(value(p,'living-rental-adjusted'),baseflow-300.25))
  check('Utility edits persist per property in the existing workspace key',store(p)['living']['utilityOverrides']=={'sample-1':300.25})
  check('Expanded explanation remains open during edits',p.locator('.living-math').get_attribute('open') is not None)
  check('Manual estimate labels replace rather than add to the formula','Your entered estimate replaces' in p.locator('#living-utility-source').inner_text())
  prev=value(p,'living-monthly-total')
  for bad in ['', '-1', '1000001']:
   p.locator('#living-utilities').fill(bad)
   check(f'Invalid utility input {bad!r} pauses saving and marks results stale',p.locator('#living-utility-error').is_visible() and p.locator('#living-utilities').get_attribute('aria-invalid')=='true' and close(value(p,'living-monthly-total'),prev) and store(p)['living']['utilityOverrides']['sample-1']==300.25)
  p.locator('#living-utilities').fill('0')
  check('A deliberate zero utility allowance is not treated as blank',store(p)['living']['utilityOverrides']['sample-1']==0 and close(value(p,'living-monthly-total'),baseline-259))
  p.locator('[data-action="living-utility-reset"]').click()
  check('Reset restores the formula and removes only this utility override',p.locator('#living-utilities').input_value()=='259' and store(p)['living']['utilityOverrides']=={} and close(value(p,'living-monthly-total'),baseline))
  p.locator('#living-utilities').fill('310');p.locator('#property-notes').fill('Unsaved tour thought, do not lose this.')
  options(p)
  check('A dedicated workspace-wide setup opens with keyboard focus',p.locator('#living-work-mode').input_value()=='none' and p.locator('#living-work-fields').is_hidden() and p.locator('#living-work-mode').evaluate('e=>e===document.activeElement'))
  p.locator('#living-work-mode').select_option('simulated')
  check('Location setup explains fictional positions before entry','No mapping service' in p.locator('.living-work-disclosure').inner_text() and p.locator('#living-work-city').input_value()=='Lincoln|NE')
  savework(p)
  check('A blank label cannot save a pretend work location',p.locator('#living-work-error').is_visible() and store(p)['living']['commute'] is None)
  p.locator('#living-work-label').fill('My office');p.locator('#living-work-speed').fill('0');savework(p)
  check('Zero speed is invalid, rather than causing division by zero',p.locator('#living-work-error').is_visible() and store(p)['living']['commute'] is None)
  p.locator('#living-work-speed').fill('25');savework(p)
  check('Saving work settings returns to the home without losing unsaved notes',p.locator('#property-notes').input_value()=='Unsaved tour thought, do not lose this.' and store(p)['notes'].get('sample-1') is None)
  check('Same-city sample commute uses the disclosed grid calculation',value(p,'living-commute-minutes')==18 and close(value(p,'living-commute-miles'),math.hypot(3.5,2)*1.3))
  check('Work setup is stored once, not in each property record',store(p)['living']['commute']['label']=='My office' and 'commute' not in store(p)['calculator']['drafts'].get('sample-1',{}))
  check('Commute is visibly not a real route and does not change dollar totals','Invented positions, not a real route' in p.locator('.living-commute').inner_text() and close(value(p,'living-monthly-total'),baseline+51))
  help=p.locator('[data-cost-help="why-living-commute"]');help.click()
  check('Commute tooltip exposes distance, assumed speed and travel-time formula',p.locator('#why-living-commute').is_visible() and all(t in p.locator('#why-living-commute').inner_text() for t in ['1.3','25 mph','ceil','5 min','no traffic']))
  p.keyboard.press('Escape')
  options(p);p.locator('#living-work-anchor').select_option('east');p.locator('#living-work-speed').fill('15');savework(p)
  miles=math.hypot(-3.5-5,2)*1.3
  check('Changing position and speed recalculates the estimate',close(value(p,'living-commute-miles'),miles) and value(p,'living-commute-minutes')==math.ceil(miles/15*60+5))
  options(p);p.locator('#living-work-label').fill('Do not keep this');p.locator('[data-action="living-work-back"]').click()
  check('Cancel preserves the saved setup and returns focus to the invoking control',store(p)['living']['commute']['label']=='My office' and p.locator('.living-commute [data-action="living-work"]').evaluate('e=>e===document.activeElement'))
  detail(p,'sample-4')
  check('Another home automatically reuses the work location without repeated entry','My office' in p.locator('.living-destination').inner_text() and p.locator('#living-work-form').count()==0)
  check('Distinct homes get distinct same-city illustrative distances',not close(value(p,'living-commute-miles'),miles))
  check('A second home does not inherit the first home utility override',p.locator('#living-utilities').input_value()!='310' and 'Demo formula' in p.locator('#living-utility-source').inner_text())
  detail(p,'sample-2')
  check('Different-city homes do not invent intercity travel estimates','No comparable local estimate' in p.locator('.living-commute').inner_text() and p.locator('#living-commute-minutes').count()==0)
  detail(p)
  check('Reopening the original home restores its independent utility edit',p.locator('#living-utilities').input_value()=='310')
  p.locator('.living-source [data-action="analyze"]').click();p.locator('#cost-insuranceAnnual').fill('2400')
  a=store(p)['calculator']['drafts']['sample-1'];ex=expected(a,310)
  p.locator('.calculator-context [data-action="details"]').click()
  check('Detail estimates follow the last valid calculator insurance edit',close(value(p,'living-monthly-total'),ex[0]) and close(value(p,'living-base-cashflow'),ex[1]) and close(value(p,'living-rental-adjusted'),ex[2]))
  check('Edited calculator provenance is explicit in property details','last valid calculator edits' in p.locator('.living-source').inner_text())
  p.locator('.modal-close').click();p.locator('#cost-closingValue').fill('8');p.locator('.calculator-context [data-action="details"]').click()
  check('Closing-cost changes cannot leak into the living-here monthly total',close(value(p,'living-monthly-total'),ex[0]))
  p.locator('.modal-close').click();p.locator('#cost-insuranceAnnual').fill('');p.locator('.calculator-context [data-action="details"]').click()
  check('An invalid calculator draft does not overwrite the detail estimate',close(value(p,'living-monthly-total'),ex[0]))
  p.locator('#living-utilities').fill('320');p.locator('.modal-close').click()
  check('Utility edits inside a modal do not erase an invalid calculator field behind it',p.locator('#cost-insuranceAnnual').input_value()=='' and p.locator('#calc-error').is_visible())
  p.locator('#cost-insuranceAnnual').fill('2400')
  detail(p,'sample-3')
  check('Duplex details disclose whole-building and both-unit income assumptions','Whole-building estimate' in p.locator('#living-cost-section').inner_text() and 'both units are rented' in p.locator('.living-flow-equation').inner_text())
  detail(p);config(p,anchor='center');p.locator('#living-utilities').fill('321.09')
  saved=store(p);seed={'haven.workspace.v1':json.dumps(saved),'haven.appearance.v1':'light'}
  restored=load(seed);detail(restored)
  check('Reinitialization with the saved store restores utilities and one global work setup',restored.locator('#living-utilities').input_value()=='321.09' and value(restored,'living-commute-minutes')==18)
  actual=json.loads(backup(restored))
  check('Actual backup download includes utility and work settings',actual['living']==saved['living'])
  legacy=json.loads(json.dumps(saved));del legacy['living']
  restored.locator('#backup-input').set_input_files({'name':'legacy.json','mimeType':'application/json','buffer':json.dumps(legacy).encode()});restored.locator('[data-action="confirm-import"]').click();detail(restored)
  check('Importing a pre-1.6 backup migrates safely with no commute or utility overrides',store(restored)['living']=={'version':1,'commute':None,'utilityOverrides':{}} and restored.locator('#living-utilities').input_value()=='259')
  restored.locator('#backup-input').set_input_files({'name':'return.json','mimeType':'application/json','buffer':json.dumps(actual).encode()});restored.locator('[data-action="confirm-import"]').click();detail(restored)
  check('Importing the new backup restores both features through the real dialog',restored.locator('#living-utilities').input_value()=='321.09' and 'My office' in restored.locator('.living-destination').inner_text())
  invalid=json.loads(json.dumps(actual));invalid['living']['commute']['speedMph']=0
  restored.locator('#backup-input').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(invalid).encode()})
  check('Malformed commute imports fail without replacing the workspace',store(restored)['living']==actual['living'] and restored.locator('[data-action="confirm-import"]').count()==0)
  options(restored);restored.locator('#living-work-mode').select_option('remote');savework(restored)
  check('Remote-work mode removes the address instead of storing stale private data',store(restored)['living']['commute']=={'mode':'remote'} and 'Work from home' in restored.locator('.living-commute').inner_text() and restored.locator('#living-commute-minutes').count()==0)
  options(restored);restored.locator('#living-work-mode').select_option('none');savework(restored)
  check('Turning commute off resets only work settings',store(restored)['living']['commute'] is None and store(restored)['living']['utilityOverrides']==actual['living']['utilityOverrides'])
  # Workspace settings entry works without a property open.
  nav(restored,'discover');restored.locator('[data-action="workspace"]').click();restored.locator('.workspace-options [data-action="living-work"]').click()
  check('Workspace settings expose the single reusable work location',restored.locator('#living-work-form').is_visible())
  restored.locator('#living-work-mode').select_option('simulated');restored.locator('#living-work-label').fill('Office <img src=x onerror=window.bad=1>');savework(restored)
  check('Saving from workspace settings returns to workspace management',restored.locator('.workspace-options').count()==1)
  detail(restored)
  check('Location labels render as text, never HTML or remote resources','<img src=x' in restored.locator('.living-destination').inner_text() and restored.evaluate('window.bad') is None)
  # Custom property UI, including deletion cleanup.
  nav(restored,'custom');restored.locator('.topbar [data-action="add-property"]').click()
  for key,v in {'name':'Test local custom','address':'Demo address','city':'Lincoln','state':'NE'}.items():restored.locator(f'#property-form [name="{key}"]').fill(v)
  restored.locator('#property-form button[type="submit"]').click();custom=store(restored)['customProperties'][0]['id'];restored.locator(f'.property-title[data-id="{custom}"]').click()
  check('Custom homes get size/age utilities but no made-up coordinates','No commute estimate for this property' in restored.locator('.living-commute').inner_text() and float(restored.locator('#living-utilities').input_value())>0)
  restored.locator('#living-utilities').fill('444');restored.locator('[data-action="delete-property"]').click();restored.locator('[data-action="confirm-delete"]').click()
  check('Deleting a custom property prunes its utilities without deleting work settings',custom not in store(restored)['living']['utilityOverrides'] and store(restored)['living']['commute'] is not None)
  # Denied writes preserve valid session edits and portable export.
  denied=load(seed);detail(denied);denied.evaluate('()=>{localStorage.setItem=()=>{throw new Error("Quota test")}}');denied.locator('#living-utilities').fill('456.78')
  check('Storage failure is visible while valid session-only calculations continue','Session only' in denied.locator('#living-save-status').inner_text() and close(value(denied,'living-rental-adjusted'),value(denied,'living-base-cashflow')-456.78))
  config(denied,label='Session office')
  check('Work location also works session-only when storage fails','Session office' in denied.locator('.living-destination').inner_text())
  exported=json.loads(backup(denied))
  check('Session-only utility and commute edits can still be exported',exported['living']['utilityOverrides']['sample-1']==456.78 and exported['living']['commute']['label']=='Session office')
  # Reset clears just what its confirmation describes.
  nav(restored,'discover');restored.locator('[data-action="workspace"]').click();restored.locator('[data-action="reset-workspace"]').click();restored.locator('[data-action="confirm-reset"]').click()
  check('Full workspace reset clears all new inputs and keeps the 60 original homes',store(restored)['living']=={'version':1,'commute':None,'utilityOverrides':{}} and restored.locator('#stat-properties').inner_text()=='60')
  # Both themes, full-width range, hover/tap/focus, and reachable narrow-screen controls.
  for width in [320,390,768,1024,1440]:
   q=load(seed,width=width,height=950)
   for theme in ['light','dark']:
    if q.locator('dialog[open]').count():q.locator('.modal-close').click()
    q.locator('[data-appearance-toggle]').click();q.locator(f'button[data-appearance="{theme}"]').click();detail(q)
    q.locator('#living-cost-section').evaluate('(e)=>e.scrollIntoView({block:"start"})')
    check(f'{width}px {theme}: property and new section have no horizontal overflow',q.locator('.detail-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1') and q.locator('#living-cost-section').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
    audit(q,f'{width}px {theme} living summary')
    help=q.locator('[data-cost-help="why-living-utility"]');help.click();box=q.locator('#why-living-utility').bounding_box()
    check(f'{width}px {theme}: utility tooltip is tap accessible and clamped',box is not None and box['x']>=0 and box['x']+box['width']<=width+1 and box['y']>=0 and box['y']+box['height']<=951)
    audit(q,f'{width}px {theme} utility formula');q.keyboard.press('Escape')
    check(f'{width}px {theme}: Escape retains the property and tooltip focus',q.locator('.detail-modal[open]').count()==1 and help.evaluate('e=>e===document.activeElement'))
    q.locator('.living-math summary').focus();q.keyboard.press('Enter');q.locator('.living-math-body').scroll_into_view_if_needed()
    check(f'{width}px {theme}: keyboard opens the cost breakdown',q.locator('.living-math').get_attribute('open') is not None)
    if width==390 and theme=='dark':q.locator('#living-cost-section').evaluate('(e)=>e.scrollIntoView({block:"start"})');q.screenshot(path=str(ROOT/'docs/living-mobile-dark.png'))
    q.locator('.living-math summary').click()
    if width==1440:
     q.locator('#living-cost-section').evaluate('(e)=>e.scrollIntoView({block:"start"})');q.screenshot(path=str(ROOT/f'docs/living-{theme}.png'))
    q.locator('.living-commute').scroll_into_view_if_needed();audit(q,f'{width}px {theme} commute')
    if width==390 and theme=='dark':q.screenshot(path=str(ROOT/'docs/living-commute-mobile-dark.png'))
    options(q)
    check(f'{width}px {theme}: work setup has no horizontal overflow',q.locator('.living-settings-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
    audit(q,f'{width}px {theme} work settings')
    q.locator('#living-work-speed').fill('30');q.locator('#living-work-form button[type="submit"]').focus();q.keyboard.press('Enter')
    check(f'{width}px {theme}: keyboard can save setup and return to home',q.locator('#living-cost-section').is_visible() and store(q)['living']['commute']['speedMph']==30)
   check(f'{width}px: reduced motion covers all new controls',q.locator('#living-cost-section *').evaluate_all('(els)=>els.every(e=>getComputedStyle(e).animationName==="none" && parseFloat(getComputedStyle(e).transitionDuration)===0)'))
  # Large, valid values must wrap without breaking small screens.
  q=load(seed,width=320,height=950);nav(q,'calculator');q.locator('#calc-price').fill('100000000');q.locator('.calculator-context [data-action="details"]').click();q.locator('#living-utilities').fill('1000000')
  check('Large valid dollar figures do not break the 320px layout',q.locator('.detail-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1') and q.locator('#living-cost-section').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
  check('All new operations avoid fetch calls',all(not x.evaluate('window.__fetches') for x in pages))
  check('No external resource requests in the feature workflows',not requests)
  check('No uncaught application exceptions in the feature workflows',not errors)
  print(f'PASS: {len(checks)} living browser checks and {len(audits)} text-contrast groups. Isolated storage adapter.',flush=True)
 except Exception:
  for i,x in enumerate(pages):
   if not x.is_closed() and x.locator('#living-cost-section,#living-work-form').count():
    x.screenshot(path=str(ROOT/f'docs/living-test-failure-{i}.png'));break
  raise
 finally:
  (ROOT/'docs/living-browser-results.json').write_text(json.dumps({'isolated':True,'checks':checks,'contrastAudits':audits,'pageErrors':errors,'blockedRequests':requests},indent=2))
  browser.close()
