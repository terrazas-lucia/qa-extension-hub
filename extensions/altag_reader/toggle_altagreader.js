// CODE CREATED BY JULIANA HORTAL FOR VML ARGENTINA FORD QA TEAM
// Toggles visibility of alt text for images and videos on the page.

(function () {
  const TOOL_ID = "altag_reader";
  const GLOBAL_STATE_VAR = `__${TOOL_ID}Toggled`;
  const HIGHLIGHT_CLASS = "qa-alt-highlight";
  const BADGE_CLASS = "qa-alt-floating-badge";

  window[GLOBAL_STATE_VAR] =
    typeof window[GLOBAL_STATE_VAR] === "undefined"
      ? true
      : !window[GLOBAL_STATE_VAR];
  const isActivating = window[GLOBAL_STATE_VAR];

  if (!window.__alt_activePairs) window.__alt_activePairs = new Map();
  if (!window.__alt_observer) window.__alt_observer = null;

  const VIDEO_WRAPPERS = [
    "video-js",
    ".video.brightCove-video",
    ".vjs-tech",
    '[id^="fgx-bc-player-container"]',
    ".video.akamai-video",
    ".akamai-player",
    ".video.dash-video",
    ".dashjs-player",
    "video",
  ];

  function createBadge(el) {
    if (window.__alt_activePairs.has(el) || el.closest("header")) return;

    el.classList.add(HIGHLIGHT_CLASS);
    const altText = el.getAttribute("alt");
    const ariaLabel = el.getAttribute("aria-label");

    const label = document.createElement("div");
    label.className = BADGE_CLASS;

    let statusText =
      el.tagName === "VIDEO" || VIDEO_WRAPPERS.some((sel) => el.matches(sel))
        ? ariaLabel || "Video"
        : altText === null
          ? "MISSING"
          : altText.trim() === ""
            ? "EMPTY"
            : altText;

    label.innerHTML = `ALT: ${statusText} <span class="alt-char-count">[Chars: ${statusText.length}]</span>`;

    if (statusText === "MISSING") label.style.backgroundColor = "#c62828";
    else if (statusText === "EMPTY") label.style.backgroundColor = "#6a1b9a";

    document.body.appendChild(label);
    window.__alt_activePairs.set(el, label);
  }

  function toggleAltReader() {
    const selectors = "img, video, " + VIDEO_WRAPPERS.join(", ");

    if (isActivating) {
      if (!document.getElementById("alt-reader-style")) {
        const style = document.createElement("style");
        style.id = "alt-reader-style";
        style.textContent = `
          .${HIGHLIGHT_CLASS} { outline: 3px solid #f06292 !important; outline-offset: -3px !important; }
          .${BADGE_CLASS} {
            position: fixed !important;
            background-color: #f06292 !important;
            color: white !important;
            font-family: 'Segoe UI', sans-serif !important;
            font-weight: bold !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            display: none;
            padding: 4px 8px !important;
            border-radius: 4px !important;
            font-size: 11px !important;
          }
          .alt-size-small { font-size: 9px !important; padding: 2px 6px !important; max-width: 120px !important; }
          .alt-char-count { display: block; font-size: 9px; opacity: 0.9; border-top: 1px solid rgba(255,255,255,0.3); margin-top: 2px; }
        `;
        document.head.appendChild(style);
      }

      document.querySelectorAll(selectors).forEach(createBadge);

      window.__alt_observer = new MutationObserver((mutations) => {
        mutations.forEach((m) =>
          m.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.matches(selectors)) createBadge(node);
              node.querySelectorAll?.(selectors).forEach(createBadge);
            }
          }),
        );
      });
      window.__alt_observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      const syncPositions = () => {
        if (!window[GLOBAL_STATE_VAR]) return;

        window.__alt_activePairs.forEach((badge, target) => {
          const rect = target.getBoundingClientRect();
          let isVisible =
            rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 2;

          if (isVisible) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const elAtPoint = document.elementFromPoint(centerX, centerY);

            if (
              elAtPoint &&
              !target.contains(elAtPoint) &&
              !elAtPoint.contains(target)
            ) {
              const style = window.getComputedStyle(elAtPoint);
              const commonContainer = target.closest(
                '.modal, [class*="overlay"], .teaser, .card, .component',
              );
              const isSameContext =
                commonContainer && commonContainer.contains(elAtPoint);

              const isText = [
                "H1",
                "H2",
                "H3",
                "H4",
                "H5",
                "H6",
                "P",
                "SPAN",
                "A",
              ].includes(elAtPoint.tagName);
              const isDecorative =
                style.pointerEvents === "none" ||
                parseFloat(style.opacity) < 0.4;

              if (!isSameContext && !isText && !isDecorative) {
                isVisible = false;
              }
            }
          }

          if (isVisible) {
            badge.style.display = "block";
            badge.style.top = `${rect.top}px`;
            badge.style.left = `${rect.left}px`;
            badge.classList.toggle("alt-size-small", rect.width < 300);
          } else {
            badge.style.display = "none";
          }
        });
        requestAnimationFrame(syncPositions);
      };
      syncPositions();
    } else {
      if (window.__alt_observer) window.__alt_observer.disconnect();
      window.__alt_activePairs.forEach((badge, target) => {
        target.classList.remove(HIGHLIGHT_CLASS);
        badge.remove();
      });
      window.__alt_activePairs.clear();
      const styleTag = document.getElementById("alt-reader-style");
      if (styleTag) styleTag.remove();
    }
  }
  toggleAltReader();
})();
