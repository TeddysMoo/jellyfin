(function() {
  'use strict';

  /* === Stable CSS Blur Layers === */
  const style = document.createElement('style');
  style.textContent = `
    /* Contain blur properly */
    .cardBox.cardBox-bottompadded .cardScalable {
      position: relative;
      overflow: hidden;
      border-radius: 0.2em;
      contain: paint;
    }

    /* Unwatched landscape cards: single consistent blur layer */
    .cardBox.cardBox-bottompadded a.cardImageContainer.coveredImage.cardContent.mf-unwatched::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 1;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.4s ease-out;
    }

    /* Smooth fade-in on page load */
    body.preload-blur .mf-unwatched::after { opacity: 0; transition: none !important; }
    body.ready-blur .mf-unwatched::after  { opacity: 1; }

    /* Structural / existing listItem rules kept */
    .listItem .listItemImage::before { content:''; position:absolute; inset:0; z-index:0; transition:backdrop-filter 0.3s ease; }
    .listItem .listItemImageButton, .listItem .listItemImageButton *, .listItem .material-icons, .listItem .emby-button {
      position:relative; z-index:1; filter:none!important; backdrop-filter:none!important;
    }
    .listItem .listItemImage.blurred::before { backdrop-filter:blur(8px); }
    .listItem .blurred-text { filter:blur(6px); opacity:0.8; transition:filter 0.3s ease,opacity 0.3s ease; }

    /* Next-Up bounded blur remains */
    #itemDetailPage > div.detailPageWrapperContainer >
    div.detailPageSecondaryContainer.padded-bottom-page >
    div > div.nextUpSection.verticalSection.detailVerticalSection >
    div > div > div > div.cardScalable { position:relative; overflow:hidden; border-radius:0.2em; contain:paint; }
    #itemDetailPage > div.detailPageWrapperContainer >
    div.detailPageSecondaryContainer.padded-bottom-page >
    div > div.nextUpSection.verticalSection.detailVerticalSection >
    div > div > div > div.cardScalable > a {
      display:block; filter:blur(10px); border-radius:0.2em; transition:filter 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  /* === Prevent initial flash === */
  document.body.classList.add('preload-blur');
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.body.classList.remove('preload-blur');
      document.body.classList.add('ready-blur');
    }, 500);
  });

  /* === Helper: detect watched state === */
  function isWatched(box) {
    const overlay = box.querySelector('.cardOverlayContainer');
    return Boolean(
      box.querySelector('.playedIndicator, .playstatebutton-played, .playstatebutton-icon-played') ||
      overlay?.querySelector('.playedIndicator, .playstatebutton-played, .playstatebutton-icon-played')
    );
  }

  /* === Apply blur only to qualifying cards === */
  function applyCardBoxBlur() {
    const body = document.body;
    if (!body.classList.contains('force-scroll') ||
        !body.classList.contains('libraryDocument') ||
        body.classList.contains('withSectionTabs')) return;

    const boxes = document.querySelectorAll('.cardBox.cardBox-bottompadded');
    boxes.forEach(box => {
      const anchor = box.querySelector('a.cardImageContainer.coveredImage.cardContent');
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const aspect = rect.width / rect.height;

      // Remove previous state first
      anchor.classList.remove('mf-unwatched');

      // Only add blur if card meets all conditions
      const shouldBlur = aspect > 1.1 && !isWatched(box);
      if (shouldBlur) {
        anchor.classList.add('mf-unwatched');
      }
    });
  }

  /* === Episode & hero blur (unchanged) === */
  function applyEpisodeVisibility() {
    document.querySelectorAll('.listItem').forEach(ep => {
      const hasIndicators = ep.querySelector('.indicators.listItemIndicators');
      const thumbnail = ep.querySelector('.listItemImage');
      const bottomViews = ep.querySelectorAll(
        '.listItem-overview.secondary.listItemBodyText, .listItem-bottomoverview'
      );
      if (hasIndicators) {
        thumbnail?.classList.remove('blurred');
        bottomViews.forEach(el => el.classList.remove('blurred-text'));
      } else {
        thumbnail?.classList.add('blurred');
        bottomViews.forEach(el => {
          if (!el.classList.contains('listItemMediaInfo')) el.classList.add('blurred-text');
        });
      }
    });
  }

  function applyLandscapeBlur() {
    const shouldBlur = !document.body.classList.contains('withSectionTabs');
    const cards = document.querySelectorAll('.cardImageContainer.coveredImage.cardContent');
    let blurredOnce = false;
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      if (shouldBlur && !blurredOnce && aspect > 1.2) {
        card.style.filter = 'blur(10px)';
        card.style.borderRadius = '0.2em';
        blurredOnce = true;
      } else {
        card.style.filter = 'none';
      }
    });
  }

  /* === Refresh all with scroll debounce === */
  let scrollTimeout;
  function refreshAll() {
    applyEpisodeVisibility();
    applyLandscapeBlur();
    applyCardBoxBlur();
  }

  function debouncedRefresh() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(refreshAll, 150);
  }

  /* === Observe DOM changes === */
  function watchForChanges() {
    const observer = new MutationObserver(() => requestAnimationFrame(refreshAll));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style'] });
    refreshAll();

    // Debounce scroll repaint updates
    window.addEventListener('scroll', debouncedRefresh, true);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    watchForChanges();
  } else {
    window.addEventListener('DOMContentLoaded', watchForChanges);
  }
})();
