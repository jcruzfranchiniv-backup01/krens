/** Entrada suave al scroll. Sin IntersectionObserver o con movimiento reducido, todo queda visible. */
export function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>('.reveal');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((el) => observer.observe(el));
}

export function initMobileMenu(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('#mobile-nav');
  if (!button || !menu) return;
  const set = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    menu.dataset.open = String(open);
  };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) set(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      set(false);
      button.focus();
    }
  });
}

export function initCarousel(): void {
  const root = document.querySelector<HTMLElement>('[data-carousel]');
  const track = root?.querySelector<HTMLElement>('[data-carousel-track]');
  const dotsBox = root?.querySelector<HTMLElement>('[data-carousel-dots]');
  if (!root || !track || !dotsBox) return;
  const slides = Array.from(track.children) as HTMLElement[];
  const dots = slides.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir a la propuesta ${index + 1}`);
    dot.addEventListener('click', () => goTo(index));
    dotsBox.append(dot);
    return dot;
  });
  const current = () => {
    const left = track.scrollLeft;
    return slides.reduce((best, slide, i) => (Math.abs(slide.offsetLeft - track.offsetLeft - left) < Math.abs((slides[best]?.offsetLeft ?? 0) - track.offsetLeft - left) ? i : best), 0);
  };
  const goTo = (index: number) => {
    const target = slides[Math.max(0, Math.min(slides.length - 1, index))];
    if (target) track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };
  const sync = () => dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current())));
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  root.querySelector('[data-carousel-prev]')?.addEventListener('click', () => goTo(current() - 1));
  root.querySelector('[data-carousel-next]')?.addEventListener('click', () => goTo(current() + 1));
  sync();
}
