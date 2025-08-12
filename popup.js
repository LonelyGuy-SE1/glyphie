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

// Load stored snips on init
function loadStoredSnips() {
  const saved = localStorage.getItem("glyphie-snips");
  storedSnips = saved ? JSON.parse(saved) : [];
}

// Save snips to localStorage
function saveSnips() {
  localStorage.setItem("glyphie-snips", JSON.stringify(storedSnips));
}

// ROBUST handleSnipAction - Add delays for stability
async function handleSnipAction() {
  console.log("🔍 Starting snip action - ROBUST VERSION");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      alert("No active tab found");
      return;
    }

    console.log("🔍 Injecting script into tab:", tab.id);

    // Inject script with delay
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectFullSnipScript,
    });

    // Wait a bit for injection to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("✅ Script injected, sending message...");

    // Send start message with retry logic
    let retryCount = 0;
    const sendMessage = () => {
      chrome.tabs.sendMessage(tab.id, { type: "START_SNIP" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Message failed:", chrome.runtime.lastError.message);
          if (retryCount < 3) {
            retryCount++;
            console.log(`🔄 Retrying message (attempt ${retryCount})...`);
            setTimeout(sendMessage, 500);
          } else {
            alert("Failed to start snipping after multiple attempts");
          }
        } else {
          console.log("✅ Snip started:", response);
          const snipBtn =
            document.getElementById("active-snip-btn") ||
            document.querySelector("#snip-btn");
          if (snipBtn) {
            snipBtn.textContent = "Snipping... (check webpage)";
            snipBtn.style.background = "orange";
          }
        }
      });
    };

    sendMessage();
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Error: " + error.message);
  }
}

// FIXED injectFullSnipScript - Proper response handling
function injectFullSnipScript() {
  console.log("🔧 SNIP: Full script injected on:", window.location.href);

  if (window.glyphieSnipLoaded) {
    console.log("SNIP: Already loaded");
    return;
  }
  window.glyphieSnipLoaded = true;

  let overlay = null;
  let isSelecting = false;
  let startX = 0,
    startY = 0;

  // Listen for messages with PROPER response handling
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 SNIP: Got message:", message.type);

    if (message.type === "START_SNIP") {
      try {
        createSnipOverlay();
        sendResponse({ success: true, message: "Overlay created" }); // Send response immediately
        return false; // Don't keep channel open
      } catch (error) {
        console.error("SNIP: Error creating overlay:", error);
        sendResponse({ success: false, error: error.message });
        return false;
      }
    }

    return false; // Don't keep channel open for unknown messages
  });

  function createSnipOverlay() {
    console.log("SNIP: Creating overlay");

    // Remove existing
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.4) !important;
      z-index: 2147483647 !important;
      cursor: crosshair !important;
    `;

    // Instructions
    const instructions = document.createElement("div");
    instructions.style.cssText = `
      position: absolute !important;
      top: 30px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.9) !important;
      color: #bbff00 !important;
      padding: 15px 25px !important;
      border: 3px solid #bbff00 !important;
      border-radius: 10px !important;
      font-size: 16px !important;
      font-weight: bold !important;
      text-align: center !important;
    `;
    instructions.innerHTML =
      "✂️ Click and drag to select area<br><small>Press ESC to cancel</small>";

    // Selection box
    const selectionBox = document.createElement("div");
    selectionBox.style.cssText = `
      position: absolute !important;
      border: 4px dashed #bbff00 !important;
      background: rgba(187, 255, 0, 0.15) !important;
      display: none !important;
      pointer-events: none !important;
    `;

    overlay.appendChild(instructions);
    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);

    console.log("✅ SNIP: Overlay created");

    // Mouse events
    overlay.onmousedown = function (e) {
      console.log("🖱️ SNIP: Mouse down");
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;

      selectionBox.style.left = startX + "px";
      selectionBox.style.top = startY + "px";
      selectionBox.style.width = "0px";
      selectionBox.style.height = "0px";
      selectionBox.style.display = "block";

      instructions.innerHTML =
        "🎯 Dragging... Release to capture<br><small>Press ESC to cancel</small>";
      e.preventDefault();
    };

    overlay.onmousemove = function (e) {
      if (!isSelecting) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selectionBox.style.left = left + "px";
      selectionBox.style.top = top + "px";
      selectionBox.style.width = width + "px";
      selectionBox.style.height = height + "px";

      instructions.innerHTML = `📏 Size: ${Math.round(width)} × ${Math.round(
        height
      )}px<br><small>Release to capture</small>`;
    };

    overlay.onmouseup = function (e) {
      if (!isSelecting) return;

      console.log("🖱️ SNIP: Mouse up");
      const rect = selectionBox.getBoundingClientRect();

      if (rect.width > 20 && rect.height > 20) {
        instructions.innerHTML =
          "✅ Capturing...<br><small>Please wait</small>";
        instructions.style.borderColor = "#00ff88";

        // Send capture coordinates with proper error handling
        const coordinates = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };

        console.log("📸 SNIP: Sending capture coordinates:", coordinates);

        chrome.runtime.sendMessage(
          {
            type: "CAPTURE_AREA",
            coordinates: coordinates,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "SNIP: Error sending capture message:",
                chrome.runtime.lastError
              );
            } else {
              console.log(
                "✅ SNIP: Capture message sent successfully:",
                response
              );
            }
          }
        );

        // Show success and remove overlay after delay
        setTimeout(() => {
          showWebpageSuccess(rect);
          if (overlay) {
            overlay.remove();
            overlay = null;
          }
        }, 500);
      } else {
        instructions.innerHTML =
          "❌ Too small! Try again<br><small>Click and drag larger area</small>";
        instructions.style.borderColor = "#ff4444";
        selectionBox.style.display = "none";

        setTimeout(() => {
          instructions.innerHTML =
            "✂️ Click and drag to select area<br><small>Press ESC to cancel</small>";
          instructions.style.borderColor = "#bbff00";
        }, 2000);
      }

      isSelecting = false;
    };

    // ESC key
    document.onkeydown = function (e) {
      if (e.key === "Escape" && overlay) {
        console.log("⌨️ SNIP: ESC pressed");
        overlay.remove();
        overlay = null;
      }
    };
  }

  // Show success on webpage
  function showWebpageSuccess(rect) {
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
      font-family: Arial, sans-serif !important;
      border: 3px solid #fff !important;
      box-shadow: 0 8px 32px rgba(0, 255, 136, 0.8) !important;
    `;

    success.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 18px; margin-bottom: 8px;">✅ Snip Captured!</div>
        <div style="font-size: 12px;">
          Size: ${Math.round(rect.width)}×${Math.round(rect.height)}px
        </div>
        <div style="font-size: 11px; margin-top: 5px;">
          Processing...
        </div>
      </div>
    `;

    document.body.appendChild(success);

    setTimeout(() => {
      if (success.parentNode) {
        success.parentNode.removeChild(success);
      }
    }, 4000);

    console.log("✅ SNIP: Success notification shown");
  }

  console.log("✅ SNIP: Full script setup complete");
}

// SINGLE message listener for capture - FIXED
// ENHANCED message listener - Reset UI after capture
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔍 POPUP MESSAGE RECEIVED:", message);

  if (message.type === "CAPTURE_AREA") {
    console.log("📸 CAPTURE_AREA message received!");
    console.log("📸 Coordinates:", message.coordinates);

    // Reset snip button UI
    const snipBtn =
      document.getElementById("active-snip-btn") ||
      document.querySelector("#snip-btn");
    if (snipBtn) {
      snipBtn.textContent = "Snip ✂️";
      snipBtn.disabled = false;
      snipBtn.style.opacity = "1";
    }

    // Call capture function
    captureScreenshotArea(message.coordinates);

    sendResponse({ received: true, status: "capture started" });
  }

  return true; // Keep channel open for async response
});

// ROBUST captureScreenshotArea - Add delays and error handling
async function captureScreenshotArea(coordinates) {
  console.log("📸 ROBUST CAPTURE: Starting with coordinates:", coordinates);

  try {
    // Add delay for stability
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log("📸 Got tab:", tab.id);

    // Capture screenshot with delay
    await new Promise((resolve) => setTimeout(resolve, 200));
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 100,
    });
    console.log("📸 Screenshot captured, length:", dataUrl.length);

    // Crop image with delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    const croppedImage = await cropImage(dataUrl, coordinates);
    console.log("📸 Image cropped, length:", croppedImage.length);

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

    console.log("📸 Created snip data with ID:", snipData.id);

    // Save to localStorage with retry
    let saveSuccess = false;
    let saveAttempts = 0;

    while (!saveSuccess && saveAttempts < 3) {
      try {
        const saved = localStorage.getItem("glyphie-snips");
        const existingSnips = saved ? JSON.parse(saved) : [];
        existingSnips.push(snipData);

        localStorage.setItem("glyphie-snips", JSON.stringify(existingSnips));

        // Verify save
        const verification = localStorage.getItem("glyphie-snips");
        const verifySnips = verification ? JSON.parse(verification) : [];

        if (verifySnips.find((s) => s.id === snipData.id)) {
          saveSuccess = true;
          storedSnips = verifySnips;
          console.log("📸 SAVED TO STORAGE! Total snips:", verifySnips.length);
        } else {
          throw new Error("Verification failed");
        }
      } catch (error) {
        saveAttempts++;
        console.warn(`⚠️ Save attempt ${saveAttempts} failed:`, error);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!saveSuccess) {
      throw new Error("Failed to save to localStorage after multiple attempts");
    }

    // Update UI with delay
    setTimeout(() => {
      const snipBtn =
        document.getElementById("active-snip-btn") ||
        document.querySelector("#snip-btn");
      if (snipBtn) {
        snipBtn.textContent = "✅ Captured!";
        snipBtn.style.background = "green";
        setTimeout(() => {
          snipBtn.textContent = "Snip ✂️";
          snipBtn.style.background = "";
        }, 2000);
      }
    }, 100);

    // Force refresh gallery with multiple attempts
    const refreshGallery = () => {
      const activeSection = document.getElementById("active-snip-section");
      if (activeSection) {
        console.log("📸 Forcing gallery refresh...");
        updateGallery(activeSection);
      }
    };

    setTimeout(refreshGallery, 300);
    setTimeout(refreshGallery, 800);
    setTimeout(refreshGallery, 1500);

    console.log("📸 CAPTURE COMPLETE!");
  } catch (error) {
    console.error("❌ ROBUST CAPTURE ERROR:", error);
    alert("Capture failed: " + error.message);
  }
}

// FIXED init function - Better navigation logic
function init() {
  console.log("🔧 INIT: Extension initializing...");

  // Check flags FIRST before setting up other listeners
  const gotoSnip = localStorage.getItem("glyphie-goto-snip");
  const newSnip = localStorage.getItem("glyphie-new-snip");

  console.log("🔧 INIT: Flags - gotoSnip:", gotoSnip, "newSnip:", newSnip);

  // Set up sidebar button listeners
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
    localStorage.removeItem("glyphie-goto-snip");

    // Set snip button as active
    sidebarButtons.forEach((btn) => btn.classList.remove("active"));
    const snipButton = document.querySelector('[data-section="snip"]');
    if (snipButton) {
      snipButton.classList.add("active");
      console.log("🔧 INIT: Set snip button as active");
    }

    // Load snip section
    setTimeout(() => {
      console.log("🔧 INIT: Loading snip section...");
      loadSection("snip");
    }, 100);
  } else {
    console.log("🔧 INIT: Loading default characters section");
    loadSection("characters");
  }

  applySavedTheme();
}

// UPDATED renderSnip - Force gallery refresh multiple ways
function renderSnip() {
  console.log("🔍 Debug: renderSnip() called");

  // Check if there's a new snip flag
  const newSnipFlag = localStorage.getItem("glyphie-new-snip");
  if (newSnipFlag) {
    console.log("🆕 New snip detected, will refresh gallery");
    localStorage.removeItem("glyphie-new-snip");
  }

  // Wait for DOM to be fully ready
  if (document.readyState !== "complete") {
    console.log("🔍 DOM not ready, waiting...");
    setTimeout(() => renderSnip(), 100);
    return;
  }

  // Debug - check if element exists
  const snipSection = document.getElementById("snip-section");
  console.log("🔍 Debug: snipSection =", snipSection);

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

// ROBUST updateGallery - Add delays for stability
function updateGallery(container) {
  console.log("🔄 ROBUST GALLERY UPDATE");

  // Add small delay to ensure DOM is ready
  setTimeout(() => {
    const gallery = container.querySelector(".snip-gallery");
    if (!gallery) {
      console.log("❌ No gallery found, retrying...");
      setTimeout(() => updateGallery(container), 500);
      return;
    }

    // Get fresh snips with retry
    let snips = [];
    try {
      const saved = localStorage.getItem("glyphie-snips");
      snips = saved ? JSON.parse(saved) : [];
      storedSnips = snips;
    } catch (error) {
      console.error("❌ Error parsing snips:", error);
      return;
    }

    console.log("🔄 Found", snips.length, "snips in storage");

    gallery.innerHTML = "";

    if (snips.length === 0) {
      gallery.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <div style="font-size: 3em;">📷</div>
          <div>No snips yet</div>
        </div>
      `;
      return;
    }

    // Create items with small delays
    snips.reverse().forEach((snip, index) => {
      setTimeout(() => {
        console.log(`🔄 Creating gallery item ${index + 1}`);

        const item = document.createElement("div");
        item.style.cssText = `
          background: #333;
          border: 2px solid #555;
          border-radius: 8px;
          padding: 8px;
          margin: 4px;
          cursor: pointer;
          position: relative;
        `;

        if (selectedSnips.includes(snip.id)) {
          item.style.borderColor = "#bbff00";
        }

        item.innerHTML = `
          <img src="${snip.data}" 
               style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px; display: block;"
               alt="Snip ${index + 1}">
          <div style="text-align: center; font-size: 11px; color: #ccc; margin-top: 4px;">
            ${snip.dimensions.width} × ${snip.dimensions.height}
          </div>
          <button onclick="this.parentElement.remove()" 
                  style="position: absolute; top: 2px; right: 2px; background: red; color: white; border: none; width: 18px; height: 18px; border-radius: 50%; font-size: 10px;">×</button>
        `;

        item.onclick = (e) => {
          if (e.target.tagName === "BUTTON") return;

          const idx = selectedSnips.indexOf(snip.id);
          if (idx > -1) {
            selectedSnips.splice(idx, 1);
            item.style.borderColor = "#555";
          } else {
            selectedSnips.push(snip.id);
            item.style.borderColor = "#bbff00";
          }
          console.log("Selected snips:", selectedSnips);
        };

        gallery.appendChild(item);
      }, index * 50); // Small delay between each item
    });

    console.log("✅ Gallery update initiated");
  }, 100);
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
  console.log("🔍 Setting up snip event listeners");

  loadStoredSnips();

  const snipBtn = snipContainer.querySelector("#snip-btn");
  const snipInput = snipContainer.querySelector("#snip-chat-input");
  const snipSendBtn = snipContainer.querySelector("#snip-send-btn");
  const snipChatHistory = snipContainer.querySelector("#snip-chat-history");

  // Change IDs to avoid conflicts
  if (snipBtn) snipBtn.id = "active-snip-btn";
  if (snipInput) snipInput.id = "active-snip-input";
  if (snipSendBtn) snipSendBtn.id = "active-snip-send-btn";
  if (snipChatHistory) snipChatHistory.id = "active-snip-chat-history";

  // LOAD CHAT HISTORY FOR SNIPS
  loadSnipChatHistory(snipChatHistory);

  // Create and insert snip gallery
  createSnipGallery(snipContainer);

  // Event listeners
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

// UPDATED updateGallery - COMPLETE VERSION
function updateGallery(container) {
  const gallery = container.querySelector(".snip-gallery");
  if (!gallery) return;

  // ALWAYS load fresh from localStorage
  const saved = localStorage.getItem("glyphie-snips");
  const freshSnips = saved ? JSON.parse(saved) : [];
  storedSnips = freshSnips; // Update global variable

  console.log("🔄 Updating gallery with", storedSnips.length, "snips");

  gallery.innerHTML = "";

  if (storedSnips.length === 0) {
    gallery.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--accent-color); padding: 20px;">
        <div style="font-size: 2em; margin-bottom: 10px;">📷</div>
        <div>No snips yet. Click the Snip ✂️ button to start!</div>
      </div>
    `;
    return;
  }

  // Show newest snips first
  const sortedSnips = [...storedSnips].reverse();

  sortedSnips.forEach((snip) => {
    const item = document.createElement("div");
    item.className = "snip-item";
    if (selectedSnips.includes(snip.id)) {
      item.classList.add("selected");
    }

    item.innerHTML = `
      <img class="snip-thumbnail" src="${snip.data}" alt="Snip ${snip.id}">
      <div class="snip-info">${snip.dimensions.width}×${snip.dimensions.height}</div>
      <button class="snip-remove">×</button>
    `;

    // Click to select/deselect
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("snip-remove")) {
        // Remove snip
        const updatedSnips = storedSnips.filter((s) => s.id !== snip.id);
        localStorage.setItem("glyphie-snips", JSON.stringify(updatedSnips));
        storedSnips = updatedSnips;
        selectedSnips = selectedSnips.filter((id) => id !== snip.id);
        updateGallery(container);
        return;
      }

      // Toggle selection
      const index = selectedSnips.indexOf(snip.id);
      if (index > -1) {
        selectedSnips.splice(index, 1);
      } else {
        selectedSnips.push(snip.id);
      }
      updateGallery(container);
    });

    gallery.appendChild(item);
  });

  console.log("✅ Gallery updated successfully");
}

// UPDATED handleSnipSend - Send images to Crestal API
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

  // Add selected snips to chat display
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

    // Create text description of images
    const imageDescriptions = selectedSnips.map((snipId, index) => {
      const snip = storedSnips.find((s) => s.id === snipId);
      return `Image ${index + 1}: Screenshot (${snip.dimensions.width}×${
        snip.dimensions.height
      }px) captured on ${new Date(snip.timestamp).toLocaleString()}`;
    });

    const fullMessage = [
      message || "Please analyze these images:",
      ...imageDescriptions,
    ].join("\n\n");

    console.log("📤 Sending to API with message:", fullMessage);
    console.log("📤 Attachments:", uploadedImages);

    // Send to Crestal API
    const apiKey = characterApiKeys.white;
    let chatId = localStorage.getItem(`intentkit_chatid_snip`);

    if (!chatId) {
      chatId = await createSnipChatThread();
    }

    const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: fullMessage,
        attachments: uploadedImages, // Send the uploaded images
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

// Create chat thread for snips
async function createSnipChatThread() {
  const apiKey = characterApiKeys.white;

  const response = await fetch(`${BASE_URL}/chats`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) throw new Error("Failed to create snip chat thread");

  const data = await response.json();
  const chatId = data.id;
  localStorage.setItem(`intentkit_chatid_snip`, chatId);
  return chatId;
}

// UPDATED appendSnipImageMessage - Use base64 data
function appendSnipImageMessage(container, snipData, timestamp) {
  const msg = document.createElement("div");
  msg.className = "message snip";

  const content = document.createElement("div");
  content.className = "msg-content";

  const img = document.createElement("img");
  img.src = snipData.data; // Use base64 data directly
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
  caption.textContent = `✂️ Snip (${snipData.dimensions.width}×${snipData.dimensions.height}px)`;

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

function init() {
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
  loadSection("characters");
  applySavedTheme();
}

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
    case "characters":
      renderCharacters();
      break;
    case "stats":
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

// ENHANCED renderSnip - Aggressive gallery refresh
function renderSnip() {
  console.log("🔍 Debug: renderSnip() called");

  // Check for new snip with more robust detection
  const newSnipFlag = localStorage.getItem("glyphie-new-snip");
  let forceRefresh = false;

  if (newSnipFlag) {
    try {
      const flagData = JSON.parse(newSnipFlag);
      // If snip was added in last 10 seconds, force refresh
      if (Date.now() - flagData.timestamp < 10000) {
        forceRefresh = true;
        console.log("🆕 Recent snip detected, will force refresh");
      }
    } catch (e) {
      forceRefresh = true; // Fallback for old format
    }
    localStorage.removeItem("glyphie-new-snip");
  }

  const snipSection = document.getElementById("snip-section");
  if (!snipSection) {
    console.log("❌ Still can't find snip section");
    mainContent.textContent = "❌ Snip section unavailable.";
    return;
  }

  console.log("✅ Found snip section, proceeding...");

  mainContent.innerHTML = "";
  const snipClone = snipSection.cloneNode(true);
  snipClone.classList.remove("hidden");
  snipClone.id = "active-snip-section";
  mainContent.appendChild(snipClone);

  // Add event listeners
  setupSnipEventListeners(snipClone);

  // AGGRESSIVE GALLERY REFRESH
  const refreshWithDelay = (delay, attempt) => {
    setTimeout(() => {
      console.log(`🔄 Gallery refresh attempt ${attempt} (${delay}ms delay)`);
      updateGallery(snipClone);

      // Check if images actually loaded
      setTimeout(() => {
        const images = snipClone.querySelectorAll(".snip-thumbnail");
        images.forEach((img, index) => {
          if (img.naturalWidth === 0) {
            console.warn(`⚠️ Image ${index + 1} not loaded, retrying...`);
            img.src = img.src + "?retry=" + Date.now(); // Force reload
          }
        });
      }, 500);
    }, delay);
  };

  // Multiple refresh attempts
  refreshWithDelay(0, 1); // Immediate
  refreshWithDelay(100, 2); // 100ms
  refreshWithDelay(500, 3); // 500ms
  refreshWithDelay(1000, 4); // 1s

  if (forceRefresh) {
    refreshWithDelay(2000, 5); // Extra refresh for new snips
  }
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

function renderStats() {
  const div = document.createElement("div");
  div.className = "placeholder";
  div.textContent = "Usage stats will appear here soon. Stay tuned!";
  mainContent.appendChild(div);
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
// TEMPORARY: Add this test function to verify message flow
window.testSnipCapture = function () {
  console.log("🧪 TEST: Simulating capture message...");

  const testCoordinates = {
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  };

  // Simulate the message that should come from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // This listener should already exist, just testing
  });

  // Call capture directly
  captureScreenshotArea(testCoordinates);
};

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

document.addEventListener("DOMContentLoaded", init);
