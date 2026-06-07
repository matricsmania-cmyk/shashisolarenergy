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

(function nextStyleEnhancements() {
  const ready = () => {
    document.documentElement.classList.add('next-ready');
    document.body.classList.add('next-ready');

    const progress = document.createElement('div');
    progress.className = 'next-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    const updateProgress = () => {
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / scrollMax));
      progress.style.transform = 'scaleX(' + ratio + ')';
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });

    const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('nav a[href], .mobile-drawer-menu a[href]').forEach((link) => {
      const rawHref = link.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('tel:') || rawHref.startsWith('mailto:')) return;

      let linkPath = rawHref.split('#')[0].split('?')[0].split('/').pop().toLowerCase();
      if (!linkPath) linkPath = 'index.html';

      if (linkPath === currentPath) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    document.querySelectorAll('.varanasi-guide-content').forEach((article) => {
      if (article.dataset.nextContentUpgraded === 'true') return;

      const children = Array.from(article.children);
      if (!children.length || children.some((child) => child.classList.contains('next-content-block'))) return;

      const hasSectionHeadings = children.some((child) => child.matches('h2, h3'));
      const hasFaqList = children.some((child) => child.classList.contains('faq-qa-list'));
      if (!hasSectionHeadings && !hasFaqList) return;

      article.classList.add('next-content-stack');

      const groups = [];
      let currentGroup = null;

      children.forEach((child) => {
        const startsSection = child.matches('h2, h3');
        if (startsSection || !currentGroup) {
          currentGroup = document.createElement('section');
          currentGroup.className = 'next-content-block';
          currentGroup.setAttribute('data-card', String(groups.length + 1).padStart(2, '0'));
          groups.push(currentGroup);
        }

        currentGroup.appendChild(child);
      });

      groups.forEach((group) => article.appendChild(group));
      article.dataset.nextContentUpgraded = 'true';
    });

    const setFaqOpen = (item, open) => {
      const button = item.querySelector('.faq-question-button');
      const panel = item.querySelector('.faq-answer-panel');
      if (!button || !panel) return;

      item.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    const setupFaqAccordions = () => {
      const faqItems = [
        ...document.querySelectorAll('.faq-qa-list > li'),
        ...document.querySelectorAll('.faq-item'),
        ...document.querySelectorAll('section[id^="faq-"] [class$="-guide-block"]')
      ];

      faqItems.forEach((item, index) => {
        if (item.dataset.faqAccordion === 'true') return;

        const heading = Array.from(item.children).find((child) => child.matches('h3, h4'));
        if (!heading || heading.querySelector('.faq-question-button')) return;

        const answerNodes = [];
        let next = heading.nextSibling;
        while (next) {
          answerNodes.push(next);
          next = next.nextSibling;
        }

        if (!answerNodes.some((node) => node.nodeType === Node.ELEMENT_NODE || node.textContent.trim())) return;

        const questionId = 'faq-question-' + index + '-' + Math.random().toString(36).slice(2, 8);
        const answerId = 'faq-answer-' + index + '-' + Math.random().toString(36).slice(2, 8);
        const button = document.createElement('button');
        const questionText = document.createElement('span');
        const icon = document.createElement('span');
        const panel = document.createElement('div');
        const inner = document.createElement('div');

        button.type = 'button';
        button.className = 'faq-question-button';
        button.id = questionId;
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', answerId);

        questionText.className = 'faq-question-text';
        while (heading.firstChild) questionText.appendChild(heading.firstChild);

        icon.className = 'faq-toggle-icon';
        icon.setAttribute('aria-hidden', 'true');

        panel.className = 'faq-answer-panel';
        panel.id = answerId;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', questionId);
        panel.setAttribute('aria-hidden', 'true');

        inner.className = 'faq-answer-inner';
        answerNodes.forEach((node) => inner.appendChild(node));
        panel.appendChild(inner);

        button.appendChild(questionText);
        button.appendChild(icon);
        heading.appendChild(button);
        item.appendChild(panel);

        item.classList.add('faq-accordion-item');
        item.dataset.faqAccordion = 'true';

        button.addEventListener('click', () => {
          const shouldOpen = !item.classList.contains('is-open');
          const group = item.closest('.faq-qa-list, .faq-list, section[id^="faq-"]');
          if (group) {
            group.querySelectorAll('.faq-accordion-item.is-open').forEach((openItem) => {
              if (openItem !== item) setFaqOpen(openItem, false);
            });
          }
          setFaqOpen(item, shouldOpen);
        });
      });

      document.querySelectorAll('.faq-qa-list, .faq-list, section[id^="faq-"]').forEach((group) => {
        if (group.dataset.faqDefaultOpen === 'true') return;

        const firstItem = group.querySelector('.faq-accordion-item');
        if (!firstItem) return;

        setFaqOpen(firstItem, true);
        group.dataset.faqDefaultOpen = 'true';
      });
    };

    setupFaqAccordions();

    const revealSelectors = [
      '.hero-content',
      '.hero-feature',
      '.section-title',
      '.card',
      '.blog-card',
      '.location-card',
      '.step',
      '.mission-point',
      '.what-do-item',
      '.team-member',
      '.solar-calc-panel',
      '.solar-calc-stat',
      '.contact-info',
      '.form-wrap',
      '.article-section',
      '.faq-item',
      '.faq-accordion-item',
      '.next-content-block',
      '.google-review-card',
      '.google-review-trust',
      '.discover-services-box'
    ].join(',');

    const revealItems = Array.from(document.querySelectorAll(revealSelectors));
    revealItems.forEach((element, index) => {
      if (element.classList.contains('next-reveal')) return;
      element.classList.add('next-reveal');
      element.style.setProperty('--next-delay', Math.min(index % 5, 4) * 55 + 'ms');
    });

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach((element) => observer.observe(element));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
