// service-worker.js
// This is the background script for your Chrome Extension (Manifest V3).

// --- CONFIGURATION ---
const CONTEXT_MENU_EXTENSIONS = [
  {
    id: "backupvideo_checker_context_menu",
    title: "Toggle Backup Asset",
    file: "extensions/backupvideo_checker/toggle_backupvideo.js",
  },
  {
    id: "htag_reader_context_menu",
    title: "HTAG Reader",
    file: "extensions/htag_reader/toggle_htagreader.js",
  },
  {
    id: "options_context_menu",
    title: "Options Exporter",
    file: "extensions/data_exporter/toggle_options.js",
  },
  {
    id: "specs_context_menu",
    title: "Specs Exporter",
    file: "extensions/data_exporter/toggle_specs.js",
  },

  {
    id: "nbsp_context_menu",
    title: "NBSP Finder",
    file: "extensions/nbsp_finder/toggle_nbspfinder.js",
  },

  {
    id: "altag_context_menu",
    title: "Alt Tag Reader",
    file: "extensions/altag_reader/toggle_altagreader.js",
  },

  {
    id: "textcompare_context_menu",
    title: "Text Compare Tool",
    file: "extensions/text_compare/toggle_textcompare.js",
  },
  {
    id: "360validator_context_menu",
    title: "Configurator Checker",
    file: "extensions/ford_360_validator/toggle_360validator.js",
  },

  {
    id: "ctachecker_context_menu",
    title: "CTA Checker",
    file: "extensions/cta_checker/toggle_ctachecker.js",
  },

  // Future extensions can be added here. Example:
  /*
    {
        id: "new_feature_a_context_menu",
        title: "New Tool A Runner",
        file: "new_feature_a/content_script_a.js" 
    }
    */
];

// --- 1. Installation Listener (Context Menu Creation) ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    CONTEXT_MENU_EXTENSIONS.forEach((extension) => {
      chrome.contextMenus.create({
        id: extension.id, 
        title: extension.title + " (Context Menu)", 
        contexts: ["all"], 
      });
    });
  });
});

// --- 2. Context Menu Click Listener ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const extension = CONTEXT_MENU_EXTENSIONS.find(
    (ext) => ext.id === info.menuItemId
  );

  if (extension && tab.id) {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: [extension.file],
      })
      .then(() => {
        console.log(
          `Script executed successfully for ${extension.title} via Context Menu.`
        );
      })
      .catch((error) => {
        console.error(
          `Error executing script for ${extension.title} via Context Menu:`,
          error
        );
      });
  }
});

// --- 3. Listener for messages from content script ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "check_link_status") {
    const processResponse = (response) => {
      let finalStatus = response.status;
      if (response.status === 0 && response.type === 'opaqueredirect') {
        finalStatus = 301;
      }
      return { status: finalStatus, ok: response.ok };
    };

    fetch(message.url, { method: "HEAD", redirect: "manual" })
      .then((response) => {
        if (response.status === 405) {
          return fetch(message.url, { method: "GET", redirect: "manual" });
        }
        return response;
      })
      .then((response) => {
        sendResponse(processResponse(response));
      })
      .catch((error) => {
        sendResponse({ status: 404, ok: false });
      });

    return true; 
  }
});

