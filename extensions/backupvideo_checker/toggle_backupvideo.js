// CODE CREATED BY JULIANA HORTAL FOR VML ARGENTINA FORD QA TEAM
// This script toggles the visibility of backup video assets on a webpage to help identify and manage them for optimal media delivery.

(function () {
  const TOOL_ID = "backupvideo_checker";
  const GLOBAL_STATE_VAR = `__${TOOL_ID}Toggled`;

  if (!window[GLOBAL_STATE_VAR]) {
    document.querySelectorAll(".image").forEach((el) => {
      if (el.classList.contains("hide_image")) {
        el.classList.remove("hide_image");
        el.setAttribute("data-domcleaner-shown", "true");
      } else {
        el.setAttribute("data-domcleaner-original-visible", "true");
      }
    });

    document
      .querySelectorAll(".video.akamai-video, .video.dash-video")
      .forEach((el) => {
        el.style.display = "none";
        el.setAttribute("data-domcleaner-hidden", "true");
      });

    window[GLOBAL_STATE_VAR] = true;

    chrome.runtime.sendMessage({
      type: "domcleaner-state",
      tool: TOOL_ID,
      state: "cleaned",
    });
  } else {
    document
      .querySelectorAll('.image[data-domcleaner-shown="true"]')
      .forEach((el) => {
        el.classList.add("hide_image");
        el.removeAttribute("data-domcleaner-shown");
      });

    document
      .querySelectorAll('.image[data-domcleaner-original-visible="true"]')
      .forEach((el) => {
        el.removeAttribute("data-domcleaner-original-visible");
      });

    document
      .querySelectorAll(
        '.video.akamai-video[data-domcleaner-hidden="true"], .video.dash-video[data-domcleaner-hidden="true"]',
      )
      .forEach((el) => {
        el.style.display = "";
        el.removeAttribute("data-domcleaner-hidden");
      });

    window[GLOBAL_STATE_VAR] = false;

    chrome.runtime.sendMessage({
      type: "domcleaner-state",
      tool: TOOL_ID,
      state: "reverted",
    });
  }
})();
