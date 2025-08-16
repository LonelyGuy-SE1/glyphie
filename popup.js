// === AI personalities data ===
const characters = [
  {
    key: "white",
    name: "Agent White",
    bio: "Your MultiPurpose AI Assistant. (White is your no bullshit assistant, who can help you with anything from coding to life advice.)",
    image: "avatars/white.png",
  },
  {
    key: "dev",
    name: "Stack Monk",
    bio: "I exist to bring clarity to chaos — guiding you through full-stack development with calm, precision, and mindful mastery.",
    image: "avatars/dev.png",
  },
  {
    key: "cat",
    name: "Dr. Paws",
    bio: "I exist to help you feel seen, soothed, and slightly more human — with the quiet wisdom of a cat who's been through nine lives of healing.",
    image: "avatars/cat.png",
  },
];

// Map character keys to unique API keys for chat requests
const characterApiKeys = {
  white: "pk-7a4dbd1aa8d5b8a7b9bb320acee0bc25deab56639c84ddf88e1b82fd2e8dc4c9",
  dev: "pk-f4101d1b38a8a1a784a8351c0364493caa107b2c3b7a0eead077c3c1bd615df8",
  cat: "pk-70d8684a117f9e22c2383180def7f4e18ab4b73fb8024283466a80b4bdd77ab4",
};

const BASE_URL = "https://open.service.crestal.network/v1";

const sidebarButtons = document.querySelectorAll("#sidebar .nav-btn");
const mainContent = document.getElementById("main-content");

let currentCharKey = null;
let chatHistory = [];
let currentChatId = null;

// Snip functionality variables
let storedSnips = [];
let selectedSnips = [];

// Attachment handling
const attachmentInput = (() => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";
  document.body.appendChild(input);
  return input;
})();

let pendingAttachment = null;
let pendingAttachmentPreviewUrl = null;

// === SNIP FUNCTIONALITY ===

// UPDATED loadStoredSnips - Use chrome.storage
async function loadStoredSnips() {
  try {
    const result = await chrome.storage.local.get(["glyphie-snips"]);
    storedSnips = result["glyphie-snips"] || [];
    console.log("📁 Loaded", storedSnips.length, "snips from chrome.storage");
  } catch (error) {
    console.error("❌ Error loading snips:", error);
    storedSnips = [];
  }
}

// Save snips to localStorage
function saveSnips() {
  localStorage.setItem("glyphie-snips", JSON.stringify(storedSnips));
}
// ENHANCED handleSnipAction with more debugging
async function handleSnipAction() {
  console.log("🔍 POPUP: Starting snip action (ENHANCED DEBUG)");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || tab.url.startsWith("chrome://")) {
      alert("Cannot snip on this page");
      return;
    }

    console.log("🔍 POPUP: Working with tab:", tab.id, tab.url);

    // Inject enhanced content script
    console.log("🔍 POPUP: Injecting enhanced content script...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        console.log("📨 CONTENT: Enhanced script starting");

        if (window.glyphieSnipActive) {
          console.log("📨 CONTENT: Already active, cleaning up first");
          window.glyphieSnipActive = false;
        }

        window.glyphieSnipActive = true;

        let overlay,
          isSelecting = false,
          startX = 0,
          startY = 0;

        function createOverlay() {
          console.log("📨 CONTENT: Creating overlay");

          overlay = document.createElement("div");
          overlay.style.cssText = `
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            background: rgba(0, 0, 0, 0.4) !important; z-index: 2147483647 !important;
            cursor: crosshair !important;
          `;

          const instructions = document.createElement("div");
          instructions.style.cssText = `
            position: absolute !important; top: 30px !important; left: 50% !important;
            transform: translateX(-50%) !important; background: rgba(0, 0, 0, 0.9) !important;
            color: #bbff00 !important; padding: 15px 25px !important;
            border: 3px solid #bbff00 !important; border-radius: 10px !important;
            font-size: 16px !important; font-weight: bold !important; text-align: center !important;
          `;
          instructions.innerHTML =
            "✂️ Click and drag to select area<br><small>Press ESC to cancel</small>";

          const selectionBox = document.createElement("div");
          selectionBox.style.cssText = `
            position: absolute !important; border: 4px dashed #bbff00 !important;
            background: rgba(187, 255, 0, 0.15) !important; display: none !important;
            pointer-events: none !important;
          `;

          overlay.append(instructions, selectionBox);
          document.body.appendChild(overlay);
          console.log("📨 CONTENT: Overlay added to page");

          overlay.onmousedown = (e) => {
            console.log("📨 CONTENT: Mouse down at", e.clientX, e.clientY);
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;
            selectionBox.style.left = startX + "px";
            selectionBox.style.top = startY + "px";
            selectionBox.style.width = "0px";
            selectionBox.style.height = "0px";
            selectionBox.style.display = "block";
            e.preventDefault();
          };

          overlay.onmousemove = (e) => {
            if (!isSelecting) return;
            const width = Math.abs(e.clientX - startX),
              height = Math.abs(e.clientY - startY);
            selectionBox.style.left = Math.min(startX, e.clientX) + "px";
            selectionBox.style.top = Math.min(startY, e.clientY) + "px";
            selectionBox.style.width = width + "px";
            selectionBox.style.height = height + "px";
            instructions.innerHTML = `📏 ${Math.round(width)} × ${Math.round(
              height
            )}px`;
          };

          overlay.onmouseup = (e) => {
            if (!isSelecting) return;
            isSelecting = false;
            console.log("📨 CONTENT: Mouse up, processing selection");

            const rect = selectionBox.getBoundingClientRect();
            console.log("📨 CONTENT: Selection rect:", rect);

            if (rect.width > 20 && rect.height > 20) {
              instructions.innerHTML = "✅ Processing... Please wait";
              instructions.style.borderColor = "#00ff88";

              const coordinates = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
              };

              console.log(
                "📨 CONTENT: Sending CAPTURE_AREA to background:",
                coordinates
              );

              // Send to background script
              chrome.runtime.sendMessage(
                {
                  type: "CAPTURE_AREA",
                  coordinates: coordinates,
                },
                (response) => {
                  console.log("📨 CONTENT: Background response:", response);
                  if (chrome.runtime.lastError) {
                    console.error(
                      "📨 CONTENT: Runtime error:",
                      chrome.runtime.lastError
                    );
                  }
                }
              );

              // Remove overlay after delay
              setTimeout(() => {
                if (overlay) {
                  overlay.remove();
                  window.glyphieSnipActive = false;
                  console.log("📨 CONTENT: Overlay removed");
                }
              }, 1000);
            } else {
              console.log("📨 CONTENT: Selection too small");
              instructions.innerHTML = "❌ Too small! Try again";
              selectionBox.style.display = "none";
            }
          };

          document.onkeydown = (e) => {
            if (e.key === "Escape" && overlay) {
              console.log("📨 CONTENT: ESC pressed");
              overlay.remove();
              window.glyphieSnipActive = false;
            }
          };
        }

        createOverlay();
        console.log("📨 CONTENT: Enhanced script completed");
      },
    });

    console.log("✅ POPUP: Enhanced content script injected");

    // Update UI
    const snipBtn =
      document.getElementById("active-snip-btn") ||
      document.querySelector("#snip-btn");
    if (snipBtn) {
      snipBtn.textContent = "Snipping... Check browser console for debug info";
      snipBtn.disabled = true;
      snipBtn.style.background = "#bbff00";
      snipBtn.style.color = "#000";
    }

    console.log("✅ POPUP: Snip action completed, you can close popup now");
  } catch (error) {
    console.error("❌ POPUP: Snip action failed:", error);
    alert("Failed to start snipping: " + error.message);
  }
}

// NEW: Minimize popup function
function minimizePopup(status = "Minimized") {
  const container = document.getElementById("container");
  const minimizedStatus = document.getElementById("minimized-status");

  if (container && minimizedStatus) {
    container.classList.add("minimized");
    container.classList.add("snipping"); // Add pulsing animation
    minimizedStatus.textContent = status;

    console.log("📦 POPUP: Minimized with status:", status);

    // Update document size to fit minimized state
    document.body.style.width = "120px";
    document.body.style.height = "60px";
  }
}

// NEW: Expand popup function
function expandPopup() {
  const container = document.getElementById("container");

  if (container) {
    container.classList.remove("minimized");
    container.classList.remove("snipping");

    console.log("📦 POPUP: Expanded back to full size");

    // Restore document size
    document.body.style.width = "";
    document.body.style.height = "";
  }
}

// ENHANCED content script function - Replace robustSnipScript in popup.js
function robustSnipScript() {
  console.log(
    "🔧 CONTENT: Robust snip script starting on:",
    window.location.href
  );

  // Prevent multiple loads with a more unique identifier
  const SCRIPT_ID = "glyphie-snip-script-v2";
  if (window[SCRIPT_ID]) {
    console.log("🔧 CONTENT: Script already active, updating listeners");
    return;
  }
  window[SCRIPT_ID] = true;

  let overlay = null;
  let isSelecting = false;
  let startX = 0,
    startY = 0;

  // Remove any existing listeners first
  if (window.glyphieMessageListener) {
    chrome.runtime.onMessage.removeListener(window.glyphieMessageListener);
  }

  // Create persistent message listener
  window.glyphieMessageListener = (message, sender, sendResponse) => {
    console.log("📨 CONTENT: Received message:", message.type, "from:", sender);

    if (message.type === "TEST_CONNECTION") {
      console.log("📨 CONTENT: Responding to connection test");
      sendResponse({
        success: true,
        message: "Content script is active",
        timestamp: Date.now(),
        url: window.location.href,
      });
      return false;
    }

    if (message.type === "START_SNIP") {
      console.log("📨 CONTENT: Processing START_SNIP request");

      try {
        createOverlay();
        console.log("✅ CONTENT: Overlay created successfully");

        sendResponse({
          success: true,
          message: "Overlay created",
          timestamp: Date.now(),
          url: window.location.href,
        });

        return false;
      } catch (error) {
        console.error("❌ CONTENT: Error creating overlay:", error);
        sendResponse({
          success: false,
          error: error.message,
          timestamp: Date.now(),
        });
        return false;
      }
    }

    console.log("📨 CONTENT: Unknown message type:", message.type);
    return false;
  };

  // Add the persistent listener
  chrome.runtime.onMessage.addListener(window.glyphieMessageListener);
  console.log("✅ CONTENT: Message listener added");

  function createOverlay() {
    console.log("🔧 CONTENT: Creating overlay");

    // Clean up any existing overlay
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }

    overlay = document.createElement("div");
    overlay.id = "glyphie-snip-overlay-v2";
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      background: rgba(0, 0, 0, 0.3) !important;
      z-index: 2147483647 !important;
      cursor: crosshair !important;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
      user-select: none !important;
    `;

    const instructions = document.createElement("div");
    instructions.style.cssText = `
      position: absolute !important; top: 30px !important; left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.95) !important; color: #bbff00 !important;
      padding: 15px 25px !important; border: 3px solid #bbff00 !important;
      border-radius: 10px !important; font-size: 16px !important;
      font-weight: bold !important; text-align: center !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8) !important;
      pointer-events: none !important;
    `;
    instructions.innerHTML =
      "✂️ Click and drag to select area<br><small>Press ESC to cancel</small>";

    const selectionBox = document.createElement("div");
    selectionBox.style.cssText = `
      position: absolute !important;
      border: 3px dashed #bbff00 !important;
      background: rgba(187, 255, 0, 0.1) !important;
      display: none !important; 
      pointer-events: none !important;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3) !important;
    `;

    overlay.appendChild(instructions);
    overlay.appendChild(selectionBox);

    // Event handlers with better coordinate tracking
    overlay.addEventListener("mousedown", (e) => {
      try {
        console.log("🖱️ CONTENT: Mouse down at screen:", e.clientX, e.clientY);
        console.log("🖱️ CONTENT: Page scroll:", window.scrollX, window.scrollY);
        console.log(
          "🖱️ CONTENT: Viewport size:",
          window.innerWidth,
          window.innerHeight
        );

        isSelecting = true;

        // Use clientX/Y for screen coordinates (what we want for cropping)
        startX = e.clientX;
        startY = e.clientY;

        selectionBox.style.left = startX + "px";
        selectionBox.style.top = startY + "px";
        selectionBox.style.width = "0px";
        selectionBox.style.height = "0px";
        selectionBox.style.display = "block";
        instructions.innerHTML = "🎯 Dragging... Release to capture";

        e.preventDefault();
        e.stopPropagation();
      } catch (error) {
        console.error("❌ CONTENT: Mouse down error:", error);
      }
    });

    overlay.addEventListener("mousemove", (e) => {
      if (!isSelecting) return;
      try {
        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);

        selectionBox.style.left = left + "px";
        selectionBox.style.top = top + "px";
        selectionBox.style.width = width + "px";
        selectionBox.style.height = height + "px";

        instructions.innerHTML = `📏 ${Math.round(width)} × ${Math.round(
          height
        )}px<br><small>Release to capture</small>`;
      } catch (error) {
        console.error("❌ CONTENT: Mouse move error:", error);
      }
    });

    overlay.addEventListener("mouseup", (e) => {
      if (!isSelecting) return;
      isSelecting = false;

      try {
        console.log("🖱️ CONTENT: Mouse up, processing selection");

        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);

        console.log("📏 CONTENT: Selection area:", {
          left,
          top,
          width,
          height,
        });

        if (width > 10 && height > 10) {
          instructions.innerHTML = "✅ Capturing... Please wait";
          instructions.style.borderColor = "#00ff88";
          instructions.style.color = "#00ff88";

          // Use viewport coordinates for the capture
          const coordinates = {
            x: left,
            y: top,
            width: width,
            height: height,
          };

          console.log(
            "📸 CONTENT: Sending CAPTURE_AREA with coordinates:",
            coordinates
          );

          // Send capture message
          chrome.runtime.sendMessage(
            {
              type: "CAPTURE_AREA",
              coordinates: coordinates,
              timestamp: Date.now(),
              url: window.location.href,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: window.scrollX,
                scrollY: window.scrollY,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "❌ CONTENT: Error sending capture message:",
                  chrome.runtime.lastError
                );
              } else {
                console.log(
                  "✅ CONTENT: Capture message sent, response:",
                  response
                );
              }
            }
          );

          // Hide overlay immediately after sending coordinates
          overlay.style.display = "none";

          // Remove overlay after a delay
          setTimeout(() => {
            try {
              if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                overlay = null;
              }
              window[SCRIPT_ID] = false; // Allow re-injection
            } catch (error) {
              console.error("❌ CONTENT: Error removing overlay:", error);
            }
          }, 500);
        } else {
          instructions.innerHTML = "❌ Area too small! Try again";
          instructions.style.borderColor = "#ff4444";
          instructions.style.color = "#ff4444";
          selectionBox.style.display = "none";

          setTimeout(() => {
            instructions.innerHTML =
              "✂️ Click and drag to select area<br><small>Press ESC to cancel</small>";
            instructions.style.borderColor = "#bbff00";
            instructions.style.color = "#bbff00";
          }, 2000);
        }
      } catch (error) {
        console.error("❌ CONTENT: Mouse up error:", error);
      }
    });

    // ESC key handler
    const escapeHandler = (e) => {
      if (e.key === "Escape" && overlay) {
        console.log("⌨️ CONTENT: ESC pressed, removing overlay");
        try {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
          }
          document.removeEventListener("keydown", escapeHandler);
          window[SCRIPT_ID] = false; // Allow re-injection
        } catch (error) {
          console.error("❌ CONTENT: Error in escape handler:", error);
        }
      }
    };

    document.addEventListener("keydown", escapeHandler);

    // Add overlay to page
    try {
      document.body.appendChild(overlay);
      console.log("✅ CONTENT: Overlay added to page successfully");
    } catch (error) {
      console.error("❌ CONTENT: Failed to add overlay to page:", error);
      throw error;
    }
  }

  console.log("✅ CONTENT: Robust snip script loaded successfully");
}
// ROBUST captureScreenshotArea - Replace existing one
async function captureScreenshotArea(coordinates) {
  console.log("📸 CAPTURE: Starting with coordinates:", coordinates);

  try {
    // Get tab with retry
    let tab;
    for (let i = 0; i < 3; i++) {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        tab = tabs[0];
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (!tab) throw new Error("No active tab found");

    console.log("📸 CAPTURE: Got tab:", tab.id);

    // Capture with retry
    let dataUrl;
    for (let i = 0; i < 3; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for page to settle
        dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: "png",
          quality: 100,
        });
        if (dataUrl) break;
      } catch (error) {
        console.warn(`📸 CAPTURE: Attempt ${i + 1} failed:`, error);
        if (i === 2) throw error;
      }
    }

    console.log("📸 CAPTURE: Screenshot taken, cropping...");

    // Crop image
    const croppedImage = await cropImage(dataUrl, coordinates);
    console.log("📸 CAPTURE: Image cropped");

    // Create snip data
    const snipData = {
      id: Date.now(),
      data: croppedImage,
      timestamp: new Date().toISOString(),
      dimensions: {
        width: Math.round(coordinates.width),
        height: Math.round(coordinates.height),
      },
      pageUrl: tab.url,
    };

    // Save with verification
    const saved = localStorage.getItem("glyphie-snips");
    const existingSnips = saved ? JSON.parse(saved) : [];
    existingSnips.push(snipData);

    localStorage.setItem("glyphie-snips", JSON.stringify(existingSnips));

    // Verify save
    const verification = localStorage.getItem("glyphie-snips");
    const verifiedSnips = verification ? JSON.parse(verification) : [];

    if (!verifiedSnips.find((s) => s.id === snipData.id)) {
      throw new Error("Failed to save snip to storage");
    }

    storedSnips = verifiedSnips;
    console.log(
      "📸 CAPTURE: Saved successfully! Total snips:",
      verifiedSnips.length
    );

    // Update UI
    const snipBtn =
      document.getElementById("active-snip-btn") ||
      document.querySelector("#snip-btn");
    if (snipBtn) {
      snipBtn.textContent = "✅ Captured!";
      snipBtn.style.background = "green";
      snipBtn.disabled = false;

      setTimeout(() => {
        snipBtn.textContent = "Snip ✂️";
        snipBtn.style.background = "";
      }, 2000);
    }

    // Refresh gallery
    setTimeout(() => {
      const activeSection = document.getElementById("active-snip-section");
      if (activeSection) {
        console.log("📸 CAPTURE: Refreshing gallery...");
        updateGallery(activeSection);
      }
    }, 500);

    console.log("📸 CAPTURE: Complete!");
  } catch (error) {
    console.error("❌ CAPTURE ERROR:", error);

    // Reset UI on error
    const snipBtn =
      document.getElementById("active-snip-btn") ||
      document.querySelector("#snip-btn");
    if (snipBtn) {
      snipBtn.textContent = "❌ Failed - Try Again";
      snipBtn.style.background = "red";
      snipBtn.disabled = false;

      setTimeout(() => {
        snipBtn.textContent = "Snip ✂️";
        snipBtn.style.background = "";
      }, 3000);
    }

    throw error;
  }
}

// ENHANCED init function - Auto-navigate to snip page after capture
async function init() {
  console.log("🔧 INIT: Extension initializing...");

  // Check navigation flags from chrome.storage
  try {
    const result = await chrome.storage.local.get([
      "glyphie-goto-snip",
      "glyphie-new-snip-id",
      "glyphie-new-snip-timestamp",
    ]);

    const gotoSnip = result["glyphie-goto-snip"];
    const newSnipId = result["glyphie-new-snip-id"];
    const newSnipTimestamp = result["glyphie-new-snip-timestamp"];

    console.log("🔧 INIT: Navigation flags:", {
      gotoSnip,
      newSnipId,
      newSnipTimestamp,
    });

    // Set up sidebar button listeners first
    sidebarButtons.forEach((button) => {
      button.addEventListener("click", () => {
        sidebarButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        const section = button.getAttribute("data-section");
        loadSection(section);

        const sidebar = document.getElementById("sidebar");
        const toggleBtn = document.getElementById("sidebar-toggle");
        if (sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
          toggleBtn.textContent = "☰";
        }
      });
    });

    // Navigate based on flags
    if (gotoSnip) {
      console.log("🔧 INIT: Auto-navigating to snip page after capture");

      // Clear the navigation flags
      await chrome.storage.local.remove([
        "glyphie-goto-snip",
        "glyphie-new-snip-id",
        "glyphie-new-snip-timestamp",
      ]);

      // Set snip button as active
      sidebarButtons.forEach((btn) => btn.classList.remove("active"));
      const snipButton = document.querySelector('[data-section="snip"]');
      if (snipButton) {
        snipButton.classList.add("active");
        console.log("🔧 INIT: Set snip button as active");
      }

      // Load snip section with highlighting for new snip
      setTimeout(() => {
        console.log("🔧 INIT: Loading snip section with new snip highlight...");
        loadSection("snip");

        // If we have a new snip ID, we can highlight it later
        if (newSnipId) {
          setTimeout(() => {
            highlightNewSnip(newSnipId);
          }, 1000);
        }
      }, 100);
    } else {
      console.log("🔧 INIT: Loading default characters section");
      loadSection("home");
    }

    applySavedTheme();
  } catch (error) {
    console.error("❌ INIT: Error checking navigation flags:", error);
    // Fallback to default behavior
    loadSection("home");
    applySavedTheme();
  }
}

// UPDATED renderSnip - Force gallery refresh multiple ways
function renderSnip() {
  console.log("🔧 Debug: renderSnip() called");

  // Check if there's a new snip flag
  const newSnipFlag = localStorage.getItem("glyphie-new-snip");
  if (newSnipFlag) {
    console.log("🆕 New snip detected, will refresh gallery");
    localStorage.removeItem("glyphie-new-snip");
  }

  // Wait for DOM to be fully ready
  if (document.readyState !== "complete") {
    console.log("🔧 DOM not ready, waiting...");
    setTimeout(() => renderSnip(), 100);
    return;
  }

  // Debug - check if element exists
  const snipSection = document.getElementById("snip-section");
  console.log("🔧 Debug: snipSection =", snipSection);

  if (!snipSection) {
    console.log("❌ Still can't find snip section");
    mainContent.textContent =
      "❌ Snip section unavailable. Element not found in DOM.";
    return;
  }

  console.log("✅ Found snip section, proceeding...");

  mainContent.innerHTML = "";
  const snipClone = snipSection.cloneNode(true);
  snipClone.classList.remove("hidden");
  snipClone.id = "active-snip-section";
  mainContent.appendChild(snipClone);

  // Add event listeners to the cloned elements
  setupSnipEventListeners(snipClone);

  // FORCE REFRESH GALLERY - Multiple attempts with debug info
  const refreshGallery = () => {
    const saved = localStorage.getItem("glyphie-snips");
    const snips = saved ? JSON.parse(saved) : [];
    console.log("📊 DEBUG: Found", snips.length, "snips in localStorage");

    if (snips.length > 0) {
      console.log("📊 DEBUG: Latest snip:", snips[snips.length - 1]);
    }

    updateGallery(snipClone);
  };

  // Refresh immediately
  refreshGallery();

  // Refresh after 100ms
  setTimeout(refreshGallery, 100);

  // Refresh after 500ms
  setTimeout(refreshGallery, 500);

  // Refresh after 1000ms
  setTimeout(refreshGallery, 1000);
}

// ENHANCED updateGallery - Fixed delete + rename functionality
async function updateGallery(container) {
  console.log("🔄 GALLERY: Starting update");

  const gallery = container.querySelector(".snip-gallery");
  if (!gallery) {
    console.log("❌ GALLERY: No gallery found");
    return;
  }

  // Load from chrome.storage
  try {
    await loadStoredSnips();
    console.log("🔄 GALLERY: Loaded", storedSnips.length, "snips from storage");
  } catch (error) {
    console.error("❌ GALLERY: Error loading snips:", error);
    return;
  }

  gallery.innerHTML = "";

  if (storedSnips.length === 0) {
    console.log("🔄 GALLERY: No snips to display");
    gallery.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="font-size: 3em;">📷</div>
        <div>No snips yet</div>
      </div>
    `;
    return;
  }

  console.log("🔄 GALLERY: Creating", storedSnips.length, "gallery items");

  // Create items with enhanced functionality
  storedSnips.reverse().forEach((snip, index) => {
    console.log(`🔄 GALLERY: Creating item ${index + 1}:`, snip.id);

    const item = document.createElement("div");
    item.className = "snip-item-enhanced";
    item.style.cssText = `
      background: #333; border: 2px solid #555; border-radius: 8px;
      padding: 8px; margin: 4px; cursor: pointer; position: relative;
      transition: all 0.3s ease;
    `;

    if (selectedSnips.includes(snip.id)) {
      item.style.borderColor = "#bbff00";
      item.style.boxShadow = "0 0 10px rgba(187, 255, 0, 0.5)";
    }

    // Default name if not set
    const displayName =
      snip.name ||
      `Screenshot ${snip.dimensions.width}×${snip.dimensions.height}`;

    item.innerHTML = `<img src="${snip.data}" 
       style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px; display: block; cursor: pointer;"
       alt="Snip ${index + 1}"
       onclick="showImageModal('${snip.data}')">
      
      <div class="snip-name" style="text-align: center; font-size: 10px; color: #ccc; margin-top: 4px; 
                                   white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">
        ${displayName}
      </div>
      
      <div class="snip-dimensions" style="text-align: center; font-size: 9px; color: #888; margin-top: 2px;">
        ${snip.dimensions.width} × ${snip.dimensions.height}
      </div>
      
      <button class="snip-delete-btn" 
              style="position: absolute; top: 2px; right: 2px; background: #ff4444; color: white; 
                     border: none; width: 18px; height: 18px; border-radius: 50%; font-size: 10px;
                     cursor: pointer; z-index: 10; transition: all 0.2s ease;"
              onmouseover="this.style.background='#ff6666'; this.style.transform='scale(1.1)'"
              onmouseout="this.style.background='#ff4444'; this.style.transform='scale(1)'">×</button>
      
      <button class="snip-rename-btn" 
              style="position: absolute; top: 2px; left: 2px; background: #4444ff; color: white; 
                     border: none; width: 18px; height: 18px; border-radius: 50%; font-size: 10px;
                     cursor: pointer; z-index: 10; transition: all 0.2s ease;"
              onmouseover="this.style.background='#6666ff'; this.style.transform='scale(1.1)'"
              onmouseout="this.style.background='#4444ff'; this.style.transform='scale(1)'"
              title="Rename snip">✏️</button>
    `;
    // Add click handler for image preview
    const img = item.querySelector("img");
    if (img) {
      img.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent item selection when clicking image
        showImageModal(snip.data);
      });
    }

    // Delete button functionality
    const deleteBtn = item.querySelector(".snip-delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent item selection

      if (confirm(`Delete "${displayName}"?`)) {
        console.log("🗑️ Deleting snip:", snip.id);

        // Remove from storage
        const updatedSnips = storedSnips.filter((s) => s.id !== snip.id);
        await chrome.storage.local.set({ "glyphie-snips": updatedSnips });

        // Remove from selected list
        selectedSnips = selectedSnips.filter((id) => id !== snip.id);

        // Update local array
        storedSnips = updatedSnips;

        // Refresh gallery
        updateGallery(container);

        console.log("✅ Snip deleted successfully");
      }
    });

    // Rename button functionality
    const renameBtn = item.querySelector(".snip-rename-btn");
    renameBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent item selection

      const currentName = snip.name || "";
      const newName = prompt(`Rename snip:`, currentName);

      if (newName !== null && newName.trim() !== "") {
        console.log("✏️ Renaming snip:", snip.id, "to:", newName.trim());

        // Update snip data
        snip.name = newName.trim();

        // Save to storage
        await chrome.storage.local.set({ "glyphie-snips": storedSnips });

        // Refresh gallery
        updateGallery(container);

        console.log("✅ Snip renamed successfully");
      }
    });

    // Item selection (click on image or name area)
    item.addEventListener("click", (e) => {
      // Only trigger selection if not clicking buttons
      if (
        e.target.classList.contains("snip-delete-btn") ||
        e.target.classList.contains("snip-rename-btn")
      ) {
        return;
      }

      const idx = selectedSnips.indexOf(snip.id);
      if (idx > -1) {
        selectedSnips.splice(idx, 1);
        item.style.borderColor = "#555";
        item.style.boxShadow = "none";
        console.log("📤 Deselected snip:", snip.id);
      } else {
        selectedSnips.push(snip.id);
        item.style.borderColor = "#bbff00";
        item.style.boxShadow = "0 0 10px rgba(187, 255, 0, 0.5)";
        console.log("📥 Selected snip:", snip.id);
      }
    });

    gallery.appendChild(item);
  });

  console.log("✅ GALLERY: Update completed");
}

// Crop image function
function cropImage(dataUrl, coordinates) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = coordinates.width;
      canvas.height = coordinates.height;

      const ratio = window.devicePixelRatio || 1;

      ctx.drawImage(
        img,
        coordinates.x * ratio,
        coordinates.y * ratio,
        coordinates.width * ratio,
        coordinates.height * ratio,
        0,
        0,
        coordinates.width,
        coordinates.height
      );

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

// UPDATED setupSnipEventListeners - Load chat history
function setupSnipEventListeners(snipContainer) {
  console.log("🔧 Setting up snip event listeners");

  loadStoredSnips();

  const snipBtn = snipContainer.querySelector("#snip-btn");
  const snipInput = snipContainer.querySelector("#snip-chat-input");
  const snipSendBtn = snipContainer.querySelector("#snip-send-btn");
  const snipChatHistory = snipContainer.querySelector("#snip-chat-history");

  // ADD THESE NEW THREAD ELEMENTS
  const newThreadBtn = snipContainer.querySelector("#snip-new-thread-btn");
  const threadList = snipContainer.querySelector("#snip-thread-list");
  const refreshBtn = snipContainer.querySelector("#refresh-threads-btn");
  if (threadList) threadList.id = "active-snip-thread-list";
  if (newThreadBtn) newThreadBtn.id = "active-snip-new-thread-btn";
  if (refreshBtn) refreshBtn.id = "active-refresh-threads-btn";

  // Change IDs to avoid conflicts
  if (snipBtn) snipBtn.id = "active-snip-btn";
  if (snipInput) snipInput.id = "active-snip-input";
  if (snipSendBtn) snipSendBtn.id = "active-snip-send-btn";
  if (snipChatHistory) snipChatHistory.id = "active-snip-chat-history";
  // Add this inside setupSnipEventListeners() after renaming IDs

  // DROPDOWN FUNCTIONALITY
  const threadDropdownBtn =
    snipContainer.querySelector("#snip-thread-dropdown-btn") ||
    snipContainer.querySelector(".thread-dropdown-toggle");
  const threadBar = snipContainer.querySelector("#snip-thread-bar");

  if (threadDropdownBtn && threadBar) {
    // Rename dropdown button if needed
    if (threadDropdownBtn.id === "snip-thread-dropdown-btn") {
      threadDropdownBtn.id = "active-snip-thread-dropdown-btn";
    }

    threadDropdownBtn.addEventListener("click", () => {
      threadBar.classList.toggle("dropdown-open");

      // Update arrow and text
      const arrow = threadDropdownBtn.querySelector(".thread-dropdown-arrow");
      const text = threadDropdownBtn.querySelector(".thread-dropdown-text");

      if (threadBar.classList.contains("dropdown-open")) {
        if (text) text.textContent = `Threads (${snipThreads.length})`;
      } else {
        if (text) text.textContent = "Threads";
      }
    });
  }

  // INITIALIZE THREADS - ADD THIS
  initSnipThreads().then(() => {
    updateSnipThreadList();

    // Load current thread history
    if (currentSnipThreadId && snipChatHistory) {
      loadSnipThreadHistory(snipChatHistory, currentSnipThreadId);
    }
  });

  // NEW THREAD BUTTON - ADD THIS
  if (newThreadBtn) {
    newThreadBtn.addEventListener("click", async () => {
      const threadName = prompt(
        "Enter thread name:",
        `Thread ${snipThreads.length + 1}`
      );
      if (threadName && threadName.trim()) {
        try {
          newThreadBtn.textContent = "Creating...";
          newThreadBtn.disabled = true;

          const newThread = await createSnipThread(threadName.trim());
          await switchSnipThread(newThread.id);

          newThreadBtn.textContent = "+";
          newThreadBtn.disabled = false;
        } catch (error) {
          alert("Failed to create thread: " + error.message);
          newThreadBtn.textContent = "+";
          newThreadBtn.disabled = false;
        }
      }
    });
  }

  // LOAD CHAT HISTORY FOR CURRENT THREAD - MODIFY THIS
  if (snipChatHistory && currentSnipThreadId) {
    loadSnipThreadHistory(snipChatHistory, currentSnipThreadId);
  } else if (snipChatHistory) {
    snipChatHistory.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="font-size: 2em; margin-bottom: 10px;">💬</div>
        <div>Create a thread to start chatting!</div>
      </div>
    `;
  }

  // Create and insert snip gallery
  createSnipGallery(snipContainer);

  // Event listeners
  // Add this to your setupSnipEventListeners function
  const refreshThreadsBtn = snipContainer.querySelector("#refresh-threads-btn");
  if (refreshThreadsBtn) {
    refreshThreadsBtn.addEventListener("click", async () => {
      refreshThreadsBtn.textContent = "Refreshing...";
      refreshThreadsBtn.disabled = true;

      await fetchThreadsFromAPI();
      updateSnipThreadList();

      refreshThreadsBtn.textContent = "🔄";
      refreshThreadsBtn.disabled = false;
    });
  }

  if (snipBtn) {
    snipBtn.addEventListener("click", handleSnipAction);
  }

  if (snipSendBtn) {
    snipSendBtn.addEventListener("click", async () => {
      const message = snipInput?.value.trim();
      if (selectedSnips.length > 0 || message) {
        snipSendBtn.textContent = "Sending...";
        snipSendBtn.disabled = true;

        console.log("📤 Starting send with:", selectedSnips.length, "images");

        // ENSURE WE HAVE A CURRENT THREAD - ADD THIS CHECK
        if (!currentSnipThreadId) {
          try {
            const newThread = await createSnipThread("New Thread");
            currentSnipThreadId = newThread.id;
            localStorage.setItem(
              "glyphie-current-snip-thread",
              currentSnipThreadId
            );
            updateSnipThreadList();
          } catch (error) {
            alert("Failed to create thread: " + error.message);
            snipSendBtn.textContent = "Send";
            snipSendBtn.disabled = false;
            return;
          }
        }

        await handleSnipSend(snipChatHistory, message);

        if (snipInput) snipInput.value = "";
        selectedSnips = [];
        updateGallery(snipContainer);

        snipSendBtn.textContent = "Send";
        snipSendBtn.disabled = false;
      } else {
        alert("Please select at least one snip or add a message!");
      }
    });
  }

  // Event listeners

  if (snipInput) {
    snipInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        snipSendBtn?.click();
      }
    });
  }

  // Manual refresh button
  const manualRefreshBtn = snipContainer.querySelector("#manual-refresh-btn");
  if (manualRefreshBtn) {
    manualRefreshBtn.addEventListener("click", () => {
      console.log("🔄 MANUAL REFRESH CLICKED");
      const saved = localStorage.getItem("glyphie-snips");
      console.log(
        "Storage check:",
        saved ? `${JSON.parse(saved).length} snips` : "empty"
      );
      updateGallery(snipContainer);
    });
  }

  // Debug buttons
  const debugClear = snipContainer.querySelector("#debug-clear-snips");
  if (debugClear) {
    debugClear.addEventListener("click", () => {
      localStorage.removeItem("glyphie-snips");
      storedSnips = [];
      selectedSnips = [];
      updateGallery(snipContainer);
      console.log("🗑️ Cleared all snips");
    });
  }

  const debugShow = snipContainer.querySelector("#debug-show-snips");
  if (debugShow) {
    debugShow.addEventListener("click", () => {
      const saved = localStorage.getItem("glyphie-snips");
      const snips = saved ? JSON.parse(saved) : [];
      console.log("📊 STORAGE DEBUG:");
      console.log("Raw localStorage:", saved);
      console.log("Parsed snips:", snips);
      console.log("Global storedSnips:", storedSnips);
      console.log("Selected snips:", selectedSnips);
      alert(`Storage has ${snips.length} snips. Check console for details.`);
    });
  }

  const debugRefresh = snipContainer.querySelector("#debug-refresh-gallery");
  if (debugRefresh) {
    debugRefresh.addEventListener("click", () => {
      console.log("🔄 Manual gallery refresh triggered");
      updateGallery(snipContainer);
    });
  }
}

// Create snip gallery
function createSnipGallery(container) {
  const existingGallery = container.querySelector(".snip-gallery");
  if (existingGallery) {
    existingGallery.remove();
  }

  const gallery = document.createElement("div");
  gallery.className = "snip-gallery";

  // Insert gallery before chat input row
  const inputRow = container.querySelector(".chat-input-row");
  if (inputRow) {
    inputRow.parentNode.insertBefore(gallery, inputRow);
  }

  updateGallery(container);
}

async function handleSnipSend(chatHistoryDiv, message) {
  console.log("📤 SENDING SNIPS:", selectedSnips.length, "selected");

  if (selectedSnips.length === 0 && !message) {
    appendSnipMessage(
      chatHistoryDiv,
      "system",
      "Please select at least one snip or add a message!",
      new Date().toISOString()
    );
    return;
  }

  const timestamp = new Date().toISOString();

  // Add user message if provided
  if (message) {
    appendSnipMessage(chatHistoryDiv, "user", message, timestamp);
  }

  // Add selected snips to chat display with names
  selectedSnips.forEach((snipId) => {
    const snip = storedSnips.find((s) => s.id === snipId);
    if (snip) {
      appendSnipImageMessage(chatHistoryDiv, snip, timestamp);
    }
  });

  // UPLOAD SELECTED IMAGES TO IMGBB FOR API
  console.log(
    "📤 Uploading",
    selectedSnips.length,
    "images to imgbb for API..."
  );
  const uploadedImages = [];

  try {
    for (const snipId of selectedSnips) {
      const snip = storedSnips.find((s) => s.id === snipId);
      if (snip) {
        console.log("📤 Uploading snip:", snip.id);

        // Convert base64 to blob
        const base64Response = await fetch(snip.data);
        const blob = await base64Response.blob();

        // Upload to imgbb
        const formData = new FormData();
        formData.append("image", blob);

        const imgbbResponse = await fetch(
          "https://api.imgbb.com/1/upload?key=563a4706f5001d2baaad744ae59e776d",
          {
            method: "POST",
            body: formData,
          }
        );

        const imgbbResult = await imgbbResponse.json();

        if (imgbbResult.success) {
          uploadedImages.push({
            type: "image",
            url: imgbbResult.data.url,
          });
          console.log("✅ Uploaded snip to:", imgbbResult.data.url);
        } else {
          console.error("❌ Failed to upload snip:", imgbbResult);
        }
      }
    }

    console.log("📤 Successfully uploaded", uploadedImages.length, "images");

    // Create text description of images using custom names
    const imageDescriptions = selectedSnips.map((snipId, index) => {
      const snip = storedSnips.find((s) => s.id === snipId);
      const snipName =
        snip.name ||
        `Screenshot ${snip.dimensions.width}×${snip.dimensions.height}`;
      return `Image ${index + 1}: "${snipName}" (${snip.dimensions.width}×${
        snip.dimensions.height
      }px) captured on ${new Date(snip.timestamp).toLocaleString()}`;
    });

    const fullMessage = [
      message || "Please analyze these images:",
      ...imageDescriptions,
    ].join("\n\n");

    console.log("📤 Sending to API with message:", fullMessage);
    console.log("📤 Attachments:", uploadedImages);

    // SEND TO CURRENT THREAD - MODIFY THIS
    const apiKey = characterApiKeys.white;
    const chatId = currentSnipThreadId; // Use current thread instead of creating new one

    if (!chatId) {
      throw new Error("No active thread found");
    }

    const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: fullMessage,
        attachments: uploadedImages,
        stream: true,
      }),
    });

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let messageText = "";

      let bubble = appendStreamingMessage(chatHistoryDiv, "bot", "", null);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value);
        try {
          for (const line of chunkStr.trim().split("\n")) {
            if (!line.trim()) continue;
            const obj = JSON.parse(line);
            if (obj.message !== undefined) {
              messageText += obj.message;
              if (bubble)
                bubble.querySelector(".msg-content").textContent = messageText;
            }
          }
        } catch {
          if (bubble)
            bubble.querySelector(".msg-content").textContent = chunkStr;
        }
      }

      if (bubble) {
        setMessageTimestamp(bubble, new Date().toISOString());
        bubble.classList.remove("typing");
      }

      // UPDATE THREAD MESSAGE COUNT - ADD THIS
      updateThreadMessageCount(currentSnipThreadId);

      console.log("✅ API response completed");
    } else {
      throw new Error(`API request failed: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Send error:", error);
    appendSnipMessage(
      chatHistoryDiv,
      "bot",
      `Sorry, I couldn't process your snips: ${error.message}`,
      new Date().toISOString(),
      true
    );
  }
}

// UPDATED appendSnipImageMessage - Show custom names
function appendSnipImageMessage(container, snipData, timestamp) {
  const msg = document.createElement("div");
  msg.className = "message snip";

  const content = document.createElement("div");
  content.className = "msg-content";

  const img = document.createElement("img");
  img.src = snipData.data;
  img.className = "snip-image";
  img.alt = "Snipped image";
  img.style.cssText = `
    max-width: 300px; 
    max-height: 200px; 
    object-fit: contain; 
    border-radius: 8px; 
    border: 2px solid var(--accent-color);
  `;
  img.onclick = () => showImageModal(snipData.data);

  const caption = document.createElement("div");
  caption.className = "snip-caption";
  caption.style.cssText = `
    text-align: center; 
    margin-top: 8px; 
    font-size: 12px; 
    color: var(--accent-color);
  `;

  // Use custom name if available
  const displayName =
    snipData.name ||
    `Screenshot ${snipData.dimensions.width}×${snipData.dimensions.height}`;
  caption.textContent = `✂️ ${displayName}`;

  content.appendChild(img);
  content.appendChild(caption);
  msg.appendChild(content);

  if (timestamp) {
    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.textContent = new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    msg.appendChild(timeDiv);
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

// Helper function to append text messages in snip chat
function appendSnipMessage(
  container,
  sender,
  text,
  timestamp,
  isError = false
) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}${isError ? " error" : ""}`;

  const content = document.createElement("div");
  content.className = "msg-content";
  content.textContent = text;

  msg.appendChild(content);

  if (timestamp) {
    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.textContent = new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    msg.appendChild(timeDiv);
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

// Show image in modal
function showImageModal(imageSrc) {
  let modal = document.getElementById("snip-image-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "snip-image-modal";
    modal.className = "snip-image-modal";
    modal.innerHTML = `
      <div class="snip-modal-content">
        <button class="snip-modal-close">×</button>
        <img class="snip-modal-image" alt="Snipped image enlarged">
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (
        e.target === modal ||
        e.target.classList.contains("snip-modal-close")
      ) {
        modal.style.display = "none";
      }
    });
  }

  modal.querySelector(".snip-modal-image").src = imageSrc;
  modal.style.display = "flex";
}

// === ATTACHMENT HANDLING ===

// Open file dialog when attach button clicked (delegated)
document.body.addEventListener("click", (e) => {
  if (e.target?.id === "toolbar-attach-btn") attachmentInput.click();
});

attachmentInput.onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const apiKey = "563a4706f5001d2baaad744ae59e776d"; // Your imgBB key
  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });
    const result = await res.json();

    if (result?.success) {
      pendingAttachment = [{ type: "image", url: result.data.url }];
      pendingAttachmentPreviewUrl = result.data.url;
      renderAttachmentPreview();
      alert("Image ready to send!");
    } else {
      throw new Error("Image upload failed");
    }
  } catch (err) {
    alert("Upload error");
    pendingAttachment = null;
    pendingAttachmentPreviewUrl = null;
    renderAttachmentPreview();
  }
  attachmentInput.value = "";
};

function renderAttachmentPreview() {
  const container = document.getElementById("attachment-preview");
  if (!container) return;

  container.innerHTML = "";

  if (pendingAttachmentPreviewUrl) {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";

    const img = document.createElement("img");
    img.src = pendingAttachmentPreviewUrl;
    img.alt = "Attachment";
    img.className = "attachment-thumb";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.title = "Remove attachment";
    removeBtn.className = "attachment-remove-btn";
    removeBtn.onclick = () => {
      pendingAttachment = null;
      pendingAttachmentPreviewUrl = null;
      renderAttachmentPreview();
    };

    chip.append(img, removeBtn);
    container.appendChild(chip);
    container.style.display = "flex";
  } else {
    container.style.display = "none";
  }
}

// === INITIALIZATION ===

function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.classList.toggle("light", savedTheme === "light");
  const toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.checked = savedTheme === "light";
}

function loadSection(section) {
  mainContent.innerHTML = "";
  currentCharKey = null;
  chatHistory = [];
  currentChatId = null;

  switch (section) {
    case "home": // ⬅⬅ NEW HOMEPAGE
      renderHome();
      break;
    case "characters":
      renderCharacters();
      break;
    case "stats":
      renderStats();
      break;
    case "usage":
      renderStats();
      break;
    case "settings":
      renderSettings();
      break;
    case "snip":
      renderSnip();
      break;
    default:
      mainContent.textContent = "This section is not available.";
  }
}

function renderHome() {
  const container = document.createElement("div");
  container.className = "home-container";
  container.style.cssText = `
    padding: 20px;
    color: var(--text-color);
    font-family: inherit;
  `;

  const heading = document.createElement("h1");
  heading.textContent = "Welcome to Glyphie";
  heading.style.cssText = `
    font-size: 1.8rem;
    margin-bottom: 10px;
    color: var(--accent-color);
  `;

  const subheading = document.createElement("p");
  subheading.textContent =
    "Your all-in-one assistant for snipping, chatting, and productivity.";
  subheading.style.cssText = `
    font-size: 1rem;
    margin-bottom: 20px;
    color: var(--text-color);
  `;

  // Quick action buttons
  const buttonRow = document.createElement("div");
  buttonRow.style.cssText = `
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  `;

  const quickActions = [
    { label: "🗂️ Explore Agents", section: "characters" },
    { label: "✂️ New Snip", section: "snip" },
    { label: "📊 Stats", section: "stats" },
    { label: "⚙️ Settings", section: "settings" },
  ];

  quickActions.forEach((action) => {
    const btn = document.createElement("button");
    btn.textContent = action.label;
    btn.style.cssText = `
      padding: 10px 15px;
      background: var(--button-bg);
      color: var(--accent-color);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: background 0.3s;
    `;
    btn.addEventListener(
      "mouseover",
      () => (btn.style.background = "var(--button-hover-bg)")
    );
    btn.addEventListener(
      "mouseout",
      () => (btn.style.background = "var(--button-bg)")
    );
    btn.addEventListener("click", () => loadSection(action.section));
    buttonRow.appendChild(btn);
  });

  container.appendChild(heading);
  container.appendChild(subheading);
  container.appendChild(buttonRow);
  mainContent.appendChild(container);
}

function renderCharacters() {
  const container = document.createElement("div");
  container.className = "character-grid";

  characters.forEach((char) => {
    const card = document.createElement("div");
    card.className = "character-card";

    const img = document.createElement("img");
    img.src = char.image;
    img.alt = `${char.name} avatar`;
    img.className = "character-avatar";

    const name = document.createElement("div");
    name.className = "character-name";
    name.textContent = char.name;

    const bio = document.createElement("div");
    bio.className = "character-bio";
    bio.textContent = char.bio;

    const btn = document.createElement("button");
    btn.className = "select-btn";
    btn.textContent = "Select";
    btn.addEventListener("click", () => startChatWithPersonality(char.key));

    card.append(img, name, bio, btn);
    container.appendChild(card);
  });

  mainContent.appendChild(container);
}

async function renderStats() {
  console.log("📊 Debug: renderStats() called");

  // 1) Clone and mount the usage section (same pattern as renderSnip)
  const usageSection = document.getElementById("usage-section");
  if (!usageSection) {
    console.error("❌ Usage section template not found in DOM");
    mainContent.textContent =
      "❌ Usage section unavailable. Element not found in DOM.";
    return;
  }

  mainContent.innerHTML = "";
  const usageClone = usageSection.cloneNode(true);
  usageClone.classList.remove("hidden");
  usageClone.id = "active-usage-section";
  mainContent.appendChild(usageClone);

  // 2) Query fields inside the cloned section
  const elSnips = usageClone.querySelector("#stats-total-snips");
  const elMsgs = usageClone.querySelector("#stats-total-messages");
  const elTop = usageClone.querySelector("#stats-top-character");
  const elLast = usageClone.querySelector("#stats-last-used");

  if (!elSnips || !elMsgs || !elTop || !elLast) {
    console.error("❌ Stats elements missing in cloned usage section");
    return;
  }

  // 3) Load and populate stats
  try {
    const result = await chrome.storage.local.get([
      "glyphie-snips",
      "glyphie-usage",
    ]);
    const snips = result["glyphie-snips"] || [];
    const usage = result["glyphie-usage"] || {
      chats: [],
      snips: 0,
      lastUsed: "–",
    };

    elSnips.textContent = snips.length;

    const chats = Array.isArray(usage.chats) ? usage.chats : [];
    elMsgs.textContent = chats.length;

    const charCounts = chats.reduce((acc, c) => {
      const key = c?.character || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Fixed topChar logic
    const topChar =
      Object.entries(charCounts).sort((a, b) => b[1] - a[1])?.[0]?.[0] || "–";
    elTop.textContent = topChar;

    elLast.textContent = usage.lastUsed || "–";
  } catch (e) {
    console.error("❌ Error rendering usage stats:", e);
  }
}

function renderSettings() {
  const container = document.createElement("div");
  container.className = "settings-container";

  const themeSetting = document.createElement("div");
  themeSetting.className = "setting-item";

  const label = document.createElement("label");
  label.htmlFor = "theme-toggle";
  label.textContent = "Dark Mode:";

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.id = "theme-toggle";
  toggle.checked = !document.body.classList.contains("light");
  toggle.addEventListener("change", (e) => {
    const isDarkMode = e.target.checked;
    document.body.classList.toggle("light", !isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  });

  themeSetting.append(label, toggle);
  container.appendChild(themeSetting);
  mainContent.appendChild(container);
}

// === CHAT API HELPERS ===

async function createChatThread(personaKey) {
  const personaApiKey = characterApiKeys[personaKey];
  if (!personaApiKey) throw new Error("API key for persona not found");

  let chatId = localStorage.getItem(`intentkit_chatid_${personaKey}`);
  if (chatId) return chatId;

  const response = await fetch(`${BASE_URL}/chats`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${personaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) throw new Error("Failed to create new chat thread");

  const data = await response.json();
  chatId = data.id;
  localStorage.setItem(`intentkit_chatid_${personaKey}`, chatId);
  return chatId;
}

async function getChatHistory(chatId, personaKey, limit = 100) {
  const personaApiKey = characterApiKeys[personaKey];
  if (!personaApiKey) throw new Error("API key for persona not found");

  const response = await fetch(
    `${BASE_URL}/chats/${chatId}/messages?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${personaApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch chat history");

  const data = await response.json();
  return data.data || [];
}

// Send message streaming with optional attachments
async function sendMessageToThread(chatId, personaKey, message) {
  const personaApiKey = characterApiKeys[personaKey];
  if (!personaApiKey) throw new Error("API key for persona not found");

  const body = { message, stream: true };
  if (pendingAttachment) body.attachments = pendingAttachment;

  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${personaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("Failed to send (stream) message");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let messageText = "";

  const chatHistoryDiv = document.getElementById("chat-history");
  let bubble = appendStreamingMessage(chatHistoryDiv, "bot", "", null);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkStr = decoder.decode(value);
    try {
      for (const line of chunkStr.trim().split("\n")) {
        if (!line.trim()) continue;
        const obj = JSON.parse(line);
        if (obj.message !== undefined) {
          messageText += obj.message;
          if (bubble)
            bubble.querySelector(".msg-content").textContent = messageText;
        }
      }
    } catch {
      if (bubble) bubble.querySelector(".msg-content").textContent = chunkStr;
    }
  }

  const ts = new Date().toISOString();
  if (bubble) {
    setMessageTimestamp(bubble, ts);
    bubble.classList.remove("typing");
  }
  chatHistory.push({ role: "assistant", content: messageText, created_at: ts });

  pendingAttachment = null;
  pendingAttachmentPreviewUrl = null;
  renderAttachmentPreview();

  return messageText;
}
async function regenerateLastResponseAlternative() {
  if (!currentCharKey || !currentChatId) {
    console.warn("No active chat to regenerate");
    return;
  }

  // Check if there are any messages in history
  if (chatHistory.length === 0) {
    console.warn("No messages to regenerate");
    return;
  }

  // Find the last user message to resend
  let lastUserMessage = null;
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    if (chatHistory[i].role === "user") {
      lastUserMessage = chatHistory[i];
      break;
    }
  }

  if (!lastUserMessage) {
    console.warn("No user message found to regenerate from");
    return;
  }

  const chatHistoryDiv = document.getElementById("chat-history");
  if (!chatHistoryDiv) {
    console.warn("Chat history div not found");
    return;
  }

  // Remove the last assistant message from the display
  const messages = chatHistoryDiv.querySelectorAll(".message.bot");
  if (messages.length > 0) {
    const lastBotMessage = messages[messages.length - 1];
    lastBotMessage.remove();
  }

  // Remove the last assistant message from chatHistory array
  if (
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1].role === "assistant"
  ) {
    chatHistory.pop();
  }

  try {
    // Set loading state
    setLoadingState(true);
    console.log("🔄 Regenerating with user message:", lastUserMessage.content);

    // Resend the last user message
    await sendMessageToThread(
      currentChatId,
      currentCharKey,
      lastUserMessage.content
    );

    // Scroll to bottom
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    console.log("✅ Response regenerated successfully using resend method");
  } catch (error) {
    console.error("❌ Regenerate error:", error);

    // Show error message
    appendMessage(
      chatHistoryDiv,
      "bot",
      `Sorry, I couldn't regenerate the response: ${error.message}`,
      new Date().toISOString(),
      true
    );
  } finally {
    setLoadingState(false);
  }
}

// Main regenerate function that tries retry first, then falls back to alternative
async function regenerateLastResponse() {
  if (!currentCharKey || !currentChatId) {
    console.warn("No active chat to regenerate");
    return;
  }

  // Check if there are any messages in history
  if (chatHistory.length === 0) {
    console.warn("No messages to regenerate");
    return;
  }

  // Find the last assistant message to remove it from display
  const chatHistoryDiv = document.getElementById("chat-history");
  if (!chatHistoryDiv) {
    console.warn("Chat history div not found");
    return;
  }

  // Remove the last assistant message from the display
  const messages = chatHistoryDiv.querySelectorAll(".message.bot");
  if (messages.length > 0) {
    const lastBotMessage = messages[messages.length - 1];
    lastBotMessage.remove();
  }

  // Remove the last assistant message from chatHistory array
  if (
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1].role === "assistant"
  ) {
    chatHistory.pop();
  }

  try {
    // Set loading state
    setLoadingState(true);

    // Try the retry endpoint first
    const personaApiKey = characterApiKeys[currentCharKey];
    if (!personaApiKey) throw new Error("API key for persona not found");

    console.log("🔄 Calling retry endpoint for chat:", currentChatId);

    const response = await fetch(
      `${BASE_URL}/chats/${currentChatId}/messages/retry`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${personaApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn("❌ Retry endpoint failed, falling back to resend method");
      setLoadingState(false);
      await regenerateLastResponseAlternative();
      return;
    }

    // Check if response is JSON (non-streaming) or streaming
    const contentType = response.headers.get("content-type");
    console.log("📥 Response content-type:", contentType);

    if (contentType && contentType.includes("application/json")) {
      // Handle JSON response (non-streaming)
      const data = await response.json();
      console.log("📥 JSON response:", data);

      let messageText = "";

      // The retry endpoint returns an array of messages
      if (Array.isArray(data) && data.length > 0) {
        // Find the agent's response
        const agentMessage = data.find(
          (msg) =>
            msg.author_type === "agent" ||
            msg.author_type === "system" ||
            !msg.author_type // fallback
        );

        if (agentMessage && agentMessage.message) {
          messageText = agentMessage.message;
        } else {
          messageText =
            data[data.length - 1].message || "No response generated";
        }
      } else {
        messageText = "No response generated";
      }

      console.log("📥 Extracted message:", messageText);

      if (!messageText.trim()) {
        console.warn(
          "❌ Empty message from retry, falling back to resend method"
        );
        setLoadingState(false);
        await regenerateLastResponseAlternative();
        return;
      }

      // Display the message
      const timestamp = new Date().toISOString();
      appendMessage(chatHistoryDiv, "bot", messageText, timestamp);

      // Add to chat history
      chatHistory.push({
        role: "assistant",
        content: messageText,
        created_at: timestamp,
      });
    } else {
      // Handle streaming response
      console.log("📥 Handling streaming response");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let messageText = "";

      let bubble = appendStreamingMessage(chatHistoryDiv, "bot", "", null);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value);
        console.log("📥 Received chunk:", chunkStr);

        try {
          for (const line of chunkStr.trim().split("\n")) {
            if (!line.trim()) continue;
            const obj = JSON.parse(line);
            if (obj.message !== undefined) {
              messageText += obj.message;
              if (bubble) {
                bubble.querySelector(".msg-content").textContent = messageText;
              }
            }
          }
        } catch (parseError) {
          console.log("📥 Non-JSON chunk, treating as text:", chunkStr);
          messageText += chunkStr;
          if (bubble) {
            bubble.querySelector(".msg-content").textContent = messageText;
          }
        }
      }

      if (!messageText.trim()) {
        console.warn(
          "❌ Empty message from streaming retry, falling back to resend method"
        );
        if (bubble) bubble.remove();
        setLoadingState(false);
        await regenerateLastResponseAlternative();
        return;
      }

      // Finalize the message
      const timestamp = new Date().toISOString();
      if (bubble) {
        setMessageTimestamp(bubble, timestamp);
        bubble.classList.remove("typing");
      }

      // Add to chat history
      chatHistory.push({
        role: "assistant",
        content: messageText,
        created_at: timestamp,
      });
    }

    // Scroll to bottom
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    console.log("✅ Response regenerated successfully");
  } catch (error) {
    console.error("❌ Regenerate error:", error);
    setLoadingState(false);

    console.warn("❌ Retry method failed, falling back to resend method");
    await regenerateLastResponseAlternative();
  } finally {
    setLoadingState(false);
  }
}

function appendStreamingMessage(container, sender, text, timestamp) {
  const msg = document.createElement("div");
  msg.className = `message ${sender} typing`;

  const content = document.createElement("div");
  content.className = "msg-content";
  content.textContent = text;

  msg.appendChild(content);
  if (timestamp) setMessageTimestamp(msg, timestamp);

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;

  return msg;
}

function setMessageTimestamp(msg, timestamp) {
  let el = msg.querySelector(".msg-time");
  if (!el) {
    el = document.createElement("div");
    el.className = "msg-time";
    msg.appendChild(el);
  }
  const dateObj = new Date(timestamp);
  el.textContent = dateObj.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function startChatWithPersonality(key) {
  currentCharKey = key;
  chatHistory = [];
  mainContent.innerHTML = "";

  const chatPanel = document.createElement("div");
  chatPanel.className = "chat-panel";

  const chatHeader = document.createElement("div");
  chatHeader.className = "chat-header";

  const persona = characters.find((c) => c.key === key);
  if (!persona) {
    mainContent.textContent = "Persona not found.";
    return;
  }

  const avatar = document.createElement("img");
  avatar.className = "chat-avatar";
  avatar.src = persona.image;
  avatar.alt = `${persona.name} avatar`;

  const nameSpan = document.createElement("span");
  nameSpan.className = "chat-name";
  nameSpan.textContent = persona.name;

  chatHeader.append(avatar, nameSpan);

  const chatHistoryDiv = document.createElement("div");
  chatHistoryDiv.id = "chat-history";
  chatHistoryDiv.className = "chat-history";

  setLoadingState(true);

  try {
    currentChatId = await createChatThread(key);
    chatHistory = await getChatHistory(currentChatId, key);
    // Display history oldest to newest
    chatHistory
      .slice()
      .reverse()
      .forEach((msg) => {
        const authorType = msg.author_type?.toLowerCase();
        const author =
          authorType === "api" || authorType === "user" ? "user" : "bot";
        appendMessage(chatHistoryDiv, author, msg.message, msg.created_at);
      });

    setTimeout(() => {
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }, 0);
  } catch (err) {
    appendMessage(chatHistoryDiv, "bot", "Unable to load chat history.");
    console.error(err);
  }

  setLoadingState(false);

  const inputRow = document.createElement("div");
  inputRow.className = "chat-input-row";

  // Attachment preview bar
  const attachmentPreviewBar = document.createElement("div");
  attachmentPreviewBar.id = "attachment-preview";
  attachmentPreviewBar.className = "attachment-preview-bar";
  attachmentPreviewBar.style.display = "none";
  attachmentPreviewBar.style.flexDirection = "row";
  attachmentPreviewBar.style.alignItems = "center";
  attachmentPreviewBar.style.margin = "6px 0";

  inputRow.appendChild(attachmentPreviewBar);

  // Toolbar with attach and regenerate buttons
  const toolbar = document.createElement("div");
  toolbar.className = "chat-toolbar";

  const attachBtnToolbar = document.createElement("button");
  attachBtnToolbar.id = "toolbar-attach-btn";
  attachBtnToolbar.title = "Attach files";
  attachBtnToolbar.setAttribute("aria-label", "Attach files");
  attachBtnToolbar.textContent = "📎";

  const regenerateBtn = document.createElement("button");
  regenerateBtn.id = "toolbar-regenerate-btn";
  regenerateBtn.title = "Regenerate response";
  regenerateBtn.setAttribute("aria-label", "Regenerate response");
  regenerateBtn.textContent = "Regenerate";

  // Style for toolbar buttons
  regenerateBtn.addEventListener("mouseover", () => {
    regenerateBtn.style.background = "var(--button-hover-bg)";
  });

  regenerateBtn.addEventListener("mouseout", () => {
    regenerateBtn.style.background = "var(--button-bg)";
  });
  [attachBtnToolbar, regenerateBtn].forEach((btn) => {
    btn.style.cursor = "pointer";
    btn.style.borderRadius = "8px";
    btn.style.border = "none";
    btn.style.background = "var(--button-bg)";
    btn.style.color = "var(--accent-color)";
    btn.style.transition = "background-color 0.3s";
  });

  attachBtnToolbar.style.fontSize = "1.5rem";
  attachBtnToolbar.style.padding = "6px 10px";

  regenerateBtn.style.fontSize = "1rem";
  regenerateBtn.style.padding = "6px 12px";

  toolbar.append(attachBtnToolbar, regenerateBtn);

  const input = document.createElement("textarea");
  input.id = "chat-input";
  input.placeholder = "Ask or enter your prompt…";
  input.rows = 1;
  input.style.resize = "none";
  input.style.overflow = "hidden";
  input.style.flexGrow = "1";
  input.style.fontSize = "1rem";
  input.style.padding = "14px 20px";
  input.style.borderRadius = "18px";
  input.style.border = "2.5px solid var(--button-bg)";
  input.style.background = "var(--background-color)";
  input.style.color = "var(--text-color)";
  input.style.outlineOffset = "3px";

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });

  const sendBtn = document.createElement("button");
  sendBtn.id = "chat-send-btn";
  sendBtn.textContent = "Send";

  sendBtn.addEventListener("click", async () => {
    const userInput = input.value.trim();
    if (!userInput && !pendingAttachment) return;
    const now = new Date().toISOString();

    appendMessage(chatHistoryDiv, "user", userInput, now);
    chatHistory.push({ role: "user", content: userInput, created_at: now });
    input.value = "";
    input.style.height = "auto";
    setLoadingState(true, sendBtn);

    try {
      await sendMessageToThread(currentChatId, key, userInput);
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    } catch (error) {
      appendMessage(
        chatHistoryDiv,
        "bot",
        "Error: Unable to get reply. Try again.",
        new Date().toISOString(),
        true
      );
      console.error(error);
    }
    setLoadingState(false, sendBtn);
  });
  regenerateBtn.addEventListener("click", async () => {
    if (!currentCharKey || !currentChatId) {
      alert("No active chat to regenerate");
      return;
    }

    if (chatHistory.length === 0) {
      alert("No messages to regenerate");
      return;
    }

    // Confirm regeneration
    if (confirm("Regenerate the last response?")) {
      regenerateBtn.textContent = "Regenerating...";
      regenerateBtn.disabled = true;

      try {
        await regenerateLastResponse();
      } catch (error) {
        console.error("Regenerate button error:", error);
      } finally {
        regenerateBtn.textContent = "Regenerate";
        regenerateBtn.disabled = false;
      }
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  chatPanel.append(chatHeader, chatHistoryDiv, toolbar, inputRow);
  mainContent.appendChild(chatPanel);

  renderAttachmentPreview();
  input.focus();
}

// Append message and optionally mark as error
function appendMessage(container, sender, text, timestamp, isError = false) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}${isError ? " error" : ""}`;

  const content = document.createElement("div");
  content.className = "msg-content";
  content.textContent = text;

  msg.appendChild(content);

  if (timestamp) {
    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.textContent = new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    msg.appendChild(timeDiv);
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function setLoadingState(isLoading, sendBtn) {
  if (sendBtn) {
    sendBtn.disabled = isLoading;
    sendBtn.textContent = isLoading ? "Loading…" : "Send";
  } else {
    document.body.style.cursor = isLoading ? "wait" : "";
  }
}

// === SIDEBAR FUNCTIONALITY ===

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const overlay = document.getElementById("main-content-overlay");

  if (!sidebar || !toggleBtn || !overlay) return;

  sidebar.classList.remove("open");
  toggleBtn.textContent = "☰";

  toggleBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      toggleBtn.textContent = "☰";
    } else {
      sidebar.classList.add("open");
      toggleBtn.textContent = "✖";
    }
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    toggleBtn.textContent = "☰";
  });
});

// Sidebar toggle drag functionality with saved position
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("sidebar-toggle");
  const container = document.getElementById("container");
  if (!toggleBtn || !container) return;

  let isDragging = false;
  let offsetX = 0,
    offsetY = 0;

  const savedLeft = localStorage.getItem("sidebarToggleLeft");
  const savedTop = localStorage.getItem("sidebarToggleTop");

  if (savedLeft && savedTop) {
    toggleBtn.style.left = savedLeft;
    toggleBtn.style.top = savedTop;
    toggleBtn.style.position = "absolute";
    toggleBtn.style.right = "auto";
  } else {
    toggleBtn.style.position = "absolute";
    toggleBtn.style.top = "10px";
    toggleBtn.style.right = "10px";
  }

  toggleBtn.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - toggleBtn.offsetLeft;
    offsetY = e.clientY - toggleBtn.offsetTop;
    toggleBtn.style.transition = "none";
    toggleBtn.style.right = "auto";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    const contRect = container.getBoundingClientRect();
    const btnRect = toggleBtn.getBoundingClientRect();

    x = Math.max(0, Math.min(x, contRect.width - btnRect.width));
    y = Math.max(0, Math.min(y, contRect.height - btnRect.height));

    toggleBtn.style.left = x + "px";
    toggleBtn.style.top = y + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      toggleBtn.style.transition = "";
      localStorage.setItem("sidebarToggleLeft", toggleBtn.style.left);
      localStorage.setItem("sidebarToggleTop", toggleBtn.style.top);
    }
  });
});

// NEW: Load chat history for snip conversations
async function loadSnipChatHistory(chatHistoryDiv) {
  console.log("📜 Loading snip chat history...");

  if (!chatHistoryDiv) {
    console.warn("No chat history div found");
    return;
  }

  try {
    // Get or create snip chat ID
    let chatId = localStorage.getItem(`intentkit_chatid_snip`);

    if (!chatId) {
      console.log("📜 No existing snip chat, will create when needed");
      chatHistoryDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <div style="font-size: 2em; margin-bottom: 10px;">💬</div>
          <div>Send your first snip to start the conversation!</div>
        </div>
      `;
      return;
    }

    console.log("📜 Loading history for chat:", chatId);

    // Load chat history
    const history = await getChatHistory(chatId, "white", 50);

    if (history.length === 0) {
      chatHistoryDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <div style="font-size: 2em; margin-bottom: 10px;">💬</div>
          <div>No messages yet. Send a snip to start!</div>
        </div>
      `;
      return;
    }

    // Clear and display history (oldest first)
    chatHistoryDiv.innerHTML = "";

    history.reverse().forEach((msg) => {
      const authorType = msg.author_type?.toLowerCase();
      const author =
        authorType === "api" || authorType === "user" ? "user" : "bot";
      appendSnipMessage(chatHistoryDiv, author, msg.message, msg.created_at);
    });

    // Scroll to bottom
    setTimeout(() => {
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }, 100);

    console.log("📜 Loaded", history.length, "messages");
  } catch (error) {
    console.error("❌ Failed to load snip chat history:", error);
    chatHistoryDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="font-size: 2em; margin-bottom: 10px;">⚠️</div>
        <div>Could not load chat history</div>
      </div>
    `;
  }
}
// ADD this message listener to popup.js (for cropping images)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CROP_IMAGE") {
    console.log("✂️ POPUP: Received crop request");

    cropImage(message.dataUrl, message.coordinates)
      .then((croppedImage) => {
        console.log("✂️ POPUP: Cropping completed");
        sendResponse({ success: true, croppedImage: croppedImage });
      })
      .catch((error) => {
        console.error("✂️ POPUP: Cropping failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }
});

// Your existing cropImage function should work fine in popup context
function cropImage(dataUrl, coordinates) {
  return new Promise((resolve) => {
    console.log("✂️ POPUP: Starting crop operation");

    const img = new Image();
    img.onload = () => {
      console.log("✂️ POPUP: Image loaded, creating canvas");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = coordinates.width;
      canvas.height = coordinates.height;

      const ratio = window.devicePixelRatio || 1;

      ctx.drawImage(
        img,
        coordinates.x * ratio,
        coordinates.y * ratio,
        coordinates.width * ratio,
        coordinates.height * ratio,
        0,
        0,
        coordinates.width,
        coordinates.height
      );

      const result = canvas.toDataURL("image/png");
      console.log("✂️ POPUP: Crop completed, size:", result.length);
      resolve(result);
    };
    img.src = dataUrl;
  });
}
// NEW: Highlight newly captured snip in gallery
function highlightNewSnip(snipId) {
  console.log("✨ HIGHLIGHT: Looking for new snip:", snipId);

  // Find the snip item in the gallery
  const gallery = document.querySelector(".snip-gallery");
  if (!gallery) {
    console.log("❌ HIGHLIGHT: No gallery found");
    return;
  }

  // Look for the snip item (we'll need to add data attributes)
  const snipItems = gallery.querySelectorAll(".snip-item-enhanced");
  let targetItem = null;

  // Find the item by checking the stored snips
  const targetSnip = storedSnips.find((s) => s.id === snipId);
  if (!targetSnip) {
    console.log("❌ HIGHLIGHT: Snip not found in storage");
    return;
  }

  // Find the corresponding DOM element (newest snips are first, so check order)
  const sortedSnips = [...storedSnips].reverse();
  const snipIndex = sortedSnips.findIndex((s) => s.id === snipId);

  if (snipIndex !== -1 && snipItems[snipIndex]) {
    targetItem = snipItems[snipIndex];
  }

  if (targetItem) {
    console.log("✨ HIGHLIGHT: Found target item, highlighting...");

    // Add highlight effect
    targetItem.style.animation = "newSnipPulse 2s ease-in-out 3 alternate";
    targetItem.style.borderColor = "#00ff88";
    targetItem.style.boxShadow = "0 0 20px rgba(0, 255, 136, 0.8)";

    // Scroll into view if needed
    targetItem.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Remove highlight after animation
    setTimeout(() => {
      targetItem.style.animation = "";
      // Only remove highlight if not selected
      if (!selectedSnips.includes(snipId)) {
        targetItem.style.borderColor = "#555";
        targetItem.style.boxShadow = "none";
      }
      console.log("✨ HIGHLIGHT: Highlight removed");
    }, 6000);

    // Show a small tooltip
    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
      position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
      background: #00ff88; color: #000; padding: 4px 8px; border-radius: 4px;
      font-size: 10px; font-weight: bold; z-index: 1000;
      animation: fadeInOut 4s ease-in-out;
    `;
    tooltip.textContent = "New!";
    targetItem.style.position = "relative";
    targetItem.appendChild(tooltip);

    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 4000);
  } else {
    console.log("❌ HIGHLIGHT: Could not find target item in DOM");
  }
}
// === SNIP THREAD MANAGEMENT ===

// Global variables for snip threads
let snipThreads = [];
let currentSnipThreadId = null;

// Load snip threads from localStorage
function loadSnipThreads() {
  try {
    const saved = localStorage.getItem("glyphie-snip-threads");
    snipThreads = saved ? JSON.parse(saved) : [];
    console.log("📋 Loaded", snipThreads.length, "snip threads from storage");
  } catch (error) {
    console.error("❌ Error loading snip threads:", error);
    snipThreads = [];
  }
}

// Save snip threads to localStorage
function saveSnipThreads() {
  try {
    localStorage.setItem("glyphie-snip-threads", JSON.stringify(snipThreads));
    console.log("💾 Saved", snipThreads.length, "snip threads to storage");
  } catch (error) {
    console.error("❌ Error saving snip threads:", error);
  }
}

// Create a new snip thread
async function createSnipThread(name = null) {
  console.log("🆕 Creating new snip thread...");

  try {
    // Create thread via API
    const apiKey = characterApiKeys.white;
    const response = await fetch(`${BASE_URL}/chats`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.status}`);
    }

    const data = await response.json();
    const chatId = data.id;

    // Generate thread name if not provided
    const threadName = name || `Thread ${snipThreads.length + 1}`;
    const timestamp = new Date().toISOString();

    // Create local thread object
    const newThread = {
      id: chatId,
      name: threadName,
      created_at: timestamp,
      updated_at: timestamp,
      messageCount: 0,
    };

    // Add to threads list
    snipThreads.push(newThread);
    saveSnipThreads();

    console.log("✅ Created new snip thread:", threadName, "ID:", chatId);
    return newThread;
  } catch (error) {
    console.error("❌ Failed to create snip thread:", error);
    throw error;
  }
}

// Switch to a different snip thread
async function switchSnipThread(threadId) {
  console.log("🔄 Switching to snip thread:", threadId);

  const thread = snipThreads.find((t) => t.id === threadId);
  if (!thread) {
    console.error("❌ Thread not found:", threadId);
    return;
  }

  currentSnipThreadId = threadId;
  localStorage.setItem("glyphie-current-snip-thread", threadId);

  // Update chat history display
  const chatHistoryDiv = document.getElementById("active-snip-chat-history");
  if (chatHistoryDiv) {
    await loadSnipThreadHistory(chatHistoryDiv, threadId);
  }

  // Update thread list display
  updateSnipThreadList();

  console.log("✅ Switched to thread:", thread.name);
}

// Load chat history for a specific snip thread
async function loadSnipThreadHistory(chatHistoryDiv, threadId) {
  console.log("📜 Loading history for snip thread:", threadId);

  if (!chatHistoryDiv) {
    console.warn("No chat history div found");
    return;
  }

  try {
    const apiKey = characterApiKeys.white;
    const response = await fetch(
      `${BASE_URL}/chats/${threadId}/messages?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch thread history: ${response.status}`);
    }

    const data = await response.json();
    const history = data.data || [];

    if (history.length === 0) {
      chatHistoryDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <div style="font-size: 2em; margin-bottom: 10px;">💬</div>
          <div>No messages yet. Send a snip to start!</div>
        </div>
      `;
      return;
    }

    // Clear and display history (oldest first)
    chatHistoryDiv.innerHTML = "";

    history.reverse().forEach((msg) => {
      const authorType = msg.author_type?.toLowerCase();
      const author =
        authorType === "api" || authorType === "user" ? "user" : "bot";
      appendSnipMessage(chatHistoryDiv, author, msg.message, msg.created_at);
    });

    // Scroll to bottom
    setTimeout(() => {
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }, 100);

    console.log("📜 Loaded", history.length, "messages for thread");
  } catch (error) {
    console.error("❌ Failed to load thread history:", error);
    chatHistoryDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="font-size: 2em; margin-bottom: 10px;">⚠️</div>
        <div>Could not load chat history</div>
      </div>
    `;
  }
}

function updateSnipThreadList() {
  const threadList =
    document.getElementById("active-snip-thread-list") ||
    document.getElementById("snip-thread-list");

  const threadBar =
    document.getElementById("active-snip-thread-bar") ||
    document.getElementById("snip-thread-bar");

  if (!threadList) {
    console.warn("Thread list element not found");
    return;
  }

  threadList.innerHTML = "";

  // Update dropdown button text with count
  const dropdownText = threadBar?.querySelector(".thread-dropdown-text");
  if (dropdownText) {
    dropdownText.textContent = `Threads (${snipThreads.length})`;
  }

  if (snipThreads.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-threads";
    emptyItem.textContent = "No threads yet. Create one to get started!";
    threadList.appendChild(emptyItem);
    return;
  }

  snipThreads.forEach((thread) => {
    const item = document.createElement("li");
    item.className = "thread-item";

    if (thread.id === currentSnipThreadId) {
      item.classList.add("active");
    }

    const threadInfo = document.createElement("div");
    threadInfo.className = "thread-info";

    const threadName = document.createElement("div");
    threadName.className = "thread-name";
    threadName.textContent = thread.name;

    const threadMeta = document.createElement("div");
    threadMeta.className = "thread-meta";
    const date = new Date(thread.created_at).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    threadMeta.textContent = `${date} • ${thread.messageCount || 0} msgs`;

    threadInfo.appendChild(threadName);
    threadInfo.appendChild(threadMeta);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Delete thread";

    // Event listeners
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Delete thread "${thread.name}"?`)) {
        try {
          await deleteSnipThread(thread.id);
        } catch (error) {
          console.error("Delete error:", error);
          alert("Failed to delete thread");
        }
      }
    });

    item.addEventListener("click", async (e) => {
      if (e.target === deleteBtn) return;
      try {
        await switchSnipThread(thread.id);

        // Close dropdown after selection
        if (threadBar) {
          threadBar.classList.remove("dropdown-open");
        }
      } catch (error) {
        console.error("Switch thread error:", error);
      }
    });

    item.appendChild(threadInfo);
    item.appendChild(deleteBtn);
    threadList.appendChild(item);
  });

  console.log("✅ Thread dropdown updated with", snipThreads.length, "threads");
}

// Delete a snip thread
async function deleteSnipThread(threadId) {
  const thread = snipThreads.find((t) => t.id === threadId);
  if (!thread) return;

  if (!confirm(`Delete thread "${thread.name}"? This cannot be undone.`)) {
    return;
  }

  console.log("🗑️ Deleting snip thread:", threadId);

  try {
    // Delete from API (optional - threads might auto-delete when empty)
    const apiKey = characterApiKeys.white;
    await fetch(`${BASE_URL}/chats/${threadId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // Remove from local storage
    snipThreads = snipThreads.filter((t) => t.id !== threadId);
    saveSnipThreads();

    // If this was the current thread, switch to another or create new
    if (currentSnipThreadId === threadId) {
      if (snipThreads.length > 0) {
        await switchSnipThread(snipThreads[0].id);
      } else {
        currentSnipThreadId = null;
        localStorage.removeItem("glyphie-current-snip-thread");

        // Clear chat history
        const chatHistoryDiv = document.getElementById(
          "active-snip-chat-history"
        );
        if (chatHistoryDiv) {
          chatHistoryDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
              <div style="font-size: 2em; margin-bottom: 10px;">💬</div>
              <div>Create a new thread to start chatting!</div>
            </div>
          `;
        }
      }
    }

    // Update UI
    updateSnipThreadList();
    console.log("✅ Thread deleted successfully");
  } catch (error) {
    console.error("❌ Failed to delete thread:", error);
    alert("Failed to delete thread. Please try again.");
  }
}

async function initSnipThreads() {
  console.log("🚀 Initializing snip threads...");

  loadSnipThreads();

  // Fetch existing threads from API
  await fetchThreadsFromAPI();
  console.log("📋 Total threads after API fetch:", snipThreads.length);
  console.log(
    "📋 Threads:",
    snipThreads.map((t) => `${t.name} (${t.id.slice(-8)})`)
  );

  // Get current thread from localStorage
  const savedCurrentThread = localStorage.getItem(
    "glyphie-current-snip-thread"
  );

  if (
    savedCurrentThread &&
    snipThreads.find((t) => t.id === savedCurrentThread)
  ) {
    currentSnipThreadId = savedCurrentThread;
  } else if (snipThreads.length > 0) {
    // Use the most recent thread
    currentSnipThreadId = snipThreads[0].id; // Already sorted newest first
    localStorage.setItem("glyphie-current-snip-thread", currentSnipThreadId);
  } else {
    // Create initial thread if none exist
    try {
      const newThread = await createSnipThread("Main Thread");
      currentSnipThreadId = newThread.id;
      localStorage.setItem("glyphie-current-snip-thread", currentSnipThreadId);
    } catch (error) {
      console.error("❌ Failed to create initial thread:", error);
    }
  }

  console.log(
    "🚀 Snip threads initialized. Current thread:",
    currentSnipThreadId
  );
}

// Update message count for a thread
function updateThreadMessageCount(threadId) {
  const thread = snipThreads.find((t) => t.id === threadId);
  if (thread) {
    thread.messageCount = (thread.messageCount || 0) + 1;
    thread.updated_at = new Date().toISOString();
    saveSnipThreads();
    updateSnipThreadList();
  }
}
async function fetchThreadsFromAPI() {
  console.log("🔍 Fetching existing threads from API...");

  try {
    const apiKey = characterApiKeys.white;
    const response = await fetch(`${BASE_URL}/chats`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch threads: ${response.status}`);
    }

    const data = await response.json();
    const apiThreads = data.data || [];

    console.log(`📋 Found ${apiThreads.length} threads from API`);

    // Convert API threads to our format and merge with local threads
    const existingIds = new Set(snipThreads.map((t) => t.id));

    apiThreads.forEach((apiThread) => {
      if (!existingIds.has(apiThread.id)) {
        const thread = {
          id: apiThread.id,
          name: `Thread ${apiThread.id.slice(-8)}`, // Use last 8 chars of ID as name
          created_at: apiThread.created_at || new Date().toISOString(),
          updated_at: apiThread.updated_at || new Date().toISOString(),
          messageCount: 0, // Will be updated when messages are loaded
        };
        snipThreads.push(thread);
      }
    });

    // Sort threads by creation date (newest first)
    snipThreads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    saveSnipThreads();
    console.log(`✅ Merged threads. Total: ${snipThreads.length}`);
  } catch (error) {
    console.error("❌ Failed to fetch threads from API:", error);
    // Continue with local threads only
  }
}

document.addEventListener("DOMContentLoaded", init);
