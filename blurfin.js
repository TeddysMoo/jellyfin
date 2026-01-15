(function () {
  'use strict';

  /***********************
   *  CONFIG
   ***********************/
  const BLUR_PX = 24;

  // Subtle horizontal stretch for blurred thumbs
  // Try: 1.01 → 1.015 → 1.02
  const STRETCH_X = 1.01;

  /***********************
   *  CSS (descriptions only)
   ***********************/
  const style = document.createElement('style');
  style.textContent = `
    .listItem .mf-desc-blur {
      filter: blur(6px);
      opacity: 0.85;
      transition: filter 180ms ease, opacity 180ms ease;
    }
  `;
  document.head.appendChild(style);

  /***********************
   *  Watched detection
   ***********************/
  function isWatchedEpisode(listItem) {
    const btn = listItem.querySelector('button.emby-playstatebutton[data-played]');
    if (btn) return btn.getAttribute('data-played') === 'true';

    if (listItem.querySelector('.playedIndicator, .playstatebutton-played, .playstatebutton-icon-played')) {
      return true;
    }

    const indicators = listItem.querySelector('.indicators.listItemIndicators');
    return Boolean(indicators);
  }

  function isWatchedNextUp(cardEl) {
    const btn = cardEl.querySelector('button.emby-playstatebutton[data-played]');
    if (btn) return btn.getAttribute('data-played') === 'true';

    if (cardEl.querySelector('.playedIndicator, .playstatebutton-played, .playstatebutton-icon-played')) {
      return true;
    }

    return false;
  }

  /***********************
   *  Canvas blur helpers
   ***********************/
  const blurCache = new Map(); // url -> dataUrl or Promise

  function extractBgUrl(el) {
    const bg = (el.style.backgroundImage || getComputedStyle(el).backgroundImage || '').trim();
    if (!bg || bg === 'none') return null;
    const m = bg.match(/^url\((.*)\)$/i);
    if (!m) return null;
    return m[1].trim().replace(/^["']|["']$/g, '');
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function canvasBlurToDataUrl(img, w, h, blurPx) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(w));
    canvas.height = Math.max(1, Math.floor(h));
    const ctx = canvas.getContext('2d');

    // Match background-size: cover
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(canvas.width / iw, canvas.height / ih);

    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;

    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(img, dx, dy, dw, dh);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /***********************
   *  Blur / restore logic
   ***********************/
  async function ensureBlurredBg(el) {
    const originalUrl = extractBgUrl(el);
    if (!originalUrl) return;
    if (el.dataset.mfBlurred === '1') return;

    if (!el.dataset.mfOrigBgSize) {
      const cs = getComputedStyle(el);
      el.dataset.mfOrigBgSize = cs.backgroundSize || '';
      el.dataset.mfOrigBgPos  = cs.backgroundPosition || '';
      el.dataset.mfOrigBgRep  = cs.backgroundRepeat || '';
    }

    const applyStretch = () => {
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center center';
      el.style.backgroundSize = `${(STRETCH_X * 100).toFixed(2)}% 100%`;
    };

    const cached = blurCache.get(originalUrl);

    if (typeof cached === 'string') {
      el.style.backgroundImage = `url("${cached}")`;
      applyStretch();
      el.dataset.mfBlurred = '1';
      el.dataset.mfOriginalBg = originalUrl;
      return;
    }

    if (cached && typeof cached.then === 'function') {
      const dataUrl = await cached;
      el.style.backgroundImage = `url("${dataUrl}")`;
      applyStretch();
      el.dataset.mfBlurred = '1';
      el.dataset.mfOriginalBg = originalUrl;
      return;
    }

    const p = (async () => {
      const img = await loadImage(originalUrl);
      const rect = el.getBoundingClientRect();
      const w = rect.width || img.naturalWidth || 300;
      const h = rect.height || img.naturalHeight || 300;
      return canvasBlurToDataUrl(img, w, h, BLUR_PX);
    })();

    blurCache.set(originalUrl, p);

    try {
      const dataUrl = await p;
      blurCache.set(originalUrl, dataUrl);
      el.style.backgroundImage = `url("${dataUrl}")`;
      applyStretch();
      el.dataset.mfBlurred = '1';
      el.dataset.mfOriginalBg = originalUrl;
    } catch {
      blurCache.delete(originalUrl);
    }
  }

  function restoreOriginalBg(el) {
    const orig = el.dataset.mfOriginalBg;
    if (orig) el.style.backgroundImage = `url("${orig}")`;

    if (el.dataset.mfOrigBgSize !== undefined) el.style.backgroundSize = el.dataset.mfOrigBgSize;
    if (el.dataset.mfOrigBgPos  !== undefined) el.style.backgroundPosition = el.dataset.mfOrigBgPos;
    if (el.dataset.mfOrigBgRep  !== undefined) el.style.backgroundRepeat = el.dataset.mfOrigBgRep;

    el.dataset.mfBlurred = '0';
  }

  /***********************
   *  Apply rules
   ***********************/
  function applyEpisodesList() {
    const items = document.querySelectorAll(
      '#childrenContent .listItem[data-type="Episode"], .listItem[data-type="Episode"]'
    );

    items.forEach(item => {
      const watched = isWatchedEpisode(item);
      const thumb = item.querySelector('.listItemImage');
      const overviewBlocks = item.querySelectorAll(
        '.secondary.listItem-overview.listItemBodyText, .listItem-bottomoverview.secondary'
      );

      overviewBlocks.forEach(el => el.classList.remove('mf-desc-blur'));

      if (thumb && watched) restoreOriginalBg(thumb);

      if (!watched) {
        if (thumb) {
          if (!thumb.dataset.mfOriginalBg) {
            const origUrl = extractBgUrl(thumb);
            if (origUrl) thumb.dataset.mfOriginalBg = origUrl;
          }
          ensureBlurredBg(thumb);
        }

        overviewBlocks.forEach(el => {
          if (!el.classList.contains('listItemMediaInfo')) {
            el.classList.add('mf-desc-blur');
          }
        });
      }
    });
  }

  function applyNextUp() {
    const cards = document.querySelectorAll(
      '.nextUpSection .card[data-type="Episode"], .nextUpSection .card[data-type="Video"]'
    );

    cards.forEach(card => {
      const watched = isWatchedNextUp(card);
      const thumb = card.querySelector('a.cardImageContainer.cardContent');
      if (!thumb) return;

      if (watched) {
        restoreOriginalBg(thumb);
        return;
      }

      if (!thumb.dataset.mfOriginalBg) {
        const origUrl = extractBgUrl(thumb);
        if (origUrl) thumb.dataset.mfOriginalBg = origUrl;
      }

      ensureBlurredBg(thumb);
    });
  }

  function applyAll() {
    applyEpisodesList();
    applyNextUp();
  }

  /***********************
   *  Observe + debounce
   ***********************/
  let rafPending = false;
  function scheduleApply() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      applyAll();
    });
  }

  function watch() {
    const obs = new MutationObserver(scheduleApply);
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-played']
    });

    applyAll();
    window.addEventListener('scroll', scheduleApply, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch, { once: true });
  } else {
    watch();
  }
})();
