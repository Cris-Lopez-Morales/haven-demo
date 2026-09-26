import type { Property, State } from './types.js';

export const escapeHTML = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const money = (n: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(n) < 0.5 ? 0 : n);
export const signedMoney = (n: number): string => (n >= 0.5 ? '+' : '') + money(n);
export const percent = (n: number | null): string => n === null ? 'N/A' : `${n.toFixed(1)}%`;
export const number = (n: number): string => n.toLocaleString('en-US');
export const compact = (n: number): string => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}m` : `$${Math.round(n / 1000)}k`;
export const uid = (): string => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const paths: Record<string, string> = {
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-9.5A8.5 8.5 0 0 1 11.5 3h1a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M8 9h8M8 13h5"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  heart: '<path d="M20.4 4.6a5.5 5.5 0 0 0-7.8 0l-.6.6-.6-.6a5.5 5.5 0 0 0-7.8 7.8L12 21l8.4-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  compare: '<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/><path d="M6 9h1m10 0h1M6 13h1m10 0h1"/>',
  calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  diagonal: '<path d="M6 18 18 6H7m11 0v11"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  bed: '<path d="M3 18v3m18-3v3M3 18V8m18 10V8M3 14h18v4H3Z"/><path d="M5 14v-4h6v4m2 0v-4h6v4"/>',
  bath: '<path d="M3 12h18l-1 5a3 3 0 0 1-3 2H7a3 3 0 0 1-3-2Zm3 7-1 2m13-2 1 2M5 12V5a2 2 0 0 1 4 0v1"/>',
  area: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v4m6-4v4M4 9h4m-4 6h4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h1m-1 7h1m-1 7h1"/>',
  sliders: '<path d="M4 7h3m4 0h9M4 17h9m4 0h3"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v5h16v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.3.9-1.7 1.2-1.7 3.2m0 3h.01"/>',
  folder: '<path d="M3 7V4h7l2 3h9v13H3Z"/>',
  leaf: '<path d="M20 3S4 1 4 12a7 7 0 0 0 7 7C22 19 20 3 20 3Z"/><path d="m3 21 11-11"/>',
  trend: '<path d="m3 17 6-6 4 4L21 7m-6 0h6v6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
export function icon(name: string, cls = ''): string {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.home}</svg>`;
}

const artworkCache = new Map<string,string>();
/** Original lightweight architectural artwork: always available, including offline.
 * Original twelve images are unchanged. New rows add type-specific facades.
 */
export function houseArt(index: number, hero = false, type?: Property['type']): string {
  index = Math.max(0,Math.floor(index));
  const cacheKey = `${index}:${hero}:${type || ''}`;
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;
  const themes = [
    ['#d9e1d5','#d4d0bb','#f3eee0','#25473c','#96a184'],
    ['#e4ddce','#bfbc9f','#e9e5d7','#3a4c46','#9b9b75'],
    ['#cedddc','#b3c6b0','#d9c3a0','#2b4946','#71918a'],
    ['#e7e2d6','#b4be9f','#ede4d6','#394d3d','#8c9a71'],
    ['#d8dedd','#adbab0','#e3e5df','#37534e','#839d94'],
    ['#e8ded0','#c5c3a4','#efdebd','#4e5141','#9b9e79']
  ];
  const c = themes[index % themes.length];
  const isModern = index % 3 === 0;
  const condo = index >= 12 && type ? type === 'Condo' : index % 6 === 4;
  const tree = (x: number,y: number,s: number) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 0v95m0-47-18-17m18 1 16-18" stroke="#485647" stroke-width="4"/><ellipse cx="0" cy="-3" rx="34" ry="48" fill="${c[4]}"/><ellipse cx="-18" cy="5" rx="23" ry="30" fill="${c[3]}" opacity=".65"/></g>`;
  const window = (x: number,y: number,w: number,h: number) => `<g><rect x="${x-3}" y="${y-3}" width="${w+6}" height="${h+6}" fill="${c[3]}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#aec1b8"/><path d="m${x} ${y+h} ${w} -${h}" stroke="#dfe8db" stroke-width="${w/2}" opacity=".4"/><path d="M${x+w/2} ${y}v${h}" stroke="${c[3]}" stroke-width="3"/></g>`;
  const townhouse = index >= 12 && type === 'Townhouse';
  const duplex = index >= 12 && type === 'Duplex';
  const ranch = index >= 12 && type === 'Single-family' && index % 2 === 1;
  const house = townhouse ? `<path d="m438 118 53 31v149h-53Z" fill="#aab3a0"/>${[0,1,2].map(i => {
    const x = 135+i*104;
    return `<path d="M${x} 130l48-38 50 38v168h-98Z" fill="${i===1 ? '#e2d9c2' : c[2]}"/><path d="m${x-6} 134 54-47 55 47" fill="none" stroke="${c[3]}" stroke-width="9"/>${window(x+24,150,49,45)}${window(x+14,219,32,42)}<rect x="${x+61}" y="218" width="25" height="80" fill="${c[3]}"/><path d="M${x+5} 296h89" stroke="#999d88" stroke-width="8"/>`;
  }).join('')}` : duplex ? `<path d="M140 181h310v117H140Z" fill="${c[2]}"/><path d="m450 181 45 22v95h-45Z" fill="#aab29c"/>${[0,1].map(i => {
    const x = 135+i*158;
    return `<path d="M${x} 181l80-66 80 66" fill="${c[2]}"/><path d="m${x-6} 181 86-73 87 73" fill="none" stroke="${c[3]}" stroke-width="10"/>${window(x+19,206,57,49)}<rect x="${x+100}" y="210" width="30" height="88" fill="${c[3]}"/>${window(x+64,148,30,26)}`;
  }).join('')}<path d="M295 183v115" stroke="#b8b69f" stroke-width="3"/>` : ranch ? `<rect x="134" y="190" width="316" height="108" fill="${c[2]}"/><path d="m450 190 47 23v85h-47Z" fill="#aab29c"/><path d="m113 196 106-69 249 49 43 35-61-12-231-50-85 57Z" fill="${c[3]}"/>${window(155,217,66,53)}${window(329,216,95,55)}<rect x="264" y="217" width="36" height="81" fill="${c[3]}"/><path d="M124 294h336" stroke="#aaa991" stroke-width="10"/>` : condo ? `<path d="M145 88 390 76 471 123v172H145Z" fill="${c[2]}"/><path d="m390 76 81 47v172h-81Z" fill="#aab6ae"/><rect x="135" y="81" width="263" height="12" fill="${c[3]}"/>${[0,1,2].map(row => [0,1,2].map(col => window(165+col*74,110+row*58,48,38)).join('')).join('')}<rect x="313" y="247" width="42" height="50" fill="${c[3]}"/>` : isModern ? `<path d="M133 157h187V93h117v205H133Z" fill="${c[2]}"/><path d="m437 93 62 34v171h-62Z" fill="#a5afa0"/><path d="M122 152h205v13H122ZM310 87h137v13H310Z" fill="${c[3]}"/>${window(151,189,100,79)}${window(343,121,71,68)}${window(343,216,71,70)}<rect x="273" y="213" width="40" height="85" fill="${c[3]}"/><path d="M275 164h39v34h-39Z" fill="#c2b397"/><path d="M290 164v34m14-34v34" stroke="#aa9e83" stroke-width="2"/><rect x="125" y="283" width="374" height="15" fill="#a2a28a"/>` : `<path d="M151 151 282 73 416 151v146H151Z" fill="${c[2]}"/><path d="m416 151 69 34v112h-69Z" fill="#abb09c"/><path d="m132 160 150-98 153 98-15 9-138-88-138 88Z" fill="${c[3]}"/><path d="m286 78 150 88 65 29-15-21L291 67Z" fill="${c[3]}" opacity=".9"/>${window(180,182,68,63)}${window(325,182,61,63)}${window(259,117,44,35)}<rect x="268" y="209" width="38" height="89" fill="${c[3]}"/><circle cx="297" cy="254" r="2" fill="#decdad"/><rect x="132" y="284" width="292" height="14" fill="#aaa991"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="400" viewBox="0 0 680 400"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${c[0]}"/><stop offset="1" stop-color="#f0eee2"/></linearGradient><pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".7" fill="#fff" opacity=".14"/></pattern></defs><rect width="680" height="400" fill="url(#sky)"/><circle cx="548" cy="76" r="34" fill="#f5eed4" opacity=".8"/><path d="M0 240Q110 201 210 235T410 231T680 216V400H0Z" fill="${c[1]}"/><path d="M0 283Q185 242 365 294T680 263V400H0Z" fill="${c[4]}" opacity=".5"/>${tree(110,161,.8)}${tree(550,154,.8)}<ellipse cx="331" cy="319" rx="207" ry="25" fill="${c[3]}" opacity=".12"/>${house}<path d="m268 298 39 0 105 102H218Z" fill="#dad6c4"/><path d="M0 367q125-28 258 7L218 400H0Z" fill="${c[4]}"/>${tree(46,188,1.3)}${tree(631,196,1.4)}<g fill="${c[3]}"><ellipse cx="157" cy="295" rx="31" ry="18"/><ellipse cx="197" cy="298" rx="27" ry="14"/><ellipse cx="432" cy="299" rx="39" ry="17"/></g><path d="m465 345 56-12m-420 7 50 6" stroke="#f3edda" opacity=".7" stroke-width="2"/><rect width="680" height="400" fill="url(#grain)"/>${hero ? '<rect width="680" height="400" fill="#345443" opacity=".06"/>' : ''}</svg>`;
  const result = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  if (artworkCache.size > 1024) artworkCache.clear();
  artworkCache.set(cacheKey,result);
  return result;
}

export function propertyImage(p: Property, cls = '', hero = false): string {
  // Start with original local artwork. Optional photography is opt-in in About.
  const usePhotos = document.documentElement.dataset.photos === 'true' && !!p.photo;
  const artwork = houseArt(p.art,hero,p.type);
  return `<img class="${cls}" src="${usePhotos ? escapeHTML(p.photo) : artwork}" data-fallback="${artwork}" alt="${usePhotos ? 'Illustrative house photograph; not the actual property' : 'Architectural illustration for '+escapeHTML(p.name)}" ${hero ? '' : 'loading="lazy"'} width="680" height="400">`;
}

export function toast(text: string, error = false): void {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
  let host: HTMLElement = document.getElementById('toast-host')!;
  if (dialog) {
    let inside = dialog.querySelector<HTMLElement>('.dialog-toast-host');
    if (!inside) { inside = document.createElement('div'); inside.className = 'dialog-toast-host'; inside.setAttribute('aria-live','polite'); dialog.append(inside); }
    host = inside;
  }
  const item = document.createElement('div');
  item.className = `toast ${error ? 'error' : ''}`;
  item.setAttribute('role', error ? 'alert' : 'status');
  item.innerHTML = `${icon(error ? 'info' : 'check')}<span>${escapeHTML(text)}</span>`;
  host.replaceChildren(item);
  window.setTimeout(() => { if (item.isConnected) item.remove(); }, 4500);
}

export function downloadFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function emptyState(title: string, message: string, action = 'clear-filters', label = 'Clear filters', symbol = 'search'): string {
  return `<div class="empty-state"><div class="empty-art">${icon(symbol)}</div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(message)}</p><button class="btn primary" data-action="${action}">${escapeHTML(label)}${icon('arrow')}</button></div>`;
}
export function bindImageFallbacks(): void {
  document.querySelectorAll<HTMLImageElement>('img[data-fallback]').forEach(img => {
    img.onerror = () => { img.onerror = null; img.src = img.dataset.fallback!; };
  });
}
export function updateNavCounts(state: State): void {
  for (const name of ['saved','compare']) {
    document.querySelectorAll(`[data-count="${name}"]`).forEach(el => {
      el.textContent = String(name === 'saved' ? state.workspace.savedIds.length : state.workspace.compareIds.length);
    });
  }
}
