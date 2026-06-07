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

(function premiumMobileNavigation() {
  const ready = () => {
    const button = document.querySelector('.mobile-menu-btn');
    const drawer = document.querySelector('#mobileDrawer, .mobile-drawer');
    if (!button || !drawer) return;

    const panel = drawer.querySelector('.mobile-drawer-panel');
    const head = drawer.querySelector('.mobile-drawer-head');
    const menu = drawer.querySelector('.mobile-drawer-menu');
    const overlay = drawer.querySelector('.mobile-drawer-overlay');
    const closeButton = drawer.querySelector('.mobile-drawer-close');

    const setDrawerInert = (isInert) => {
      try {
        drawer.inert = isInert;
      } catch (_err) {}

      if (isInert) drawer.setAttribute('inert', '');
      else drawer.removeAttribute('inert');
    };

    const closeMenu = (restoreFocus = true) => {
      if (!document.body.classList.contains('mobile-menu-active')) return;

      document.body.classList.remove('mobile-menu-active');
      drawer.setAttribute('aria-hidden', 'true');
      button.setAttribute('aria-expanded', 'false');
      setDrawerInert(true);

      if (restoreFocus && drawer.contains(document.activeElement)) {
        button.focus({ preventScroll: true });
      }
    };

    const openMenu = () => {
      document.body.classList.add('mobile-menu-active');
      drawer.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-expanded', 'true');
      setDrawerInert(false);

      if (panel) panel.scrollTop = 0;
      window.setTimeout(() => {
        const target = closeButton || drawer.querySelector('a[href], button');
        if (target) target.focus({ preventScroll: true });
      }, 120);
    };

    const toggleMenu = () => {
      if (document.body.classList.contains('mobile-menu-active')) closeMenu();
      else openMenu();
    };

    if (!button.querySelector('.mobile-menu-lines')) {
      button.innerHTML = [
        '<span class="mobile-menu-lines" aria-hidden="true"><span></span><span></span><span></span></span>',
        '<span class="mobile-menu-label">Menu</span>'
      ].join('');
    }

    if (drawer.id) button.setAttribute('aria-controls', drawer.id);
    drawer.setAttribute('aria-hidden', document.body.classList.contains('mobile-menu-active') ? 'false' : 'true');
    button.setAttribute('aria-expanded', document.body.classList.contains('mobile-menu-active') ? 'true' : 'false');
    if (!document.body.classList.contains('mobile-menu-active')) setDrawerInert(true);

    if (head && !head.querySelector('.mobile-drawer-brand')) {
      const brand = document.createElement('div');
      brand.className = 'mobile-drawer-brand';
      brand.innerHTML = [
        '<span class="mobile-drawer-brand-mark" aria-hidden="true">S</span>',
        '<span class="mobile-drawer-brand-copy"><strong>Shashi Solar</strong><small>Clean energy menu</small></span>'
      ].join('');
      head.insertBefore(brand, closeButton || head.firstChild);
    }

    if (menu) {
      const serviceDefs = [
        { match: 'on-grid-solar-system', label: 'On Grid Solar System', href: 'on-grid-solar-system.html' },
        { match: 'hybrid-solar-system', label: 'Hybrid Solar System', href: 'hybrid-solar-system.html' },
        { match: 'solar-atta-chakki', label: 'Solar Atta Chakki', href: 'solar-atta-chakki.html' }
      ];

      if (!menu.querySelector('.mobile-services-item')) {
        const topLevelItems = Array.from(menu.children).filter((child) => child.matches('li'));
        const serviceItems = serviceDefs
          .map((service) => topLevelItems.find((item) => {
            const link = item.querySelector('a[href]');
            return link && (link.getAttribute('href') || '').includes(service.match);
          }))
          .filter(Boolean);

        const homeItem = topLevelItems.find((item) => {
          const link = item.querySelector('a[href]');
          const href = link ? link.getAttribute('href') || '' : '';
          return href.includes('index.html') || href === './' || href === '/';
        });

        const servicesItem = document.createElement('li');
        servicesItem.className = 'mobile-services-item';

        const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const isServicePage = serviceDefs.some((service) => currentPath.includes(service.match));

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'mobile-services-toggle';
        toggle.setAttribute('aria-expanded', isServicePage ? 'true' : 'false');
        toggle.innerHTML = '<span>Services</span>';

        const submenu = document.createElement('ul');
        submenu.className = 'mobile-services-submenu';
        submenu.setAttribute('aria-label', 'Solar services');

        serviceDefs.forEach((service) => {
          const originalItem = serviceItems.find((item) => {
            const link = item.querySelector('a[href]');
            return link && (link.getAttribute('href') || '').includes(service.match);
          });
          const originalLink = originalItem ? originalItem.querySelector('a[href]') : null;
          const link = originalLink ? originalLink.cloneNode(true) : document.createElement('a');

          link.href = originalLink ? originalLink.getAttribute('href') : service.href;
          link.textContent = service.label;

          const submenuItem = document.createElement('li');
          submenuItem.appendChild(link);
          submenu.appendChild(submenuItem);
        });

        servicesItem.classList.toggle('is-open', isServicePage);
        servicesItem.appendChild(toggle);
        servicesItem.appendChild(submenu);

        if (homeItem && homeItem.nextSibling) {
          menu.insertBefore(servicesItem, homeItem.nextSibling);
        } else {
          menu.insertBefore(servicesItem, menu.firstChild);
        }

        serviceItems.forEach((item) => item.remove());

        toggle.addEventListener('click', () => {
          const shouldOpen = !servicesItem.classList.contains('is-open');
          servicesItem.classList.toggle('is-open', shouldOpen);
          toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        });
      }

      if (!menu.querySelector('.mobile-drawer-cta')) {
        const callItem = document.createElement('li');
        callItem.className = 'mobile-drawer-cta mobile-drawer-cta-call';
        callItem.innerHTML = '<a href="tel:+9194258575">Call Solar Expert</a>';

        const whatsappItem = document.createElement('li');
        whatsappItem.className = 'mobile-drawer-cta mobile-drawer-cta-whatsapp';
        whatsappItem.innerHTML = '<a href="https://wa.me/9194258575?text=Hi%20Shashi%20Solar%20Energy%2C%20I%20want%20a%20solar%20quotation." target="_blank" rel="noopener">WhatsApp Inquiry</a>';

        menu.appendChild(callItem);
        menu.appendChild(whatsappItem);
      }

      Array.from(menu.querySelectorAll('a[href]')).forEach((link, index) => {
        link.style.setProperty('--mobile-item-index', String(index));
      });

      menu.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        closeMenu(false);
      }, true);
    }

    if (drawer.dataset.premiumMobileBound !== 'true') {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleMenu();
      }, true);

      if (overlay) {
        overlay.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeMenu();
        }, true);
      }

      if (closeButton) {
        closeButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeMenu();
        }, true);
      }

      document.addEventListener('keydown', (event) => {
        if (!document.body.classList.contains('mobile-menu-active')) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          closeMenu();
          return;
        }

        if (event.key !== 'Tab' || !panel) return;

        const focusable = Array.from(panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
          .filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }, true);

      window.addEventListener('resize', () => {
        if (window.innerWidth > 1080) closeMenu(false);
      }, { passive: true });

      drawer.dataset.premiumMobileBound = 'true';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
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
