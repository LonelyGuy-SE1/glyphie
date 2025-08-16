// offscreen.js - Handles image cropping in offscreen document

console.log("🖼️ Offscreen document loaded for image processing");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CROP_IN_OFFSCREEN") {
    console.log("✂️ OFFSCREEN: Cropping image...");

    cropImage(message.dataUrl, message.coordinates)
      .then((croppedImage) => {
        console.log("✂️ OFFSCREEN: Cropping completed");
        sendResponse({ success: true, croppedImage: croppedImage });
      })
      .catch((error) => {
        console.error("✂️ OFFSCREEN: Cropping failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }
});

function cropImage(dataUrl, coordinates) {
  return new Promise((resolve, reject) => {
    console.log("✂️ OFFSCREEN: Starting crop operation");

    const img = new Image();
    img.onload = () => {
      try {
        console.log("✂️ OFFSCREEN: Image loaded, creating canvas");

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = coordinates.width;
        canvas.height = coordinates.height;

        // Account for device pixel ratio and potential scroll offset
        const ratio = window.devicePixelRatio || 1;

        // Use coordinates as-is since they're already in screen pixels
        ctx.drawImage(
          img,
          coordinates.x,
          coordinates.y,
          coordinates.width,
          coordinates.height,
          0,
          0,
          coordinates.width,
          coordinates.height
        );

        const result = canvas.toDataURL("image/png");
        console.log("✂️ OFFSCREEN: Crop completed, size:", result.length);
        resolve(result);
      } catch (error) {
        console.error("✂️ OFFSCREEN: Canvas error:", error);
        reject(error);
      }
    };

    img.onerror = () => {
      console.error("✂️ OFFSCREEN: Image load failed");
      reject(new Error("Failed to load image"));
    };

    img.src = dataUrl;
  });
}
