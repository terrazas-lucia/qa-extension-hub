(function () {
  const stateVar = "__cta_checkerToggled";
  const boxRegistry = [];
  const masterData = new Map();
  const boxWidth = 260;
  const boxHeight = 110;
  const visibleCtas = new Set();
  let floatingBoxesVisible = true;

  const startTime = performance.now();
  let scanFinished = false;
  let totalScanTime = 0;
  let pendingInitialChecks = 0;
  let initialDiscoveryDone = false;

  if (window[stateVar]) {
    document
      .querySelectorAll(".cta-info-floating-box, .cta-summary-banner")
      .forEach((el) => el.remove());
    if (window._ctaMutationObserver) window._ctaMutationObserver.disconnect();
    if (window._ctaIntersectionObserver)
      window._ctaIntersectionObserver.disconnect();
    window[stateVar] = false;
    return;
  }

  window[stateVar] = true;

  setTimeout(() => {
    if (!scanFinished) finishScan();
  }, 8000);

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  function getCtaSection(cta) {
    const section = cta.closest(
      '.cmp-kbaBar, .kba-container, .modal-content, [role="dialog"], section, nav, footer, header, .secondary-navigation',
    );
    if (!section) return "Main Body";
    let name =
      section.id ||
      section.className.split(" ")[0] ||
      section.tagName.toLowerCase();
    return name.replace(/-/g, " ").toUpperCase();
  }

  function getLinkElements() {
    const selectors = ["a[href]", "button[data-url]", ".button a", ".cta a"];
    return Array.from(document.querySelectorAll(selectors.join(","))).filter(
      (cta) => {
        if (
          cta.closest(".cta-info-floating-box") ||
          cta.closest(".cta-summary-banner")
        )
          return false;
        let href = (
          cta.getAttribute("href") ||
          cta.getAttribute("data-url") ||
          ""
        ).trim();
        return (
          href !== "" &&
          href !== "#" &&
          !href.startsWith("#$") &&
          !href.startsWith("javascript:")
        );
      },
    );
  }

  window._ctaIntersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleCtas.add(entry.target);
        else visibleCtas.delete(entry.target);
      });
      requestAnimationFrame(() => refreshPositions());
    },
    { threshold: 0.1 },
  );

  function discoverCtas() {
    const currentCtas = getLinkElements();
    let foundNew = false;
    currentCtas.forEach((cta) => {
      if (!masterData.has(cta)) {
        const href = (
          cta.getAttribute("href") ||
          cta.getAttribute("data-url") ||
          "EMPTY"
        ).trim();
        const ariaLabel =
          (cta.getAttribute("aria-label") || cta.innerText || "").trim() ||
          "MISSING";
        const sectionName = getCtaSection(cta);
        const isKba = cta.closest('[class*="kba"], .cmp-kbaBar');
        const ariaErr =
          ariaLabel.toLowerCase().startsWith("click to") ||
          ariaLabel === "MISSING"
            ? "YES"
            : "NO";

        masterData.set(cta, {
          section: (isKba ? "KBA: " : "") + sectionName,
          label: ariaLabel,
          url: href,
          status: "Checking...",
          statusCode: 0,
          ariaError: ariaErr,
        });

        if (!scanFinished) pendingInitialChecks++;
        createBoxForCta(cta);
        window._ctaIntersectionObserver.observe(cta);
        foundNew = true;
      }
    });

    if (!initialDiscoveryDone) {
      initialDiscoveryDone = true;
      if (pendingInitialChecks === 0) finishScan();
    }
    if (foundNew) updateBanner();
  }

  function finishScan() {
    if (scanFinished) return;
    scanFinished = true;
    totalScanTime = ((performance.now() - startTime) / 1000).toFixed(1);
    updateBanner();
  }

  function refreshPositions(forceReset = false) {
    if (!floatingBoxesVisible) return;
    const occupiedCoordinates = [];
    boxRegistry.forEach((entry) => {
      const { element, targetCta } = entry;
      if (!targetCta.isConnected) {
        element.style.display = "none";
        return;
      }
      const rect = targetCta.getBoundingClientRect();
      if (
        !visibleCtas.has(targetCta) ||
        rect.width === 0 ||
        rect.top > window.innerHeight ||
        rect.bottom < 0
      ) {
        element.style.display = "none";
        return;
      }
      element.style.display = "block";
      if (entry.manuallyMoved && !forceReset) return;

      let currentTop = rect.top + window.scrollY - (boxHeight - 10);
      let currentLeft = rect.left + window.scrollX;

      let overlap = true;
      let iterations = 0;
      while (overlap && iterations < 3) {
        overlap = occupiedCoordinates.some(
          (c) =>
            Math.abs(c.top - currentTop) < boxHeight - 20 &&
            Math.abs(c.left - currentLeft) < 50,
        );
        if (overlap) currentTop -= boxHeight + 5;
        iterations++;
      }
      element.style.transform = `translate3d(${currentLeft}px, ${currentTop}px, 0)`;
      occupiedCoordinates.push({ top: currentTop, left: currentLeft });
    });
  }

  function createBoxForCta(cta) {
    const data = masterData.get(cta);
    cta.style.outline =
      data.ariaError === "YES" ? "3px dashed #ff5252" : "2px solid #00aced";

    const overlay = document.createElement("div");
    overlay.className = "cta-info-floating-box";
    Object.assign(overlay.style, {
      position: "absolute",
      top: "0",
      left: "0",
      backgroundColor: "#ffffff",
      color: "#333366",
      fontSize: "11px",
      padding: "10px",
      borderLeft: `4px solid ${data.ariaError === "YES" ? "#ff5252" : "#7e57c2"}`,
      zIndex: "2147483647",
      width: `${boxWidth}px`,
      borderRadius: "8px",
      display: "none",
      pointerEvents: "auto",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e0e0f8",
      fontFamily: "'Inter', sans-serif",
    });

    overlay.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom:5px; border-bottom:1px solid #e0e0f8; padding-bottom: 5px;">
                <strong style="color: #4a148c;">${data.section}</strong>
                <button class="copy-btn" style="background:#d1c4e9; color:#333366; border:none; border-radius: 4px; font-size:9px; cursor:pointer; font-weight: 600; padding: 2px 6px;">COPY</button>
            </div>
            <div style="margin-bottom: 3px;">Label: <b>${data.label}</b></div>
            <div style="word-break: break-all; color:#665c8a; font-size: 10px;">URL: ${data.url}</div>
            <div style="margin-top: 5px; font-weight: bold;">Status: <span class="status-text">...</span></div>
        `;

    document.body.appendChild(overlay);
    const registryEntry = {
      element: overlay,
      targetCta: cta,
      manuallyMoved: false,
    };
    boxRegistry.push(registryEntry);

    overlay.style.cursor = "move";
    overlay.addEventListener("mousedown", (e) => {
      if (e.target.closest(".copy-btn")) return;
      registryEntry.manuallyMoved = true;
      const matrix = new DOMMatrixReadOnly(
        window.getComputedStyle(overlay).transform,
      );
      const startX = e.clientX - matrix.m41;
      const startY = e.clientY - matrix.m42;
      const onMove = (m) =>
        (overlay.style.transform = `translate3d(${m.clientX - startX}px, ${m.clientY - startY}px, 0)`);
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    overlay.querySelector(".copy-btn").onclick = () =>
      navigator.clipboard.writeText(data.url);

    const decrementAndCheck = () => {
      if (!scanFinished) {
        pendingInitialChecks--;
        if (pendingInitialChecks <= 0) finishScan();
      }
    };

    if (data.url && (data.url.startsWith("http") || data.url.startsWith("/"))) {
      const absUrl = new URL(data.url, window.location.origin).href;
      chrome.runtime.sendMessage(
        { action: "check_link_status", url: absUrl },
        (res) => {
          if (!res) return;

          const statusSpan = overlay.querySelector(".status-text");
          const code = res.status;

          data.statusCode = code;

          if (code >= 400 || code === "Error") {
            data.status = code + " Error";
          } else if (code >= 300 || code === 301) {
            data.status = "301 Redirect";
          } else {
            data.status = "200 OK";
          }

          if (statusSpan) {
            statusSpan.textContent = data.status;
            statusSpan.style.color =
              code >= 400 ? "#e53935" : code >= 300 ? "#f57f17" : "#4caf50";
          }

          decrementAndCheck();
          updateBanner();
        },
      );
    } else {
      data.status = "Internal/Special";
      data.statusCode = 200;
      const statusSpan = overlay.querySelector(".status-text");
      if (statusSpan) {
        statusSpan.textContent = data.status;
        statusSpan.style.color = "#7e57c2";
      }
      decrementAndCheck();
    }
  }

  function showFullReportInNewTab() {
    const resultsArray = JSON.stringify(Array.from(masterData.values()));
    const reportHtml = `
            <html>
            <head>
                <title>QA Hub | Link Audit Report</title>
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #f7f3ff; color: #333366; padding: 40px; margin: 0; }
                    .container { max-width: 1200px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid #fba0be; }
                    .controls { display: flex; gap: 15px; margin-bottom: 20px; background: #fcfcff; padding: 15px; border-radius: 12px; border: 1px solid #e0e0f8; }
                    .control-group { flex: 1; }
                    label { display:block; font-size:10px; margin-bottom:4px; color:#665c8a; font-weight: bold; }
                    input, select { width:100%; padding:8px; border-radius:6px; border:1px solid #d1c4e9; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #d1c4e9; padding: 12px; text-align: left; position: sticky; top: 0; }
                    td { padding: 12px; border-bottom: 1px solid #f0f0f8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Link Audit Report</h1>
                    <div class="controls">
                        <div class="control-group">
                            <label>SEARCH LABEL OR URL</label>
                            <input type="text" id="reportSearch" placeholder="Filter links...">
                        </div>
                        <div class="control-group" style="max-width: 200px;">
                            <label>STATUS FILTER</label>
                            <select id="reportFilter">
                                <option value="all">Show All</option>
                                <option value="valid">200 OK</option>
                                <option value="redirect">Redirects (30x)</option>
                                <option value="error">Errors (40x+)</option>
                            </select>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr><th>Section</th><th>Label</th><th>URL</th><th>Status</th></tr>
                        </thead>
                        <tbody id="reportTableBody"></tbody>
                    </table>
                </div>
                <script>
                    const masterData = ${resultsArray};
                    const tbody = document.getElementById("reportTableBody");
                    const searchInput = document.getElementById("reportSearch");
                    const filterSelect = document.getElementById("reportFilter");

                    function render() {
                        const term = searchInput.value.toLowerCase();
                        const filter = filterSelect.value;
                        tbody.innerHTML = "";
                        masterData.forEach(d => {
                            const matchSearch = d.url.toLowerCase().includes(term) || d.label.toLowerCase().includes(term);
                            let matchFilter = true;
                            if (filter === "valid") matchFilter = d.statusCode === 200;
                            else if (filter === "redirect") matchFilter = d.statusCode >= 300 && d.statusCode < 400;
                            else if (filter === "error") matchFilter = d.statusCode >= 400;

                            if (matchSearch && matchFilter) {
                                const tr = document.createElement("tr");
                                const color = d.statusCode >= 400 ? "#e53935" : d.statusCode >= 300 ? "#f57f17" : "#4caf50";
                                tr.innerHTML = \`
                                    <td>\${d.section}</td>
                                    <td>\${d.label}</td>
                                    <td style="word-break:break-all; font-size:11px;">\${d.url}</td>
                                    <td style="color:\${color}; font-weight:bold;">\${d.status}</td>
                                \`;
                                tbody.appendChild(tr);
                            }
                        });
                    }
                    searchInput.oninput = render;
                    filterSelect.onchange = render;
                    render();
                <\/script>
            </body>
            </html>
        `;

    const blob = new Blob([reportHtml], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  }

  // --- BANNER UI ---
  const banner = document.createElement("div");
  banner.className = "cta-summary-banner";
  Object.assign(banner.style, {
    position: "fixed",
    top: "15px",
    right: "15px",
    backgroundColor: "#f7f3ff",
    color: "#333366",
    padding: "0",
    border: "2px solid #fba0be",
    borderRadius: "12px",
    zIndex: "2147483647",
    fontSize: "12px",
    width: "240px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
  });
  document.body.appendChild(banner);

  const updateBanner = () => {
    const stats = { total: 0, valid: 0, redirect: 0, warning: 0, error: 0 };
    masterData.forEach((d) => {
      if (!d.url) return;
      stats.total++;
      if (d.statusCode === 200) stats.valid++;
      else if (d.statusCode >= 300 && d.statusCode < 400) stats.redirect++;
      else if (d.statusCode >= 400) stats.error++;
      if (d.ariaError === "YES") stats.warning++;
    });

    const timerDisplay = scanFinished ? `${totalScanTime}s` : "Scanning...";

    banner.innerHTML = `
            <div style="background: #ffffff; padding: 12px; border-bottom: 2px solid #e0e0f8; display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 14px; color: #4a148c;">Check my CTAs</strong>
            </div>
            <div style="padding: 15px;">
                <div style="margin-bottom: 10px; display: flex; justify-content: space-between; font-weight: bold; color: #333366;">
                    <span>Found: ${stats.total}</span>
                    <span id="scanTimer" style="color: #665c8a; font-size: 11px;">${timerDisplay}</span>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div style="background: #e8f5e9; color: #2e7d32; padding: 8px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #c8e6c9;">
                        <span>Valid</span> <strong>${stats.valid}</strong>
                    </div>
                    <div style="background: #fff9c4; color: #f57f17; padding: 8px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #fff176;">
                        <span>Redirects</span> <strong>${stats.redirect}</strong>
                    </div>
                    <div style="background: #ffe0b2; color: #e65100; padding: 8px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #ffcc80;">
                        <span>Warnings</span> <strong>${stats.warning}</strong>
                    </div>
                    <div style="background: #ffebee; color: #c62828; padding: 8px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #ffcdd2;">
                        <span>Errors</span> <strong>${stats.error}</strong>
                    </div>
                </div>

                <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr; gap: 8px;">
                    <button id="viewReportBtn" style="padding: 10px; background: #7e57c2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">FULL REPORT</button>
                    <button id="downloadCsvBtn" style="padding: 10px; background: #f06292; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;">DOWNLOAD CSV</button>
                    <div style="display: flex; gap: 4px;">
                        <button id="toggleFloatingBtn" style="flex: 1; padding: 6px; font-size: 10px; cursor: pointer; background: #d1c4e9; color: #333366; border:none; border-radius: 4px; font-weight: 600;">${floatingBoxesVisible ? "Hide UI" : "Show UI"}</button>
                        <button id="resetCtaPositions" style="flex: 1; padding: 6px; font-size: 10px; cursor: pointer; background: #e0e0e0; color: #333; border:none; border-radius: 4px; font-weight: 600;">Reset View</button>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("viewReportBtn").onclick = showFullReportInNewTab;
    document.getElementById("downloadCsvBtn").onclick = () => {
      let csv = "Section,Label,URL,Status\n";
      masterData.forEach((d) => {
        csv += `"${d.section}","${d.label.replace(/"/g, '""')}","${d.url}","${d.status}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Link_Audit_${new Date().getTime()}.csv`;
      a.click();
    };

    document.getElementById("toggleFloatingBtn").onclick = () => {
      floatingBoxesVisible = !floatingBoxesVisible;
      boxRegistry.forEach(
        (entry) =>
          (entry.element.style.display = floatingBoxesVisible
            ? "block"
            : "none"),
      );
      updateBanner();
    };
    document.getElementById("resetCtaPositions").onclick = () => {
      boxRegistry.forEach((entry) => (entry.manuallyMoved = false));
      refreshPositions(true);
    };
  };

  discoverCtas();
  const debouncedDiscover = debounce(() => discoverCtas(), 250);
  const debouncedRefresh = debounce(() => refreshPositions(), 50);

  window.addEventListener("scroll", debouncedRefresh, { passive: true });
  window._ctaMutationObserver = new MutationObserver((mutations) => {
    const isInternal = mutations.every((m) =>
      m.target.closest?.(".cta-info-floating-box, .cta-summary-banner"),
    );
    if (!isInternal) debouncedDiscover();
  });
  window._ctaMutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
})();
