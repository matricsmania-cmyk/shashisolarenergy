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

(function siteLanguageSwitcher() {
  const STORAGE_KEY = 'shashi_site_language';
  const RELOAD_GUARD_KEY = 'shashi_translate_reload_guard';
  const DEFAULT_LANG = 'hi';
  const ORIGINAL_LANG = 'en';
  const SUPPORTED_LANGS = new Set(['en', 'hi']);
  const RETRY_LIMIT = 12;
  const RETRY_DELAY_MS = 120;

  let latestRequestedLang = null;

  const readCookie = (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const writeCookie = (name, value, domain) => {
    const maxAge = 60 * 60 * 24 * 365;
    const domainPart = domain ? ';domain=' + domain : '';
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;max-age=' + maxAge + ';SameSite=Lax' + domainPart;
  };

  const setGoogleTranslateCookie = (langCode) => {
    const value = '/' + ORIGINAL_LANG + '/' + langCode;
    writeCookie('googtrans', value, '');

    const hostBase = window.location.hostname.replace(/^www\./, '');
    if (hostBase && hostBase.includes('.')) {
      writeCookie('googtrans', value, '.' + hostBase);
    }
  };

  const getCookieLang = () => {
    const raw = readCookie('googtrans');
    if (!raw) return ORIGINAL_LANG;
    const parts = raw.split('/');
    const target = parts[2];
    return SUPPORTED_LANGS.has(target) ? target : ORIGINAL_LANG;
  };

  const getSavedLang = () => {
    // Always open website in Hindi on page load.
    // Users can switch language manually, but each fresh page load starts in Hindi.
    try {
      localStorage.setItem(STORAGE_KEY, DEFAULT_LANG);
    } catch (_err) {}
    return DEFAULT_LANG;
  };

  const updateLanguageButtons = (langCode) => {
    document.querySelectorAll('.site-language-btn').forEach((button) => {
      const code = button.getAttribute('data-lang');
      button.classList.toggle('is-active', code === langCode);
    });
  };

  const forceReloadForTranslate = (langCode) => {
    try {
      const marker = window.location.pathname + '|' + langCode;
      const currentStamp = Date.now();
      const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
      if (raw) {
        const parts = raw.split('::');
        const prevMarker = parts[0];
        const prevStamp = Number(parts[1] || 0);
        if (prevMarker === marker && Number.isFinite(prevStamp) && currentStamp - prevStamp < 15000) {
          return;
        }
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, marker + '::' + currentStamp);
      window.location.reload();
    } catch (_err) {
      window.location.reload();
    }
  };

  const triggerComboTranslate = (langCode, attempt) => {
    if (latestRequestedLang !== langCode) return;

    const combo = document.querySelector('select.goog-te-combo');
    if (!combo) {
      if (attempt < RETRY_LIMIT) {
        window.setTimeout(() => triggerComboTranslate(langCode, attempt + 1), RETRY_DELAY_MS);
      } else {
        forceReloadForTranslate(langCode);
      }
      return false;
    }

    const nextValue = langCode === 'en' ? 'en' : 'hi';
    if (combo.value !== nextValue) {
      combo.value = nextValue;
      combo.dispatchEvent(new Event('change', { bubbles: true }));
      combo.dispatchEvent(new Event('input', { bubbles: true }));
      if (window.jQuery) {
        window.jQuery(combo).val(nextValue).trigger('change');
      }
    } else if (langCode !== getCookieLang()) {
      combo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch (_err) {}
    return true;
  };

  const applyLanguage = (langCode, persistChoice) => {
    if (!SUPPORTED_LANGS.has(langCode)) return;

    latestRequestedLang = langCode;
    if (persistChoice) {
      localStorage.setItem(STORAGE_KEY, langCode);
    }
    setGoogleTranslateCookie(langCode);
    updateLanguageButtons(langCode);
    triggerComboTranslate(langCode, 0);
  };

  const buildLanguageSwitcher = () => {
    if (document.querySelector('.site-language-switcher')) return;

    const wrap = document.createElement('aside');
    wrap.className = 'site-language-switcher';
    wrap.setAttribute('aria-label', 'Website language switcher');

    wrap.innerHTML = [
      '<span class="site-language-label">Language</span>',
      '<div class="site-language-buttons">',
      '<button type="button" class="site-language-btn" data-lang="hi" aria-label="Switch to Hindi">&#2361;&#2367;&#2306;&#2342;&#2368;</button>',
      '<button type="button" class="site-language-btn" data-lang="en" aria-label="Switch to English">English</button>',
      '</div>'
    ].join('');

    const savedLang = getSavedLang();
    const buttons = wrap.querySelectorAll('.site-language-btn');
    buttons.forEach((button) => {
      const langCode = button.getAttribute('data-lang');
      button.classList.toggle('is-active', langCode === savedLang);
      button.addEventListener('click', () => {
        latestRequestedLang = langCode;
        applyLanguage(langCode, true);
      });
    });

    document.body.appendChild(wrap);
  };

  const mountGoogleTranslate = () => {
    if (!document.getElementById('google_translate_element')) {
      const container = document.createElement('div');
      container.id = 'google_translate_element';
      container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(container);
    }

    window.googleTranslateElementInit = function () {
      if (!window.google || !google.translate || !google.translate.TranslateElement) return;
      new google.translate.TranslateElement(
        {
          pageLanguage: ORIGINAL_LANG,
          includedLanguages: 'en,hi',
          autoDisplay: false
        },
        'google_translate_element'
      );
      window.setTimeout(() => {
        applyLanguage(getSavedLang(), false);
      }, 120);
    };

    if (document.getElementById('google-translate-script')) return;
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      updateLanguageButtons(getSavedLang());
      console.warn('Google Translate script could not load.');
    };
    document.head.appendChild(script);
  };

  buildLanguageSwitcher();
  setGoogleTranslateCookie(getSavedLang());
  mountGoogleTranslate();
})();
