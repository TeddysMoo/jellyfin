(function() {
  'use strict';

  // --- Base CSS setup ---
  const style = document.createElement('style');
  style.textContent = `
    /* Structural layer for thumbnails */
    .listItem .listItemImage::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      transition: backdrop-filter 0.3s ease;
    }

    /* Keep overlay buttons/icons above blur */
    .listItem .listItemImageButton,
    .listItem .listItemImageButton *,
    .listItem .material-icons,
    .listItem .emby-button {
      position: relative;
      z-index: 1;
      filter: none !important;
      backdrop-filter: none !important;
    }

    /* Blur for thumbnails when marked as blurred */
    .listItem .listItemImage.blurred::before {
      backdrop-filter: blur(8px);
    }

    /* Blur text description when marked as blurred */
    .listItem .blurred-text {
      filter: blur(6px);
      opacity: 0.8;
      transition: filter 0.3s ease, opacity 0.3s ease;
    }

    /* --- Bounded blur for the Next Up card --- */
    #itemDetailPage > div.detailPageWrapperContainer >
    div.detailPageSecondaryContainer.padded-bottom-page >
    div > div.nextUpSection.verticalSection.detailVerticalSection >
    div > div > div > div.cardScalable {
      position: relative;
      overflow: hidden;
      border-radius: 0.2em;
      contain: paint;
    }

    #itemDetailPage > div.detailPageWrapperContainer >
    div.detailPageSecondaryContainer.padded-bottom-page >
    div > div.nextUpSection.verticalSection.detailVerticalSection >
    div > div > div > div.cardScalable > a {
      display: block;
      filter: blur(10px);
      border-radius: 0.2em;
      transition: filter 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // --- Apply watched/unwatched blur logic for episode list ---
  function applyEpisodeVisibility() {
    const episodes = document.querySelectorAll('.listItem');
    episodes.forEach(ep => {
      const hasIndicators = ep.querySelector('.indicators.listItemIndicators');
      const thumbnail = ep.querySelector('.listItemImage');
      const bottomViews = ep.querySelectorAll(
        '.listItem-overview.secondary.listItemBodyText, .listItem-bottomoverview'
      );

      if (hasIndicators) {
        if (thumbnail) thumbnail.classList.remove('blurred');
        bottomViews.forEach(el => {
          el.classList.remove('blurred-text');
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.minHeight = '';
          el.style.marginBottom = '';
        });
      } else {
        if (thumbnail) thumbnail.classList.add('blurred');
        bottomViews.forEach(el => {
          if (el.classList.contains('listItemMediaInfo')) return;
          el.classList.add('blurred-text');
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.minHeight = '2.5em';
          el.style.marginBottom = '0.5em';
        });
      }
    });
  }

  // --- Blur first landscape card only when body lacks 'withSectionTabs' ---
  function applyLandscapeBlur() {
    const body = document.body;
    const shouldBlur = !body.classList.contains('withSectionTabs');
    const cards = document.querySelectorAll('.cardImageContainer.coveredImage.cardContent');
    let blurredOnce = false;

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const aspect = rect.width / rect.height;

      if (shouldBlur && !blurredOnce && aspect > 1.2) {
        card.style.filter = 'blur(10px)';
        card.style.borderRadius = '0.2em';
        card.style.transition = 'filter 0.3s ease';
        blurredOnce = true;
      } else {
        card.style.filter = 'none';
        card.style.backdropFilter = 'none';
        card.style.opacity = '1';
      }
    });
  }

  // --- Unified refresh for both conditions ---
  function refreshAll() {
    applyEpisodeVisibility();
    applyLandscapeBlur();
  }

  // --- Observe DOM + body class changes ---
  function watchForChanges() {
    // Observe the DOM for new cards or episodes
    const domObserver = new MutationObserver(refreshAll);
    domObserver.observe(document.body, { childList: true, subtree: true });

    // Observe <body> attribute/class changes (to detect navigation)
    const classObserver = new MutationObserver(refreshAll);
    classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Initial run
    refreshAll();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    watchForChanges();
  } else {
    window.addEventListener('DOMContentLoaded', watchForChanges);
  }
})();
