(function premiumThemeEnhancer() {
  if (document.documentElement.dataset.premiumThemeReady === '1') return;
  document.documentElement.dataset.premiumThemeReady = '1';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('nav');

  const syncNav = () => {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  syncNav();
  window.addEventListener('scroll', syncNav, { passive: true });

  const targets = document.querySelectorAll([
    '.hero',
    '.panel',
    '.card',
    '.stat',
    '.step',
    '.location-card',
    '.video-card',
    '.quote-card',
    '.contact-info',
    '.form-wrap',
    '.solar-calc-panel',
    '.solar-result-card',
    '.cta'
  ].join(','));

  if (!targets.length || prefersReduced || !('IntersectionObserver' in window)) return;

  targets.forEach((el, i) => {
    if (el.classList.contains('motion-reveal')) return;
    el.classList.add('premium-reveal');
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity .55s ease, transform .55s ease';
    el.style.transitionDelay = Math.min(i * 45, 260) + 'ms';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.premium-reveal').forEach((el) => observer.observe(el));
})();
