// contentScript.js

function startSnipOverlay() {
  if (document.getElementById("glyphie-snip-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "glyphie-snip-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 999999;
  overlay.style.background = "rgba(0,0,0,0.3)";
  overlay.style.cursor = "crosshair";
  overlay.innerText = "Snip mode active ✂️";
  overlay.style.color = "white";
  overlay.style.fontSize = "24px";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);

  // === BASIC SNIP BOX ===
  let box = document.createElement("div");
  box.id = "glyphie-snip-box";
  box.style.position = "fixed";
  box.style.border = "2px dashed red";
  box.style.zIndex = "1000000";
  box.style.pointerEvents = "none";
  box.style.background = "rgba(255, 0, 0, 0.1)";
  document.body.appendChild(box);

  let startX, startY;

  function mouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    document.addEventListener("mousemove", mouseMove);
  }

  function mouseMove(e) {
    box.style.left = `${Math.min(e.clientX, startX)}px`;
    box.style.top = `${Math.min(e.clientY, startY)}px`;
    box.style.width = `${Math.abs(e.clientX - startX)}px`;
    box.style.height = `${Math.abs(e.clientY - startY)}px`;
  }

  function mouseUp(e) {
    document.removeEventListener("mousemove", mouseMove);
    document.removeEventListener("mousedown", mouseDown);
    document.removeEventListener("mouseup", mouseUp);
    console.log("Snip done at:", box.getBoundingClientRect());

    // Clean up
    overlay.remove();
    // box.remove(); // Keep this if you want to leave the selection
  }

  document.addEventListener("mousedown", mouseDown);
  document.addEventListener("mouseup", mouseUp);
}

// === Listen for injection ===
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.command === "startSnip") {
    startSnipOverlay();
  }
});
function startSnipOverlay() {
  if (document.getElementById("glyphie-snip-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "glyphie-snip-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 999999;
  overlay.style.background = "rgba(0,0,0,0.3)";
  overlay.style.cursor = "crosshair";
  overlay.style.color = "white";
  overlay.style.fontSize = "24px";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.innerText = "Snip mode active ✂️";
  document.body.appendChild(overlay);

  let box = document.createElement("div");
  box.id = "glyphie-snip-box";
  box.style.position = "fixed";
  box.style.border = "2px dashed red";
  box.style.zIndex = "1000000";
  box.style.pointerEvents = "none";
  box.style.background = "rgba(255, 0, 0, 0.1)";
  document.body.appendChild(box);

  let startX, startY;

  // Toolbar container
  const toolbar = document.createElement("div");
  toolbar.id = "glyphie-snip-toolbar";
  toolbar.style.position = "fixed";
  toolbar.style.zIndex = "1000001";
  toolbar.style.display = "none"; // initially hidden
  toolbar.style.gap = "10px";
  toolbar.style.background = "#222";
  toolbar.style.borderRadius = "10px";
  toolbar.style.padding = "8px 12px";
  toolbar.style.boxShadow = "0 0 10px #0f0";
  document.body.appendChild(toolbar);

  // Confirm button
  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Confirm Snip";
  confirmBtn.style.cursor = "pointer";
  toolbar.appendChild(confirmBtn);

  // Cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cursor = "pointer";
  toolbar.appendChild(cancelBtn);

  // Resnip button
  const resnipBtn = document.createElement("button");
  resnipBtn.textContent = "Resnip";
  resnipBtn.style.cursor = "pointer";
  toolbar.appendChild(resnipBtn);

  function mouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = "0px";
    box.style.height = "0px";
    box.style.display = "block";
    toolbar.style.display = "none";
    document.addEventListener("mousemove", mouseMove);
  }

  function mouseMove(e) {
    box.style.left = `${Math.min(e.clientX, startX)}px`;
    box.style.top = `${Math.min(e.clientY, startY)}px`;
    box.style.width = `${Math.abs(e.clientX - startX)}px`;
    box.style.height = `${Math.abs(e.clientY - startY)}px`;
  }

  function mouseUp(e) {
    document.removeEventListener("mousemove", mouseMove);
    // Show toolbar near box bottom-right corner
    const rect = box.getBoundingClientRect();
    toolbar.style.left = `${rect.right + 10}px`;
    toolbar.style.top = `${rect.bottom + 10}px`;
    toolbar.style.display = "flex";
  }

  confirmBtn.addEventListener("click", () => {
    // Get the box rect for cropping
    const rect = box.getBoundingClientRect();

    // Use chrome.tabs.captureVisibleTab to grab a screenshot (cropping performed later)
    chrome.runtime.sendMessage({ command: "captureTab" }, (dataUrl) => {
      if (!dataUrl) {
        alert("Failed to capture screenshot");
        cleanup();
        return;
      }

      cropAndSendImage(dataUrl, rect);
    });
  });

  cancelBtn.addEventListener("click", () => {
    cleanup();
  });

  resnipBtn.addEventListener("click", () => {
    box.style.display = "none";
    toolbar.style.display = "none";
    // Restart selection by waiting for new mousedown
  });

  function cleanup() {
    overlay.remove();
    box.remove();
    toolbar.remove();
  }

  function cropAndSendImage(dataUrl, rect) {
    const img = new Image();
    img.onload = () => {
      // Calculate scaling between image natural size and viewport
      const scaleX = img.naturalWidth / window.innerWidth;
      const scaleY = img.naturalHeight / window.innerHeight;

      // Create canvas and crop image
      const canvas = document.createElement("canvas");
      canvas.width = rect.width * scaleX;
      canvas.height = rect.height * scaleY;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        rect.left * scaleX,
        rect.top * scaleY,
        rect.width * scaleX,
        rect.height * scaleY,
        0,
        0,
        rect.width * scaleX,
        rect.height * scaleY
      );

      // Convert cropped image to base64
      const croppedDataUrl = canvas.toDataURL("image/png");

      // Send base64 snip image back to popup
      chrome.runtime.sendMessage({
        type: "snipResult",
        data: { imageData: croppedDataUrl },
      });

      cleanup();
    };
    img.src = dataUrl;
  }

  document.addEventListener("mousedown", mouseDown, { once: true });
  document.addEventListener("mouseup", mouseUp, { once: true });
}

// Listen for injection command
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.command === "startSnip") {
    startSnipOverlay();
  }
});
