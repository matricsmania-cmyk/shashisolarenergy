(function siteLanguageSwitcher() {
  const STORAGE_KEY = 'shashi_site_language';
  const ORIGINAL_LANG = 'en';
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGS = new Set(['en', 'hi']);
  const RETRY_LIMIT = 12;
  const RETRY_DELAY_MS = 120;

  let latestRequestedLang = DEFAULT_LANG;
  let translateScriptPromise = null;

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

  const getSavedLang = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED_LANGS.has(stored) ? stored : DEFAULT_LANG;
    } catch (_err) {
      return DEFAULT_LANG;
    }
  };

  const updateLanguageButtons = (langCode) => {
    document.querySelectorAll('.site-language-btn').forEach((button) => {
      const code = button.getAttribute('data-lang');
      button.classList.toggle('is-active', code === langCode);
    });
  };

  const ensureTranslateContainer = () => {
    if (document.getElementById('google_translate_element')) return;
    const container = document.createElement('div');
    container.id = 'google_translate_element';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  };

  const triggerComboTranslate = (langCode, attempt = 0) => {
    const combo = document.querySelector('select.goog-te-combo');
    if (!combo) {
      if (attempt < RETRY_LIMIT) {
        window.setTimeout(() => triggerComboTranslate(langCode, attempt + 1), RETRY_DELAY_MS);
      }
      return;
    }

    const nextValue = langCode === 'hi' ? 'hi' : 'en';
    if (combo.value !== nextValue) {
      combo.value = nextValue;
      combo.dispatchEvent(new Event('change', { bubbles: true }));
      combo.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const loadGoogleTranslate = () => {
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
      return Promise.resolve();
    }

    if (translateScriptPromise) return translateScriptPromise;

    translateScriptPromise = new Promise((resolve, reject) => {
      window.googleTranslateElementInit = function () {
        if (!window.google || !google.translate || !google.translate.TranslateElement) {
          reject(new Error('Google Translate API unavailable.'));
          return;
        }

        new google.translate.TranslateElement(
          {
            pageLanguage: ORIGINAL_LANG,
            includedLanguages: 'en,hi',
            autoDisplay: false
          },
          'google_translate_element'
        );

        resolve();
      };

      if (document.getElementById('google-translate-script')) return;

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        translateScriptPromise = null;
        reject(new Error('Google Translate script failed to load.'));
      };
      document.head.appendChild(script);
    });

    return translateScriptPromise;
  };

  const applyLanguage = async (langCode, persistChoice) => {
    if (!SUPPORTED_LANGS.has(langCode)) return;

    latestRequestedLang = langCode;
    if (persistChoice) {
      try { localStorage.setItem(STORAGE_KEY, langCode); } catch (_err) {}
    }

    updateLanguageButtons(langCode);
    setGoogleTranslateCookie(langCode);

    if (langCode === 'en') {
      triggerComboTranslate('en', 0);
      return;
    }

    ensureTranslateContainer();
    try {
      await loadGoogleTranslate();
      if (latestRequestedLang !== langCode) return;
      triggerComboTranslate(langCode, 0);
    } catch (_err) {
      console.warn('Language switch failed:', _err);
    }
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

    wrap.querySelectorAll('.site-language-btn').forEach((button) => {
      const langCode = button.getAttribute('data-lang');
      button.addEventListener('click', () => {
        applyLanguage(langCode, true);
      });
    });

    document.body.appendChild(wrap);
  };

  buildLanguageSwitcher();

  const savedLang = getSavedLang();
  updateLanguageButtons(savedLang);

  const loadHindiOnFirstInteraction = () => {
    let loaded = false;
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    const opts = { passive: true };

    const trigger = () => {
      if (loaded) return;
      loaded = true;
      events.forEach((eventName) => window.removeEventListener(eventName, trigger, opts));
      applyLanguage('hi', false);
    };

    events.forEach((eventName) => window.addEventListener(eventName, trigger, opts));
  };

  // Keep initial page fast: never boot Google Translate during first paint.
  if (savedLang === 'hi') {
    setGoogleTranslateCookie('hi');
    loadHindiOnFirstInteraction();
  } else {
    setGoogleTranslateCookie('en');
  }
})();
