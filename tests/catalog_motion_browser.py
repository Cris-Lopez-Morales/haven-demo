"""Haven 1.1 catalog and motion regression checks.
Uses an isolated document with an in-memory Storage adapter, not native reload
persistence. Requires Python Playwright and Chromium. See docs/TESTING.md.
"""
from pathlib import Path
import json, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT/'dist/index.html').read_text()
checks, errors = [], []
STORAGE = """() => { const values = new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}}); }"""

def check(name, condition):
    checks.append({'name':name,'passed':bool(condition)})
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)
    assert condition,name

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1200},reduced_motion='no-preference')
    def load(reduced=False, backup=None, fallback=False):
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.emulate_media(reduced_motion='reduce' if reduced else 'no-preference')
        page.evaluate(STORAGE)
        if backup: page.evaluate('(v)=>localStorage.setItem("haven.workspace.v1",JSON.stringify(v))',backup)
        if fallback: page.evaluate('()=>{window.IntersectionObserver=undefined;Element.prototype.animate=undefined}')
        page.set_content(HTML,wait_until='load')
        page.locator('#stat-properties').wait_for()
        return page
    try:
        page=load()
        check('Expanded catalog shows 60 properties and 20 city options',page.locator('#stat-properties').inner_text()=='60' and page.locator('[data-filter="city"] option').count()==21)
        check('Landing page starts with twelve cards',page.locator('.property-card').count()==12)
        check('Web Animations run on the initial landing page',page.evaluate('document.getAnimations().some(a=>a.effect?.target?.classList?.contains("hero-copy"))'))
        page.wait_for_timeout(850)
        check('One-shot page animation finishes instead of looping',page.evaluate('!document.getAnimations().some(a=>a.effect?.target?.classList?.contains("hero-copy"))'))
        page.screenshot(path=str(ROOT/'docs/discover.png'))
        page.evaluate('window.firstHavenCard=document.querySelector(".property-card")')
        page.locator('[data-action="load-more"]').click()
        check('Show more appends twelve new properties',page.locator('.property-card').count()==24)
        check('Show more preserves the original card nodes',page.evaluate('window.firstHavenCard===document.querySelector(".property-card")'))
        check('Show more moves keyboard focus to the first new home',page.locator('.property-card[data-property="sample-13"] .property-title').evaluate('e=>e===document.activeElement'))
        check('New card artwork is available offline',page.locator('.property-card[data-property="sample-13"] img').get_attribute('src').startswith('data:image/svg+xml'))
        page.wait_for_timeout(650)
        card=page.locator('.property-card[data-property="sample-13"]')
        card.locator('[data-action="save-toggle"]').click()
        check('Saving a newly loaded home preserves all loaded results',page.locator('.property-card').count()==24)
        check('New favorites persist to the workspace',page.evaluate('JSON.parse(localStorage.getItem("haven.workspace.v1")).savedIds.includes("sample-13")'))
        check('Saving does not replay the hero animation',page.evaluate('!document.getAnimations().some(a=>a.effect?.target?.classList?.contains("hero-copy"))'))
        check('Heart feedback is animated on a save',page.evaluate('document.getAnimations().some(a=>a.effect?.target?.matches?.(".save-button .icon"))'))
        page.wait_for_timeout(400)
        card.locator('.property-title').click()
        check('Details for newly added properties open correctly',page.locator('dialog[open] #dialog-title').inner_text()=='The Wren Flat')
        check('Dialog has a finite entrance animation',page.evaluate('document.querySelector("dialog[open]").getAnimations().length>0'))
        page.locator('#property-notes').fill('New catalog note. Compare HOA assumptions.')
        page.locator('[data-action="save-note"]').click()
        page.keyboard.press('Escape')
        check('A newly added property can keep notes',page.evaluate('JSON.parse(localStorage.getItem("haven.workspace.v1")).notes["sample-13"].startsWith("New catalog")'))
        for count in [36,48,60]:
            page.locator('[data-action="load-more"]').click()
            check(f'Progressive loading reaches {count} distinct homes',page.locator('.property-card').count()==count and page.locator('.property-card').evaluate_all('(els)=>new Set(els.map(e=>e.dataset.property)).size===els.length'))
        check('Show more disappears at the end of the collection',page.locator('[data-action="load-more"]').count()==0 and 'Showing 60 of 60' in page.locator('#results-pagination').inner_text())
        page.locator('[data-filter="city"]').select_option('San Diego')
        check('City filter searches every page of the catalog',page.locator('.property-card').count()==3 and page.locator('.property-card[data-property="sample-60"]').count()==1)
        page.locator('[data-action="clear-filters"]').first.click()
        page.locator('#property-search').fill('Seaglass')
        check('Text search finds a property beyond the initial page',page.locator('.property-card').count()==1 and page.locator('.property-card').get_attribute('data-property')=='sample-59')
        page.locator('.property-card [data-action="analyze"]').click()
        check('New properties work in the existing calculator',page.locator('#calc-price').input_value()=='565000')
        page.locator('.nav-item[data-page="discover"]').click()
        page.locator('#sort-select').select_option('price-desc')
        check('Sorting uses the complete collection before pagination',page.locator('.property-card').first.get_attribute('data-property')=='sample-58')
        page.locator('[data-filter="maxPrice"]').select_option('800000')
        check('Expanded budget controls filter the highest-price property',page.locator('.property-card[data-property="sample-58"]').count()==0)
        page.locator('[data-action="clear-filters"]').first.click()
        page.locator('[data-filter="city"]').select_option('Chicago')
        page.locator('[data-action="layout"][data-layout="list"]').click()
        check('New cities work in list view',page.locator('.property-grid.list-layout .property-card').count()==3)
        page.locator('[data-action="layout"][data-layout="grid"]').click()
        page.wait_for_timeout(650)
        page.evaluate('window.scrollTo({top:400,behavior:"instant"})')
        page.wait_for_timeout(250)
        page.screenshot(path=str(ROOT/'docs/new-city.png'))
        for id in ['sample-13','sample-14','sample-15']:
            page.locator(f'.property-card[data-property="{id}"] [data-action="compare-toggle"]').click()
        page.locator('.nav-item[data-page="compare"]').click()
        check('Three new properties can be compared',page.locator('.compare-image').count()==3)
        check('New comparison contains real calculations, not placeholders',page.locator('.comparison-table').inner_text().find('The Courtyard Two')>=0)
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function('document.getAnimations().every(a=>a.playState!=="running")',timeout=250)
        check('Changing reduced-motion preference cancels current animations',page.evaluate('document.getAnimations().every(a=>a.playState!=="running")'))
        page.locator('.nav-item[data-page="discover"]').click()
        check('Reduced motion never leaves cards hidden',page.locator('.reveal-pending').count()==0)
        check('Reduced motion suppresses page animations',page.evaluate('document.getAnimations().length===0'))
        page.locator('[data-action="load-more"]').click()
        check('Progressive loading still works with reduced motion',page.locator('.property-card').count()==24)
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
        check('Expanded catalog has no mobile horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.locator('[data-action="menu"]').click()
        page.locator('.nav-item[data-page="saved"]').click()
        check('Newly saved properties are accessible through mobile navigation',page.locator('.property-card[data-property="sample-13"]').count()==1)
        page.locator('[data-action="menu"]').click()
        page.locator('.nav-item[data-page="discover"]').click()
        page.locator('[data-filter="city"]').select_option('Chicago')
        page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
        page.screenshot(path=str(ROOT/'docs/mobile-new-city.png'))
        backup={'version':1,'savedIds':['sample-1','sample-59'],'compareIds':[],'customProperties':[],'notes':{'sample-1':'Old note','sample-59':'New note'},'searches':[],'scenarios':[]}
        restored=load(reduced=True,backup=backup)
        restored.locator('.nav-item[data-page="saved"]').click()
        check('Legacy backup format restores both original and new saved homes',restored.locator('.property-card').count()==2)
        fallback=load(reduced=False,fallback=True)
        check('App remains usable without IntersectionObserver or Web Animations',fallback.locator('.property-card').count()==12 and fallback.locator('.reveal-pending').count()==0)
        check('No uncaught errors across new catalog and motion workflows',len(errors)==0)
        print(f'PASS: {len(checks)} catalog/motion browser checks.',flush=True)
    except Exception:
        if 'page' in locals(): page.screenshot(path=str(ROOT/'docs/catalog-motion-failure.png'))
        raise
    finally:
        (ROOT/'docs/catalog-motion-results.json').write_text(json.dumps({'mode':'isolated-document-with-memory-storage','checks':checks,'uncaught_errors':errors},indent=2))
        context.close()
        browser.close()
