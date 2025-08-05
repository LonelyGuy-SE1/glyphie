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
