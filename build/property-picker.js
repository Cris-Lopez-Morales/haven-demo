import { escapeHTML as e, icon, money, number, propertyImage, bindImageFallbacks } from './ui.js';
import { searchPropertyOptions } from './property-search.js';
export function propertyPickerView(current) {
    return `<div class="property-picker" id="property-picker"><label for="calculator-property">EXPLORING A SCENARIO FOR</label><div class="picker-input-wrap">${icon('search')}<input id="calculator-property" type="text" role="combobox" aria-label="Property to analyze" aria-autocomplete="list" aria-expanded="false" aria-controls="calculator-property-options" autocomplete="off" spellcheck="false" value="${e(current.name)} · ${e(current.city)}" placeholder="Search a name, city, or property type…"><button type="button" class="picker-clear" aria-label="Clear property search" title="Clear search">${icon('x')}</button><button type="button" class="picker-toggle" aria-label="Show property options" tabindex="-1">${icon('down')}</button></div><div class="picker-popup" hidden><div class="picker-caption"><span id="picker-count"></span><span>Type to narrow it down</span></div><div id="calculator-property-options" role="listbox" aria-label="Properties"></div><div class="picker-empty" hidden>No places found.<small>Try a city, part of a name, or “condo”.</small></div><div class="picker-hint"><span>↑ ↓ to explore · Enter to choose</span><span>Demo + your properties</span></div></div><span id="picker-announcement" class="sr-only" role="status" aria-live="polite"></span></div>`;
}
let cleanup = null;
export function bindPropertyPicker(properties, current, select) {
    cleanup?.abort();
    cleanup = new AbortController();
    const root = document.getElementById('property-picker');
    if (!root)
        return;
    const signal = cleanup.signal;
    const input = root.querySelector('#calculator-property');
    const popup = root.querySelector('.picker-popup');
    const list = root.querySelector('[role="listbox"]');
    const announcement = root.querySelector('#picker-announcement');
    const selectedLabel = `${current.name} · ${current.city}`;
    let options = [...properties], active = -1, open = false;
    function highlight(scroll = false) {
        list.querySelectorAll('[role="option"]').forEach((el, i) => el.classList.toggle('picker-active', i === active));
        if (active >= 0 && options[active]) {
            const id = `picker-option-${options[active].id}`;
            input.setAttribute('aria-activedescendant', id);
            if (scroll)
                document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
        }
        else
            input.removeAttribute('aria-activedescendant');
    }
    function draw(query = '') {
        options = searchPropertyOptions(properties, query);
        active = query ? (options.length ? 0 : -1) : options.findIndex(p => p.id === current.id);
        list.innerHTML = options.map(p => `<div class="picker-option" role="option" id="picker-option-${e(p.id)}" data-property-option="${e(p.id)}" aria-selected="${p.id === current.id}">${propertyImage(p)}<span class="picker-option-copy"><strong>${e(p.name)}</strong><small>${e(p.city)}, ${e(p.state)} · ${e(p.type)} · ${p.beds} beds · ${number(p.sqft)} sq ft</small></span><span class="picker-option-price">${money(p.price)}${p.id === current.id ? icon('check') : ''}</span></div>`).join('');
        root.querySelector('.picker-empty').toggleAttribute('hidden', options.length > 0);
        root.querySelector('#picker-count').textContent = `${options.length} ${options.length === 1 ? 'place' : 'places'}`;
        announcement.textContent = `${options.length} properties available${query ? ` for ${query}` : ''}. Use arrow keys to explore and Enter to choose.`;
        bindImageFallbacks();
        highlight(!query);
    }
    function show(query = '') {
        open = true;
        popup.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        root.classList.add('picker-open');
        draw(query);
    }
    function close() {
        open = false;
        popup.hidden = true;
        root.classList.remove('picker-open');
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        input.value = selectedLabel;
    }
    function choose(id) {
        if (!properties.some(p => p.id === id))
            return;
        close();
        select(id);
        const replacement = document.querySelector('#calculator-property');
        if (replacement && replacement !== input) {
            replacement.dataset.skipOpen = 'true';
            replacement.focus({ preventScroll: true });
        }
    }
    input.addEventListener('focus', () => { if (input.dataset.skipOpen) {
        delete input.dataset.skipOpen;
        return;
    } input.select(); show(); }, { signal });
    input.addEventListener('click', () => { if (!open) {
        input.select();
        show();
    } }, { signal });
    input.addEventListener('input', () => show(input.value), { signal });
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
                show();
                return;
            }
            if (options.length)
                active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
            highlight(true);
        }
        else if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (active >= 0 && options[active])
                choose(options[active].id);
        }
        else if (event.key === 'Tab')
            close();
    }, { signal });
    list.addEventListener('pointerdown', event => event.preventDefault(), { signal });
    list.addEventListener('click', event => {
        const option = event.target instanceof Element ? event.target.closest('[data-property-option]') : null;
        if (option)
            choose(option.dataset.propertyOption);
    }, { signal });
    root.querySelector('.picker-toggle').addEventListener('pointerdown', event => event.preventDefault(), { signal });
    root.querySelector('.picker-toggle').addEventListener('click', () => { if (open)
        close();
    else {
        input.focus();
        show();
    } }, { signal });
    root.querySelector('.picker-clear').addEventListener('click', () => { input.focus(); input.value = ''; show(); }, { signal });
    document.addEventListener('pointerdown', event => { if (event.target instanceof Node && !root.contains(event.target))
        close(); }, { signal });
    root.addEventListener('focusout', () => queueMicrotask(() => { if (!root.contains(document.activeElement))
        close(); }), { signal });
}
