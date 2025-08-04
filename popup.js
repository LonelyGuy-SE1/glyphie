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
}

function loadSection(section) {
  mainContent.innerHTML = "";
  currentCharKey = null;
  chatHistory = [];

  if (section === "characters") renderCharacters();
  else if (section === "stats") renderStats();
  else if (section === "settings") renderSettings();
  else mainContent.textContent = "This section is not available.";
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
    btn.addEventListener("click", () => {
      startChatWithPersonality(char.key);
    });

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
  const div = document.createElement("div");
  div.className = "placeholder";
  div.textContent = "Settings panel coming soon!";
  mainContent.appendChild(div);
}

function startChatWithPersonality(key) {
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
  chatHistoryDiv.className = "chat-history";

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
      const messagesToSend = [
        { role: "system", content: personalityPrompts[currentCharKey] || "" },
        ...chatHistory,
      ];

      const reply = await sendToAgent(messagesToSend);

      appendMessage(chatHistoryDiv, "bot", reply);
      chatHistory.push({ role: "assistant", content: reply });
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

function appendMessage(container, sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  container.appendChild(msg);
}

function setLoadingState(isLoading, sendBtn) {
  sendBtn.disabled = isLoading;
  sendBtn.textContent = isLoading ? "Loading…" : "Send";
}

async function sendToAgent(messages) {
  const API_KEY =
    "sk-f6468c183380dd0167248a95174aea01b2681e311e50e975fe47e1afc9c955ad";
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

document.addEventListener("DOMContentLoaded", init);
