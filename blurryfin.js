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
      position: relative;      /* create clipping context */
      overflow: hidden;        /* clip the blur */
      border-radius: 0.2em;    /* container corner radius */
      contain: paint;          /* isolate paint area */
    }

    /* Apply the blur to the <a> inside, clipped to parent bounds */
    #itemDetailPage > div.detailPageWrapperContainer >
    div.detailPageSecondaryContainer.padded-bottom-page >
    div > div.nextUpSection.verticalSection.detailVerticalSection >
    div > div > div > div.cardScalable > a {
      display: block;
      filter: blur(10px);
      border-radius: 0.2em;    /* restore lost inherited rounding */
      transition: filter 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // --- Apply visibility & blur logic ---
  function applyEpisodeVisibility() {
    const episodes = document.querySelectorAll('.listItem');

    episodes.forEach(ep => {
      const hasIndicators = ep.querySelector('.indicators.listItemIndicators');
      const thumbnail = ep.querySelector('.listItemImage');
      const bottomViews = ep.querySelectorAll(
      '.listItem-overview.secondary.listItemBodyText, .listItem-bottomoverview'
    );

      if (hasIndicators) {
        // --- Watched episode ---
        if (thumbnail) thumbnail.classList.remove('blurred');
        bottomViews.forEach(el => {
          el.classList.remove('blurred-text');
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.minHeight = '';
          el.style.marginBottom = '';
        });
      } else {
        // --- Unwatched episode ---
        if (thumbnail) thumbnail.classList.add('blurred');
        bottomViews.forEach(el => {
          // Skip the element with media info
          if (el.classList.contains('listItemMediaInfo')) {
            el.classList.remove('blurred-text');
            el.style.filter = 'none';
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            return;
          }

          // Blur everything else
          el.classList.add('blurred-text');
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.minHeight = '2.5em';
          el.style.marginBottom = '0.5em';
        });
      }
    });
  }

  // --- Wait for episodes to appear, then observe for updates ---
  function waitForEpisodes() {
    const interval = setInterval(() => {
      const found = document.querySelectorAll('.listItem').length;
      if (found > 0) {
        clearInterval(interval);
        applyEpisodeVisibility();

        const observer = new MutationObserver(applyEpisodeVisibility);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }, 1000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    waitForEpisodes();
  } else {
    window.addEventListener('DOMContentLoaded', waitForEpisodes);
  }
})();
