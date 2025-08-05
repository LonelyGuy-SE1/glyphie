// === AI personalities data ===
const characters = [
  {
    key: "genz",
    name: "GenZ Baddie",
    bio: "Roasts, memes & emojis only.",
    image: "avatars/genz.png",
  },
  {
    key: "sage",
    name: "Neon sage",
    bio: "Explains like a wise sage.",
    image: "avatars/neonsage.png",
  },
  {
    key: "dev",
    name: "Stack Monk",
    bio: "Tech help and code mastery.",
    image: "avatars/dev.png",
  },
  {
    key: "cat",
    name: "Cat Therapist",
    bio: "Gives snarky emotional support.",
    image: "avatars/cat.png",
  },
];

const personalityPrompts = {
  genz: "You are a sarcastic GenZ assistant who responds with memes, emojis, and casual slang.",
  sage: "You respond patiently and wisely like a caring and knowledgeable sage.",
  dev: "You are a precise technical expert focused on clear and concise coding help.",
  cat: "You respond with sass and cat-like attitude, offering snarky emotional support.",
};

const sidebarButtons = document.querySelectorAll("#sidebar .nav-btn");
const mainContent = document.getElementById("main-content");
let currentCharKey = null;
let chatHistory = [];
let currentChatId = null; // Persist server-side chat_id

const API_KEY =
  "sk-f6468c183380dd0167248a95174aea01b2681e311e50e975fe47e1afc9c955ad";
const BASE_URL = "https://open.service.crestal.network/v1";

// === INIT ===
function init() {
  sidebarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sidebarButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const section = button.getAttribute("data-section");
      loadSection(section);
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
  else mainContent.textContent = "This section is not available.";
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

// === CHAT UI + HISTORY ===
// --------- NEW HELPER FUNCTIONS FOR INTENTKIT API -----------
async function createChatThread(personaKey) {
  // Save chatId per persona (allows parallel persona threads)
  let chatId = localStorage.getItem(`intentkit_chatid_${personaKey}`);
  if (chatId) return chatId;

  const response = await fetch(`${BASE_URL}/chats`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    }, // Personalization: could send {user_id: ...}
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error("Failed to create new chat thread");
  const data = await response.json();
  chatId = data.id;
  localStorage.setItem(`intentkit_chatid_${personaKey}`, chatId);
  return chatId;
}

async function getChatHistory(chatId, limit = 100) {
  const response = await fetch(
    `${BASE_URL}/chats/${chatId}/messages?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch chat history");
  const data = await response.json(); // Returns {data:[...], has_more:bool}
  return data.data || [];
}

async function sendMessageToThread(chatId, message) {
  const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error("Failed to send message to agent");
  const data = await response.json(); // Returns list of agent/assistant message objects
  return data;
}
// --------- END NEW HELPER FUNCTIONS -----------

// (Below changed to async)
async function startChatWithPersonality(key) {
  currentCharKey = key;
  chatHistory = [];
  mainContent.innerHTML = "";

  const chatPanel = document.createElement("div");
  chatPanel.className = "chat-panel";

  const chatHeader = document.createElement("div");
  chatHeader.className = "chat-header";

  const persona = characters.find((c) => c.key === key);
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
  chatHistoryDiv.className = "chat-history"; // --- Load (or create) chat thread and message history

  setLoadingState(true, null); // Show loading (button will re-enable itself)

  try {
    currentChatId = await createChatThread(key);
    chatHistory = await getChatHistory(currentChatId); // Render previous message history
    chatHistory.forEach((msg) => {
      // Treat "API", "user", "USER" as user, everything else as bot
      const author =
        msg.author_type &&
        (msg.author_type.toLowerCase() === "api" ||
          msg.author_type.toLowerCase() === "user")
          ? "user"
          : "bot";
      appendMessage(chatHistoryDiv, author, msg.message);
    });
  } catch (err) {
    appendMessage(chatHistoryDiv, "bot", "Unable to load chat history.");
    console.error(err);
  }

  setLoadingState(false, null);

  const inputRow = document.createElement("div");
  inputRow.className = "chat-input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "chat-input";
  input.placeholder = "Ask or enter your prompt…";

  const sendBtn = document.createElement("button");
  sendBtn.id = "chat-send-btn";
  sendBtn.textContent = "Send";

  sendBtn.addEventListener("click", async () => {
    const userInput = input.value.trim();
    if (!userInput) return;

    appendMessage(chatHistoryDiv, "user", userInput);
    chatHistory.push({ role: "user", content: userInput });

    input.value = "";
    setLoadingState(true, sendBtn);

    try {
      // --- Send to IntentKit agent, get model reply
      const agentReplies = await sendMessageToThread(currentChatId, userInput);

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
  inputRow.appendChild(sendBtn);

  chatPanel.appendChild(chatHeader);
  chatPanel.appendChild(chatHistoryDiv);
  chatPanel.appendChild(inputRow);

  mainContent.appendChild(chatPanel);
  input.focus();
}

// === HELPER FUNCTIONS ===
function appendMessage(container, sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  container.appendChild(msg);
}

function setLoadingState(isLoading, sendBtn) {
  // If sendBtn provided, disable/enable only that button
  if (sendBtn) {
    sendBtn.disabled = isLoading;
    sendBtn.textContent = isLoading ? "Loading…" : "Send";
  } else {
    // Otherwise, optionally show loading overlay or cursor
    if (isLoading) {
      document.body.style.cursor = "wait";
    } else {
      document.body.style.cursor = "";
    }
  }
}

// Optionally keep sendToAgent for compatibility/stats/legacy
async function sendToAgent(messages) {
  // You can remove this function if not using the OpenAI style endpoint anymore.
  const API_URL = "https://open.service.crestal.network/v1/chat/completions";
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }

    return "Sorry, no reply was generated.";
  } catch (error) {
    console.error("Error communicating with Nation Agent API:", error);
    throw error;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const overlay = document.getElementById("main-content-overlay");

  // Initially sidebar closed: no '.open' class
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

  // Restore saved position or use defaults
  const savedLeft = localStorage.getItem("sidebarToggleLeft");
  const savedTop = localStorage.getItem("sidebarToggleTop");
  if (savedLeft && savedTop) {
    toggleBtn.style.left = savedLeft;
    toggleBtn.style.top = savedTop;
    toggleBtn.style.position = "absolute";
  } else {
    // Set default position if needed
    toggleBtn.style.position = "absolute";
    toggleBtn.style.top = "10px";
    toggleBtn.style.right = "10px";
  }

  toggleBtn.addEventListener("mousedown", function (e) {
    isDragging = true;
    // Calculate offset between cursor and element top-left corner
    offsetX = e.clientX - toggleBtn.offsetLeft;
    offsetY = e.clientY - toggleBtn.offsetTop;
    toggleBtn.style.transition = "none";
    // Remove right if exists so left/top can take effect smoothly
    toggleBtn.style.right = "auto";
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    // Boundaries to keep button inside #container
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
      toggleBtn.style.transition = ""; // restore transition

      // Save current position to localStorage
      localStorage.setItem("sidebarToggleLeft", toggleBtn.style.left);
      localStorage.setItem("sidebarToggleTop", toggleBtn.style.top);
    }
  });
});

// === INIT ON LOAD ===
document.addEventListener("DOMContentLoaded", init);
