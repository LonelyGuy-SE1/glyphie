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
    bio: "I exist to help you feel seen, soothed, and slightly more human — with the quiet wisdom of a cat who’s been through nine lives of healing.",
    image: "avatars/cat.png",
  },
];

// Map each character key to a unique API key for chat requests
const characterApiKeys = {
  white: "pk-7a4dbd1aa8d5b8a7b9bb320acee0bc25deab56639c84ddf88e1b82fd2e8dc4c9",
  dev: "pk-f4101d1b38a8a1a784a8351c0364493caa107b2c3b7a0eead077c3c1bd615df8",
  cat: "pk-70d8684a117f9e22c2383180def7f4e18ab4b73fb8024283466a80b4bdd77ab4",
};

const sidebarButtons = document.querySelectorAll("#sidebar .nav-btn");
const mainContent = document.getElementById("main-content");
let currentCharKey = null;
let chatHistory = [];
let currentChatId = null;

const BASE_URL = "https://open.service.crestal.network/v1";

// File input for attachments
const attachmentInput = document.createElement("input");
attachmentInput.type = "file";
attachmentInput.accept = "image/*";
attachmentInput.style.display = "none";
document.body.appendChild(attachmentInput);

let pendingAttachment = null;
let pendingAttachmentPreviewUrl = null;

// Trigger input when toolbar-attach-btn is clicked
document.body.addEventListener("click", function (e) {
  if (e.target && e.target.id === "toolbar-attach-btn") {
    attachmentInput.click();
  }
});

attachmentInput.onchange = async (e) => {
  const file = e.target.files[0];
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
    if (result && result.success) {
      pendingAttachment = [{ type: "image", url: result.data.url }];
      pendingAttachmentPreviewUrl = result.data.url;
      renderAttachmentPreview();
      alert("Image ready to send!");
    } else {
      alert("Image upload failed.");
      pendingAttachment = null;
      pendingAttachmentPreviewUrl = null;
      renderAttachmentPreview();
    }
  } catch (err) {
    alert("Upload error");
    pendingAttachment = null;
    pendingAttachmentPreviewUrl = null;
    renderAttachmentPreview();
  }
  attachmentInput.value = "";
};

// Called every time an attachment is added or removed
function renderAttachmentPreview() {
  const container = document.getElementById("attachment-preview");
  if (!container) return;

  container.innerHTML = ""; // Clear previous

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

    chip.appendChild(img);
    chip.appendChild(removeBtn);
    container.appendChild(chip);
    container.style.display = "flex";
  } else {
    container.style.display = "none";
  }
}

// === INIT ===
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
  if (section === "characters") renderCharacters();
  else if (section === "stats") renderStats();
  else if (section === "settings") renderSettings();
  else if (section === "snip") renderSnip();
  else mainContent.textContent = "This section is not available.";
}

function renderSnip() {
  let snipSection = document.getElementById("snip-section");
  if (!snipSection) {
    mainContent.textContent = "Snip section unavailable.";
    return;
  }
  mainContent.innerHTML = "";
  const snipClone = snipSection.cloneNode(true);
  snipClone.classList.remove("hidden");
  mainContent.appendChild(snipClone);
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
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(bio);
    card.appendChild(btn);
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
  themeSetting.appendChild(label);
  themeSetting.appendChild(toggle);
  container.appendChild(themeSetting);
  mainContent.appendChild(container);
}

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

// STREAMING and ATTACHMENTS (NO double rendering, clean state!)
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
  let bubble = appendStreamingMessage(
    document.getElementById("chat-history"),
    "bot",
    "",
    null
  );
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
    } catch (e) {
      if (bubble) bubble.querySelector(".msg-content").textContent = chunkStr;
    }
  }
  let ts = new Date().toISOString();
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
  chatHeader.appendChild(avatar);
  chatHeader.appendChild(nameSpan);

  const chatHistoryDiv = document.createElement("div");
  chatHistoryDiv.id = "chat-history";
  chatHistoryDiv.className = "chat-history";

  setLoadingState(true, null);

  try {
    currentChatId = await createChatThread(key);
    chatHistory = await getChatHistory(currentChatId, key);
    chatHistory
      .slice()
      .reverse()
      .forEach((msg) => {
        const author =
          msg.author_type &&
          (msg.author_type.toLowerCase() === "api" ||
            msg.author_type.toLowerCase() === "user")
            ? "user"
            : "bot";
        appendMessage(chatHistoryDiv, author, msg.message, msg.created_at);
      });
    setTimeout(() => {
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }, 0);
  } catch (err) {
    appendMessage(chatHistoryDiv, "bot", "Unable to load chat history.");
    console.error(err);
  }

  setLoadingState(false, null);

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

  // Toolbar above input with attach and regenerate buttons
  const toolbar = document.createElement("div");
  toolbar.className = "chat-toolbar";
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "flex-start";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "12px";
  toolbar.style.marginBottom = "8px";
  const attachBtnToolbar = document.createElement("button");
  attachBtnToolbar.id = "toolbar-attach-btn";
  attachBtnToolbar.title = "Attach files";
  attachBtnToolbar.setAttribute("aria-label", "Attach files");
  attachBtnToolbar.textContent = "📎";
  attachBtnToolbar.style.cursor = "pointer";
  attachBtnToolbar.style.fontSize = "1.5rem";
  attachBtnToolbar.style.padding = "6px 10px";
  attachBtnToolbar.style.borderRadius = "8px";
  attachBtnToolbar.style.border = "none";
  attachBtnToolbar.style.background = "var(--button-bg)";
  attachBtnToolbar.style.color = "var(--accent-color)";
  attachBtnToolbar.style.transition = "background-color 0.3s";
  const regenerateBtn = document.createElement("button");
  regenerateBtn.id = "toolbar-regenerate-btn";
  regenerateBtn.title = "Regenerate response";
  regenerateBtn.setAttribute("aria-label", "Regenerate response");
  regenerateBtn.textContent = "Regenerate";
  regenerateBtn.style.cursor = "pointer";
  regenerateBtn.style.fontSize = "1rem";
  regenerateBtn.style.padding = "6px 12px";
  regenerateBtn.style.borderRadius = "8px";
  regenerateBtn.style.border = "none";
  regenerateBtn.style.background = "var(--button-bg)";
  regenerateBtn.style.color = "var(--accent-color)";
  regenerateBtn.style.transition = "background-color 0.3s";
  toolbar.appendChild(attachBtnToolbar);
  toolbar.appendChild(regenerateBtn);

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
        new Date().toISOString()
      );
      console.error(error);
    }
    setLoadingState(false, sendBtn);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  inputRow.appendChild(input);

  chatPanel.appendChild(chatHeader);
  chatPanel.appendChild(chatHistoryDiv);
  chatPanel.appendChild(toolbar);
  chatPanel.appendChild(inputRow);
  inputRow.appendChild(sendBtn);

  mainContent.appendChild(chatPanel);
  renderAttachmentPreview();
  input.focus();
}

// Append message with support for timestamp and only the message text
function appendMessage(container, sender, text, timestamp, isError) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}` + (isError ? " error" : "");
  const content = document.createElement("div");
  content.className = "msg-content";
  content.textContent = text;
  msg.appendChild(content);

  if (timestamp) {
    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    const dateObj = new Date(timestamp);
    timeDiv.textContent = dateObj.toLocaleString([], {
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

document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const overlay = document.getElementById("main-content-overlay");
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

document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("sidebar-toggle");
  const container = document.getElementById("container");
  let isDragging = false;
  let offsetX = 0,
    offsetY = 0;
  const savedLeft = localStorage.getItem("sidebarToggleLeft");
  const savedTop = localStorage.getItem("sidebarToggleTop");
  if (savedLeft && savedTop) {
    toggleBtn.style.left = savedLeft;
    toggleBtn.style.top = savedTop;
    toggleBtn.style.position = "absolute";
  } else {
    toggleBtn.style.position = "absolute";
    toggleBtn.style.top = "10px";
    toggleBtn.style.right = "10px";
  }
  toggleBtn.addEventListener("mousedown", function (e) {
    isDragging = true;
    offsetX = e.clientX - toggleBtn.offsetLeft;
    offsetY = e.clientY - toggleBtn.offsetTop;
    toggleBtn.style.transition = "none";
    toggleBtn.style.right = "auto";
  });
  document.addEventListener("mousemove", function (e) {
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
  document.addEventListener("mouseup", function () {
    if (isDragging) {
      isDragging = false;
      toggleBtn.style.transition = "";
      localStorage.setItem("sidebarToggleLeft", toggleBtn.style.left);
      localStorage.setItem("sidebarToggleTop", toggleBtn.style.top);
    }
  });
});

document.addEventListener("DOMContentLoaded", init);
