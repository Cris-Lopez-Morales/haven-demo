/** Small, progressive motion layer. No library, layout polling, or infinite loops.
 * Content and actions still work without IntersectionObserver / Web Animations.
 * Respect reduced motion both at startup and when the preference changes.
 */
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
let cardObserver = null;
const animations = new Set();
export function motionAllowed() { return !preference.matches; }
function animate(el, frames, duration = 380, delay = 0) {
    if (!el || !motionAllowed() || typeof el.animate !== 'function')
        return;
    const animation = el.animate(frames, { duration, delay, easing: ease, fill: 'backwards' });
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
}
/** Snapshot before a DOM update so saving a home does not replay every card. */
export function revealedCards() {
    return new Set([...document.querySelectorAll('.property-card[data-revealed="true"]')].map(el => el.dataset.property));
}
function reveal(card, delay = 0) {
    card.classList.remove('reveal-pending');
    card.dataset.revealed = 'true';
    cardObserver?.unobserve(card);
    animate(card, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], 440, delay);
}
export function bindCardMotion(keep = new Set()) {
    cardObserver?.disconnect();
    cardObserver = null;
    // Dispose animations belonging to nodes replaced by a filter or a navigation.
    for (const animation of animations) {
        const target = animation.effect?.target;
        if (target && !target.isConnected)
            animation.cancel();
    }
    const cards = [...document.querySelectorAll('.property-card')];
    if (!motionAllowed() || typeof IntersectionObserver === 'undefined') {
        cards.forEach(card => { card.classList.remove('reveal-pending'); card.dataset.revealed = 'true'; });
        return;
    }
    cardObserver = new IntersectionObserver(entries => {
        let order = 0;
        for (const entry of entries) {
            if (entry.isIntersecting)
                reveal(entry.target, Math.min(order++ * 45, 135));
        }
    }, { rootMargin: '0px 0px 24px 0px', threshold: 0.02 });
    for (const card of cards) {
        if (keep.has(card.dataset.property)) {
            card.classList.remove('reveal-pending');
            card.dataset.revealed = 'true';
        }
        else {
            card.classList.add('reveal-pending');
            cardObserver.observe(card);
        }
    }
}
export function pageMotion() {
    const hero = document.querySelector('.hero');
    if (hero) {
        animate(hero.querySelector('.hero-copy'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], 560);
        animate(hero.querySelector('.hero-visual'), [{ opacity: 0.45, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1)' }], 720, 50);
        animate(hero.querySelector('.hero-stamp'), [{ opacity: 0, transform: 'rotate(3deg) scale(.94)' }, { opacity: 1, transform: 'rotate(12deg) scale(1)' }], 620, 180);
        animate(document.querySelector('.stats-row'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 460, 100);
    }
    else {
        const main = document.querySelector('main');
        if (main)
            [...main.children].slice(0, 5).forEach((el, i) => animate(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], 340, Math.min(i * 35, 100)));
    }
}
export function dialogMotion(dialog) {
    animate(dialog, [{ opacity: 0, transform: 'translateY(10px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 300);
}
export function trayMotion() {
    animate(document.querySelector('.compare-tray'), [{ opacity: 0, transform: 'translate(-50%, 12px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], 320);
}
export function favoriteMotion(id) {
    const card = [...document.querySelectorAll('.property-card')].find(el => el.dataset.property === id);
    animate(card?.querySelector('.save-button .icon') ?? null, [{ transform: 'scale(.85)' }, { transform: 'scale(1.22)', offset: .48 }, { transform: 'scale(1)' }], 320);
    animate(document.querySelector('.nav-count[data-count="saved"]'), [{ transform: 'scale(.9)' }, { transform: 'scale(1.12)', offset: .5 }, { transform: 'scale(1)' }], 300);
}
export function filterMotion() {
    animate(document.querySelector('.extra-filters'), [{ opacity: 0, transform: 'translateY(-5px)' }, { opacity: 1, transform: 'translateY(0)' }], 260);
}
// Keyboard users never focus a visually hidden card. Revealing must not wait
// for scrolling or for the observer callback to run.
document.addEventListener('focusin', event => {
    const card = event.target instanceof Element ? event.target.closest('.reveal-pending') : null;
    if (card) {
        card.classList.remove('reveal-pending');
        card.dataset.revealed = 'true';
        cardObserver?.unobserve(card);
    }
});
preference.addEventListener('change', () => {
    if (!preference.matches)
        return;
    cardObserver?.disconnect();
    document.querySelectorAll('.reveal-pending').forEach(card => { card.classList.remove('reveal-pending'); card.dataset.revealed = 'true'; });
    for (const animation of animations)
        animation.cancel();
});
