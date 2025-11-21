(function () {
  const widget = document.getElementById("chat-widget");
  const toggleBtn = document.getElementById("chat-toggle");
  const closeBtn = document.getElementById("chat-close");
  const messagesEl = document.getElementById("chat-messages");
  const typingEl = document.getElementById("chat-typing");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  if (!widget || !toggleBtn || !closeBtn || !messagesEl || !form || !input) {
    console.error("[MontfortChat] Missing required DOM elements.");
    return;
  }

  let dataEntries = [];

  // =====================
  // URL AUTO-LINK FUNCTION
  // =====================
  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank">${url}</a>`;
    });
  }

  // =====================
  // HELPER FUNCTIONS
  // =====================

  function isGreeting(text) {
    const t = text.toLowerCase().trim();
    if (!t) return false;
    const greetings = [
      "hi",
      "hello",
      "hey",
      "hai",
      "good morning",
      "good evening",
      "good afternoon",
    ];
    return greetings.some((g) => t === g || t.startsWith(g));
  }

  function getLabel(entry) {
    return (entry.keyword || entry.question || "School info").trim();
  }

  function getSearchText(entry) {
    return (entry.keyword || entry.question || "").toLowerCase();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function createMessageRow(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (role === "bot") {
      bubble.innerHTML = linkify(text); // clickable URLs
    } else {
      bubble.textContent = text; // safe for user
    }

    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function showUserMessage(text) {
    createMessageRow("user", text);
  }

  function showBotMessage(text) {
    createMessageRow("bot", text);
  }

  function setTyping(visible) {
    typingEl.classList.toggle("hidden", !visible);
  }

  // =====================
  // LOAD JSON
  // =====================

  async function loadData() {
    try {
      const res = await fetch("data/school-data.json");
      if (!res.ok) throw new Error("Failed to load JSON data");
      const json = await res.json();

      if (!Array.isArray(json)) {
        throw new Error("JSON must be an array");
      }

      // keyword fallback for ALL entries
      dataEntries = json.map((entry) => ({
        ...entry,
        keyword: entry.keyword || entry.question || "",
      }));

      console.log(`[MontfortChat] Loaded ${dataEntries.length} entries.`);
    } catch (err) {
      console.error("[MontfortChat] Error loading JSON:", err);
      showBotMessage(
        "I’m having trouble loading school information. Please try again later."
      );
    }
  }

  // =====================
  // OPEN/CLOSE CHAT
  // =====================

  function openChat() {
    widget.classList.remove("hidden");
    widget.setAttribute("aria-hidden", "false");
    toggleBtn.style.display = "none";

    if (!messagesEl.dataset.initialized) {
      messagesEl.dataset.initialized = "1";

      const welcome =
        "Hello! 👋 I’m the Montfort ICSE school assistant.\n\n" +
        "You can ask me about admissions, fees, transport, academics, timings, and other basic school details.\n" +
        "For official information, please visit:\nhttps://montforticse.in/";

      showBotMessage(welcome);
    }
  }

  function closeChat() {
    widget.classList.add("hidden");
    widget.setAttribute("aria-hidden", "true");
    toggleBtn.style.display = "flex";
  }

  toggleBtn.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  // =====================
  // MAIN CHAT HANDLER
  // =====================

  async function handleUserMessage(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    showUserMessage(trimmed);
    window.ChatbotContext.addToHistory("user", trimmed);
    setTyping(true);

    // GREETING
    if (isGreeting(trimmed)) {
      showBotMessage(
        "Hi there! 👋 Ask me about admissions, fees, timings, transport, and more.\nVisit https://montforticse.in/ for full details."
      );
      setTyping(false);
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

      const combined = isShort
        ? `${state.lastUserMessage} ${trimmed}`
        : trimmed;

      // Normalize spelling + grammar
      const normalized = await window.GeminiService.normalizeUserQuery(
        combined
      );
      const normalizedLower = normalized.toLowerCase().trim();

      // ===============================
      // EXACT MATCH (highest priority)
      // ===============================

      const exactMatch = dataEntries.find((entry) => {
        const q = (entry.question || "").toLowerCase().trim();
        return q === normalizedLower;
      });

      if (exactMatch) {
        const friendly =
          await window.GeminiService.rephraseAnswer(exactMatch.answer);

        setTyping(false);
        showBotMessage(friendly);
        return;
      }

      // ===============================
      // TOKEN-BASED MATCHING
      // ===============================

      const tokens = window.ChatbotUtils.tokenize(normalized);

      // --- SINGLE KEYWORD ---
      if (tokens.length === 1) {
        const t = tokens[0];

        const matches = dataEntries.filter((entry) =>
          getSearchText(entry).includes(t)
        );

        if (matches.length >= 2) {
          let out = "Here are the details I found:\n\n";
          for (const entry of matches) {
            const friendly =
              await window.GeminiService.rephraseAnswer(entry.answer);
            out += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }

          setTyping(false);
          showBotMessage(out.trim());
          return;
        }

        if (matches.length === 1) {
          const entry = matches[0];
          const friendly =
            await window.GeminiService.rephraseAnswer(entry.answer);

          setTyping(false);
          showBotMessage(friendly);
          return;
        }
      }

      // --- TWO KEYWORDS ---
      if (tokens.length === 2) {
        const bothMatches = dataEntries.filter((entry) => {
          const text = getSearchText(entry);
          return tokens.every((t) => text.includes(t));
        });

        if (bothMatches.length >= 2) {
          let out = "Here are the details I found:\n\n";
          for (const entry of bothMatches) {
            const friendly =
              await window.GeminiService.rephraseAnswer(entry.answer);
            out += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }

          setTyping(false);
          showBotMessage(out.trim());
          return;
        }

        if (bothMatches.length === 1) {
          const entry = bothMatches[0];
          const friendly =
            await window.GeminiService.rephraseAnswer(entry.answer);

          setTyping(false);
          showBotMessage(friendly);
          return;
        }
      }

      // ===============================
      // SEMANTIC MATCH
      // ===============================

      if (dataEntries.length > 0) {
        const keys = dataEntries.map((e) => e.keyword || e.question);
        const bestIndex =
          await window.GeminiService.pickBestCandidateKeyword(
            normalized,
            keys
          );

        if (bestIndex !== null && bestIndex >= 0) {
          const entry = dataEntries[bestIndex];
          const friendly =
            await window.GeminiService.rephraseAnswer(entry.answer);

          setTyping(false);
          showBotMessage(friendly);
          return;
        }
      }

      // ===============================
      // FALLBACK
      // ===============================

      const fallback =
        await window.GeminiService.answerGeneralQuestion(trimmed);

      setTyping(false);
      showBotMessage(fallback);
    } catch (err) {
      console.error("[MontfortChat] Error:", err);
      setTyping(false);
      showBotMessage(
        "Something went wrong. Please try again.\nVisit https://montforticse.in/."
      );
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    input.value = "";
    handleUserMessage(value);
  });

  loadData();
})();
