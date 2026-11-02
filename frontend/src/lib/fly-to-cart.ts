/** Decorative only: cart updates never depend on animation completion. */
export function flyToCart(source: HTMLElement, image: string) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]')).find(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  });
  if (!target || !source.animate) return;
  const start = source.getBoundingClientRect(), end = (target.querySelector('svg') || target).getBoundingClientRect();
  const x = start.left + start.width / 2, y = start.top + start.height / 2;
  const dx = end.left + end.width / 2 - x, dy = end.top + end.height / 2 - y;
  const tile = document.createElement('div');
  tile.className = 'cart-flight';
  tile.setAttribute('aria-hidden', 'true');
  tile.style.left = `${x - 30}px`;
  tile.style.top = `${y - 30}px`;
  const photo = document.createElement('img');
  photo.src = image || '/images/product-placeholder.svg';
  photo.alt = '';
  tile.append(photo);
  // Bound decorative nodes when someone clicks rapidly.
  document.querySelectorAll('.cart-flight').forEach((el, index) => { if (index >= 7) el.remove(); });
  document.body.append(tile);
  const frames = Array.from({length: 25}, (_, index) => {
    const t = index / 24;
    const arc = -Math.min(150, Math.abs(dx) * .2 + 65) * 4 * t * (1 - t);
    return { transform: `translate(${dx * t}px, ${dy * t + arc}px) scale(${1 - .8 * t}) rotate(${t * 24}deg)`, opacity: t > .85 ? (1 - t) / .15 : 1, offset: t };
  });
  const flight = tile.animate(frames, {duration: 850, easing: 'cubic-bezier(.3,.05,.65,1)', fill: 'forwards'});
  const cleanup = window.setTimeout(() => { flight.cancel(); tile.remove(); }, 1100);
  flight.finished.then(() => {
    if (target.isConnected && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.animate([{transform: 'scale(1)'}, {transform: 'scale(1.15)', offset: .45}, {transform: 'scale(1)'}], {duration: 300});
    }
  }).catch(() => {}).finally(() => { clearTimeout(cleanup); tile.remove(); });
}
