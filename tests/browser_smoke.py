"""Browser interaction checks. Requires Python Playwright and Chromium.

Normal: python tests/browser_smoke.py --url http://localhost:3000/dist/index.html
Sandbox: --isolated loads the built HTML directly into the test document and
injects an in-memory Storage adapter because navigation/storage are restricted.
The isolated mode tests state restoration on app re-initialization, NOT native
cross-session localStorage persistence. A separate check exercises denied storage.
"""
from pathlib import Path
import argparse
import json
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--isolated', action='store_true')
parser.add_argument('--url', default='http://localhost:3000/dist/index.html')
args = parser.parse_args()
HTML = (ROOT / 'dist/index.html').read_text()
OUTPUT = ROOT / 'docs'
OUTPUT.mkdir(exist_ok=True)
checks = []
errors = []
STORAGE = """() => { const values = new Map(); Object.defineProperty(window, 'localStorage', {configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}}); }"""

def check(name, condition):
    checks.append({'name':name, 'passed':bool(condition)})
    assert condition, name

def load(page, first=False):
    if args.isolated:
        if first:
            page.evaluate(STORAGE)
        page.set_content(HTML, wait_until='load')
    else:
        if first:
            page.goto(args.url)
        else:
            page.reload()
    page.locator('main').wait_for()

def nav(page, target):
    if page.viewport_size['width'] <= 780:
        page.locator('[data-action="menu"]').click()
    page.locator(f'.nav-item[data-page="{target}"]').click()

def card(page, prop='sample-1'):
    return page.locator(f'.property-card[data-property="{prop}"]')

def store(page):
    return page.evaluate("JSON.parse(localStorage.getItem('haven.workspace.v1') || '{}')")

def dl(page, selector):
    with page.expect_download(timeout=5000) as download:
        page.locator(selector).click()
    path = Path(download.value.path())
    return path.read_text(encoding='utf-8-sig')

with sync_playwright() as pw:
    chromium = shutil.which('chromium') or shutil.which('google-chrome')
    browser = pw.chromium.launch(**({'executable_path':chromium} if chromium else {}), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1200},accept_downloads=True, reduced_motion='reduce')
    page = context.new_page()
    page.set_default_timeout(5000)
    page.on('pageerror',lambda err:errors.append(str(err)))
    try:
        load(page,True)
        check('Starter workspace renders the first twelve of sixty properties',page.locator('.property-card').count()==12 and page.locator('#stat-properties').inner_text()=='60')
        check('Artwork renders with no external dependencies',page.locator('img').evaluate_all('(imgs)=>imgs.every(i=>i.src.startsWith("data:image/svg+xml"))'))
        nav(page,'saved')
        check('Empty saved view is actionable',page.locator('.empty-state').is_visible())
        nav(page,'discover')
        page.locator('#property-search').fill('LINCOLN')
        check('Live text search finds all four Lincoln fixtures',page.locator('.property-card').count()==4)
        page.locator('#property-search').fill('')
        page.locator('[data-filter="city"]').select_option('Omaha')
        check('City filter works',page.locator('.property-card').count()==3)
        page.locator('[data-filter="maxPrice"]').select_option('250000')
        check('Combined city and budget filters work',page.locator('.property-card').count()==1)
        page.locator('[data-action="more-filters"]').click()
        page.locator('[data-filter="minSqft"]').select_option('2000')
        check('No-results filter state renders',page.locator('.empty-state').is_visible())
        page.locator('[data-action="clear-filters"]').first.click()
        page.locator('[data-action="type-filter"][data-type="Duplex"]').click()
        check('Property-type tabs filter the complete catalog',page.locator('.property-card').count()==12 and page.locator('.property-type').evaluate_all("els=>els.every(el=>el.textContent==='Duplex')"))
        page.locator('#sort-select').select_option('price-asc')
        check('Ascending price sorting is correct',page.locator('.property-card').first.get_attribute('data-property')=='sample-8')
        page.locator('[data-action="layout"][data-layout="list"]').click()
        check('List-view switch changes the layout',page.locator('.property-grid.list-layout').count()==1)
        page.locator('[data-action="layout"][data-layout="grid"]').click()
        page.locator('[data-action="clear-filters"]').first.click()
        page.locator('[data-filter="city"]').select_option('Lincoln')
        page.locator('[data-action="save-search"]').click()
        page.locator('#search-form input').fill('Lincoln shortlist')
        page.locator('#search-form button[type="submit"]').click()
        check('Named searches are persisted',store(page)['searches'][0]['name']=='Lincoln shortlist')
        page.locator('[data-action="clear-filters"]').first.click()
        page.locator('[data-action="load-search"]').click()
        check('Saved searches restore their exact filters',page.locator('.property-card').count()==4)
        page.locator('[data-action="clear-filters"]').first.click()
        page.locator('#sort-select').select_option('featured')
        card(page).locator('[data-action="save-toggle"]').click()
        check('Saving a home updates the workspace',store(page)['savedIds']==['sample-1'])
        load(page)
        check('Saved homes restore after app initialization',card(page).locator('[data-action="save-toggle"]').get_attribute('aria-pressed')=='true')
        nav(page,'saved')
        check('Saved view contains the correct property',page.locator('.property-card').count()==1)
        card(page).locator('.property-title').click()
        note='Check the roof. <script>window.havenXss = 1</script>'
        page.locator('#property-notes').fill(note)
        page.locator('[data-action="save-note"]').click()
        check('Notes persist verbatim without executing markup',store(page)['notes']['sample-1']==note and page.evaluate('window.havenXss === undefined'))
        check('Confirmation is visible inside the native dialog',page.locator('dialog[open] .toast').is_visible())
        page.keyboard.press('Escape')
        check('Escape closes the details dialog',page.locator('dialog[open]').count()==0)
        card(page).locator('.property-title').click()
        check('Notes load on reopening a property',page.locator('#property-notes').input_value()==note)
        page.keyboard.press('Escape')
        nav(page,'discover')
        for prop in ['sample-1','sample-2','sample-3']:
            card(page,prop).locator('[data-action="compare-toggle"]').click()
        check('Comparison selection persists three properties',len(store(page)['compareIds'])==3)
        card(page,'sample-4').locator('[data-action="compare-toggle"]').click()
        check('Comparison enforces the three-property limit',len(store(page)['compareIds'])==3)
        nav(page,'compare')
        check('Comparison renders all selected property columns',page.locator('.compare-image').count()==3)
        comparison=dl(page,'[data-action="export-comparison"]')
        check('Comparison CSV exports actual property data','The Willow House' in comparison and 'Cash-on-cash' in comparison)
        page.locator('.comparison-table [data-action="compare-toggle"][data-id="sample-2"]').click()
        check('Comparison columns can be removed',page.locator('.compare-image').count()==2)
        page.locator('.comparison-table [data-action="analyze"][data-id="sample-1"]').click()
        check('Calculator loads the selected property',page.locator('#calc-price').input_value()=='325000')
        check('Default calculator result matches the model','+$55' in page.locator('#cashflow-value').inner_text())
        page.locator('[data-action="shortcut"][data-kind="cash"]').click()
        check('All-cash preset removes the mortgage',page.locator('#calc-downPercent').input_value()=='100' and page.locator('.no-loan').is_visible())
        check('All-cash cash flow is correct','+$1,698' in page.locator('#cashflow-value').inner_text())
        page.locator('[data-action="reset-calculator"]').click()
        page.locator('#calc-interestRate').fill('0')
        check('Zero-interest scenario calculates without error','+$976' in page.locator('#cashflow-value').inner_text())
        page.locator('#calc-price').fill('')
        check('Invalid inputs disable report export',page.locator('[data-action="export-report"]').is_disabled() and page.locator('#calc-error').is_visible())
        page.locator('#calc-price').fill('325000')
        check('Valid input restores live calculations',not page.locator('[data-action="export-report"]').is_disabled())
        page.locator('#calc-rent').fill('2800.50')
        check('Currency inputs accept cents without validation mismatch',page.locator('#calc-rent').evaluate('e=>e.checkValidity()') and not page.locator('[data-action="export-report"]').is_disabled())
        page.locator('#calc-years').fill('2.5')
        check('Fractional loan years are explicitly rejected',page.locator('[data-action="export-report"]').is_disabled())
        page.locator('[data-action="reset-calculator"]').click()
        page.locator('.advanced-assumptions summary').click()
        page.locator('#calc-downPercent').fill('10')
        check('Low down payment with zero PMI displays a warning',page.locator('.compact-notice').count()==1)
        page.locator('#calc-mortgageInsuranceMonthly').fill('100')
        check('Entering PMI clears the missing-premium warning',page.locator('.compact-notice').count()==0)
        page.locator('[data-action="reset-calculator"]').click()
        page.locator('[data-action="save-scenario"]').click()
        page.locator('#scenario-form input').fill('Baseline for interview demo')
        page.locator('#scenario-form button[type="submit"]').click()
        check('Scenario snapshots persist the assumptions',len(store(page)['scenarios'])==1)
        page.locator('#calc-rent').fill('4000')
        page.locator('[data-action="load-scenario"]').click()
        check('Loading a scenario restores the exact saved inputs',page.locator('#calc-rent').input_value()=='2800')
        report=dl(page,'[data-action="export-report"]')
        check('Report includes assumptions, amortization and sensitivity','AMORTIZATION' in report and 'RENT / RATE SENSITIVITY' in report and '325000' in report)
        page.locator('.topbar [data-action="add-property"]').click()
        fields={'name':'My Home <b>safe</b>','address':'10 Portfolio Lane','city':'Lincoln','state':'ne','price':'275000','rent':'2950'}
        for name,value in fields.items(): page.locator(f'#property-form [name="{name}"]').fill(value)
        page.locator('#property-form button[type="submit"]').click()
        nav(page,'custom')
        check('Custom property creation works',page.locator('.property-card').count()==1)
        check('Custom names render as text, not HTML',page.locator('.property-title').inner_text()=='My Home <b>safe</b>' and page.locator('.property-title b').count()==0)
        custom_id=page.locator('.property-card').get_attribute('data-property')
        card(page,custom_id).locator('.property-title').click()
        page.locator('dialog[open] [data-action="edit-property"]').click()
        page.locator('#property-form [name="name"]').fill('Updated Portfolio Home')
        page.locator('#property-form [name="price"]').fill('290000')
        page.locator('#property-form button[type="submit"]').click()
        check('Custom property edits update the displayed data',page.locator('.property-title').inner_text()=='Updated Portfolio Home' and '$290,000' in page.locator('.property-price-row').inner_text())
        card(page,custom_id).locator('[data-action="save-toggle"]').click()
        page.locator('.workspace-button').click()
        backup=dl(page,'dialog[open] [data-action="export-backup"]')
        backup_data=json.loads(backup)
        check('Workspace backup exports custom entries and notes',len(backup_data['customProperties'])==1 and backup_data['notes']['sample-1']==note)
        page.locator('dialog[open] [data-action="reset-workspace"]').click()
        page.locator('dialog[open] [data-action="confirm-reset"]').click()
        check('Reset clears personal state and returns to the first twelve sample homes',store(page)['savedIds']==[] and page.locator('.property-card').count()==12)
        page.locator('#backup-input').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':backup.encode()})
        page.locator('dialog[open] [data-action="confirm-import"]').wait_for()
        check('Import requires a review before replacing data',store(page)['customProperties']==[])
        page.locator('dialog[open] [data-action="confirm-import"]').click()
        check('Import restores the complete workspace',len(store(page)['customProperties'])==1 and len(store(page)['scenarios'])==1)
        page.locator('#backup-input').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'not json'})
        page.locator('.toast.error').wait_for()
        check('Malformed import does not overwrite existing data',len(store(page)['customProperties'])==1)
        nav(page,'custom')
        card(page,custom_id).locator('.property-title').click()
        page.locator('dialog[open] [data-action="delete-property"]').click()
        page.locator('dialog[open] [data-action="confirm-delete"]').click()
        check('Custom deletion also removes its saved reference',store(page)['customProperties']==[] and custom_id not in store(page)['savedIds'])
        nav(page,'discover')
        page.locator('[data-action="delete-search"]').click()
        check('Saved searches can be deleted',store(page)['searches']==[])
        nav(page,'calculator')
        page.locator('[data-action="delete-scenario"]').click()
        check('Saved scenarios can be deleted',store(page)['scenarios']==[])
        nav(page,'discover')
        page.locator('[data-action="clear-compare"]').click()
        check('Comparison tray can be cleared',store(page)['compareIds']==[])
        card(page).locator('[data-action="save-toggle"]').click()
        check('Saved properties can be removed',store(page)['savedIds']==[])
        page.route('https://images.unsplash.com/**',lambda route:route.abort())
        page.locator('.nav-item[data-action="about"]').click()
        page.locator('#use-photos').check()
        page.wait_for_function("Array.from(document.querySelectorAll('.hero img,.property-card img')).filter(i=>!i.loading||i.loading!=='lazy'||i.getBoundingClientRect().top<innerHeight).every(i=>i.src.startsWith('data:image/svg+xml'))")
        check('Failed optional photos fall back to original artwork',page.locator('.hero img').get_attribute('src').startswith('data:image/svg+xml'))
        page.locator('#use-photos').uncheck()
        page.keyboard.press('Escape')
        page.evaluate('window.scrollTo(0,0)')
        page.locator('.toast').first.wait_for(state='hidden',timeout=7000)
        page.screenshot(path=str(OUTPUT/'discover.png'))
        card(page).locator('[data-action="analyze"]').click()
        page.screenshot(path=str(OUTPUT/'calculator.png'))
        for width in [390,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':900})
            for target in ['discover','calculator','saved','custom','compare']:
                nav(page,target)
                check(f'{target} does not overflow at {width}px',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.set_viewport_size({'width':390,'height':844})
        nav(page,'discover')
        page.locator('.toast').first.wait_for(state='hidden',timeout=7000)
        page.screenshot(path=str(OUTPUT/'mobile.png'))
        page.locator('[data-action="menu"]').click()
        check('Mobile navigation drawer opens',page.locator('body').evaluate("e=>e.classList.contains('menu-open')"))
        page.keyboard.press('Escape')
        check('Mobile drawer closes with Escape and becomes inert',page.locator('.sidebar').evaluate('e=>e.inert'))
        page.locator('.topbar [data-action="add-property"]').click()
        check('Mobile custom-property form fits the viewport',page.locator('dialog[open]').evaluate('e=>e.scrollWidth<=e.clientWidth'))
        page.keyboard.press('Escape')
        check('No uncaught application errors during all workflows',not errors)
        if args.isolated:
            denied=context.new_page()
            denied.set_content(HTML)
            check('Denied native storage displays session-only mode',denied.locator('main > .notice.warning').count()==1 and denied.locator('.property-card').count()==12)
            denied.close()
        print(f"PASS: {len(checks)} browser checks. Isolated storage adapter: {args.isolated}.")
    except Exception:
        page.screenshot(path=str(OUTPUT/'test-failure.png'))
        raise
    finally:
        (OUTPUT/'browser-test-results.json').write_text(json.dumps({'mode':'isolated-document-with-memory-storage' if args.isolated else 'native-browser','checks':checks,'uncaught_errors':errors},indent=2))
        browser.close()
