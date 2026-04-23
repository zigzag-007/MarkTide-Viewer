// What's New modal
// Shows a one-time announcement per version to inform users of significant updates.
// Privacy-first: uses localStorage only. No analytics, no network calls.
(function () {
  'use strict';

  const STORAGE_KEY = 'marktide-whats-new-dismissed';
  const CURRENT_VERSION = 'v1.7.9';

  const RELEASE = {
    version: CURRENT_VERSION,
    tagline: 'Smarter code blocks in preview and exported HTML.',
    headline: 'Wrap long lines, clearer controls',
    highlights: [
      {
        icon: 'bi-text-wrap',
        title: 'Wrap / unwrap in preview & HTML export',
        text: 'Long lines in fenced code can soft-wrap or scroll, with a control that only appears when it matters \u2014 same behavior in the live preview and in downloaded HTML.'
      },
      {
        icon: 'bi-chat-square-text',
        title: 'Hints on code actions',
        text: 'Wrap, unwrap, and copy show quick labels on hover (and keyboard focus) so the header stays clean but still self-explanatory.'
      },
      {
        icon: 'bi-filetype-html',
        title: 'Export parity',
        text: 'Exported HTML bundles the wrap control, styling, and scripts so standalone pages feel like the in-app preview.'
      },
      {
        icon: 'bi-text-center',
        title: 'Alignment toggle fix',
        text: 'When the editor falls back to a plain textarea, alignment buttons again remove the wrapper on a second click instead of nesting extra divs.'
      }
    ]
  };

  function getDismissedVersion() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setDismissedVersion(version) {
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch (e) {
      /* ignore storage errors (private mode, disabled, etc.) */
    }
  }

  function shouldShow() {
    return getDismissedVersion() !== RELEASE.version;
  }

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'whats-new-overlay';
    overlay.className = 'whats-new-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'whats-new-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'whats-new-title');
    dialog.setAttribute('aria-describedby', 'whats-new-subtitle');
    dialog.tabIndex = -1;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'whats-new-close';
    closeBtn.setAttribute('aria-label', 'Dismiss what\u2019s new');
    closeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

    const header = document.createElement('div');
    header.className = 'whats-new-header';

    const hero = document.createElement('div');
    hero.className = 'whats-new-hero';
    hero.innerHTML =
      '<span class="whats-new-hero-glow" aria-hidden="true"></span>' +
      '<span class="whats-new-hero-logo" aria-hidden="true">' +
      '<i class="bi bi-markdown"></i>' +
      '<span class="whats-new-hero-sparkle whats-new-hero-sparkle--a"><i class="bi bi-star-fill"></i></span>' +
      '<span class="whats-new-hero-sparkle whats-new-hero-sparkle--b"><i class="bi bi-star-fill"></i></span>' +
      '<span class="whats-new-hero-sparkle whats-new-hero-sparkle--c"><i class="bi bi-star-fill"></i></span>' +
      '</span>';
    header.appendChild(hero);

    const badge = document.createElement('span');
    badge.className = 'whats-new-badge';
    badge.innerHTML = '<i class="bi bi-stars" aria-hidden="true"></i><span>What\u2019s new \u00b7 ' + RELEASE.version + '</span>';

    const title = document.createElement('h2');
    title.id = 'whats-new-title';
    title.className = 'whats-new-title';
    title.textContent = RELEASE.headline;

    const subtitle = document.createElement('p');
    subtitle.id = 'whats-new-subtitle';
    subtitle.className = 'whats-new-subtitle';
    subtitle.textContent = RELEASE.tagline;

    header.appendChild(badge);
    header.appendChild(title);
    header.appendChild(subtitle);

    const list = document.createElement('ul');
    list.className = 'whats-new-list';
    RELEASE.highlights.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'whats-new-item';
      li.innerHTML =
        '<span class="whats-new-item-icon"><i class="bi ' + item.icon + '" aria-hidden="true"></i></span>' +
        '<div class="whats-new-item-body">' +
        '<h3 class="whats-new-item-title"></h3>' +
        '<p class="whats-new-item-text"></p>' +
        '</div>';
      li.querySelector('.whats-new-item-title').textContent = item.title;
      li.querySelector('.whats-new-item-text').textContent = item.text;
      list.appendChild(li);
    });

    const actions = document.createElement('div');
    actions.className = 'whats-new-actions';

    const laterBtn = document.createElement('a');
    laterBtn.className = 'whats-new-link';
    laterBtn.href = 'https://github.com/zigzag-007/MarkTide-Viewer/releases';
    laterBtn.target = '_blank';
    laterBtn.rel = 'noopener noreferrer';
    laterBtn.innerHTML = '<i class="bi bi-github" aria-hidden="true"></i><span>View on GitHub</span>';

    const primaryBtn = document.createElement('button');
    primaryBtn.type = 'button';
    primaryBtn.className = 'whats-new-primary';
    primaryBtn.innerHTML = '<span>Got it</span><i class="bi bi-arrow-right" aria-hidden="true"></i>';

    actions.appendChild(laterBtn);
    actions.appendChild(primaryBtn);

    dialog.appendChild(closeBtn);
    dialog.appendChild(header);
    dialog.appendChild(list);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    const dismiss = function () {
      setDismissedVersion(RELEASE.version);
      hide(overlay);
    };

    closeBtn.addEventListener('click', dismiss);
    primaryBtn.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (evt) {
      if (evt.target === overlay) dismiss();
    });
    document.addEventListener('keydown', function escHandler(evt) {
      if (!overlay.classList.contains('open')) return;
      if (evt.key === 'Escape') {
        evt.stopPropagation();
        dismiss();
      }
    });

    return { overlay: overlay, dialog: dialog, primaryBtn: primaryBtn };
  }

  function show(overlay, dialog, focusTarget) {
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      overlay.classList.add('open');
    });
    setTimeout(function () {
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus({ preventScroll: true });
      }
    }, 240);
  }

  function hide(overlay) {
    if (overlay.classList.contains('closing')) return;
    overlay.classList.add('closing');
    overlay.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      overlay.classList.remove('open');
    }, 20);
    setTimeout(function () {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 520);
  }

  function mount(force) {
    if (!force && !shouldShow()) return;
    if (document.getElementById('whats-new-overlay')) return;
    const built = buildModal();
    document.body.appendChild(built.overlay);
    show(built.overlay, built.dialog, built.primaryBtn);
  }

  function waitForAppReady(callback) {
    const appContainer = document.querySelector('.app-container');
    const loadingScreen = document.getElementById('loading-screen');

    const ready = function () {
      const visible = appContainer && appContainer.style.visibility !== 'hidden';
      const loaderGone = !loadingScreen || loadingScreen.style.display === 'none' || loadingScreen.classList.contains('fade-out');
      return visible || loaderGone;
    };

    if (ready()) {
      setTimeout(callback, 600);
      return;
    }

    const observer = new MutationObserver(function () {
      if (ready()) {
        observer.disconnect();
        setTimeout(callback, 600);
      }
    });

    if (appContainer) {
      observer.observe(appContainer, { attributes: true, attributeFilter: ['style'] });
    }
    if (loadingScreen) {
      observer.observe(loadingScreen, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // Hard fallback so we never block indefinitely.
    setTimeout(function () {
      observer.disconnect();
      callback();
    }, 8000);
  }

  window.MarkTideWhatsNew = {
    show: function () { mount(true); },
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    },
    version: RELEASE.version
  };

  const boot = function () {
    if (!shouldShow()) return;
    waitForAppReady(function () { mount(false); });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
