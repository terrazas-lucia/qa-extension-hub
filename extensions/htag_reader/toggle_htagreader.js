(function () {
  const TOOL_ID = "htag_reader";
  const GLOBAL_STATE_VAR = "__htag_readerToggled";
  const HIGHLIGHT_CLASS = "qa-heading-highlight-active";
  const INDICATOR_CLASS = "qa-heading-indicator-8472";

  window[GLOBAL_STATE_VAR] =
    typeof window[GLOBAL_STATE_VAR] === "undefined"
      ? true
      : !window[GLOBAL_STATE_VAR];
  const isActivating = window[GLOBAL_STATE_VAR];

  if (!window.__htag_activePairs) window.__htag_activePairs = new Map();
  if (!window.__htag_observer) window.__htag_observer = null;

  function createBadge(htag) {
    if (window.__htag_activePairs.has(htag)) return;

    const tag = htag.tagName.toLowerCase();
    const isHTag = tag.startsWith("h");
    htag.classList.add(HIGHLIGHT_CLASS);
    htag.classList.add(isHTag ? "qa-theme-pink" : "qa-theme-purple");

    const indicator = document.createElement("span");
    indicator.className = `${INDICATOR_CLASS} ${isHTag ? "badge-pink" : "badge-purple"}`;
    indicator.textContent = isHTag ? tag.toUpperCase() : "P-TAG";

    document.body.appendChild(indicator);
    window.__htag_activePairs.set(htag, indicator);
  }

  function toggleHeadings() {
    const targetTags = ["H1", "H2", "H3", "H4", "H5", "H6", "P"];
    const PINK = "#ff00bb";
    const PURPLE = "#9c27b0";

    if (isActivating) {
      if (!document.getElementById("heading-highlighter-style")) {
        const style = document.createElement("style");
        style.id = "heading-highlighter-style";
        style.textContent = `
                .${HIGHLIGHT_CLASS} {
                    outline-width: 2px !important;
                    outline-style: solid !important;
                    outline-offset: 4px !important; 
                    pointer-events: none !important;
                }
                /* Specific color themes */
                .qa-theme-pink { 
                    outline-color: ${PINK} !important; 
                    background-color: rgba(255, 0, 187, 0.08) !important; 
                }
                .qa-theme-purple { 
                    outline-color: ${PURPLE} !important; 
                    background-color: rgba(156, 39, 176, 0.08) !important; 
                }

                .${INDICATOR_CLASS} {
                    position: fixed;
                    color: white;
                    font-size: 13px;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-weight: 800;
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid white;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                    pointer-events: none !important;
                    z-index: 2147483647 !important;
                    display: none;
                    white-space: nowrap;
                    text-transform: uppercase;
                }
                .badge-pink { background-color: ${PINK} !important; }
                .badge-purple { background-color: ${PURPLE} !important; }
            `;
        document.head.appendChild(style);
      }

      document.querySelectorAll(targetTags.join(",")).forEach(createBadge);

      window.__htag_observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (targetTags.includes(node.tagName)) createBadge(node);
              node
                .querySelectorAll?.(targetTags.join(","))
                .forEach(createBadge);
            }
          });
        });
      });

      window.__htag_observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      const syncPositions = () => {
        if (!window[GLOBAL_STATE_VAR]) return;

        window.__htag_activePairs.forEach((badge, target) => {
          const rect = target.getBoundingClientRect();
          const isInViewport =
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0;

          if (!isInViewport || rect.width === 0) {
            badge.style.display = "none";
            return;
          }

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const elementsAtPoint = document.elementsFromPoint(centerX, centerY);

          let isObscured = true;
          for (const el of elementsAtPoint) {
            if (el === target || target.contains(el)) {
              isObscured = false;
              break;
            }
            const style = window.getComputedStyle(el);
            if (
              parseFloat(style.opacity) < 0.1 ||
              style.pointerEvents === "none"
            )
              continue;
            if (!el.contains(target)) break;
            else {
              isObscured = false;
              break;
            }
          }

          if (!isObscured) {
            badge.style.display = "block";

            const badgeWidth = badge.offsetWidth || 55;
            const horizontalGap = 15;
            let leftPos = rect.left - (badgeWidth + horizontalGap);

            if (leftPos < 5) {
              leftPos = rect.left + 8;
            }

            badge.style.top = `${rect.top}px`;
            badge.style.left = `${leftPos}px`;
          } else {
            badge.style.display = "none";
          }
        });
        requestAnimationFrame(syncPositions);
      };

      syncPositions();
    } else {
      if (window.__htag_observer) window.__htag_observer.disconnect();
      window.__htag_activePairs.forEach((badge, target) => {
        target.classList.remove(
          HIGHLIGHT_CLASS,
          "qa-theme-pink",
          "qa-theme-purple",
        );
        badge.remove();
      });
      window.__htag_activePairs.clear();
      const styleTag = document.getElementById("heading-highlighter-style");
      if (styleTag) styleTag.remove();
    }

    chrome.runtime.sendMessage({
      type: "domcleaner-state",
      tool: "htag_reader",
      state: isActivating ? "cleaned" : "reverted",
      buttonId: "btn-htag_reader",
    });
  }

  toggleHeadings();
})();
