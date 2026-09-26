"""Feature 1 regression suite. Real Chromium DOM, isolated in-memory storage.
This tests re-initialization and backup restoration, not native cross-session persistence.
All requests are blocked and recorded. No live provider or mapping calls are made.
"""
from pathlib import Path
import ast, copy, json, math, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
KEY='haven.workspace.v1'
checks=[]; errors=[]; audits=[]; requests=[]
STORAGE="""(seed)=>{const v=new Map(Object.entries(seed||{}));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>v.get(k)??null,setItem:(k,x)=>v.set(k,String(x)),removeItem:k=>v.delete(k),clear:()=>v.clear()}});window.__fetches=[];window.fetch=(...args)=>{window.__fetches.push(String(args[0]));return Promise.reject(new Error('Network disabled in cost test'));};}"""
CONTRAST=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tests/ranking_theme_browser.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CONTRAST' for t in n.targets))
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)})
 print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 assert ok,name

def stored(p):return p.evaluate('JSON.parse(localStorage.getItem("haven.workspace.v1")||"{}")')
def draft(p):
 w=stored(p);return w['calculator']['drafts'][w['calculator']['activePropertyId']]
def val(p,key):return float(p.locator('#'+key).get_attribute('data-value'))
def close(a,b):return abs(a-b)<.00001
def calc(a):
 c=a['costs'];price=a['price'];loan=price*(1-a['downPercent']/100);rate=a['interestRate']/1200;months=a['years']*12
 mortgage=(loan/months if not rate else loan*rate/(1-(1+rate)**(-months))) if loan else 0
 tax=price*c['taxRatePercent']/1200;ins=c['insuranceAnnual']/12
 maint=c['maintenanceValue'] if c['maintenanceBasis']=='monthly' else price*c['maintenanceValue']/1200
 hoa=a['hoaMonthly'] if c['hoaApplicable'] else 0
 collected=a['rent']*(1-a['vacancyPercent']/100)
 total=mortgage+tax+ins+maint+hoa+collected*a['managementPercent']/100+a['rent']*a['capexPercent']/100+(a['mortgageInsuranceMonthly'] if loan else 0)
 closing=c['closingValue'] if c['closingBasis']=='amount' else price*c['closingValue']/100
 upfront=price*a['downPercent']/100+closing+a['initialRepairs']
 return {'monthly':total,'closing':closing,'upfront':upfront,'year':upfront+total*12,'flow':collected-total}
def expected(p,name):
 a=calc(draft(p));check(name,all(close(val(p,k),a[v]) for k,v in [('ownership-monthly-total','monthly'),('one-time-closing-total','closing'),('purchase-cash-total','upfront'),('ownership-first-year-total','year')]))
def nav(p,key):
 if p.viewport_size['width']<=780:p.locator('[data-action="menu"]').click()
 p.locator(f'.nav-item[data-page="{key}"]').click()
def select(p,text):
 p.locator('#calculator-property').click();p.locator('#calculator-property').fill(text);p.locator('#calculator-property').press('Enter')
def audit(p,name):
 a=p.evaluate(CONTRAST);audits.append({'name':name,**a})
 if a['failures']:print(json.dumps(a['failures'],indent=2),flush=True)
 check(name+' rendered-text contrast',a['count']>0 and not a['failures'])
def download(p,selector):
 with p.expect_download(timeout=6000) as pending:p.locator(selector).click()
 return Path(pending.value.path()).read_text(encoding='utf-8-sig')
def shot(p,name):
 p.evaluate('document.querySelector("#toast-host").replaceChildren();window.scrollTo(0,0)')
 p.screenshot(path=str(ROOT/'docs'/name),full_page=True)

with sync_playwright() as pw:
 executable=shutil.which('chromium') or shutil.which('google-chrome')
 browser=pw.chromium.launch(**({'executable_path':executable} if executable else {}),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce',accept_downloads=True)
 context.route('**/*',lambda route:(requests.append(route.request.url),route.abort()))
 pages=[]
 def load(seed=None,width=1440,height=1100):
  p=context.new_page();pages.append(p);p.set_viewport_size({'width':width,'height':height});p.set_default_timeout(7000);p.on('pageerror',lambda err:errors.append(str(err)));p.evaluate(STORAGE,seed);p.set_content(HTML,wait_until='load');return p
 p=load()
 try:
  nav(p,'calculator')
  check('All five cost controls are available with explicit units',all(p.locator(s).count()==1 for s in ['#cost-taxRatePercent','#cost-insuranceAnnual','#cost-maintenanceValue','#cost-hoa-applicable','#cost-closingValue']))
  check('Defaults preserve source amounts with a disclosed rounded tax rate',p.locator('#cost-taxRatePercent').input_value()=='1.477' and p.locator('#cost-insuranceAnnual').input_value()=='1500' and p.locator('#cost-maintenanceValue').input_value()=='140')
  check('Non-applicable HOA amount is hidden and disabled',p.locator('#cost-hoa-field').is_hidden() and p.locator('#calc-hoaMonthly').is_disabled() and p.locator('[data-cost-row="hoa"]').count()==0)
  check('Maintenance defaults to fixed monthly dollars',p.locator('#cost-maintenance-basis').input_value()=='monthly')
  check('Closing costs default to a one-time percentage',p.locator('#cost-closing-basis').input_value()=='percent' and p.locator('#cost-closingValue').input_value()=='3' and 'Not a monthly charge' in p.locator('#hint-closingValue').inner_text())
  check('Initial cost totals match the independent example',close(val(p,'ownership-monthly-total'),260000*(6.5/1200)/(1-(1+6.5/1200)**(-360)) + 325000*1.477/1200 + 125 + 140 + 212.8 + 84) and val(p,'one-time-closing-total')==9750)
  check('Every visible calculator number has a why-default description',p.locator('[data-calc], [data-cost]').evaluate_all('(els)=>els.every(e=>!!document.getElementById(e.getAttribute("aria-describedby").split(" ")[0]))'))
  help=p.locator('[data-cost-help="why-taxRatePercent"]');help.hover()
  check('Default explanation opens on hover',p.locator('#why-taxRatePercent').is_visible() and 'fictional property record' in p.locator('#why-taxRatePercent').inner_text())
  help.focus();p.keyboard.press('Escape')
  check('Tooltip dismisses with Escape without moving keyboard focus',p.locator('#why-taxRatePercent').is_hidden() and help.evaluate('e=>e===document.activeElement'))
  p.locator('#cost-insuranceAnnual').focus();help.focus()
  check('Keyboard focus also reveals the explanation',p.locator('#why-taxRatePercent').is_visible() and help.get_attribute('aria-expanded')=='true')
  p.keyboard.press('Escape');p.locator('#cost-insuranceAnnual').focus()
  before=val(p,'ownership-monthly-total');p.locator('#cost-taxRatePercent').fill('1.1')
  check('Tax edit recalculates immediately without submitting',close(val(p,'ownership-monthly-total')-before,325000*(1.1-1.477)/1200))
  check('Tax rate edit does not overwrite the other fields',draft(p)['costs']['insuranceAnnual']==1500 and draft(p)['costs']['maintenanceValue']==140 and draft(p)['costs']['closingValue']==3)
  check('Tax edit persists under this property in the existing workspace key',stored(p)['calculator']['drafts']['sample-1']['costs']['taxRatePercent']==1.1)
  check('Typing preserves input focus and does not replace the form',p.locator('#cost-taxRatePercent').evaluate('e=>e===document.activeElement'))
  expected(p,'Tax results agree with independent finance arithmetic')
  before=val(p,'ownership-monthly-total');p.locator('#cost-insuranceAnnual').fill('2400')
  check('Annual insurance adds exactly the correct monthly delta',close(val(p,'ownership-monthly-total')-before,75))
  check('Insurance conversion is visible',p.locator('#hint-insuranceAnnual').inner_text()=='Annual estimate ÷ 12 = $200.00 / month')
  check('Editing insurance keeps the chosen tax rate',draft(p)['costs']['taxRatePercent']==1.1)
  p.locator('#calc-price').fill('400000');expected(p,'Changing price reuses the selected tax and closing percentage')
  check('A fixed maintenance reserve stays fixed when price changes',draft(p)['costs']['maintenanceValue']==140)
  p.locator('#cost-maintenanceValue').fill('250');expected(p,'Monthly maintenance is added exactly once')
  p.locator('#calc-rent').fill('3000')
  check('Changing rent no longer changes the fixed maintenance reserve',draft(p)['costs']['maintenanceValue']==250 and '$250.00' in p.locator('[data-cost-row="maintenance"]').inner_text())
  before=val(p,'ownership-monthly-total');p.locator('#cost-maintenance-basis').focus();p.locator('#cost-maintenance-basis').select_option('home-value')
  check('Switching maintenance units keeps the estimated monthly amount',close(val(p,'ownership-monthly-total'),before) and close(float(p.locator('#cost-maintenanceValue').input_value()),.75))
  check('Annual home-value basis is explicit in the input label','% of home value / year' in p.locator('label[for="cost-maintenanceValue"]').inner_text())
  check('Unit selection retains keyboard focus after rerender',p.locator('#cost-maintenance-basis').evaluate('e=>e===document.activeElement'))
  p.locator('#cost-maintenanceValue').fill('1');expected(p,'Home-value percentage divides by twelve, not by one')
  p.locator('#calc-price').fill('300000')
  check('Home-value maintenance recalculates with purchase price','$250.00' in p.locator('[data-cost-row="maintenance"]').inner_text())
  p.locator('#cost-hoa-applicable').check()
  check('Turning HOA on reveals a usable independent fee field',p.locator('#cost-hoa-field').is_visible() and p.locator('#calc-hoaMonthly').is_enabled())
  before=val(p,'ownership-monthly-total');p.locator('#calc-hoaMonthly').fill('185.50')
  check('HOA adds its monthly amount exactly once',close(val(p,'ownership-monthly-total')-before,185.5))
  before=val(p,'ownership-monthly-total');p.locator('#cost-hoa-applicable').uncheck()
  check('Turning HOA off removes its cost and row',close(val(p,'ownership-monthly-total'),before-185.5) and p.locator('[data-cost-row="hoa"]').count()==0)
  check('Excluded HOA is retained for a reversible toggle',draft(p)['hoaMonthly']==185.5 and not draft(p)['costs']['hoaApplicable'])
  p.locator('#cost-hoa-applicable').check()
  check('Turning HOA back on restores the previous fee',float(p.locator('#calc-hoaMonthly').input_value())==185.5 and close(val(p,'ownership-monthly-total'),before))
  expected(p,'HOA-inclusive totals match independent arithmetic')
  monthly=val(p,'ownership-monthly-total');year=val(p,'ownership-first-year-total');p.locator('#cost-closingValue').fill('4')
  check('Closing percentage changes upfront cash, not monthly total',val(p,'one-time-closing-total')==12000 and close(val(p,'ownership-monthly-total'),monthly))
  check('First-year outlay increases once, not twelve times',close(val(p,'ownership-first-year-total')-year,3000))
  p.locator('#cost-closing-basis').select_option('amount')
  check('Switching closing cost units preserves the dollar amount',p.locator('#cost-closingValue').input_value()=='12000' and val(p,'one-time-closing-total')==12000)
  p.locator('#cost-closingValue').fill('8500')
  check('Fixed closing amount still never changes monthly outflows',val(p,'one-time-closing-total')==8500 and close(val(p,'ownership-monthly-total'),monthly))
  p.locator('#calc-price').fill('330000')
  check('Fixed closing amount does not scale with the purchase price',val(p,'one-time-closing-total')==8500)
  expected(p,'Combined independent edits produce the expected full result')
  p.locator('#cost-closing-basis').select_option('percent');p.locator('#cost-closing-basis').select_option('amount')
  check('Repeated closing-unit conversions do not round away the entered amount',close(float(p.locator('#cost-closingValue').input_value()),8500))
  check('Monthly and one-time sections explicitly describe their different scopes','ONE-TIME' in p.locator('.purchase-cost-panel').inner_text() and 'Includes down payment and loan principal' in p.locator('.purchase-cost-panel').inner_text())
  check('First-year formula is visible, not hidden inside a score','Upfront cash + (monthly costs & reserves × 12)' in p.locator('.cost-formula').inner_text())
  good=copy.deepcopy(draft(p));goodtotal=val(p,'ownership-monthly-total');p.locator('#cost-insuranceAnnual').fill('')
  check('Blank cost input pauses saving and report export',p.locator('#calc-error').is_visible() and p.locator('[data-action="export-report"]').is_disabled() and 'Not saved' in p.locator('#cost-saving-status').inner_text())
  check('Invalid drafts cannot overwrite saved per-home values',draft(p)==good and close(val(p,'ownership-monthly-total'),goodtotal))
  check('Invalid results remain readable with a distinct stale state',p.locator('#calc-results').evaluate('e=>e.classList.contains("results-stale") && getComputedStyle(e).opacity==="1"'))
  check('Unit changes are disabled while an input is invalid',p.locator('#cost-closing-basis').is_disabled() and p.locator('#cost-maintenance-basis').is_disabled())
  p.locator('#cost-taxRatePercent').fill('1.2')
  check('A second edit is not partially saved while another field is invalid',draft(p)==good)
  p.locator('#cost-insuranceAnnual').fill('2400')
  check('Correcting input commits all valid visible edits together',draft(p)['costs']['taxRatePercent']==1.2 and p.locator('[data-action="export-report"]').is_enabled())
  for selector,label in [('#cost-taxRatePercent','Tax'),('#cost-insuranceAnnual','Insurance'),('#cost-maintenanceValue','Maintenance'),('#cost-closingValue','Closing')]:
   old=p.locator(selector).input_value();p.locator(selector).fill('-1')
   check(label+' rejects a negative input with accessible invalid state',p.locator(selector).get_attribute('aria-invalid')=='true' and p.locator('[data-action="save-scenario"]').is_disabled())
   p.locator(selector).fill(old)
  expected(p,'Corrected valid inputs restore the expected results')
  # Save a nested snapshot, then verify edits and property navigation cannot mutate it.
  p.locator('[data-action="save-scenario"]').click();p.locator('#scenario-form input').fill('Transparent plan');p.locator('#scenario-form [type="submit"]').click()
  saved=copy.deepcopy(stored(p)['scenarios'][0]['assumptions']);p.locator('#cost-insuranceAnnual').fill('1234')
  check('Named scenario remains frozen after changing a current cost',stored(p)['scenarios'][0]['assumptions']==saved)
  p.locator('[data-action="load-scenario"]').click()
  check('Loading a scenario restores all cost units and numbers',draft(p)==saved)
  report=download(p,'[data-action="export-report"]')
  check('CSV contains annual insurance, tax rate, and reserve basis','Annual insurance estimate' in report and 'Annual property tax rate' in report and '% of home value per year' in report)
  check('CSV clearly marks closing one-time and includes cash-outlay totals','ONE-TIME' in report and 'First-year cash outlay' in report and 'Total costs and reserves' in report)
  check('CSV does not mislabel the new reserve as a rent percentage','Maintenance (% of gross rent)' not in report)
  willow=copy.deepcopy(draft(p));select(p,'Juniper Townhome')
  check('A different home starts with its own HOA amount',p.locator('#calc-hoaMonthly').input_value()=='120' and p.locator('#cost-hoa-applicable').is_checked())
  p.locator('#cost-insuranceAnnual').fill('1777');p.locator('#cost-closing-basis').select_option('amount');p.locator('#cost-closingValue').fill('7000');juniper=copy.deepcopy(draft(p))
  select(p,'The Willow House')
  check('Returning to a property restores every edited cost without cross-contamination',draft(p)==willow and p.locator('#cost-insuranceAnnual').input_value()=='2400')
  select(p,'Juniper Townhome')
  check('The second property independently restores its amount and units',draft(p)==juniper and p.locator('#cost-closing-basis').input_value()=='amount')
  check('Active property is persisted with its draft',stored(p)['calculator']['activePropertyId']=='sample-4')
  nav(p,'discover');nav(p,'calculator')
  check('Leaving and returning to calculator retains the current home',p.locator('#calculator-property').input_value().startswith('Juniper Townhome') and draft(p)==juniper)
  seed={KEY:json.dumps(stored(p))};p2=load(seed);nav(p2,'calculator')
  check('App reinitialization with stored data restores the active property and costs',p2.locator('#cost-insuranceAnnual').input_value()=='1777' and p2.locator('#cost-closingValue').input_value()=='7000')
  check('Reinitialized results match independent arithmetic',close(val(p2,'ownership-monthly-total'),calc(juniper)['monthly']))
  p2.locator('[data-action="reset-calculator"]').click()
  check('Reset restores this home to source-based defaults',p2.locator('#cost-insuranceAnnual').input_value()=='1200' and p2.locator('#cost-closing-basis').input_value()=='percent')
  check('Reset does not alter another property’s plan',stored(p2)['calculator']['drafts']['sample-1']==willow)
  # Import / export both edited homes through actual file controls.
  p.locator('.workspace-button').click();backup=download(p,'dialog[open] [data-action="export-backup"]');p.keyboard.press('Escape')
  check('Full backup includes both independently edited cost plans',len(json.loads(backup)['calculator']['drafts'])==2)
  p3=load();p3.locator('#backup-input').set_input_files({'name':'cost-plans.json','mimeType':'application/json','buffer':backup.encode()})
  # File.text() is asynchronous: wait for the actual confirmation, not upload dispatch.
  p3.locator('dialog[open] [data-action="confirm-import"]').wait_for(state='visible',timeout=7000)
  check('Import asks for confirmation before replacing any saved plan',p3.locator('dialog[open] [data-action="confirm-import"]').is_visible())
  p3.locator('[data-action="confirm-import"]').click();nav(p3,'calculator')
  check('Confirmed import restores property, selected units, and exact values',draft(p3)==juniper and p3.locator('#cost-closing-basis').input_value()=='amount')
  # Legacy snapshot retains its original numbers; opening creates a modern draft only.
  old=json.loads(backup);old.pop('calculator');old['scenarios'][0]['assumptions'].pop('costs');old_assumptions=copy.deepcopy(old['scenarios'][0]['assumptions'])
  oldpage=load({KEY:json.dumps(old)});nav(oldpage,'calculator');oldpage.locator('[data-action="load-scenario"]').click()
  check('Legacy backups open without recovery/reset warnings',not oldpage.locator('main>.notice').count())
  check('Loading legacy maintenance preserves its initial dollar allowance',close(float(oldpage.locator('#cost-maintenanceValue').input_value()),old_assumptions['rent']*old_assumptions['maintenancePercent']/100))
  check('Legacy saved snapshot is not rewritten when opened',stored(oldpage)['scenarios'][0]['assumptions']==old_assumptions and 'costs' not in stored(oldpage)['scenarios'][0]['assumptions'])
  # Deleting the active custom property restores, rather than overwrites, another home's plan.
  deleting=json.loads(backup)
  deleting['customProperties']=[{'id':'custom-cost-test','name':'My Cost Test Home','address':'10 Sample Lane','city':'Lincoln','state':'NE','neighborhood':'Demo','price':300000,'beds':3,'baths':2,'sqft':1800,'type':'Single-family','rent':2600,'taxAnnual':4000,'insuranceMonthly':120,'hoaMonthly':0,'yearBuilt':2000,'photo':'','art':0,'tags':['Demo'],'description':'Fictional home for cost persistence tests.','addedAt':1,'custom':True}]
  deleting['calculator']['activePropertyId']='custom-cost-test'
  deleting['calculator']['drafts']['custom-cost-test']=copy.deepcopy(willow)
  removing=load({KEY:json.dumps(deleting)});nav(removing,'custom')
  removing.locator('[data-action="details"][data-id="custom-cost-test"]').first.click()
  removing.locator('[data-action="delete-property"]').click();removing.locator('[data-action="confirm-delete"]').click();nav(removing,'calculator')
  check('Deleting a custom home removes its persisted cost draft','custom-cost-test' not in stored(removing)['calculator']['drafts'] and not stored(removing)['customProperties'])
  check('Deleting the active home restores the fallback home’s saved costs',draft(removing)==willow and removing.locator('#cost-insuranceAnnual').input_value()=='2400')
  check('Deleting a home does not overwrite another home’s saved costs',stored(removing)['calculator']['drafts']['sample-4']==juniper)
  removing.locator('.workspace-button').click();removing.locator('[data-action="reset-workspace"]').click();removing.locator('[data-action="confirm-reset"]').click()
  check('Confirmed workspace reset clears all per-home calculator plans',stored(removing)['calculator']['drafts']=={} and stored(removing)['calculator']['activePropertyId']=='sample-1')
  # Deliberately denied persistence still exposes the valid session calculation.
  denied=load(seed);nav(denied,'calculator');denied.evaluate('()=>{localStorage.setItem=()=>{throw new Error("Quota exceeded")};}')
  denied.locator('#cost-insuranceAnnual').fill('3000')
  check('Storage failure is visibly session-only, not falsely saved','Session only' in denied.locator('#cost-saving-status').inner_text())
  check('Storage failure does not overwrite the previous persisted plan',stored(denied)['calculator']['drafts']['sample-4']['costs']['insuranceAnnual']==1777)
  check('Valid session-only edits still recalculate',close(val(denied,'ownership-monthly-total'),calc({**juniper,'costs':{**juniper['costs'],'insuranceAnnual':3000}})['monthly']))
  denied.locator('.workspace-button').click();session_backup=download(denied,'dialog[open] [data-action="export-backup"]');denied.keyboard.press('Escape')
  check('Session-only edits can be rescued in a backup',json.loads(session_backup)['calculator']['drafts']['sample-4']['costs']['insuranceAnnual']==3000)
  # Rejected unit conversion is atomic, and all zero values are usable.
  zero=load();nav(zero,'calculator');zero.locator('#cost-closing-basis').select_option('amount');zero.locator('#cost-closingValue').fill('200000');old_month=val(zero,'ownership-monthly-total');zero.locator('#cost-closing-basis').select_option('percent')
  check('Unrepresentable closing percentage leaves the dollar mode and inputs unchanged',zero.locator('#cost-closing-basis').input_value()=='amount' and draft(zero)['costs']['closingValue']==200000 and close(val(zero,'ownership-monthly-total'),old_month))
  check('Rejected conversion explains the range instead of silently clamping','cannot be represented' in zero.locator('#toast-host').inner_text())
  zero.locator('[data-action="reset-calculator"]').click()
  for selector in ['#cost-taxRatePercent','#cost-insuranceAnnual','#cost-maintenanceValue','#cost-closingValue']:
   zero.locator(selector).fill('0')
  zero.locator('[data-action="shortcut"][data-kind="cash"]').click();zero.locator('#calc-rent').fill('0')
  check('Zero costs and all-cash purchase calculate without NaN or missing-field errors',val(zero,'ownership-monthly-total')==0 and zero.locator('[data-action="export-report"]').is_enabled())
  check('All-cash first-year outlay includes purchase equity, not phantom debt',val(zero,'ownership-first-year-total')==325000)
  check('Loan breakdown still works after cost extension',zero.locator('.no-loan').is_visible())
  # Keyboard/touch/mobile/contrast in both complete palettes, including tooltips.
  for width in [320,390,768,1024,1440]:
   responsive=load(seed,width,900);nav(responsive,'calculator')
   for theme in ['light','dark']:
    responsive.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    check(f'{width}px {theme}: cost page has no horizontal overflow',responsive.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    audit(responsive,f'{width}px {theme} calculator')
    tip=responsive.locator('[data-cost-help="why-closingValue"]');tip.click()
    box=responsive.locator('#why-closingValue').bounding_box()
    check(f'{width}px {theme}: tap tooltip stays inside the viewport',box is not None and box['x']>=0 and box['x']+box['width']<=width+1 and box['y']>=0 and box['y']+box['height']<=900+1)
    audit(responsive,f'{width}px {theme} tooltip')
    responsive.keyboard.press('Escape')
    check(f'{width}px {theme}: tooltip Escape does not trap focus',responsive.locator('#why-closingValue').is_hidden() and tip.evaluate('e=>e===document.activeElement'))
    if width==1440:shot(responsive,f'cost-breakdown-{theme}.png')
    if width==390:shot(responsive,f'cost-breakdown-mobile-{theme}.png')
   # Keep the typing picker and reduced-motion behavior from older versions.
   responsive.locator('#calculator-property').click();responsive.locator('#calculator-property').fill('Cedar');box=responsive.locator('.picker-popup').bounding_box()
   check(f'{width}px: existing property search remains within the viewport',box['x']>=0 and box['x']+box['width']<=width+1)
   responsive.locator('#calculator-property').press('Escape')
  motion=load(seed);nav(motion,'calculator')
  check('Cost controls respect reduced-motion without extra animations',motion.locator('.ownership-inputs *').evaluate_all('(els)=>els.every(e=>getComputedStyle(e).animationName==="none" && parseFloat(getComputedStyle(e).transitionDuration)===0)'))
  check('New cost operations never attempt fetch requests',all(not page.evaluate('window.__fetches') for page in pages))
  check('No external resource request occurred in the exercised app',not requests)
  check('No uncaught application errors in the feature suite',not errors)
  print(f'PASS: {len(checks)} cost browser checks and {len(audits)} text-contrast groups. Isolated storage adapter.',flush=True)
 except Exception:
  p.screenshot(path=str(ROOT/'docs/cost-test-failure.png'),full_page=True)
  raise
 finally:
  (ROOT/'docs/cost-browser-results.json').write_text(json.dumps({'isolated':True,'checks':checks,'contrastAudits':audits,'pageErrors':errors,'blockedRequests':requests},indent=2))
  browser.close()
