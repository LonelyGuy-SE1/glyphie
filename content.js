// content.js - SUPER DEBUG VERSION
console.log("🔧 GLYPHIE: Content script loaded on:", window.location.href);

// Prevent multiple loads
if (window.glyphieSnipLoaded) {
  console.log("GLYPHIE: Already loaded, skipping");
} else {
  window.glyphieSnipLoaded = true;
  console.log("GLYPHIE: First load, setting up listeners");

  // Listen for messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 GLYPHIE: Content script got message:", message);

    if (message.type === "START_SNIP") {
      console.log("🎯 GLYPHIE: Starting snip mode");
      try {
        createTestOverlay();
        console.log("✅ GLYPHIE: Overlay created successfully");
        sendResponse({ success: true });
      } catch (error) {
        console.error("❌ GLYPHIE: Error creating overlay:", error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  });

  function createTestOverlay() {
    console.log("GLYPHIE: createTestOverlay() called");

    // Remove any existing overlay
    const existing = document.getElementById("test-overlay");
    if (existing) {
      console.log("GLYPHIE: Removing existing overlay");
      existing.remove();
    }

    // Create bright red overlay
    const overlay = document.createElement("div");
    overlay.id = "test-overlay";
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(255, 0, 0, 0.7) !important;
      z-index: 2147483647 !important;
      cursor: crosshair !important;
    `;

    console.log("GLYPHIE: Overlay element created");

    // Add instruction text
    const instructions = document.createElement("div");
    instructions.style.cssText = `
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: black !important;
      color: yellow !important;
      padding: 30px !important;
      font-size: 24px !important;
      border: 5px solid yellow !important;
      text-align: center !important;
      font-family: Arial, sans-serif !important;
    `;
    instructions.innerHTML =
      "DEBUG MODE ACTIVE!<br>Click me to test capture<br>Check console for logs";

    overlay.appendChild(instructions);

    console.log("GLYPHIE: Instructions added to overlay");

    // Add click handler with multiple fallbacks
    const clickHandler = function (e) {
      console.log("🖱️ GLYPHIE: Overlay clicked! Event:", e);

      try {
        // Stop event from bubbling
        e.preventDefault();
        e.stopPropagation();

        console.log("GLYPHIE: Removing overlay...");
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
          console.log("GLYPHIE: Overlay removed");
        }

        console.log("GLYPHIE: Showing success message...");
        showSuccessOnPage();

        console.log("GLYPHIE: Sending runtime message...");
        sendCaptureMessage();
      } catch (error) {
        console.error("❌ GLYPHIE: Click handler error:", error);
        // Show error on page
        showErrorOnPage(error.message);
      }
    };

    // Add multiple event listeners as fallbacks
    overlay.addEventListener("click", clickHandler, true);
    overlay.addEventListener("mousedown", clickHandler, true);
    instructions.addEventListener("click", clickHandler, true);

    console.log("GLYPHIE: Click handlers added");

    // Add to page
    try {
      document.body.appendChild(overlay);
      console.log("✅ GLYPHIE: Overlay successfully added to page");

      // Test if overlay is actually visible
      const rect = overlay.getBoundingClientRect();
      console.log("GLYPHIE: Overlay dimensions:", rect);
    } catch (error) {
      console.error("❌ GLYPHIE: Failed to add overlay to page:", error);
    }
  }

  // Show success message directly on the webpage
  function showSuccessOnPage() {
    console.log("GLYPHIE: showSuccessOnPage() called");

    try {
      const successMsg = document.createElement("div");
      successMsg.id = "glyphie-success-msg";
      successMsg.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: green !important;
        color: white !important;
        padding: 40px !important;
        font-size: 24px !important;
        border: 5px solid white !important;
        z-index: 2147483647 !important;
        font-family: Arial, sans-serif !important;
        text-align: center !important;
      `;

      successMsg.innerHTML = `
        <div>✅ SUCCESS!</div>
        <div>Capture message sent</div>
        <div>Size: 200×200px</div>
        <div style="font-size: 14px; margin-top: 10px;">This message will disappear in 5 seconds</div>
      `;

      document.body.appendChild(successMsg);
      console.log("✅ GLYPHIE: Success message added to page");

      // Remove after 5 seconds
      setTimeout(() => {
        if (successMsg && successMsg.parentNode) {
          successMsg.parentNode.removeChild(successMsg);
          console.log("GLYPHIE: Success message removed");
        }
      }, 5000);
    } catch (error) {
      console.error("❌ GLYPHIE: Error showing success message:", error);
    }
  }

  // Show error message on page
  function showErrorOnPage(errorMsg) {
    console.log("GLYPHIE: showErrorOnPage() called with:", errorMsg);

    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: red !important;
      color: white !important;
      padding: 20px !important;
      font-size: 18px !important;
      border: 3px solid white !important;
      z-index: 2147483647 !important;
      font-family: Arial, sans-serif !important;
      text-align: center !important;
    `;

    errorDiv.innerHTML = `❌ ERROR:<br>${errorMsg}`;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);
  }

  // Send capture message
  function sendCaptureMessage() {
    console.log("GLYPHIE: sendCaptureMessage() called");

    try {
      chrome.runtime.sendMessage(
        {
          type: "CAPTURE_AREA",
          coordinates: { x: 100, y: 100, width: 200, height: 200 },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "❌ GLYPHIE: Runtime message error:",
              chrome.runtime.lastError
            );
          } else {
            console.log("✅ GLYPHIE: Message sent successfully:", response);
          }
        }
      );
    } catch (error) {
      console.error("❌ GLYPHIE: Error sending message:", error);
    }
  }

  console.log("✅ GLYPHIE: Content script setup complete");
}
