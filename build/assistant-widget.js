import { detectRanking } from './ranking.js';
import { freshPreferences, interpretMessage, nextReply, preferenceSummary, validPreferences } from './assistant-engine.js';
import { escapeHTML as e, icon, money, number, propertyImage, bindImageFallbacks } from './ui.js';
import { motionAllowed } from './motion.js';
export function mountAssistant(callbacks) {
    const host = document.getElementById('assistant-host');
    host.innerHTML = `<section class="assistant-panel" id="haven-assistant" role="dialog" aria-modal="false" aria-labelledby="assistant-title" hidden><header class="assistant-header"><span class="assistant-mark">${icon('home')}</span><div><h2 id="assistant-title">Haven assistant<span>DEMO</span></h2><p>A little help finding home.</p></div><button class="icon-button assistant-reset" title="Start a new chat" aria-label="Start a new chat">${icon('reset')}</button><button class="icon-button assistant-close" aria-label="Close Haven assistant">${icon('x')}</button></header><div class="assistant-mode-row"><span class="assistant-mode-label"><i></i><span id="assistant-mode-text">Local demo</span></span><button class="assistant-info-toggle" aria-expanded="false" aria-controls="assistant-info">Fictional listings ${icon('info')}</button></div><div id="assistant-info" class="assistant-info" hidden><p><strong>A sample world, not a listing service.</strong> Local mode uses a rule-based conversational matcher, not a live AI model. It only recommends the 60 fictional demo homes. No availability, real prices, or financial advice.</p><p>Chat stays in memory for this tab and clears on refresh. Saved homes use your existing workspace.</p><div id="assistant-provider"><span>Live AI is optional. See the source README to connect a server-side key.</span></div></div><details class="assistant-brief" hidden><summary><span>Your search</span><span id="assistant-preference-count"></span>${icon('down')}</summary><div id="assistant-preferences"></div></details><div id="assistant-messages" class="assistant-messages" role="log" aria-label="Conversation with Haven demo assistant" aria-live="polite" aria-relevant="additions text"></div><div id="assistant-working" class="assistant-working" role="status" hidden><span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span><span id="assistant-working-label">Comparing the demo listings…</span></div><div id="assistant-suggestions" class="assistant-suggestions" aria-label="Suggested replies"></div><form id="assistant-form" class="assistant-composer"><div><label class="sr-only" for="assistant-input">Message Haven assistant</label><textarea id="assistant-input" rows="1" maxlength="1200" placeholder="Try “the cheapest house”…" enterkeyhint="send"></textarea><button type="submit" id="assistant-send" aria-label="Send message" disabled>${icon('arrow')}</button></div><p><span>Demo homes. Real possibilities to explore.</span><span id="assistant-counter" aria-live="off">0 / 1200</span></p></form></section><button id="assistant-launcher" class="assistant-launcher" aria-label="Open Haven assistant" aria-expanded="false" aria-controls="haven-assistant">${icon('chat')}<span>Ask Haven</span><span class="launcher-demo">DEMO</span></button>`;
    const panel = host.querySelector('.assistant-panel');
    const launcher = host.querySelector('#assistant-launcher');
    const input = host.querySelector('#assistant-input');
    const log = host.querySelector('#assistant-messages');
    const sendButton = host.querySelector('#assistant-send');
    const suggestions = host.querySelector('#assistant-suggestions');
    let prefs = freshPreferences(), question = 'city', offset = 0, busy = false, sequence = 0, open = false;
    let liveAI = false, providerChecked = false, request = null;
    const history = [];
    function refresh() {
        host.querySelectorAll('[data-chat-save]').forEach(button => {
            const saved = callbacks.isSaved(button.dataset.chatSave);
            button.setAttribute('aria-pressed', String(saved));
            button.classList.toggle('is-saved', saved);
            button.innerHTML = icon('heart') + (saved ? 'Saved' : 'Save');
        });
    }
    function summary() {
        const parts = preferenceSummary(prefs);
        host.querySelector('.assistant-brief').toggleAttribute('hidden', !parts.length);
        host.querySelector('#assistant-preference-count').textContent = `${parts.length} ${parts.length === 1 ? 'preference' : 'preferences'}`;
        host.querySelector('#assistant-preferences').innerHTML = parts.map(text => `<span>${e(text)}</span>`).join('') + '<small>Tell me what to change in your next message.</small>';
    }
    function renderSuggestions(items) {
        suggestions.innerHTML = items.map(item => `<button type="button" data-chat-suggestion="${e(item.message)}">${e(item.label)} ${icon('plus')}</button>`).join('');
    }
    function card(match) {
        const p = match.property;
        return `<article class="assistant-property" data-recommendation="${e(p.id)}"><div class="assistant-property-top">${propertyImage(p)}<div><span class="assistant-card-kind">${e(p.type)} · Fictional</span><button class="assistant-property-title" data-chat-details="${e(p.id)}">${e(p.name)}</button><span class="assistant-card-location">${e(p.city)}, ${e(p.state)}</span><strong>${money(p.price)}</strong></div></div><div class="assistant-card-specs"><span>${p.beds} beds</span><span>${p.baths} baths</span><span>${number(p.sqft)} sq ft</span></div><div class="assistant-fit"><strong>Why this fits</strong><ul>${match.reasons.map(reason => `<li>${icon('check')}<span>${e(reason)}</span></li>`).join('')}</ul></div>${match.caveats.map(text => `<p class="assistant-caveat">${icon('info')}<span>${e(text)}</span></p>`).join('')}<div class="assistant-card-actions"><button data-chat-details="${e(p.id)}">View home ${icon('diagonal')}</button><button data-chat-analyze="${e(p.id)}">Run numbers ${icon('calculator')}</button><button data-chat-save="${e(p.id)}" aria-label="Save ${e(p.name)}" aria-pressed="false">${icon('heart')}Save</button></div></article>`;
    }
    function append(role, text, matches = [], welcome = false) {
        const node = document.createElement('div');
        node.className = `assistant-message ${role === 'user' ? 'from-user' : 'from-haven'}`;
        node.innerHTML = role === 'assistant' ? `<span class="assistant-message-label">HAVEN${liveAI ? ' · AI-ASSISTED' : ' · DEMO'}</span>${welcome ? '<h3>Let’s find your kind of place.</h3>' : ''}<p>${e(text)}</p>${matches.length ? `<div class="assistant-recommendations">${matches.map(card).join('')}</div>` : ''}` : `<p>${e(text)}</p>`;
        log.append(node);
        history.push({ role, content: text });
        // Bound the ephemeral transcript; preferences survive trimming.
        if (log.children.length > 70)
            log.firstElementChild?.remove();
        if (history.length > 24)
            history.shift();
        bindImageFallbacks();
        refresh();
        if (open)
            requestAnimationFrame(() => {
                const top = role === 'user' ? log.scrollHeight : node.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - 12;
                log.scrollTo({ top, behavior: motionAllowed() ? 'smooth' : 'instant' });
            });
    }
    function composer() {
        sendButton.disabled = busy || !input.value.trim();
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 86) + 'px';
        host.querySelector('#assistant-counter').textContent = `${input.value.length} / 1200`;
    }
    function working(on) {
        busy = on;
        host.querySelector('#assistant-working').hidden = !on;
        host.querySelector('#assistant-working-label').textContent = liveAI ? 'Interpreting your preferences…' : 'Comparing the demo listings…';
        suggestions.querySelectorAll('button').forEach(button => button.disabled = on);
        host.querySelector('#assistant-ai-toggle')?.toggleAttribute('disabled', on);
        composer();
    }
    function mode() { host.querySelector('#assistant-mode-text').textContent = liveAI ? 'Connected AI · demo homes' : 'Local demo'; }
    let lastRecommendedIds = [];
    function start() {
        lastRecommendedIds = [];
        sequence++;
        request?.abort();
        request = null;
        prefs = freshPreferences();
        question = 'criteria';
        offset = 0;
        working(false);
        log.replaceChildren();
        history.length = 0;
        input.value = '';
        composer();
        summary();
        host.querySelector('.assistant-brief').open = false;
        append('assistant', `Ask me to compare any of Haven’s 60 fictional homes: the cheapest house, the biggest place, or the most bedrooms. I’ll check the listing numbers directly. Add a city, budget, or must-have whenever it matters to you.`, [], true);
        renderSuggestions([
            { label: 'Cheapest house', message: 'Show me the cheapest house' },
            { label: 'Biggest place', message: 'Show me the biggest place' },
            { label: 'Most bedrooms', message: 'Which home has the most bedrooms?' }
        ]);
    }
    async function checkProvider() {
        if (providerChecked || !/^https?:$/.test(location.protocol))
            return;
        providerChecked = true;
        try {
            const res = await fetch('/api/assistant/status', { signal: AbortSignal.timeout(3000), credentials: 'same-origin' });
            if (!res.ok)
                return;
            const status = await res.json();
            if (status.available !== true)
                return;
            host.querySelector('#assistant-provider').innerHTML = `<p>A server-side AI connection is available. Enabling it sends your chat and search preferences to OpenAI. Workspace notes, backups, and saved scenarios are never sent.</p><button type="button" id="assistant-ai-toggle" aria-pressed="false">Enable connected AI</button>`;
            host.querySelector('#assistant-ai-toggle').addEventListener('click', event => {
                if (busy)
                    return;
                liveAI = !liveAI;
                mode();
                const button = event.currentTarget;
                button.setAttribute('aria-pressed', String(liveAI));
                button.textContent = liveAI ? 'Switch to local demo' : 'Enable connected AI';
                append('assistant', liveAI ? 'Connected AI is enabled to interpret your next message. Recommendations and explanations still come only from the fictional catalogue.' : 'Back to the local demo matcher. Your preferences are unchanged; new messages won’t be sent to the AI service.');
            });
        }
        catch { /* Standalone and static hosting remain entirely usable without a backend. */ }
    }
    function toggle(show, focus = true) {
        open = show;
        panel.hidden = !show;
        launcher.setAttribute('aria-expanded', String(show));
        launcher.setAttribute('aria-label', show ? 'Close Haven assistant' : 'Open Haven assistant');
        launcher.classList.toggle('assistant-is-open', show);
        if (show) {
            refresh();
            checkProvider();
            if (focus)
                input.focus({ preventScroll: true });
        }
        else if (focus)
            launcher.focus({ preventScroll: true });
    }
    async function submit(text) {
        text = text.trim().slice(0, 1200);
        if (!text || busy)
            return;
        if (/^(?:start over|start again|reset(?: search)?|new search|clear everything)[.!]?$/i.test(text)) {
            start();
            input.focus();
            return;
        }
        const token = ++sequence;
        append('user', text);
        input.value = '';
        working(true);
        input.focus({ preventScroll: true });
        const local = interpretMessage(text, prefs, question, callbacks.properties, lastRecommendedIds);
        let interpreted = local, fail = '';
        // Known numerical requests are answered locally even when connected AI is on.
        // This prevents the provider from re-introducing gating or fabricating rankings.
        if (liveAI && !detectRanking(text.toLowerCase()) && !local.note) {
            request = new AbortController();
            const timer = setTimeout(() => request?.abort(), 20000);
            try {
                const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, preferences: prefs, question, history: history.slice(-10, -1) }), signal: request.signal, credentials: 'same-origin' });
                if (!response.ok)
                    throw new Error('AI service unavailable');
                const data = await response.json();
                if (!validPreferences(data.preferences))
                    throw new Error('Invalid AI response');
                interpreted = { ...local, preferences: data.preferences, recognized: true, note: typeof data.note === 'string' ? data.note.slice(0, 300) : '', noteQuestion: data.note ? 'criteria' : local.noteQuestion };
            }
            catch {
                if (token !== sequence)
                    return;
                fail = 'The AI connection didn’t respond. I’m using the local demo matcher for this message; your existing preferences are still here.';
            }
            finally {
                clearTimeout(timer);
                request = null;
            }
        }
        else
            await new Promise(resolve => setTimeout(resolve, motionAllowed() ? 320 : 40));
        if (token !== sequence)
            return;
        if (fail) {
            liveAI = false;
            mode();
            const toggle = host.querySelector('#assistant-ai-toggle');
            if (toggle) {
                toggle.setAttribute('aria-pressed', 'false');
                toggle.textContent = 'Enable connected AI';
            }
            append('assistant', fail);
        }
        prefs = interpreted.preferences;
        const reply = nextReply(prefs, callbacks.properties, { recognized: interpreted.recognized, note: interpreted.note, noteQuestion: interpreted.noteQuestion, offset, more: interpreted.more });
        if (reply.matches.length)
            lastRecommendedIds = reply.matches.map(match => match.property.id);
        question = reply.question;
        offset = reply.offset;
        summary();
        working(false);
        append('assistant', reply.text, reply.matches);
        renderSuggestions(reply.suggestions);
    }
    launcher.addEventListener('click', () => toggle(!open));
    host.querySelector('.assistant-close').addEventListener('click', () => toggle(false));
    host.querySelector('.assistant-reset').addEventListener('click', () => { start(); input.focus(); });
    host.querySelector('.assistant-info-toggle').addEventListener('click', event => {
        const info = host.querySelector('#assistant-info');
        info.hidden = !info.hidden;
        event.currentTarget.setAttribute('aria-expanded', String(!info.hidden));
    });
    host.querySelector('#assistant-form').addEventListener('submit', event => { event.preventDefault(); void submit(input.value); });
    input.addEventListener('input', composer);
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        void submit(input.value);
    } });
    host.addEventListener('keydown', event => { if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        toggle(false);
    } });
    host.addEventListener('click', event => {
        const button = event.target instanceof Element ? event.target.closest('button') : null;
        if (!button || button.disabled)
            return;
        if (button.dataset.chatSuggestion)
            void submit(button.dataset.chatSuggestion);
        if (button.dataset.chatDetails)
            callbacks.details(button.dataset.chatDetails);
        if (button.dataset.chatAnalyze) {
            toggle(false, false);
            callbacks.analyze(button.dataset.chatAnalyze);
        }
        if (button.dataset.chatSave) {
            callbacks.save(button.dataset.chatSave);
            refresh();
        }
    });
    start();
    return { refresh };
}
