// background.js - FIXED VERSION for Manifest V3 Service Worker
console.log("🔧 Background script loaded");

let captureInProgress = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔧 BACKGROUND: Received message:", message.type);

  if (message.type === "CAPTURE_AREA") {
    console.log(
      "📸 BACKGROUND: Processing capture request:",
      message.coordinates
    );

    if (captureInProgress) {
      console.log("⚠️ BACKGROUND: Capture already in progress");
      sendResponse({ success: false, error: "Capture in progress" });
      return;
    }

    captureInProgress = true;

    handleCapture(message.coordinates, sender.tab.id)
      .then((result) => {
        captureInProgress = false;
        console.log("✅ BACKGROUND: Capture completed successfully");
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        captureInProgress = false;
        console.error("❌ BACKGROUND: Capture failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === "SAVE_CROPPED_SNIP") {
    console.log("💾 BACKGROUND: Saving cropped snip");

    saveCroppedSnip(message.snipData)
      .then((result) => {
        console.log("✅ BACKGROUND: Snip saved successfully");
        sendResponse({ success: true, snipId: result.id });
      })
      .catch((error) => {
        console.error("❌ BACKGROUND: Save failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (message.type === "GET_SNIPS") {
    chrome.storage.local.get(["glyphie-snips"], (result) => {
      const snips = result["glyphie-snips"] || [];
      sendResponse({ success: true, snips: snips });
    });
    return true;
  }

  return false;
});

async function handleCapture(coordinates, tabId) {
  console.log("📸 BACKGROUND CAPTURE: Starting with coordinates:", coordinates);

  try {
    // Step 1: Hide overlay first
    console.log("📸 BACKGROUND: Hiding overlay before capture");
    await hideOverlay(tabId);

    // Step 2: Wait for overlay to be hidden
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Step 3: Capture full screenshot
    console.log("📸 BACKGROUND: Capturing visible tab");
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
      quality: 100,
    });

    console.log("📸 BACKGROUND: Screenshot captured, size:", dataUrl.length);

    // Step 4: Return screenshot and coordinates to popup for cropping
    return {
      screenshot: dataUrl,
      coordinates: coordinates,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ BACKGROUND CAPTURE ERROR:", error);
    throw error;
  }
}

// Helper function to hide overlay before capture
async function hideOverlay(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "HIDE_OVERLAY" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "⚠️ BACKGROUND: Could not hide overlay:",
          chrome.runtime.lastError
        );
        resolve(); // Continue anyway
      } else {
        console.log("✅ BACKGROUND: Overlay hidden");
        resolve(response);
      }
    });
  });
}

// Function to save cropped snip (called by popup after cropping)
async function saveCroppedSnip(snipData) {
  try {
    console.log("💾 BACKGROUND: Saving snip data");

    const result = await chrome.storage.local.get(["glyphie-snips"]);
    const existingSnips = result["glyphie-snips"] || [];
    existingSnips.push(snipData);

    await chrome.storage.local.set({ "glyphie-snips": existingSnips });

    console.log(
      "💾 BACKGROUND: Saved to storage, total:",
      existingSnips.length
    );

    // Show success notification
    await showSuccessNotification(snipData);

    return snipData;
  } catch (error) {
    console.error("❌ BACKGROUND SAVE ERROR:", error);
    throw error;
  }
}

// Show success notification on the page
async function showSuccessNotification(snipData) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (dimensions) => {
        console.log("📸 WEBPAGE: Showing success notification");
        const success = document.createElement("div");
        success.style.cssText = `
          position: fixed !important;
          top: 20px !important;
          right: 20px !important;
          background: linear-gradient(135deg, #00ff88, #4CAF50) !important;
          color: #000 !important;
          padding: 20px 30px !important;
          border-radius: 15px !important;
          font-weight: bold !important;
          z-index: 2147483647 !important;
          border: 3px solid #fff !important;
          box-shadow: 0 8px 32px rgba(0, 255, 136, 0.6) !important;
          font-family: 'Inter', sans-serif !important;
        `;
        success.innerHTML = `
          ✅ <span style="color: #000;">Snip saved!</span><br>
          📏 <small>${dimensions.width}×${dimensions.height}px</small>
        `;
        document.body.appendChild(success);

        setTimeout(() => {
          if (success.parentNode) {
            success.parentNode.removeChild(success);
          }
        }, 3000);
      },
      args: [snipData.dimensions],
    });
  } catch (error) {
    console.warn("⚠️ BACKGROUND: Could not show notification:", error);
  }
}
