// background.js - FIXED VERSION with proper overlay hiding and coordinate handling
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

        // Set navigation flags for auto-redirect to snip page
        chrome.storage.local.set({
          "glyphie-goto-snip": true,
          "glyphie-new-snip-id": result.id,
          "glyphie-new-snip-timestamp": result.timestamp,
        });

        sendResponse({ success: true, snipId: result.id });
      })
      .catch((error) => {
        captureInProgress = false;
        console.error("❌ BACKGROUND: Capture failed:", error);
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
    // Step 1: Hide overlay with enhanced method
    console.log("📸 BACKGROUND: Hiding overlay before capture");
    await hideOverlayRobustly(tabId);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Extra wait

    console.log("📸 BACKGROUND: Overlay should be hidden, waiting...");
    // Additional wait to ensure overlay is completely hidden
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 2: Capture full screenshot
    console.log("📸 BACKGROUND: Capturing visible tab");
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
      quality: 100,
    });
    console.log("📸 BACKGROUND: Screenshot captured, size:", dataUrl.length);

    // Step 3: Crop the image with proper coordinate handling
    console.log("📸 BACKGROUND: Cropping image with coordinates:", coordinates);
    const croppedImage = await cropImageInBackground(dataUrl, coordinates);
    console.log("📸 BACKGROUND: Image cropped, size:", croppedImage.length);

    // Step 4: Create snip data
    const snipData = {
      id: Date.now(),
      data: croppedImage,
      timestamp: new Date().toISOString(),
      dimensions: {
        width: Math.round(coordinates.width),
        height: Math.round(coordinates.height),
      },
    };

    // Step 5: Save to storage
    const result = await chrome.storage.local.get(["glyphie-snips"]);
    const existingSnips = result["glyphie-snips"] || [];
    existingSnips.push(snipData);

    await chrome.storage.local.set({ "glyphie-snips": existingSnips });
    console.log(
      "📸 BACKGROUND: Saved to storage, total:",
      existingSnips.length
    );

    // Step 6: Show success notification
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (dimensions) => {
        console.log("📸 WEBPAGE: Showing success notification");
        const success = document.createElement("div");
        success.style.cssText = `
          position: fixed !important; top: 20px !important; right: 20px !important;
          background: linear-gradient(135deg, #00ff88, #4CAF50) !important;
          color: #000 !important; padding: 20px 30px !important;
          border-radius: 15px !important; font-weight: bold !important;
          z-index: 2147483647 !important; border: 3px solid #fff !important;
        `;
        success.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 18px;">✅ Snip Saved!</div>
            <div style="font-size: 12px; margin-top: 5px;">Size: ${dimensions.width}×${dimensions.height}px</div>
            <div style="font-size: 11px; margin-top: 3px;">Click extension to view</div>
          </div>
        `;
        document.body.appendChild(success);
        setTimeout(() => success.remove(), 3000);
      },
      args: [snipData.dimensions],
    });

    return snipData;
  } catch (error) {
    console.error("❌ BACKGROUND: Capture failed:", error);

    // Clean up overlay on error
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const overlay = document.getElementById("glyphie-snip-overlay-v2");
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        },
      });
    } catch (cleanupError) {
      console.warn("⚠️ BACKGROUND: Cleanup error:", cleanupError);
    }

    throw error;
  }
}
// ENHANCED overlay hiding with multiple verification attempts
async function hideOverlayRobustly(tabId) {
  console.log("🙈 BACKGROUND: Starting robust overlay hiding");

  // Method 1: Remove overlay completely
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const overlay = document.getElementById("glyphie-snip-overlay-v2");
      if (overlay) {
        overlay.remove();
        console.log("🙈 CONTENT: Overlay completely removed");
      }
      // Also remove any other snip overlays
      const allOverlays = document.querySelectorAll(
        '[id*="glyphie-snip"], [class*="snip-overlay"]'
      );
      allOverlays.forEach((el) => el.remove());
    },
  });

  // Method 2: Wait and inject CSS to hide any remaining elements
  await new Promise((resolve) => setTimeout(resolve, 200));

  await chrome.scripting.insertCSS({
    target: { tabId: tabId },
    css: `
      #glyphie-snip-overlay-v2,
      [id*="glyphie-snip"],
      [class*="snip-overlay"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        z-index: -9999 !important;
      }
    `,
  });

  console.log("✅ BACKGROUND: Overlay hiding completed");
}

async function cropImageInBackground(dataUrl, coordinates) {
  try {
    // First try using an offscreen document for reliable cropping
    console.log("🔄 BACKGROUND: Using offscreen document for cropping");

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_SCRAPING"],
      justification: "Image cropping requires canvas manipulation",
    });

    // Send cropping request to offscreen document
    const croppedResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "CROP_IN_OFFSCREEN",
          dataUrl: dataUrl,
          coordinates: coordinates,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.croppedImage);
          } else {
            reject(new Error(response ? response.error : "Cropping failed"));
          }
        }
      );
    });

    // Close offscreen document
    await chrome.offscreen.closeDocument();

    return croppedResult;
  } catch (error) {
    console.error("⚠️ BACKGROUND: Offscreen cropping failed:", error);

    // Fallback: return original image if cropping fails
    console.log("🔄 BACKGROUND: Returning original image as fallback");
    return dataUrl;
  }
}
