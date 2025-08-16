// background.js - FIXED VERSION (No cropping in service worker)
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
  console.log("📸 BACKGROUND CAPTURE: Starting");

  try {
    // Step 1: Hide overlay before capture
    console.log("🔸 BACKGROUND: Hiding overlay before capture");
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const overlay = document.getElementById("glyphie-snip-overlay-v2");
        if (overlay) {
          overlay.style.display = "none";
        }
      },
    });

    // Wait a bit for overlay to hide
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Step 2: Capture full screenshot
    console.log("🔸 BACKGROUND: Capturing visible tab");
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
      quality: 100,
    });
    console.log("📸 BACKGROUND: Screenshot captured, size:", dataUrl.length);

    // Step 2: Send screenshot + coordinates to popup for cropping
    console.log("📸 BACKGROUND: Sending to popup for cropping");
    const croppedImage = await sendToCropInPopup(dataUrl, coordinates);
    console.log(
      "📸 BACKGROUND: Received cropped image, size:",
      croppedImage.length
    );

    // Step 3: Create snip data
    const snipData = {
      id: Date.now(),
      data: croppedImage,
      timestamp: new Date().toISOString(),
      dimensions: {
        width: Math.round(coordinates.width),
        height: Math.round(coordinates.height),
      },
    };

    // Step 4: Save to storage
    const result = await chrome.storage.local.get(["glyphie-snips"]);
    const existingSnips = result["glyphie-snips"] || [];
    existingSnips.push(snipData);

    await chrome.storage.local.set({ "glyphie-snips": existingSnips });
    console.log(
      "📸 BACKGROUND: Saved to storage, total:",
      existingSnips.length
    );

    // Step 5: Show success notification
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
        setTimeout(() => success.remove(), 5000);
      },
      args: [snipData.dimensions],
    });

    return snipData;
  } catch (error) {
    console.error("❌ BACKGROUND: Capture failed:", error);
    throw error;
  }
}

async function sendToCropInPopup(dataUrl, coordinates) {
  try {
    // First try popup method
    const popupResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "CROP_IMAGE",
          dataUrl: dataUrl,
          coordinates: coordinates,
        },
        (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            resolve(null);
          } else {
            resolve(response.croppedImage);
          }
        }
      );
      // Quick timeout for popup method
      setTimeout(() => resolve(null), 1000);
    });

    if (popupResult) {
      console.log("✅ BACKGROUND: Popup cropping succeeded");
      return popupResult;
    }

    // Fallback: Create offscreen document for cropping
    console.log("🔄 BACKGROUND: Using offscreen document for cropping");

    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_SCRAPING"],
      justification: "Image cropping requires canvas manipulation",
    });

    const croppedResult = await chrome.runtime.sendMessage({
      type: "CROP_IN_OFFSCREEN",
      dataUrl: dataUrl,
      coordinates: coordinates,
    });

    await chrome.offscreen.closeDocument();

    return croppedResult.croppedImage;
  } catch (error) {
    console.error("⚠️ BACKGROUND: All cropping methods failed:", error);
    // Last resort: return original image
    return dataUrl;
  }
}
