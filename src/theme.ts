export type Appearance = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'haven.appearance.v1';
const icons:Record<Appearance,string>={
  light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  dark:'<path d="M20.5 13A8.6 8.6 0 0 1 11 3.5 8.6 8.6 0 1 0 20.5 13Z"/>',
  system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>'
};
const svg=(name:Appearance):string=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):{matches:false,addEventListener:(_name:string,_fn:()=>void)=>{}};
let preference:Appearance=typeof document==='undefined'?'system':(['system','light','dark'].includes(document.documentElement.dataset.appearance||'')?document.documentElement.dataset.appearance:'system') as Appearance;
export function effectiveTheme(mode:Appearance,systemDark:boolean):'dark'|'light' {return mode==='system'?(systemDark?'dark':'light'):mode;}
export function appearanceControl():string {
  return `<div class="appearance"><button type="button" class="appearance-toggle" data-appearance-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="appearance-menu" aria-label="Change appearance. Current setting: ${preference}" title="Appearance: ${preference}">${svg(effectiveTheme(preference,media.matches))}</button><div class="appearance-menu" id="appearance-menu" role="menu" aria-label="Appearance" hidden><p>A little change of light</p>${(['light','dark','system'] as Appearance[]).map(mode=>`<button type="button" role="menuitemradio" data-appearance="${mode}" aria-checked="${preference===mode}" tabindex="-1">${svg(mode)}<span>${mode==='system'?'Use device setting':mode==='dark'?'Dark':'Light'}</span><span class="appearance-check" aria-hidden="true">✓</span></button>`).join('')}</div></div>`;
}
function closeMenu(restoreFocus=false):void {
  const button=document.querySelector<HTMLButtonElement>('[data-appearance-toggle]');
  document.getElementById('appearance-menu')?.setAttribute('hidden','');
  button?.setAttribute('aria-expanded','false');
  if(restoreFocus)button?.focus({preventScroll:true});
}
function apply(mode:Appearance,persist=false):void {
  preference=mode;
  const theme=effectiveTheme(mode,media.matches);
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.appearance=mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#141d18':'#fbfcf9');
  if(persist){try{localStorage.setItem(THEME_STORAGE_KEY,mode);}catch{/* Session theme still works when storage is blocked. */}}
  const button=document.querySelector<HTMLButtonElement>('[data-appearance-toggle]');
  if(button){button.innerHTML=svg(theme);button.setAttribute('aria-label',`Change appearance. Current setting: ${mode}`);button.title=`Appearance: ${mode}`;}
  document.querySelectorAll<HTMLButtonElement>('[data-appearance]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.appearance===mode)));
}
export function initializeAppearance():void {
  apply(preference);
  media.addEventListener('change',()=>{if(preference==='system')apply('system');});
  window.addEventListener('storage',event=>{if(event.key===THEME_STORAGE_KEY||event.key===null)apply(event.newValue==='dark'||event.newValue==='light'?event.newValue:'system');});
  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const control=event.target.closest<HTMLButtonElement>('[data-appearance-toggle]');
    if(control){
      const menu=document.getElementById('appearance-menu')!;
      const show=menu.hidden;menu.hidden=!show;control.setAttribute('aria-expanded',String(show));
      if(show)menu.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
      return;
    }
    const selected=event.target.closest<HTMLButtonElement>('button[data-appearance]');
    if(selected){apply(selected.dataset.appearance as Appearance,true);closeMenu(true);return;}
    if(!event.target.closest('.appearance'))closeMenu();
  });
  document.addEventListener('keydown',event=>{
    const menu=document.getElementById('appearance-menu');if(!menu||menu.hidden)return;
    if(event.key==='Escape'){event.preventDefault();closeMenu(true);return;}
    const choices=[...menu.querySelectorAll<HTMLButtonElement>('[data-appearance]')];
    const i=choices.indexOf(document.activeElement as HTMLButtonElement);
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();choices[event.key==='Home'?0:event.key==='End'?choices.length-1:(i+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();
    }
    if(event.key==='Tab')closeMenu();
  });
}
