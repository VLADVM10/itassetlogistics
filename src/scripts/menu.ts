// Mobile menu (spec section 8): toggles below 900px, closes on Esc,
// on link click and when the window grows past the breakpoint; focus returns to the button.

const DESKTOP = window.matchMedia('(min-width: 901px)');

export function initMenu(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-menu-button]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!button || !menu) return;

  const isOpen = () => button.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean, returnFocus = false) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', (open ? button.dataset.labelClose : button.dataset.labelOpen) ?? '');
    menu.classList.toggle('is-open', open);
    if (!open && returnFocus) button.focus();
  };

  button.addEventListener('click', () => setOpen(!isOpen()));

  menu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, true);
  });

  DESKTOP.addEventListener('change', (event) => {
    if (event.matches && isOpen()) setOpen(false);
  });
}
