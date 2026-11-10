/*
 * Equipment Journey (spec section 8).
 * 6 states: 5 stations + "Back in Stock". On the final state the marker returns to Store,
 * the return line and the Back in Stock button light up.
 * Autoplay every 4.5 s only while ≥30% of the block is visible and the tab is active.
 * Manual choice pauses. Reduced motion: starts paused. aria-live is polite only when paused.
 */
const INTERVAL = 4500;

export function initJourney(): void {
  const root = document.querySelector<HTMLElement>('[data-journey]');
  if (!root) return;

  const picks = [...root.querySelectorAll<HTMLButtonElement>('[data-j-pick]')];
  const entries = [...root.querySelectorAll<HTMLElement>('[data-j-entry]')];
  const count = root.querySelector<HTMLElement>('[data-j-count]');
  const live = root.querySelector<HTMLElement>('[data-j-live]');
  const pauseLabel = root.querySelector<HTMLElement>('[data-j-pause]');
  const playLabel = root.querySelector<HTMLElement>('[data-j-play]');
  const total = entries.length;
  const final = total - 1;
  const pad = (n: number) => String(n).padStart(2, '0');

  let step = 0;
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inView = false;

  function render(): void {
    const isFinal = step === final;
    const pos = isFinal ? 2 : step; // the laptop goes back to Store
    const reached = step >= 4 ? 4 : pos;
    root!.style.setProperty('--pos', String(pos));
    root!.style.setProperty('--reached', String(reached));
    root!.classList.toggle('is-final', isFinal);
    root!.dataset.step = String(step);

    for (const btn of picks) {
      const i = Number(btn.dataset.jPick);
      const current = isFinal ? i === final : i === pos;
      const done = i < final && i <= reached && i !== pos;
      // when on the final state, Store keeps the "current" look (the laptop is there)
      btn.classList.toggle('is-cur', current || (i === pos && i !== final));
      btn.classList.toggle('is-done', done);
      if (current) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    }
    entries.forEach((e, i) => (e.hidden = i !== step));
    if (count) count.textContent = `${pad(step + 1)} / ${count.dataset.total ?? pad(total)}`;
    if (live) live.setAttribute('aria-live', paused ? 'polite' : 'off');
    if (pauseLabel && playLabel) {
      pauseLabel.hidden = paused;
      playLabel.hidden = !paused;
    }
  }

  function go(next: number): void {
    step = (next + total) % total;
    paused = true;
    render();
  }

  root.querySelector('[data-j-prev]')?.addEventListener('click', () => go(step - 1));
  root.querySelector('[data-j-next]')?.addEventListener('click', () => go(step + 1));
  root.querySelector('[data-j-toggle]')?.addEventListener('click', () => {
    paused = !paused;
    render();
  });
  for (const btn of picks) btn.addEventListener('click', () => go(Number(btn.dataset.jPick)));

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => (inView = e[0]?.isIntersecting ?? false), { threshold: 0.3 }).observe(root);
  } else {
    inView = true;
  }

  window.setInterval(() => {
    if (paused || !inView || document.hidden) return;
    step = (step + 1) % total;
    render();
  }, INTERVAL);

  render();
}
