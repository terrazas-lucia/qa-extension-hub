(function () {
  const TOOL_ID = "text_compare";
  const GLOBAL_STATE_VAR = `__${TOOL_ID}Toggled`;

  window[GLOBAL_STATE_VAR] =
    typeof window[GLOBAL_STATE_VAR] === "undefined"
      ? true
      : !window[GLOBAL_STATE_VAR];
  const isActivating = window[GLOBAL_STATE_VAR];

  const WRAPPER_ID = "qa-text-compare-wrapper";

  if (isActivating) {
    if (!document.getElementById(WRAPPER_ID)) {
      const container = document.createElement("div");
      container.id = WRAPPER_ID;
      container.innerHTML = `
                <div class="tc-header">
                    <span>Text Compare</span>
                    <button id="tc-close">×</button>
                </div>
                <div class="tc-body">
                    <div class="tc-column">
                        <label>Original Text</label>
                        <textarea id="tc-text-1" placeholder="Paste source text..."></textarea>
                    </div>
                    <div class="tc-column">
                        <label>Comparison Text</label>
                        <textarea id="tc-text-2" placeholder="Paste comparison text..."></textarea>
                    </div>
                </div>
                
                <div id="tc-diff-container" style="display:none;">
                    <label style="margin: 0 20px; font-size: 11px; font-weight: 700; color: #665c8a; text-transform: uppercase;">Visual Comparison:</label>
                    <div id="tc-diff-viewer"></div>
                </div>

                <div id="tc-result">Awaiting comparison...</div>
                
                <div class="tc-footer">
                    <button id="tc-run-compare" class="tc-btn-primary">COMPARE & HIGHLIGHT</button>
                    <button id="tc-clear" class="tc-btn-secondary">CLEAR</button>
                </div>
                <style>
                    #${WRAPPER_ID} {
                        position: fixed; top: 30px; right: 30px; width: 550px;
                        background: #ffffff; border-radius: 12px; 
                        box-shadow: 0 4px 15px rgba(156, 39, 176, 0.1);
                        z-index: 2147483647; font-family: 'Inter', sans-serif;
                        display: flex; flex-direction: column; border: 2px solid #e0e0f8;
                        overflow: hidden;
                    }
                    .tc-header { 
                        background: #ffffff; color: #4a148c; padding: 12px 18px; 
                        display: flex; justify-content: space-between; align-items: center; 
                        font-weight: 700; border-bottom: 2px solid #e0e0f8;
                        font-size: 14px;
                    }
                    .tc-body { display: flex; gap: 12px; padding: 15px 20px; background: #fcfcff; }
                    .tc-column { flex: 1; display: flex; flex-direction: column; gap: 6px; }
                    .tc-column label { font-size: 11px; font-weight: 700; color: #665c8a; text-transform: uppercase; }
                    
                    textarea { 
                        height: 120px; padding: 10px; border: 1px solid #d1c4e9; 
                        border-radius: 8px; resize: none; font-size: 12px; background: #ffffff;
                        font-family: 'Inter', sans-serif; color: #333366;
                        transition: border-color 0.2s;
                    }
                    textarea:focus { outline: none; border-color: #9c27b0; }

                    #tc-diff-viewer {
                        margin: 5px 20px 15px 20px; padding: 12px; 
                        background: #ffffff; border: 1px dashed #d1c4e9;
                        border-radius: 10px; font-size: 13px; line-height: 1.6;
                        max-height: 200px; overflow-y: auto; color: #333366;
                    }

                    .word-match { color: #2e7d32; background: #e8f5e9; padding: 0 2px; border-radius: 2px; }
                    .word-mismatch { color: #c62828; background: #ffebee; text-decoration: underline; font-weight: bold; padding: 0 2px; border-radius: 2px; }

                    .tc-footer { padding: 15px 20px; background: #ffffff; display: flex; gap: 10px; border-top: 1px solid #e0e0f8; }
                    
                    .tc-btn-primary { 
                        background: #f06292; color: white; border: none; padding: 10px; 
                        border-radius: 6px; cursor: pointer; flex: 2; font-weight: 700; 
                        font-size: 13px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(240, 98, 146, 0.2);
                    }
                    .tc-btn-primary:hover { background: #ec407a; transform: translateY(-1px); }

                    .tc-btn-secondary { 
                        background: #d1c4e9; color: #333366; border: none; padding: 10px; 
                        border-radius: 6px; cursor: pointer; flex: 1; font-weight: 600; 
                        font-size: 13px; transition: all 0.2s;
                    }
                    .tc-btn-secondary:hover { background: #b39ddb; }

                    #tc-result { 
                        margin: 0 20px; padding: 10px; text-align: center; font-weight: 700; 
                        font-size: 12px; border-radius: 8px; background: #f7f3ff; color: #665c8a; 
                        text-transform: uppercase; letter-spacing: 0.5px;
                    }
                    .tc-match-status { background: #e8f5e9 !important; color: #2e7d32 !important; border: 1px solid #2e7d32; }
                    .tc-diff-status { background: #ffeef0 !important; color: #cb2431 !important; border: 1px solid #cb2431; }
                    
                    #tc-close { background: none; border: none; color: #f06292; font-size: 24px; cursor: pointer; line-height: 1; }
                    #tc-close:hover { color: #74014c; }
                </style>
            `;
      document.body.appendChild(container);

      document
        .getElementById("tc-run-compare")
        .addEventListener("click", performComparison);
      document.getElementById("tc-clear").addEventListener("click", () => {
        document.getElementById("tc-text-1").value = "";
        document.getElementById("tc-text-2").value = "";
        document.getElementById("tc-diff-container").style.display = "none";
        const res = document.getElementById("tc-result");
        res.textContent = "Awaiting comparison...";
        res.className = "";
      });
      document.getElementById("tc-close").addEventListener("click", () => {
        window[GLOBAL_STATE_VAR] = false;
        container.remove();
      });
    }
  } else {
    const existing = document.getElementById(WRAPPER_ID);
    if (existing) existing.remove();
  }

  function performComparison() {
    const t1 = document.getElementById("tc-text-1").value.trim();
    const t2 = document.getElementById("tc-text-2").value.trim();
    const resultDiv = document.getElementById("tc-result");
    const diffViewer = document.getElementById("tc-diff-viewer");
    const diffContainer = document.getElementById("tc-diff-container");

    if (!t1 || !t2) {
      resultDiv.textContent = "Please fill both fields.";
      resultDiv.className = "tc-diff-status";
      return;
    }

    const words1 = t1.split(/(\s+)/);
    const words2 = t2.split(/(\s+)/);

    let htmlOutput = "";
    let isPerfectMatch = t1 === t2;

    words1.forEach((word, index) => {
      if (word === words2[index]) {
        htmlOutput += `<span class="word-match">${word}</span>`;
      } else {
        htmlOutput += `<span class="word-mismatch">${word || ""}</span>`;
      }
    });

    diffViewer.innerHTML = htmlOutput;
    diffContainer.style.display = "block";

    if (isPerfectMatch) {
      resultDiv.textContent = "✓ PERFECT MATCH";
      resultDiv.className = "tc-match-status";
    } else {
      resultDiv.textContent = "✗ DIFFERENCE DETECTED";
      resultDiv.className = "tc-diff-status";
    }
  }
})();
