"""Haven 1.4: new features, accessibility, responsive layouts, and migration.
Uses an isolated document plus an in-memory Storage adapter; not native cross-session persistence.
Live AI is intentionally not configured. No external requests are needed.
"""
from pathlib import Path
import json, ast, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
checks=[];errors=[];audits=[]
STORAGE="""(seed) => {const values=new Map(Object.entries(seed||{}));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}});}"""
CONTRAST=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tests/ranking_theme_browser.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CONTRAST' for t in n.targets))
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True);assert ok,name
def store(p):return p.evaluate('JSON.parse(localStorage.getItem("haven.workspace.v1")||"{}")')
def tab(p,key):p.locator(f'#decision-tab-{key}').click()
def nav(p,key):
 if p.viewport_size['width']<=780:p.locator('[data-action="menu"]').click()
 p.locator(f'.nav-item[data-page="{key}"]').click()
def download(p,selector):
 with p.expect_download(timeout=5000) as pending:p.locator(selector).click()
 return Path(pending.value.path()).read_text(encoding='utf-8-sig')
def shot(p,name):
 p.evaluate('document.querySelector("#toast-host").replaceChildren()');p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(ROOT/'docs'/name),full_page=True)
def audit(p,name):
 result=p.evaluate(CONTRAST);audits.append({'name':name,**result});check(name+' text contrast',not result['failures'])
with sync_playwright() as pw:
 executable=shutil.which('chromium') or shutil.which('google-chrome')
 browser=pw.chromium.launch(**({'executable_path':executable} if executable else {}),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce',accept_downloads=True)
 def load(seed=None,width=1440,height=1100):
  p=context.new_page();p.set_viewport_size({'width':width,'height':height});p.set_default_timeout(6000);p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate(STORAGE,seed);p.set_content(HTML,wait_until='load');return p
 p=load()
 try:
  check('Original discovery still shows 12 of 60 listings',p.locator('.property-card').count()==12 and p.locator('#stat-properties').inner_text()=='60')
  p.locator('.property-card').first.locator('[data-action="decision-open"]').click()
  check('Listing opens the same home in the new workspace',p.locator('.decision-property h2').inner_text()=='The Willow House')
  check('No household budget is invented on first visit',p.locator('.life-no-budget').is_visible() and p.locator('#life-leftover').count()==0)
  check('All three decision tabs are available',p.locator('.decision-tabs [role="tab"]').count()==3)
  p.locator('[data-action="decision-example"]').click()
  check('Explicit example budget is persisted with sample flag',store(p)['decisions']['participants'][0]['budget']['example'] is True)
  check('Monthly remainder matches an independently expected rounded result','$1,911' in p.locator('#life-leftover').inner_text())
  check('Cash after purchase matches the expected inputs',p.locator('#life-cash').inner_text()=='$33,750')
  p.locator('.decision-property [data-action="save-toggle"]').click()
  check('A saved home appears in the baseline budget comparison',p.locator('.life-compare tbody tr').count()==1)
  p.locator('[data-action="decision-stress"][data-kind="income"]').click()
  check('20% income shock removes $1,400 per month','$511' in p.locator('#life-leftover').inner_text())
  p.locator('#decision-stress-value').fill('10')
  check('Stress value recalculates as typed','$1,211' in p.locator('#life-leftover').inner_text())
  p.locator('[data-action="decision-stress"][data-kind="repair"]').click()
  check('One-time repair preserves the monthly remainder','$1,911' in p.locator('#life-leftover').inner_text())
  check('One-time repair subtracts $5,000 from liquid cash',p.locator('#life-cash').inner_text()=='$28,750')
  p.locator('[data-action="decision-stress"][data-kind="expenses"]').click()
  check('Higher expenses reduce monthly remainder','$1,611' in p.locator('#life-leftover').inner_text())
  p.locator('[data-action="decision-stress"][data-kind="baseline"]').click()
  p.locator('#life-interestRate').fill('')
  check('Blank ownership input marks stale results and disables exports',p.locator('#decision-life-error').is_visible() and p.locator('[data-action="decision-export-life"]').is_disabled())
  check('Invalid input never overwrites valid persisted assumptions',store(p)['decisions']['participants'][0]['life']['sample-1']['interestRate']==6.5)
  p.locator('#life-interestRate').fill('0')
  check('Zero-interest input is valid and computes immediately','$2,832' in p.locator('#life-leftover').inner_text())
  check('Typing keeps the focused input rather than rerendering the form',p.locator('#life-interestRate').evaluate('(e)=>document.activeElement===e'))
  p.locator('#life-interestRate').fill('6.5')
  p.locator('[data-action="decision-save-snapshot"]').click();p.locator('#decision-snapshot-form input').fill('Our first plan');p.locator('#decision-snapshot-form [type="submit"]').click()
  check('Named life scenario saves a full frozen snapshot',store(p)['decisions']['snapshots'][0]['price']==325000 and store(p)['decisions']['snapshots'][0]['name']=='Our first plan')
  p.locator('[data-action="decision-budget"]').click()
  p.locator('#decision-budget-form [name="income"]').fill('4500');p.locator('#decision-budget-form [name="cash"]').fill('1000');p.locator('#decision-budget-form [name="example"]').uncheck();p.locator('#decision-budget-form [type="submit"]').click()
  check('Real user-input plan is not labeled sample',store(p)['decisions']['participants'][0]['budget']['example'] is False)
  check('Negative monthly balance is not concealed','-$589' in p.locator('#life-leftover').inner_text())
  check('Cash shortfall is displayed as additional cash needed','Additional cash needed' in p.locator('.cash-remainder').inner_text() and '$75,250' in p.locator('#life-cash').inner_text())
  p.locator('[data-action="decision-load-snapshot"]').click()
  check('Restoring snapshot asks before replacing household inputs',p.locator('dialog[open]').is_visible() and 'replaces' in p.locator('dialog[open]').inner_text())
  p.locator('[data-action="decision-apply-snapshot"]').click()
  check('Snapshot restores original budget and finance inputs',store(p)['decisions']['participants'][0]['budget']['income']==7000 and '$1,911' in p.locator('#life-leftover').inner_text())
  report=download(p,'[data-action="decision-export-life"]')
  check('Life export includes inputs, results, and privacy disclosure','7000' in report and 'HOUSEHOLD BUDGET' in report and 'Privacy' in report)
  # Live autocomplete preserves current scenario until selection.
  picker=p.locator('#calculator-property');picker.click();picker.fill('O');n=p.locator('[data-property-option]').count();picker.fill('Oma')
  check('Workspace autocomplete narrows on every keystroke',p.locator('[data-property-option]').count()<n and p.locator('[data-property-option]').count()>0)
  check('Typing a property does not change the home prematurely',p.locator('.decision-property h2').inner_text()=='The Willow House')
  picker.press('Enter');check('Choosing a result opens the chosen home','Omaha' in p.locator('.decision-property-copy>p').inner_text())
  p.locator('.decision-property [data-action="save-toggle"]').click()
  check('Same household budget follows another property',p.locator('.household-card').inner_text().find('$7,000')>=0 and p.locator('.life-compare tbody tr').count()==2)
  picker=p.locator('#calculator-property');picker.click();picker.fill('Willow');picker.press('Enter')
  # Shared priorities and explicit presentation-level privacy.
  tab(p,'together')
  check('Together honestly discloses local-only collaboration','No invitations' in p.locator('.decision-local-notice').inner_text())
  check('No raw income or cash appears in shared participant cards','$7,000' not in p.locator('.participant-grid').inner_text() and '$110,000' not in p.locator('.participant-grid').inner_text())
  p.locator('[data-action="decision-edit-person"]').first.click()
  f=p.locator('#decision-participant-form');f.locator('[name="minBeds"]').fill('3');f.locator('[name="maxPrice"]').fill('400000');f.locator('[name="outdoor"]').check();f.locator('[type="submit"]').click()
  p.locator('[data-action="decision-add-person"]').click();f=p.locator('#decision-participant-form');f.locator('[name="name"]').fill('Alex');f.locator('[name="minBeds"]').fill('4');f.locator('[type="submit"]').click()
  check('Participant creation adds a second independent profile',p.locator('.participant-card').count()==2 and len(store(p)['decisions']['participants'])==2)
  check('Conflicting bedroom requirements produce a concrete trade-off','Trade-offs to discuss' in p.locator('.together-summary').inner_text() and 'at least 4' in p.locator('.participant-card').last.inner_text())
  p.locator('#decision-stage').select_option('Need answers')
  check('Shared stage persists per property',store(p)['decisions']['homes']['sample-1']['stage']=='Need answers')
  p.locator('#decision-review-form [value="Interested"]').check(force=True);p.locator('#decision-review-form textarea').fill('The garden fits, but ask about the roof.');p.locator('#decision-review-form [type="submit"]').click()
  check('Each participant can record a home-specific opinion and note','The garden fits' in p.locator('.participant-card').first.inner_text())
  p.locator('#decision-share-budget').check()
  check('Only explicit sharing exposes the calculated budget summary',p.locator('.shared-budget-summary').count()==1 and '$1,911' in p.locator('.shared-budget-summary').inner_text())
  check('Even a shared summary omits raw income and available cash','$7,000' not in p.locator('.participant-grid').inner_text() and '$110,000' not in p.locator('.participant-grid').inner_text())
  p.locator('#decision-share-budget').uncheck()
  alex=store(p)['decisions']['participants'][1]['id'];p.locator('#decision-person').select_option(alex)
  check('Profile switch loads a separate opinion',p.locator('#decision-review-form textarea').input_value()=='')
  tab(p,'life');check('New participant does not inherit another household budget',p.locator('.life-no-budget').is_visible())
  p.locator('#decision-person').select_option('person-me');check('Switching back restores the original budget','$1,911' in p.locator('#life-leftover').inner_text())
  # Tour answering, source requirement, custom question, notes, and safe exports.
  tab(p,'tour')
  check('Tour brief distinguishes unknown condition from factual defects','not provided' in p.locator('.tour-brief-grid').inner_text())
  check('Tour starts with unanswered questions',p.locator('.tour-question.resolved').count()==0)
  p.locator('[data-action="decision-question"][data-id="roof"]').click();f=p.locator('#decision-answer-form');f.locator('[name="resolved"]').check();f.locator('[type="submit"]').click()
  check('A question cannot be answered without answer and source','both an answer and a source' in f.locator('.decision-error').inner_text())
  f.locator('[name="answer"]').fill('Seller reports replacement in 2021; request documentation.');f.locator('[name="source"]').fill('Fictional seller note for this demo');f.locator('[type="submit"]').click()
  check('Recorded answer advances progress and preserves source',p.locator('.tour-question.resolved').count()==1 and store(p)['decisions']['homes']['sample-1']['questions']['roof']['source']=='Fictional seller note for this demo')
  p.locator('#decision-question-add input').fill('Where can I store bicycles?');p.locator('#decision-question-add [type="submit"]').click()
  check('Custom tour question can be added','Where can I store bicycles?' in p.locator('.tour-question-list').inner_text())
  p.locator('#decision-visit-form [name="date"]').fill('2026-10-03T14:30');p.locator('#decision-visit-form textarea').fill('Visit in the afternoon to check natural light.');p.locator('#decision-visit-form [type="submit"]').click()
  check('Visit plan saves locally without claiming a booking',store(p)['decisions']['homes']['sample-1']['visit']['date']=='2026-10-03T14:30')
  brief=download(p,'[data-action="decision-export-tour"]')
  check('Tour export includes questions, answers, sources, and visit notes','Fictional seller note' in brief and 'store bicycles' in brief and 'afternoon' in brief)
  check('Tour export excludes household budget and life snapshots','7000' not in brief and '110000' not in brief and 'Our first plan' not in brief)
  check('Tour export never implies independent verification','not independently verified' in brief)
  # All themes, keyboard controls, no text contrast regressions.
  p.locator('#decision-tab-tour').focus();p.keyboard.press('ArrowLeft')
  check('Arrow keys navigate accessible tabs',p.locator('#decision-tab-together').get_attribute('aria-selected')=='true' and p.locator('#decision-tab-together').evaluate('(e)=>document.activeElement===e'))
  for theme in ['light','dark']:
   p.evaluate('(theme)=>{document.documentElement.dataset.theme=theme}',theme)
   for key in ['life','together','tour']:
    tab(p,key);audit(p,theme+' '+key);shot(p,f'decision-{key}-{theme}.png')
  p.evaluate('document.documentElement.dataset.theme="light"')
  tab(p,'life');p.locator('[data-action="decision-budget"]').click();audit(p,'light budget dialog');p.locator('dialog[open] .modal-close').click()
  tab(p,'tour');p.locator('[data-action="decision-question"][data-id="roof"]').click();p.evaluate('document.documentElement.dataset.theme="dark"');audit(p,'dark answer dialog');p.locator('dialog[open] .modal-close').click()
  # Complete state portability (simulated storage; actual file downloads/import control).
  p.locator('.workspace-button').click();backup=download(p,'[data-action="export-backup"]');p.locator('dialog[open] .modal-close').click()
  exported=json.loads(backup);check('Full backup includes decisions and clearly separate private data',len(exported['decisions']['participants'])==2 and exported['decisions']['participants'][0]['budget']['income']==7000)
  p2=load();p2.locator('.workspace-button').click();p2.locator('#backup-input').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':backup.encode()});p2.locator('[data-action="confirm-import"]').click();nav(p2,'decision');tab(p2,'tour')
  check('Backup restore brings back participants, tour answers, notes, and budget',len(store(p2)['decisions']['participants'])==2 and p2.locator('.tour-question.resolved').count()==1 and 'afternoon' in p2.locator('#decision-visit-form textarea').input_value())
  # Older format keeps existing saved homes while adding an empty decision space.
  legacy={k:v for k,v in exported.items() if k!='decisions'};old=load({'haven.workspace.v1':json.dumps(legacy)});nav(old,'decision')
  check('Pre-1.4 backup migrates without inventing a budget',old.locator('.life-no-budget').is_visible() and old.locator('.nav-count[data-count="saved"]').inner_text()=='2')
  corrupt=json.loads(backup);corrupt['decisions']['activeParticipantId']='missing';bad=load({'haven.workspace.v1':json.dumps(corrupt)})
  check('Malformed decision state is preserved as recovery data',bad.evaluate('localStorage.getItem("haven.workspace.v1.recovery")!==null') and 'recovery copy' in bad.locator('.notice.warning').inner_text())
  # Profile removal deliberately preserves shared notes and valid attribution.
  tab(p2,'together');p2.locator(f'[data-action="decision-remove-person"][data-id="{alex}"]').click();p2.locator('[data-action="decision-confirm-person-delete"]').click()
  check('Deleting a local profile keeps a valid remaining workspace',len(store(p2)['decisions']['participants'])==1 and store(p2)['decisions']['activeParticipantId']=='person-me')
  # Existing assistant can open a recommendation directly in new workspace.
  p2.locator('#assistant-launcher').click();p2.locator('#assistant-input').fill('show me the cheapest house');p2.locator('#assistant-send').click();p2.wait_for_function('document.querySelector("#assistant-working").hidden')
  check('Local assistant rankings still name the cheapest single-family home','Clover Cottage' in p2.locator('.from-haven').last.inner_text())
  target=p2.locator('[data-chat-explore]').first.get_attribute('data-chat-explore');p2.locator('[data-chat-explore]').first.click()
  check('Assistant recommendation opens that home’s decision workspace',store(p2)['decisions']['currentPropertyId']==target and p2.locator('.decision-page').is_visible())
  check('No connected AI is activated',p2.locator('#assistant-mode-text').inner_text()=='Local demo' and p2.locator('#assistant-ai-toggle').count()==0)
  # Mobile layouts and picker stay in viewport, in both themes and each tab.
  for width in [390,320,768]:
   mobile=load({'haven.workspace.v1':backup},width,844);nav(mobile,'decision')
   for theme in ['light','dark']:
    mobile.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    for key in ['life','together','tour']:
     tab(mobile,key)
     check(f'{width}px {theme} {key} has no horizontal page overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
     if width==390:audit(mobile,f'{width}px {theme} {key}')
     if width==390 and theme=='dark':shot(mobile,f'decision-{key}-mobile.png')
   picker=mobile.locator('#calculator-property');picker.click();picker.fill('Chic');box=mobile.locator('.picker-popup').bounding_box()
   check(f'{width}px decision autocomplete stays within screen',box['x']>=0 and box['x']+box['width']<=width+1)
   mobile.close()
  check('No uncaught JavaScript errors in new feature scenarios',not errors)
  print(f'PASS: {len(checks)} decision browser checks and {len(audits)} text-contrast samples.',flush=True)
 except Exception:
  p.screenshot(path=str(ROOT/'docs/decision-test-failure.png'),full_page=True)
  raise
 finally:
  (ROOT/'docs/decision-browser-results.json').write_text(json.dumps({'isolated':True,'checks':checks,'contrastAudits':audits,'pageErrors':errors},indent=2));browser.close()
