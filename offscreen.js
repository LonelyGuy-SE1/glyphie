// offscreen.js - FIXED VERSION with proper coordinate handling

console.log("🖼️ Offscreen document loaded for image processing");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CROP_IN_OFFSCREEN") {
    console.log(
      "✂️ OFFSCREEN: Cropping image with coordinates:",
      message.coordinates
    );

    cropImage(message.dataUrl, message.coordinates)
      .then((croppedImage) => {
        console.log("✂️ OFFSCREEN: Cropping completed successfully");
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
    console.log("✂️ OFFSCREEN: Coordinates:", coordinates);

    const img = new Image();

    img.onload = () => {
      try {
        console.log("✂️ OFFSCREEN: Image loaded:", img.width, "x", img.height);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas size to the desired crop size
        canvas.width = Math.round(coordinates.width);
        canvas.height = Math.round(coordinates.height);

        console.log(
          "✂️ OFFSCREEN: Canvas size:",
          canvas.width,
          "x",
          canvas.height
        );

        // Get device pixel ratio for proper scaling
        const devicePixelRatio = window.devicePixelRatio || 1;
        console.log("✂️ OFFSCREEN: Device pixel ratio:", devicePixelRatio);

        // Apply pixel ratio correction - the key fix here
        const sourceX = Math.round(coordinates.x * devicePixelRatio);
        const sourceY = Math.round(coordinates.y * devicePixelRatio);
        const sourceWidth =
          Math.round(coordinates.width * devicePixelRatio) + 75;
        const sourceHeight =
          Math.round(coordinates.height * devicePixelRatio) + 75;

        console.log("✂️ OFFSCREEN: Source crop area:", {
          x: sourceX,
          y: sourceY,
          width: sourceWidth,
          height: sourceHeight,
        });

        // Ensure we don't crop outside the image bounds
        const actualSourceX = Math.max(0, Math.min(sourceX, img.width));
        const actualSourceY = Math.max(0, Math.min(sourceY, img.height));
        const actualSourceWidth = Math.min(
          sourceWidth,
          img.width - actualSourceX
        );
        const actualSourceHeight = Math.min(
          sourceHeight,
          img.height - actualSourceY
        );

        console.log("✂️ OFFSCREEN: Adjusted source crop area:", {
          x: actualSourceX,
          y: actualSourceY,
          width: actualSourceWidth,
          height: actualSourceHeight,
        });

        // Draw the cropped portion
        ctx.drawImage(
          img,
          actualSourceX, // source x
          actualSourceY, // source y
          actualSourceWidth, // source width
          actualSourceHeight, // source height
          0, // destination x
          0, // destination y
          canvas.width, // destination width
          canvas.height // destination height
        );

        const result = canvas.toDataURL("image/png", 1.0);
        console.log(
          "✂️ OFFSCREEN: Crop completed, result size:",
          result.length
        );
        resolve(result);
      } catch (error) {
        console.error("✂️ OFFSCREEN: Canvas error:", error);
        reject(error);
      }
    };

    img.onerror = (error) => {
      console.error("✂️ OFFSCREEN: Image load failed:", error);
      reject(new Error("Failed to load image for cropping"));
    };

    img.src = dataUrl;
    console.log("✂️ OFFSCREEN: Loading image...");
  });
}
