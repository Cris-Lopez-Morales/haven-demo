"""v1.3 data-query and whole-app theme regressions.
Uses an isolated HTML document and an explicitly simulated Storage adapter.
This does not verify native cross-session persistence or a live AI provider.
"""
from pathlib import Path
import json, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
checks=[];errors=[];audits=[]
STORAGE="""(seed) => {const v=new Map(Object.entries(seed||{}));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>v.get(k)??null,setItem:(k,x)=>v.set(k,String(x)),removeItem:k=>v.delete(k),clear:()=>v.clear()}})}"""
CONTRAST="""() => {
 const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number), mix=(f,b)=>{const a=f[3]??1;return [0,1,2].map(i=>f[i]*a+b[i]*(1-a));};
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const results=[];
 for(const el of document.querySelectorAll('body *')){
  const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' ').trim();
  if(!text||el.closest('script,style,noscript,[hidden],:disabled,[inert]')||el.closest('.image-credit'))continue;
  const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
  if(!rect.width||!rect.height||rect.right<0||rect.left>innerWidth||style.visibility!=='visible'||+style.opacity<.99)continue;
  let bg=rgb(getComputedStyle(document.documentElement).backgroundColor);
  const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);
  for(const p of chain){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length>=3)bg=mix(c,bg);}
  const fg=rgb(el.tagName==='text'?style.fill:style.color);if(fg.length<3)continue;
  const r=ratio(mix(fg,bg),bg),size=parseFloat(style.fontSize),bold=parseFloat(style.fontWeight)>=700;
  const limit=size>=24||size>=18.66&&bold?3:4.5;
  results.push({text:text.slice(0,65),selector:el.tagName.toLowerCase()+'.'+String(el.className?.baseVal??el.className).replaceAll(' ','.'),ratio:+r.toFixed(2),limit,fg:style.color,bg:bg.map(Math.round)});
 }
 return {count:results.length,min:Math.min(...results.map(x=>x.ratio)),failures:results.filter(x=>x.ratio+.01<x.limit)};
}"""
def check(name,value):
 checks.append({'name':name,'passed':bool(value)})
 assert value,name
 print('PASS',name)
def load(page,seed=None,denied=False):
 if denied:page.evaluate("() => Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('Storage denied for test')}})")
 else:page.evaluate(STORAGE,seed or {})
 page.set_content(HTML,wait_until='load');page.locator('main').wait_for()
 page.on('pageerror',lambda e:errors.append(str(e)))
def nav(page,target):
 if page.viewport_size['width']<=780:page.locator('[data-action="menu"]').click()
 page.locator(f'.nav-item[data-page="{target}"]').click()
def choose(page,mode):
 page.locator('[data-appearance-toggle]').click();page.locator(f'button[data-appearance="{mode}"]').click()
def send(page,message,reset=True):
 if not page.locator('#haven-assistant').is_visible():page.locator('#assistant-launcher').click()
 if reset:page.locator('.assistant-reset').click()
 page.locator('#assistant-input').fill(message);page.locator('#assistant-send').click();page.wait_for_function("document.querySelector('#assistant-working').hidden")
 return page.locator('.from-haven').last

def audit(page,name):
 r=page.evaluate(CONTRAST);audits.append({'page':name,**r})
 if r['failures']:print('CONTRAST FAILURES',name,json.dumps(r['failures'],indent=2))
 check(f'{name}: sampled rendered text has sufficient contrast',r['count']>0 and not r['failures'])

def screenshot(page,name):page.screenshot(path=str(ROOT/'docs'/name))

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 try:
  context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light',reduced_motion='reduce')
  p=context.new_page();p.set_default_timeout(7000);load(p)
  check('Default appearance follows a light device',p.locator('html').get_attribute('data-theme')=='light')
  p.emulate_media(color_scheme='dark');p.wait_for_timeout(80)
  check('System appearance responds to a device theme change',p.locator('html').get_attribute('data-theme')=='dark')
  check('Native controls are explicitly dark',p.locator('html').evaluate("el=>getComputedStyle(el).colorScheme==='dark'"))
  screenshot(p,'dark-discover.png');audit(p,'Dark discovery')
  queries=[('show me the cheapest house',['sample-19','sample-6','sample-12']),('show me the cheapest home',['sample-9','sample-23','sample-19']),('the biggest place',['sample-15','sample-54','sample-42']),('something affordable',['sample-9','sample-23','sample-19']),('most bedrooms',['sample-15','sample-8','sample-3']),('lowest price per sq ft',['sample-8','sample-21','sample-3']),('least expensive house',['sample-19','sample-6','sample-12'])]
  for text,ids in queries:
   answer=send(p,text);actual=answer.locator('.assistant-property').evaluate_all('es=>es.map(e=>e.dataset.recommendation)')
   check(f'Direct query {text!r} returns exact ranked fixture IDs',actual==ids)
   check(f'{text!r} has no city gate','Which city' not in answer.inner_text())
   check(f'{text!r} explains its numerical rank','#1 of' in answer.locator('.assistant-property').first.inner_text())
  audit(p,'Dark assistant recommendations');screenshot(p,'dark-assistant.png')
  answer=send(p,'a good house');check('Subjective query asks what good means',answer.locator('.assistant-property').count()==0 and 'What would make' in answer.inner_text())
  answer=send(p,'closest to downtown');check('No distance data means no fabricated closest home',answer.locator('.assistant-property').count()==0 and 'no coordinates' in answer.inner_text() and 'Which city' not in answer.inner_text())
  answer=send(p,'a condo under $350k');check('A budget and type need no additional mandatory questions',answer.locator('.assistant-property').count()==3)
  send(p,'Chicago under $500k');answer=send(p,'biggest place',False);check('Follow-up rankings retain the city and budget',answer.locator('.assistant-property').first.get_attribute('data-recommendation')=='sample-14' and answer.locator('.assistant-property').count()==2)
  answer=send(p,'most bedrooms across all 60 listings',False);check('An explicit catalogue-wide search clears old filters',answer.locator('.assistant-property').first.get_attribute('data-recommendation')=='sample-15' and '60 matching' in answer.inner_text())
  answer=send(p,'cheaper than The Willow House');check('Relative named comparison uses real fixture price','324,999' in answer.inner_text())
  p.locator('#assistant-input').fill('Keep this unsent message');transcript=p.locator('#assistant-messages').inner_text()
  choose(p,'light');check('Changing the palette does not erase chat or an unsent message',p.locator('#assistant-input').input_value()=='Keep this unsent message' and p.locator('#assistant-messages').inner_text()==transcript)
  check('Theme choice is written to the simulated preference store',p.evaluate("localStorage.getItem('haven.appearance.v1')")=='light')
  p.emulate_media(color_scheme='light');p.emulate_media(color_scheme='dark');p.wait_for_timeout(60)
  check('Explicit Light overrides a dark device',p.locator('html').get_attribute('data-theme')=='light')
  audit(p,'Light assistant recommendations')
  p.locator('.assistant-close').click()
  p.locator('[data-appearance-toggle]').click();p.keyboard.press('End');check('Appearance menu supports keyboard focus',p.locator('button[data-appearance="system"]').evaluate('e=>e===document.activeElement'))
  p.keyboard.press('Escape');check('Escape dismisses appearance menu and returns focus',not p.locator('.appearance-menu').is_visible() and p.locator('[data-appearance-toggle]').evaluate('e=>e===document.activeElement'))
  choose(p,'system');check('Use device setting restores dark appearance',p.locator('html').get_attribute('data-theme')=='dark')
  # Populate the saved/compare pages with real fixtures, preserving all normal workflows.
  send(p,'most bedrooms');p.locator('.from-haven').last.locator('[data-chat-save]').first.click();p.locator('.assistant-close').click()
  nav(p,'discover')
  p.locator('.property-card [data-action="compare-toggle"]').nth(0).click()
  p.locator('.property-card [data-action="compare-toggle"]').nth(1).click()
  for mode in ['dark','light']:
   choose(p,mode)
   for target in ['saved','compare','custom','calculator','discover']:
    nav(p,target)
    check(f'{mode} theme is retained on {target}',p.locator('html').get_attribute('data-theme')==mode)
    check(f'{mode} {target} has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    audit(p,f'{mode.title()} {target}')
   if mode=='light':screenshot(p,'light-discover.png')
   # Detail/modal content is outside the app shell and must share the palette.
   p.locator('.property-title').first.click();audit(p,f'{mode.title()} property detail')
   check(f'{mode} detail modal shares the surface token',p.locator('.modal').evaluate("e=>getComputedStyle(e).backgroundColor===getComputedStyle(document.querySelector('.sidebar')).backgroundColor"))
   p.locator('[data-action="close-dialog"]').first.click()
   p.locator('[data-action="add-property"]').click();audit(p,f'{mode.title()} new property form');p.locator('[data-action="close-dialog"]').first.click()
   p.locator('[data-action="workspace"]').click();audit(p,f'{mode.title()} workspace dialog');p.locator('[data-action="close-dialog"]').first.click()
   nav(p,'calculator');p.locator('#calc-price').fill('333000');before=p.locator('#cashflow-value').inner_text()
   choose(p,'light' if mode=='dark' else 'dark');check(f'Switching from {mode} leaves the calculator inputs and result unchanged',p.locator('#calc-price').input_value()=='333000' and p.locator('#cashflow-value').inner_text()==before)
   choose(p,mode);p.locator('#calculator-property').fill('Chicago');audit(p,f'{mode.title()} calculator autocomplete')
   check(f'{mode} per-letter autocomplete retains all Chicago suggestions',p.locator('[role="option"]').count()==3)
   if mode=='dark':screenshot(p,'dark-calculator-search.png')
   p.keyboard.press('Escape');p.locator('.advanced-assumptions summary').click();p.locator('.amortization-details summary').click();audit(p,f'{mode.title()} calculator details and chart')
   p.locator('#calc-price').fill('-1');audit(p,f'{mode.title()} input validation')
   p.locator('[data-action="reset-calculator"]').click()
  # Stored explicit appearance is read before the app initializes, not just after a click.
  saved=context.new_page();load(saved,{'haven.appearance.v1':'dark'})
  check('A pre-existing simulated dark preference is applied on startup',saved.locator('html').get_attribute('data-theme')=='dark');saved.close()
  denied=context.new_page();load(denied,denied=True);choose(denied,'dark');check('Theme changes still work with storage denied',denied.locator('html').get_attribute('data-theme')=='dark');denied.close()
  for width in [390,320]:
   mobile_context=browser.new_context(viewport={'width':width,'height':844},color_scheme='dark',reduced_motion='reduce')
   m=mobile_context.new_page();m.set_default_timeout(7000);load(m)
   check(f'{width}px dark discovery has no horizontal overflow',m.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   answer=send(m,'most bedrooms');box=m.locator('#haven-assistant').bounding_box()
   check(f'{width}px widget and composer fit the screen',box['x']>=0 and box['x']+box['width']<=width and m.locator('#assistant-form').bounding_box()['y']+m.locator('#assistant-form').bounding_box()['height']<=844)
   check(f'{width}px mobile ranking is the same factual result',answer.locator('.assistant-property').first.get_attribute('data-recommendation')=='sample-15')
   audit(m,f'{width}px dark chat')
   if width==390:screenshot(m,'dark-mobile-assistant.png')
   m.locator('.assistant-close').click();choose(m,'light');check(f'{width}px appearance menu selection works',m.locator('html').get_attribute('data-theme')=='light')
   choose(m,'dark');nav(m,'calculator');m.locator('#calculator-property').fill('Seattle');box=m.locator('.picker-popup').bounding_box()
   check(f'{width}px calculator autocomplete is wholly within the viewport',box['x']>=0 and box['x']+box['width']<=width)
   audit(m,f'{width}px dark calculator autocomplete')
   if width==390:screenshot(m,'dark-mobile-calculator.png')
   m.close();mobile_context.close()
  check('No uncaught JavaScript errors in ranking/theme scenarios',not errors)
  print(f'PASS: {len(checks)} ranking/theme browser checks; {len(audits)} rendered-text contrast samples. Isolated storage adapter.')
 except Exception:
  p.screenshot(path=str(ROOT/'docs/ranking-theme-failure.png'))
  raise
 finally:
  (ROOT/'docs/ranking-theme-results.json').write_text(json.dumps({'isolated':True,'checks':checks,'contrastAudits':audits,'pageErrors':errors},indent=2))
  browser.close()
