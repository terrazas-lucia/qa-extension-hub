(function () {
  const TOOL_ID = "ford_360_validator";
  const WRAPPER_ID = "qa-360-validator-ui";
  const STYLE_ID = "qa-360-validator-styles";
  const GLOBAL_STATE_VAR = `__${TOOL_ID}Toggled`;

  if (!window[GLOBAL_STATE_VAR]) {
    window[GLOBAL_STATE_VAR] = true;
  } else {
    document.getElementById(WRAPPER_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    window[GLOBAL_STATE_VAR] = false;
    return;
  }

  const rgbToHex = (rgb) => {
    if (!rgb || rgb === "transparent") return "transparent";
    if (rgb.startsWith("#")) return rgb;
    const match = rgb.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/,
    );
    if (!match) return rgb;
    const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
            .v360-main-container { position: fixed; top: 20px; right: 20px; z-index: 2147483647; font-family: "Inter", sans-serif; }
            
            /* Card & Header Styling */
            .v360-card { width: 450px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); border: 1px solid #e0e0f8; overflow: hidden; }
            .v360-header { padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; border-bottom: 2px solid #e0e0f8; }
            .v360-title { font-weight: 700; color: #4a148c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .v360-body { padding: 15px; background-color: #fcfcff; }
            
            /* Log / Console Window Styling */
            .v360-log { height: 160px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 11px; background: #1e1e1e; color: #dcdcdc; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #333; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
            
            /* Stats Grid */
            .v360-stats { display: flex; gap: 8px; margin-bottom: 15px; }
            .v360-stat-box { flex: 1; background: #ffffff; padding: 10px 5px; border-radius: 8px; border: 1px solid #e0e0f8; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
            .v360-val { display: block; font-size: 18px; font-weight: 700; color: #4a148c; }
            .v360-lbl { font-size: 9px; color: #665c8a; font-weight: 600; text-transform: uppercase; }
            
            /* Button Styling */
            .v360-btn { width: 100%; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease-in-out; font-family: "Inter", sans-serif; font-size: 13px; }
            .v360-btn-main { background: #f06292; color: white; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(240, 98, 146, 0.3); }
            .v360-btn-main:hover { background: #ec407a; transform: translateY(-1px); }
            .v360-btn-main:disabled { background: #ffb300; cursor: wait; }
            
            .v360-btn-sec { background: #d1c4e9; color: #333366; margin-bottom: 8px; }
            .v360-btn-sec:hover { background: #b39ddb; transform: translateY(-1px); }
            
            /* Modal / Summary Styling */
            .v360-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(74, 20, 140, 0.2); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 2147483647; }
            .v360-modal-content { background: white; padding: 25px; border-radius: 12px; width: 950px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid #e0e0f8; }
            
            .v360-summary-trim-group { margin-bottom: 20px; text-align: left; border: 1px solid #e0e0f8; border-radius: 8px; position: relative; overflow: visible; background: #fff; }
            .v360-summary-trim-header { background: #4a148c; color: white; padding: 12px 15px; font-weight: 700; font-size: 13px; border-radius: 7px 7px 0 0; }
            .v360-summary-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            .v360-summary-table th { background: #fcfcff; text-align: left; padding: 10px 8px; border-bottom: 2px solid #e0e0f8; color: #665c8a; }
            .v360-summary-table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; color: #333366; }
            
            .v360-info-icon { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; background: #d1c4e9; color: #4a148c; border-radius: 50%; font-size: 10px; margin-left: 6px; cursor: help; font-weight: bold; }
            .v360-info-icon:hover::after { content: attr(data-tip); position: absolute; top: 100%; left: 0; margin-top: 8px; background: #333; color: #fff; padding: 10px; border-radius: 6px; font-size: 10px; width: 230px; z-index: 100; white-space: normal; line-height: 1.4; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: normal; }

            .count-badge { color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; display: inline-block; }
            .v360-swatch-mini { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid #e0e0f8; vertical-align: middle; margin-right: 10px; }
            
            /* Status Colors from Extension Theme */
            .status-pass { color: #4caf50; font-weight: bold; }
            .status-fail { color: #e53935; font-weight: bold; }
            #v360-view-summary { display: none; }
        `;
    document.head.appendChild(style);
  }

  const container = document.createElement("div");
  container.id = WRAPPER_ID;
  container.className = "v360-main-container";
  container.innerHTML = `
        <div class="v360-card">
            <div class="v360-header">
                <span class="v360-title">360 Validator</span>
                <button id="v360-close" style="background:none; border:none; cursor:pointer; color:#f06292; font-size:24px; line-height:1;">&times;</button>
            </div>
            <div class="v360-body">
                <div class="v360-stats">
                    <div class="v360-stat-box"><span id="stat-t" class="v360-val">0</span><span class="v360-lbl">Trims</span></div>
                    <div class="v360-stat-box"><span id="stat-c" class="v360-val">0</span><span class="v360-lbl">Colors</span></div>
                    <div class="v360-stat-box"><span id="stat-a" class="v360-val">0</span><span class="v360-lbl">Assets</span></div>
                    <div class="v360-stat-box"><span id="stat-timer" class="v360-val">0s</span><span class="v360-lbl">Time</span></div>
                </div>
                <div id="v360-log" class="v360-log">> Ready to scan.</div>
                <button id="v360-start" class="v360-btn v360-btn-main">START SCAN</button>
                <button id="v360-view-summary" class="v360-btn v360-btn-sec">VIEW LATEST SUMMARY</button>
                <button id="v360-dl" class="v360-btn v360-btn-sec">DOWNLOAD CSV REPORT</button>
            </div>
        </div>
    `;
  document.body.appendChild(container);

  window.v360_recorded_assets = {};
  window.v360_color_hex_map = {};
  window.v360_total_scan_time = 0;
  let isRotating = false;

  async function runRotation() {
    if (isRotating) return;
    const log = document.getElementById("v360-log");
    const mainContainer = document.querySelector(
      ".cmp-360-image-container.show",
    );
    if (!mainContainer) return;

    isRotating = true;
    const rect = mainContainer.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.05;
    const clickPathWidth = rect.width * 0.9;

    for (let i = 0; i < 37; i++) {
      if (!isRotating) break;
      const clickX = startX + clickPathWidth * (i / 73);
      mainContainer.dispatchEvent(
        new MouseEvent("click", {
          clientX: clickX,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          view: window,
        }),
      );
      await new Promise((r) => setTimeout(r, 100));
    }
    isRotating = false;
    log.innerHTML += `<div style="color:#d1c4e9">> 36 asset rotation complete.</div>`;
    log.scrollTop = log.scrollHeight;
  }

  function verifyAsset(asset) {
    const isMissingSource =
      asset.mobile === "N/A" ||
      asset.tablet === "N/A" ||
      asset.desktop === "N/A";
    if (isMissingSource)
      return {
        fileValid: "FAIL",
        pathValid: "FAIL",
        filename: "Missing Res Source",
      };
    const path = asset.mobile;
    const filename = path.split("/").pop();
    const pathLower = path.toLowerCase();
    const sequencePattern = "(00[1-9]|00[1-3]\\d)";
    const filePattern =
      asset.view === "EXTERIOR"
        ? new RegExp(`^${sequencePattern}-[\\w-]+-[\\w\\d]+\\.(jpeg|jpg)$`, "i")
        : new RegExp(`^${sequencePattern}-[\\w-]+\\.(jpeg|jpg)$`, "i");
    const fileValid = filePattern.test(filename) ? "PASS" : "FAIL";
    const expectedSegments = [
      "360",
      asset.trim.toLowerCase().replace(/\s/g, "-"),
      asset.view.toLowerCase(),
    ];
    const pathValid = expectedSegments.every((seg) => pathLower.includes(seg))
      ? "PASS"
      : "FAIL";
    return { fileValid, pathValid, filename };
  }

  async function runScan() {
    const log = document.getElementById("v360-log");
    const startBtn = document.getElementById("v360-start");
    const summaryBtn = document.getElementById("v360-view-summary");
    const scanStartTime = performance.now();
    const timerDisplay = document.getElementById("stat-timer");
    startBtn.disabled = true;
    summaryBtn.style.display = "none";
    log.innerHTML = `<div style="color:#f06292">> Initializing Scan...</div>`;
    let trigger = document.querySelector(".dropdown-trigger");
    if (trigger && trigger.getAttribute("aria-expanded") === "false")
      trigger.click();
    await new Promise((r) => setTimeout(r, 600));
    const visibleTrims = [
      ...document.querySelectorAll(".dropdown-item.trimAware__item"),
    ].filter((el) => el.offsetParent !== null);
    const totalTrims = visibleTrims.length;
    if (trigger) trigger.click();
    for (let i = 0; i < totalTrims; i++) {
      trigger = document.querySelector(".dropdown-trigger");
      if (trigger) {
        trigger.click();
        await new Promise((r) => setTimeout(r, 400));
      }
      const activeTrims = [
        ...document.querySelectorAll(".dropdown-item.trimAware__item"),
      ].filter((el) => el.offsetParent !== null);
      const trimName = activeTrims[i].innerText.trim();
      log.innerHTML += `<div style="color:#fff">> [TRIM ${i + 1}/${totalTrims}] ${trimName}</div>`;
      activeTrims[i].click();
      await new Promise((r) => setTimeout(r, 3000));
      for (const viewType of ["exterior", "interior"]) {
        log.innerHTML += `<div style="color:#d1c4e9">&nbsp;&nbsp;+ Switching to ${viewType.toUpperCase()}...</div>`;
        const toggle = document.querySelector(
          `.toggle-option[data-value="${viewType}"]`,
        );
        if (toggle && !toggle.classList.contains("active")) {
          toggle.click();
          await new Promise((r) => setTimeout(r, 2000));
        }
        const swatches = [
          ...document.querySelectorAll(".color-container"),
        ].filter((el) => el.offsetParent !== null);
        for (let j = 0; j < swatches.length; j++) {
          const label = (swatches[j].getAttribute("data-label") || "").trim();
          const colorEl = swatches[j].querySelector(".color");
          const hexValue = rgbToHex(
            colorEl ? getComputedStyle(colorEl).backgroundColor : "transparent",
          );
          log.innerHTML += `<div>&nbsp;&nbsp;&nbsp;&nbsp;- Verifying: ${label}</div>`;
          log.scrollTop = log.scrollHeight;
          swatches[j].click();
          await new Promise((r) => setTimeout(r, 1500));
          const activePic = document.querySelector(
            ".cmp-360-image-container.show picture",
          );
          if (activePic && activePic.id) {
            const parts = activePic.id
              .split("~")[0]
              .split("-" + viewType.toLowerCase() + "-");
            if (parts.length >= 2)
              window.v360_color_hex_map[parts[1].toUpperCase()] = hexValue;
          }
          await runRotation();
          window.v360_total_scan_time = performance.now() - scanStartTime;
          timerDisplay.innerText = formatTime(window.v360_total_scan_time);
        }
      }
      document.getElementById("stat-t").innerText = i + 1;
    }
    log.innerHTML += `<div style="color:#f06292">> SCAN FINISHED.</div>`;
    startBtn.disabled = false;
    summaryBtn.style.display = "block";
    showSummaryModal();
  }

  function scrapeDOM() {
    const pics = document.querySelectorAll(".cmp-360-image-container picture");
    const activeToggle = document.querySelector(".toggle-option.active");
    const currentView = activeToggle
      ? activeToggle.getAttribute("data-value").toUpperCase()
      : "EXTERIOR";
    pics.forEach((p) => {
      const storageKey = `${p.id}_${currentView}`;
      if (!p.id) return;
      const parts = p.id
        .split("~")[0]
        .split("-" + currentView.toLowerCase() + "-");
      if (parts.length < 2) return;
      const colorID = parts[1].toUpperCase();
      if (!window.v360_recorded_assets[storageKey]) {
        window.v360_recorded_assets[storageKey] = {
          id: p.id,
          view: currentView,
          trim: parts[0].toUpperCase(),
          color: colorID,
          hex: window.v360_color_hex_map[colorID] || "N/A",
          desktop: p.querySelector('source[media*="992px"]')?.srcset || "N/A",
          tablet: p.querySelector('source[media*="768px"]')?.srcset || "N/A",
          mobile: p.querySelector("img")?.src || "N/A",
        };
      } else if (window.v360_recorded_assets[storageKey].hex === "N/A") {
        window.v360_recorded_assets[storageKey].hex =
          window.v360_color_hex_map[colorID] || "N/A";
      }
    });
    const dataArray = Object.values(window.v360_recorded_assets);
    document.getElementById("stat-a").innerText = dataArray.length;
    document.getElementById("stat-c").innerText = new Set(
      dataArray.map((v) => `${v.trim}|${v.view}|${v.color}`),
    ).size;
  }

  function showSummaryModal() {
    const data = Object.values(window.v360_recorded_assets);
    const hierarchy = {};
    data.forEach((item) => {
      const v = verifyAsset(item);
      const key = `[${item.view}] ${item.color}`;
      if (!hierarchy[item.trim]) hierarchy[item.trim] = {};
      if (!hierarchy[item.trim][key]) {
        hierarchy[item.trim][key] = {
          dFrames: 0,
          tFrames: 0,
          mFrames: 0,
          path: "PASS",
          file: "PASS",
          hex: item.hex || "N/A",
        };
      }
      if (item.desktop !== "N/A") hierarchy[item.trim][key].dFrames++;
      if (item.tablet !== "N/A") hierarchy[item.trim][key].tFrames++;
      if (item.mobile !== "N/A") hierarchy[item.trim][key].mFrames++;
      if (v.pathValid === "FAIL") hierarchy[item.trim][key].path = "FAIL";
      if (v.fileValid === "FAIL") hierarchy[item.trim][key].file = "FAIL";
    });

    let rowsHtml = `<div style="font-size:18px; color:#4a148c; font-weight:700; margin-bottom:5px; text-align:center;">Validation Summary</div><div style="font-size:12px; color:#665c8a; text-align:center; margin-bottom:20px;">Duration: ${formatTime(window.v360_total_scan_time)}</div>`;
    for (const trim in hierarchy) {
      rowsHtml += `<div class="v360-summary-trim-group"><div class="v360-summary-trim-header">${trim}</div><table class="v360-summary-table"><thead><tr><th style="width: 45%; padding-left: 15px">Filename + Hex</th><th style="width: 10%;">D</th><th style="width: 10%;">T</th><th style="width: 10%;">M</th><th style="width: 7%;">Path</th><th style="width: 7%;">File</th></tr></thead><tbody>`;
      for (const colorKey in hierarchy[trim]) {
        const stat = hierarchy[trim][colorKey];
        const getBadgeColor = (count) => (count === 36 ? "#4caf50" : "#e53935");
        rowsHtml += `<tr><td><span class="v360-swatch-mini" style="background:${stat.hex}"></span>${colorKey}</td><td><span class="count-badge" style="background:${getBadgeColor(stat.dFrames)}">${stat.dFrames}</span></td><td><span class="count-badge" style="background:${getBadgeColor(stat.tFrames)}">${stat.tFrames}</span></td><td><span class="count-badge" style="background:${getBadgeColor(stat.mFrames)}">${stat.mFrames}</span></td><td class="status-${stat.path.toLowerCase()}">${stat.path}</td><td class="status-${stat.file.toLowerCase()}">${stat.file}</td></tr>`;
      }
      rowsHtml += `</tbody></table></div>`;
    }
    const overlay = document.createElement("div");
    overlay.className = "v360-modal-overlay";
    overlay.innerHTML = `<div class="v360-modal-content">${rowsHtml}<button id="v360-modal-close" class="v360-btn v360-btn-main" style="margin-top:20px;">CLOSE SUMMARY</button></div>`;
    document.body.appendChild(overlay);
    document.getElementById("v360-modal-close").onclick = () =>
      overlay.remove();
  }

  const interval = setInterval(scrapeDOM, 800);
  document.getElementById("v360-start").onclick = runScan;
  document.getElementById("v360-view-summary").onclick = showSummaryModal;
  document.getElementById("v360-close").onclick = () => {
    isRotating = false;
    clearInterval(interval);
    document.getElementById(WRAPPER_ID).remove();
    document.getElementById(STYLE_ID).remove();
    window[GLOBAL_STATE_VAR] = false;
  };
  document.getElementById("v360-dl").onclick = () => {
    const data = Object.values(window.v360_recorded_assets);
    const headers =
      "VIEW,TRIM,COLOR,HEX_CODE,FILENAME_VALID,PATH_VALID,FILENAME,DESKTOP_PATH,TABLET_PATH,MOBILE_PATH\n";
    const rows = data
      .map((d) => {
        const v = verifyAsset(d);
        return `"${d.view}","${d.trim}","${d.color}","${d.hex}","${v.fileValid}","${v.pathValid}","${v.filename}","${d.desktop}","${d.tablet}","${d.mobile}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Ford_360_Report.csv`;
    a.click();
  };
})();
