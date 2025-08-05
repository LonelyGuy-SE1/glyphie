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
let currentChatId = null; // Persist server-side chat_id

const BASE_URL = "https://open.service.crestal.network/v1";

// === INIT ===
function init() {
  sidebarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sidebarButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const section = button.getAttribute("data-section");
      loadSection(section);

      // Auto-close sidebar on selection
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

// === LOAD SECTIONS ===
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

// === RENDER CHARACTERS ===
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

// === RENDER STATS ===
function renderStats() {
  const div = document.createElement("div");
  div.className = "placeholder";
  div.textContent = "Usage stats will appear here soon. Stay tuned!";
  mainContent.appendChild(div);
}

// === RENDER SETTINGS ===
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

// IntentKit API helper functions with character-specific API key

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

async function sendMessageToThread(chatId, personaKey, message) {
  const personaApiKey = characterApiKeys[personaKey];
  if (!personaApiKey) throw new Error("API key for persona not found");

  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${personaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error("Failed to send message to agent");
  const data = await response.json();
  return data;
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
    // Append messages oldest first
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
        appendMessage(chatHistoryDiv, author, msg.message);
      });
    // Ensure chat scrolls fully to the latest after DOM updates
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

  // Toolbar above input for attachment and regenerate buttons
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

  attachBtnToolbar.addEventListener("mouseenter", () => {
    attachBtnToolbar.style.backgroundColor = "var(--accent-color)";
    attachBtnToolbar.style.color = "#000";
  });
  attachBtnToolbar.addEventListener("mouseleave", () => {
    attachBtnToolbar.style.backgroundColor = "var(--button-bg)";
    attachBtnToolbar.style.color = "var(--accent-color)";
  });
  regenerateBtn.addEventListener("mouseenter", () => {
    regenerateBtn.style.backgroundColor = "var(--accent-color)";
    regenerateBtn.style.color = "#000";
  });
  regenerateBtn.addEventListener("mouseleave", () => {
    regenerateBtn.style.backgroundColor = "var(--button-bg)";
    regenerateBtn.style.color = "var(--accent-color)";
  });

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
    if (!userInput) return;

    appendMessage(chatHistoryDiv, "user", userInput);
    chatHistory.push({ role: "user", content: userInput });

    input.value = "";
    input.style.height = "auto";
    setLoadingState(true, sendBtn);

    try {
      const agentReplies = await sendMessageToThread(
        currentChatId,
        key,
        userInput
      );

      if (Array.isArray(agentReplies)) {
        agentReplies.forEach((msgObj) => {
          appendMessage(chatHistoryDiv, "bot", msgObj.message);
          chatHistory.push({ role: "assistant", content: msgObj.message });
        });
      } else {
        appendMessage(chatHistoryDiv, "bot", "No reply from agent.");
      }
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    } catch (error) {
      appendMessage(
        chatHistoryDiv,
        "bot",
        "Error: Unable to get reply. Try again."
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
  chatPanel.appendChild(toolbar); // Insert toolbar above input row
  chatPanel.appendChild(inputRow);
  inputRow.appendChild(sendBtn);

  mainContent.appendChild(chatPanel);
  input.focus();
}

function appendMessage(container, sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  container.appendChild(msg);

  container.scrollTop = container.scrollHeight; // Auto-scroll on new message
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

// === INIT ON LOAD ===
document.addEventListener("DOMContentLoaded", init);
