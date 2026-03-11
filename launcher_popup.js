// Global Map to track running extensions and their watchdog timers for data exporters
const activeTimers = new Map();

// Helper to determine the unique global variable name for an extension's state
const getGlobalStateVarName = (extensionId) => `__${extensionId}Toggled`;

/**
 * Helper function to update a specific button's appearance based on state
 */
const updateButtonUI = (button, state) => {
  if (!button) return;
  const isToggledOn = state === "cleaned";
  const actionType = button.getAttribute("data-action-type");

  button.setAttribute("data-toggled", state);

  if (state === "reverted") {
    button.classList.remove(
      "is-active",
      "is-link-action",
      "is-toggled-active",
      "loading",
      "success",
      "error",
    );
    button.disabled = false;
    button.textContent = button.getAttribute("data-name-activate");
  }

  if (actionType === "toggle") {
    button.textContent = isToggledOn
      ? button.getAttribute("data-name-revert")
      : button.getAttribute("data-name-activate");
    if (isToggledOn) {
      button.classList.add("is-toggled-active");
      button.classList.remove("loading", "success", "error");
    } else {
      button.classList.remove("is-toggled-active");
    }
  }
};

/**
 * Executes the logic for a given extension.
 */
const runExtension = (extension, tabId, button) => {
  const buttonId = button.id;
  const isDataExporter = extension.actionType === "exporter";
  const isToggle = extension.actionType === "toggle";

  if (activeTimers.has(buttonId)) return;

  button.setAttribute("data-action-type", extension.actionType);

  if (isDataExporter) {
    button.classList.add("loading");
    button.textContent = "Processing Data...";
    button.disabled = true;
    activeTimers.set(buttonId, null);
  } else if (
    extension.actionType === "link" ||
    extension.actionType === "pdf"
  ) {
    button.classList.add("is-active", "is-link-action");
    button.textContent = "Opening...";
  }

  // PDF/Link Actions
  if (
    extension.actionType === "pdf" ||
    (extension.actionType === "link" && extension.url)
  ) {
    const url =
      extension.actionType === "pdf"
        ? chrome.runtime.getURL(extension.url)
        : extension.url;
    chrome.tabs.create({ url: url });
    setTimeout(() => updateButtonUI(button, "reverted"), 1500);
    return;
  }

  // Execute Content Script
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: [extension.file],
    })
    .then(() => {
      if (isToggle) {
        chrome.scripting
          .executeScript({
            target: { tabId: tabId },
            func: (varName) => (window[varName] ? "cleaned" : "reverted"),
            args: [getGlobalStateVarName(extension.id)],
          })
          .then((results) => {
            updateButtonUI(button, results?.[0]?.result || "reverted");
          });
        activeTimers.delete(buttonId);
      } else if (isDataExporter) {
        const watchdogTimer = setTimeout(() => {
          button.classList.remove("loading");
          button.classList.add("error");
          button.textContent = "TIMEOUT";
          setTimeout(() => updateButtonUI(button, "reverted"), 2000);
          activeTimers.delete(buttonId);
        }, 15000);
        activeTimers.set(buttonId, watchdogTimer);
      }
    })
    .catch((error) => {
      console.error(`Error running ${extension.name}:`, error);
      button.classList.remove("loading", "is-active");
      button.classList.add("error");
      button.textContent = "ERROR";
      if (activeTimers.has(buttonId)) {
        clearTimeout(activeTimers.get(buttonId));
        activeTimers.delete(buttonId);
      }
      setTimeout(() => updateButtonUI(button, "reverted"), 1500);
    });
};

/**
 * CSV Export Utility
 */
function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    csvRows.push(
      headers
        .map((header) => `"${("" + row[header]).replace(/"/g, '""')}"`)
        .join(","),
    );
  }

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Message Listener for async responses
 */
chrome.runtime.onMessage.addListener((request) => {
  const button = request.buttonId
    ? document.getElementById(request.buttonId)
    : null;
  if (!button) return false;

  if (activeTimers.has(button.id)) {
    clearTimeout(activeTimers.get(button.id));
    activeTimers.delete(button.id);
  }

  if (request.action === "export_data") {
    button.classList.remove("loading");
    button.classList.add("success");
    button.textContent = "DOWNLOADED!";

    if (request.tool === "nbsp_finder") {
      renderResultsConsole(request.data, request.tool);
    } else {
      const existingConsole = document.getElementById("results-console");
      if (existingConsole) existingConsole.remove();
    }

    const ext = EXTENSIONS_ARRAY.find(
      (e) => `btn-${e.id}` === request.buttonId,
    );
    const fileName =
      ext?.exportFileName || `${request.tool || "export"}_results.csv`;
    downloadCSV(request.data, fileName);

    setTimeout(() => {
      updateButtonUI(button, "reverted");
    }, 2000);
  }

  if (request.action === "export_error") {
    button.classList.remove("loading");
    button.classList.add("error");
    button.textContent = "NOT FOUND";
    setTimeout(() => updateButtonUI(button, "reverted"), 2000);
  }

  return true;
});

/**
 * Generic Console Window for results
 */
function renderResultsConsole(data, toolName) {
  const existing = document.getElementById("results-console");
  if (existing) existing.remove();

  const container = document.getElementById("extensionButtonContainer");
  const consoleDiv = document.createElement("div");
  consoleDiv.id = "results-console";

  const safeToolName = toolName || "Extraction";
  const formattedName = safeToolName.replace("_", " ").toUpperCase();

  consoleDiv.innerHTML = `
        <div class="console-header">
            <span>Found ${data.length} ${formattedName} Items</span>
            <button id="close-console-btn">Close</button>
        </div>
        <div class="console-body">
            <table>
                <thead><tr><th>Tag</th><th>Context</th><th>Snippet</th></tr></thead>
                <tbody>
                    ${data
                      .map(
                        (item) => `
                        <tr class="console-row" data-target-id="nbsp-element-${
                          item.id
                        }">
                            <td><span class="tag-badge">${
                              item.tag || "N/A"
                            }</span></td>
                            <td style="color: #bbb; font-size: 9px;">${
                              item.context || ""
                            }</td>
                            <td><code>${item.snippet || ""}</code></td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    `;

  consoleDiv
    .querySelector("#close-console-btn")
    .addEventListener("click", () => consoleDiv.remove());
  consoleDiv.querySelectorAll(".console-row").forEach((row) => {
    row.addEventListener("click", () => {
      const elementId = row.getAttribute("data-target-id");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0])
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "scroll_to_nbsp",
            elementId,
          });
      });
    });
  });
  container.appendChild(consoleDiv);
}

/** Confetti Effect */
function launchConfetti(container) {
  const colors = ["#f06292", "#4a148c", "#4caf50", "#ffeb3b", "#2196f3"];
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    const duration = Math.random() * 2 + 1;
    const delay = Math.random() * 0.5;
    Object.assign(confetti.style, {
      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      left: `${Math.random() * 100}%`,
      top: "-10px",
      width: `${Math.random() * 8 + 4}px`,
      height: `${Math.random() * 8 + 4}px`,
      animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
    });
    container.appendChild(confetti);
    setTimeout(() => confetti.remove(), (duration + delay) * 1000);
  }
}

// --- CONFIGURATION ---
const EXTENSIONS_ARRAY = [
  {
    id: "home_documentation_link",
    name: "Launcher Documentation",
    activateText: "View Documentation",
    category: "home",
    wrapperId: "home_info",
    actionType: "pdf",
    url: "pdfs/Documentation_Integrated_Ford_Tools.pdf",
  },
  {
    id: "backupvideo_checker",
    name: "Backup Asset Checker",
    file: "extensions/backupvideo_checker/toggle_backupvideo.js",
    activateText: "Toggle Backup Asset",
    revertText: "Revert Videos",
    category: "media",
    wrapperId: "backupvideo_checker",
    wrapperDescription:
      "Backup Asset Checker: Identify and manage backup video assets to ensure optimal media delivery.",
    actionType: "toggle",
  },
  {
    id: "htag_reader",
    name: "HTag Reader",
    file: "extensions/htag_reader/toggle_htagreader.js",
    activateText: "Highlight Headings",
    revertText: "Clear Headings",
    category: "content",
    wrapperId: "htag_reader",
    wrapperDescription:
      "HTag Reader: Visualize heading tags (H1-H6) to ensure proper document structure and accessibility.",
    actionType: "toggle",
  },
  {
    id: "altag_reader",
    name: "Alt Tag Reader",
    file: "extensions/altag_reader/toggle_altagreader.js",
    activateText: "Highlight Alt Tags",
    revertText: "Clear Alt Tags",
    category: "content",
    wrapperId: "altag_reader",
    wrapperDescription:
      "Alt Tag Reader: Visualize image alt attributes to ensure accessibility compliance.",
    actionType: "toggle",
  },
  {
    id: "data_exporter_options",
    name: "Export Options",
    file: "extensions/data_exporter/toggle_options.js",
    activateText: "Export Options",
    category: "data",
    wrapperId: "data_exporter",
    wrapperDescription:
      "Data Exporter: Tools for extracting vehicle specifications and options into CSV files.",
    actionType: "exporter",
    exportFileName: "vehicle_options.csv",
  },
  {
    id: "data_exporter_specs",
    name: "Export Specifications",
    file: "extensions/data_exporter/toggle_specs.js",
    activateText: "Export Specifications",
    category: "data",
    wrapperId: "data_exporter",
    actionType: "exporter",
    exportFileName: "vehicle_specifications.csv",
  },
  {
    id: "nbsp_finder",
    name: "Find NBSP",
    file: "extensions/nbsp_finder/toggle_nbspfinder.js",
    activateText: "Find Non-Breaking Spaces",
    category: "data",
    wrapperId: "nbsp_finder",
    wrapperDescription:
      "NBSP Finder: Locate non-breaking spaces in content to ensure proper text formatting and accessibility.",
    actionType: "exporter",
    exportFileName: "nbsp_issues.csv",
  },
  {
    id: "text_compare",
    name: "Text Compare",
    file: "extensions/text_compare/toggle_textcompare.js",
    activateText: "Compare Text",
    revertText: "Clear Comparison",
    category: "content",
    wrapperId: "text_compare_wrapper",
    wrapperDescription:
      "Text Compare: Analyze and compare text segments for consistency.",
    actionType: "toggle",
  },
  {
    id: "ford_360_validator",
    name: "Ford 360 Validator",
    file: "extensions/ford_360_validator/toggle_360validator.js",
    activateText: "Validate 360 Images",
    revertText: "Close Validator",
    category: "media",
    wrapperId: "ford_360_val",
    wrapperDescription:
      "360 Validator: Verify frame counts, sequence, and naming conventions for 360 assets.",
    actionType: "toggle",
  },
  {
    id: "cta_checker",
    name: "CTA Checker",
    file: "extensions/cta_checker/toggle_ctachecker.js",
    activateText: "Check CTAs",
    revertText: "Clear CTA Check",
    category: "content",
    wrapperId: "cta_checker_wrapper",
    wrapperDescription:
      "CTA Checker: Validates redirect status and aria-label patterns for main body buttons.",
    actionType: "toggle",
  },
];

const CATEGORIES = [
  { id: "home", name: "Home" },
  { id: "all", name: "All Tools" },
  { id: "content", name: "Content Structure" },
  { id: "media", name: "Images & Media" },
  { id: "data", name: "Data Extraction" },
];

// --- RENDER LOGIC ---
const renderButtons = (tabId, categoryId) => {
  const container = document.getElementById("extensionButtonContainer");
  if (!container) return;
  container.innerHTML = "";

  if (categoryId === "home") {
    container.innerHTML = `<div class="home-intro-wrapper">
            <h2 class="home-title">Welcome to the FORD QA Launcher!</h2>
            <p class="home-description">Your single point of access for all QA scripts.</p>
        </div>`;
  }

  const filteredExtensions = EXTENSIONS_ARRAY.filter((ext) =>
    categoryId === "all"
      ? ext.category !== "home"
      : ext.category === categoryId,
  );

  const grouped = new Map();
  filteredExtensions.forEach((ext) => {
    if (!grouped.has(ext.wrapperId)) grouped.set(ext.wrapperId, []);
    grouped.get(ext.wrapperId).push(ext);
  });

  grouped.forEach((extensions, wrapperId) => {
    const wrapper = document.createElement("div");
    wrapper.className = "extension-wrapper";

    if (wrapperId !== "home_info") {
      const title = document.createElement("p");
      title.className = "extension-description group-title";
      title.textContent =
        extensions[0].wrapperDescription || extensions[0].name;
      wrapper.appendChild(title);
    }

    const btnContainer = document.createElement("div");
    btnContainer.className =
      extensions.length > 1 ? "button-group-multi" : "button-group-single";

    extensions.forEach((ext) => {
      const btn = document.createElement("button");
      btn.id = `btn-${ext.id}`;
      btn.className = "extension-button";
      btn.setAttribute("data-name-activate", ext.activateText);
      btn.setAttribute("data-name-revert", ext.revertText || ext.activateText);
      btn.setAttribute("data-action-type", ext.actionType);

      if (ext.actionType === "toggle") {
        chrome.scripting
          .executeScript({
            target: { tabId },
            func: (varName) => (window[varName] ? "cleaned" : "reverted"),
            args: [getGlobalStateVarName(ext.id)],
          })
          .then((res) => updateButtonUI(btn, res?.[0]?.result || "reverted"));
      } else {
        updateButtonUI(btn, "reverted");
      }

      btn.addEventListener("click", () => runExtension(ext, tabId, btn));
      btnContainer.appendChild(btn);
    });

    wrapper.appendChild(btnContainer);
    container.appendChild(wrapper);
  });
};

const renderTabs = (tabId) => {
  const tabNav = document.getElementById("tab-navigation");
  const footer = document.getElementById("launcherFooter");
  let activeId = CATEGORIES[0].id;

  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat.name;
    btn.className = `tab-button ${cat.id === activeId ? "active-tab" : ""}`;
    btn.addEventListener("click", (e) => {
      activeId = cat.id;
      document
        .querySelectorAll(".tab-button")
        .forEach((b) => b.classList.remove("active-tab"));
      e.target.classList.add("active-tab");
      if (footer) footer.style.display = activeId === "home" ? "block" : "none";
      renderButtons(tabId, activeId);
    });
    tabNav.appendChild(btn);
  });
  renderButtons(tabId, activeId);
};

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (
      !activeTab ||
      !activeTab.id ||
      /^(chrome|about|file|data):/.test(activeTab.url)
    ) {
      document.getElementById("extensionButtonContainer").innerHTML =
        '<p class="text-error">Cannot run on this page.</p>';
      return;
    }
    renderTabs(activeTab.id);
  });

  const secretButton = document.getElementById("secretCatButton");
  const catModal = document.getElementById("catModal");
  if (secretButton && catModal) {
    document.getElementById("catImage").src =
      chrome.runtime.getURL("icons/luchito.jpeg");
    secretButton.addEventListener("click", () => {
      catModal.style.display = "flex";
      launchConfetti(catModal.querySelector(".modal-content"));
    });
    document
      .getElementById("closeModal")
      .addEventListener("click", () => (catModal.style.display = "none"));
  }
});
