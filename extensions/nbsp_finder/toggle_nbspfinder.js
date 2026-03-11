// CODE CREATED BY MAXIMILIANO ZALDUA FOR VML ARGENTINA FORD QA TEAM
// This script scans the webpage for non-breaking space characters (NBSP, Unicode U+00A0)
// It now supports Shadow DOM and has relaxed exclusion filters to find more results.

(function () {
  const TOOL_ID = "nbsp_finder";
  const buttonId = `btn-${TOOL_ID}`;
  const HIGHLIGHT_CLASS = "nbsp-highlight-container";

  const EXCLUDED_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "HEAD",
    "LINK",
    "META",
    "NOSCRIPT",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "TEMPLATE",
    "SVG",
    "FOOTER",
    "HEADER",
  ]);

  const EXCLUDED_CODE_TAGS = new Set([
    "CODE",
    "PRE",
    "KBD",
    "SAMP",
    "XMP",
    "TEXTAREA",
  ]);

  const EXCLUDED_SECTION_TAGS = new Set([]);
  const EXCLUDED_CLASS_PATTERNS = [
    /syntax/i,
    /monaco/i,
    /ace[-_ ]editor/i,
    /hljs/i,
    /prism/i,
  ];

  function getContext(el) {
    const heading = el
      .closest('section, [id^="section-"], main')
      ?.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading)
      return `Section: ${heading.textContent.trim().substring(0, 25)}...`;

    const container = el.closest("[id], [class]");
    if (container) {
      const id = container.id ? `#${container.id}` : "";
      const cls =
        container.className && typeof container.className === "string"
          ? `.${container.className.split(" ")[0]}`
          : "";
      return id || cls || "Container";
    }
    return "General Content";
  }

  function isInExcludedContainer(el) {
    let current = el;
    while (current && current.tagName !== "HTML") {
      const cls = (current.className || "").toString();
      const role = (current.getAttribute?.("role") || "").toLowerCase();

      const isExcluded =
        EXCLUDED_TAGS.has(current.tagName) ||
        EXCLUDED_CODE_TAGS.has(current.tagName) ||
        EXCLUDED_SECTION_TAGS.has(current.tagName) ||
        ["menubar", "toolbar", "footer"].includes(role) ||
        EXCLUDED_CLASS_PATTERNS.some((rx) => rx.test(cls));

      if (isExcluded) return true;
      current = current.parentElement;
    }
    return false;
  }

  function clearPreviousHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((span) => {
      const text = span.textContent.replace(/\[NBSP\]/g, "\u00A0");
      span.replaceWith(document.createTextNode(text));
    });
  }

  function findNBSPNodes(
    root,
    results = [],
    targets = [],
    idCounter = { val: 1 },
  ) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    let node;

    const RELEVANT_CONTENT_TAGS = new Set([
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "LI",
      "SPAN",
      "A",
      "B",
      "STRONG",
      "EM",
    ]);

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (
        !parent ||
        isInExcludedContainer(parent) ||
        parent.classList.contains(HIGHLIGHT_CLASS)
      )
        continue;

      if (!RELEVANT_CONTENT_TAGS.has(parent.tagName)) continue;

      const content = node.textContent;

      if (content.includes("\u00A0")) {
        const currentId = idCounter.val++;
        targets.push({ node, text: content, id: currentId });
        results.push({
          id: currentId,
          tag: parent.tagName,
          context: getContext(parent),
          snippet: content
            .replace(/\u00A0/g, "[NBSP]")
            .trim()
            .substring(0, 50),
        });
      }
    }

    const elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
    elements.forEach((el) => {
      if (el.shadowRoot) {
        findNBSPNodes(el.shadowRoot, results, targets, idCounter);
      }
    });

    return { results, targets };
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "scroll_to_nbsp" && request.elementId) {
      const el = document.getElementById(request.elementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "outline 0.3s ease";
        el.style.outline = "4px solid #f44336";
        setTimeout(() => {
          el.style.outline = "none";
        }, 2000);
      }
    }
  });

  function scanAndHighlight() {
    clearPreviousHighlights();
    const { results, targets } = findNBSPNodes(document.body);

    targets.forEach(({ node, text, id }) => {
      if (!node.parentNode) return;

      const wrapper = document.createElement("span");
      wrapper.id = `nbsp-element-${id}`;
      wrapper.className = HIGHLIGHT_CLASS;

      text.split("\u00A0").forEach((part, index, arr) => {
        wrapper.appendChild(document.createTextNode(part));
        if (index < arr.length - 1) {
          const badge = document.createElement("span");
          badge.style.cssText =
            "background: #ffdcfa; border: 1px solid #f436b1; color: #f436b1; font-weight: bold; padding: 0 2px; border-radius: 2px; font-size: 0.8em; margin: 0 2px;";
          badge.textContent = "[NBSP]";
          wrapper.appendChild(badge);
        }
      });
      node.parentNode.replaceChild(wrapper, node);
    });

    const finalData = {
      action: results.length > 0 ? "export_data" : "export_error",
      data: results,
      tool: TOOL_ID,
      buttonId: buttonId,
    };

    chrome.runtime.sendMessage(finalData);
    return finalData;
  }

  return scanAndHighlight();
})();
