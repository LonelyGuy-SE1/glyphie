async function handleCapture(coordinates, tabId) {
  console.log("📸 BACKGROUND CAPTURE: Starting");

  try {
    // Step 1: Capture full screenshot
    console.log("📸 BACKGROUND: Capturing visible tab");
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
      name: `Screenshot ${Math.round(coordinates.width)}×${Math.round(
        coordinates.height
      )}`,
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

    // Step 5: SET NAVIGATION FLAG - This will make extension open to snip page
    await chrome.storage.local.set({
      "glyphie-goto-snip": true,
      "glyphie-new-snip-id": snipData.id,
      "glyphie-new-snip-timestamp": Date.now(),
    });
    console.log(
      "📸 BACKGROUND: Set navigation flag - extension will open to snip page"
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
            <div style="font-size: 11px; margin-top: 3px; color: #bbff00;">Click extension to view & use</div>
          </div>
        `;
        document.body.appendChild(success);
        setTimeout(() => success.remove(), 6000);
      },
      args: [snipData.dimensions],
    });

    console.log(
      "✅ BACKGROUND: Capture completed, user will be taken to snip page on next open"
    );
    return snipData;
  } catch (error) {
    console.error("❌ BACKGROUND: Capture failed:", error);
    throw error;
  }
}
