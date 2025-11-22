(function () {
  const widget = document.getElementById("chat-widget");
  const toggleBtn = document.getElementById("chat-toggle");
  const closeBtn = document.getElementById("chat-close");
  const messagesEl = document.getElementById("chat-messages");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  const typingSound = document.getElementById("typing-sound");
  const deliveredSound = document.getElementById("delivered-sound");
  const openSound = document.getElementById("open-sound");
  const closeSound = document.getElementById("close-sound");

  if (!widget || !toggleBtn || !closeBtn || !messagesEl || !form || !input) {
    console.error("[MontfortChat] Missing required DOM elements.");
    return;
  }

  let dataEntries = [];
  let isTyping = false;

  function playSound(sound) {
    if (sound && sound.readyState >= 2) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" style="color: #2563eb; text-decoration: underline;">${url}</a>`;
    });
  }

  function isGreeting(text) {
    const t = text.toLowerCase().trim();
    if (!t) return false;
    const greetings = ["hi", "hello", "hey", "hai", "good morning", "good evening", "good afternoon"];
    return greetings.some((g) => t === g || t.startsWith(g));
  }

  function getLabel(entry) {
    return (entry.keyword || entry.question || "School info").trim();
  }

  function getSearchText(entry) {
    return (entry.keyword || entry.question || "").toLowerCase();
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 100);
  }

  function createMessageRow(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";

    if (role === "user") {
      avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>`;
    } else {
      avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>`;
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (role === "bot") bubble.innerHTML = linkify(text);
    else bubble.textContent = text;

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    playSound(deliveredSound);
  }

  function showUserMessage(text) {
    createMessageRow("user", text);
  }

  function showBotMessage(text) {
    createMessageRow("bot", text);
  }

  function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;

    const typingRow = document.createElement("div");
    typingRow.className = "typing-message";
    typingRow.id = "current-typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "typing-avatar";
    avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>`;

    const bubble = document.createElement("div");
    bubble.className = "typing-bubble";

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;

    bubble.appendChild(indicator);
    typingRow.appendChild(avatar);
    typingRow.appendChild(bubble);
    messagesEl.appendChild(typingRow);

    scrollToBottom();
    playSound(typingSound);
  }

  function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById("current-typing-indicator");
    if (indicator) indicator.remove();
  }

  function typeMessage(text, speed = 20) {
    return new Promise((resolve) => {
      hideTypingIndicator();

      const row = document.createElement("div");
      row.className = "message-row bot";

      const avatar = document.createElement("div");
      avatar.className = "message-avatar";
      avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>`;

      const bubble = document.createElement("div");
      bubble.className = "message-bubble typing-text";

      row.appendChild(avatar);
      row.appendChild(bubble);
      messagesEl.appendChild(row);

      let i = 0;
      let currentText = "";

      function typeWriter() {
        if (i < text.length) {
          currentText += text.charAt(i);
          bubble.innerHTML = linkify(currentText);
          i++;
          const delay = speed + (Math.random() * 10 - 5);
          setTimeout(typeWriter, delay);
          scrollToBottom();
        } else {
          bubble.classList.remove("typing-text");
          playSound(deliveredSound);
          resolve();
        }
      }

      typeWriter();
    });
  }

  async function loadData() {
    try {
      const res = await fetch("data/school-data.json");
      if (!res.ok) throw new Error();
      const json = await res.json();

      if (!Array.isArray(json)) throw new Error();

      dataEntries = json.map((entry) => ({
        ...entry,
        keyword: entry.keyword || entry.question || "",
      }));
    } catch (err) {
      showBotMessage("I'm having trouble loading school information. Please try again later.");
    }
  }

  function openChat() {
    widget.classList.remove("hidden");
    widget.setAttribute("aria-hidden", "false");
    toggleBtn.style.display = "none";
    playSound(openSound);

    if (!messagesEl.dataset.initialized) {
      messagesEl.dataset.initialized = "1";

      const welcome =
        "Hello! I'm the Montfort ICSE school assistant.\n\n" +
        "You can ask me about admissions, fees, transport, academics, timings, and other basic school details.\n" +
        "For official information, please visit:\nhttps://montforticse.in/";

      setTimeout(() => {
        showTypingIndicator();
        setTimeout(() => {
          typeMessage(welcome, 30);
        }, 1500);
      }, 500);
    }
  }

  function closeChat() {
    widget.classList.add("hidden");
    widget.setAttribute("aria-hidden", "true");
    toggleBtn.style.display = "flex";
    playSound(closeSound);
  }

  toggleBtn.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  async function handleUserMessage(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    showUserMessage(trimmed);
    window.ChatbotContext.addToHistory("user", trimmed);

    setTimeout(() => showTypingIndicator(), 300);

    if (isGreeting(trimmed)) {
      setTimeout(async () => {
        const response =
          "Hi there! Ask me about admissions, fees, timings, transport, and more.\nVisit https://montforticse.in/ for full details.";
        await typeMessage(response, 25);
      }, 1500);
      return;
    }

    try {
      const state = window.ChatbotContext.getState();
      const currentTokens = window.ChatbotUtils.tokenize(trimmed);

      const isShort =
        state.lastUserMessage &&
        state.lastUserMessage !== trimmed &&
        currentTokens.length > 0 &&
        currentTokens.length <= 3;

      const combined = isShort ? `${state.lastUserMessage} ${trimmed}` : trimmed;

      const normalized = await window.GeminiService.normalizeUserQuery(combined);
      const normalizedLower = normalized.toLowerCase().trim();

      const exactMatch = dataEntries.find((entry) => {
        const q = (entry.question || "").toLowerCase().trim();
        return q === normalizedLower;
      });

      if (exactMatch) {
        const friendly = await window.GeminiService.rephraseAnswer(exactMatch.answer);
        setTimeout(async () => {
          await typeMessage(friendly, 25);
        }, 1500);
        return;
      }

      const tokens = window.ChatbotUtils.tokenize(normalized);

      if (tokens.length === 1) {
        const t = tokens[0];
        const matches = dataEntries.filter((entry) => getSearchText(entry).includes(t));

        if (matches.length >= 2) {
          let out = "Here are the details I found:\n\n";
          for (const entry of matches) {
            const friendly = await window.GeminiService.rephraseAnswer(entry.answer);
            out += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }
          setTimeout(async () => {
            await typeMessage(out.trim(), 20);
          }, 1500);
          return;
        }

        if (matches.length === 1) {
          const entry = matches[0];
          const friendly = await window.GeminiService.rephraseAnswer(entry.answer);
          setTimeout(async () => {
            await typeMessage(friendly, 25);
          }, 1500);
          return;
        }
      }

      if (tokens.length === 2) {
        const bothMatches = dataEntries.filter((entry) => {
          const text = getSearchText(entry);
          return tokens.every((t) => text.includes(t));
        });

        if (bothMatches.length >= 2) {
          let out = "Here are the details I found:\n\n";
          for (const entry of bothMatches) {
            const friendly = await window.GeminiService.rephraseAnswer(entry.answer);
            out += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }

          setTimeout(async () => {
            await typeMessage(out.trim(), 20);
          }, 1500);
          return;
        }

        if (bothMatches.length === 1) {
          const entry = bothMatches[0];
          const friendly = await window.GeminiService.rephraseAnswer(entry.answer);
          setTimeout(async () => {
            await typeMessage(friendly, 25);
          }, 1500);
          return;
        }
      }

      if (dataEntries.length > 0) {
        const keys = dataEntries.map((e) => e.keyword || e.question);
        const bestIndex = await window.GeminiService.pickBestCandidateKeyword(
          normalized,
          keys
        );

        if (bestIndex !== null && bestIndex >= 0) {
          const entry = dataEntries[bestIndex];
          const friendly = await window.GeminiService.rephraseAnswer(entry.answer);
          setTimeout(async () => {
            await typeMessage(friendly, 25);
          }, 1500);
          return;
        }
      }

      const fallback = await window.GeminiService.answerGeneralQuestion(trimmed);

      setTimeout(async () => {
        await typeMessage(fallback, 25);
      }, 1500);
    } catch (err) {
      hideTypingIndicator();
      showBotMessage("Something went wrong. Please try again.\nVisit https://montforticse.in/.");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    input.value = "";
    handleUserMessage(value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  loadData();
})();
