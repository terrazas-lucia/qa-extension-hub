(function () {
  const TOOL_ID = "specs_meme";
  const GLOBAL_STATE_VAR = `__${TOOL_ID}Toggled`;

  window[GLOBAL_STATE_VAR] =
    typeof window[GLOBAL_STATE_VAR] === "undefined"
      ? true
      : !window[GLOBAL_STATE_VAR];
  const isActivating = window[GLOBAL_STATE_VAR];

  const OVERLAY_ID = "qa-specs-meme-overlay";

  if (isActivating) {
    if (!document.getElementById(OVERLAY_ID)) {
      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;

      const memeUrl = "https://i.imgur.com/JmihOBH.jpeg";

      overlay.innerHTML = `
                <div class="meme-container">
                    <div class="meme-header">
                        <span>🚧 WORK IN PROGRESS 🚧</span>
                        <button id="meme-close">×</button>
                    </div>
                    <img src="${memeUrl}" alt="Work in progress meme" class="meme-img">
                    <p class="meme-footer">This feature is coming soon... maybe.</p>
                </div>
                <style>
                    #${OVERLAY_ID} {
                        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                        background: rgba(255, 141, 234, 0.4); backdrop-filter: blur(4px);
                        z-index: 2147483647; display: flex; align-items: center; justify-content: center;
                        font-family: 'Inter', sans-serif;
                    }
                    .meme-container {
                        background: white; padding: 20px; border-radius: 20px;
                        border: 4px solid #ff97d7; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                        max-width: 400px; text-align: center; animation: memePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    @keyframes memePop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    .meme-header { 
                        display: flex; justify-content: space-between; align-items: center;
                        margin-bottom: 15px; color: #ff75d1; font-weight: bold;
                    }
                    .meme-img { width: 100%; border-radius: 10px; border: 2px solid #e0e0f8; }
                    .meme-footer { margin-top: 15px; font-weight: 600; color: #665c8a; font-size: 14px; }
                    #meme-close { 
                        background: #f3e5f5; border: none; color: #ff81e2; 
                        width: 25px; height: 25px; border-radius: 50%; cursor: pointer; 
                        font-weight: bold; display: flex; align-items: center; justify-content: center;
                    }
                    #meme-close:hover { background: #e1bee7; }
                </style>
            `;
      document.body.appendChild(overlay);

      document.getElementById("meme-close").addEventListener("click", () => {
        window[GLOBAL_STATE_VAR] = false;
        overlay.remove();
      });
    }
  } else {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }
})();
