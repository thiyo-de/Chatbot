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

  // Use keyword if present, otherwise fall back to question
  function getLabel(entry) {
    return (entry.keyword || entry.question || "School info").trim();
  }

  // Text used for searching (keyword + question fallback)
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
    bubble.textContent = text;

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
      let json = await res.json();

      if (!Array.isArray(json)) {
        throw new Error("JSON must be an array");
      }

      // 🔹 Ensure each entry has a keyword (fallback = question)
      dataEntries = json.map((entry) => {
        const keyword = entry.keyword || entry.question || "";
        return { ...entry, keyword };
      });

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
        "For official and latest information, please visit:\nhttps://montforticse.in/";

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
  // MAIN MESSAGE HANDLER
  // =====================

  async function handleUserMessage(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    showUserMessage(trimmed);
    window.ChatbotContext.addToHistory("user", trimmed);

    // ---- Greeting ----
    if (isGreeting(trimmed)) {
      const greetReply =
        "Hi there! 👋 I’m the Montfort ICSE assistant.\n\n" +
        "Ask me about admissions, fee details, timings, transport, and more.\n" +
        "For full details: https://montforticse.in/";
      showBotMessage(greetReply);
      window.ChatbotContext.addToHistory("assistant", greetReply);
      return;
    }

    setTyping(true);

    try {
      const state = window.ChatbotContext.getState();

      // ✅ Safer follow-up logic:
      // Only merge with previous if the new question is very short (like "for 7th?" / "and hostel?")
      const currentTokens = window.ChatbotUtils.tokenize(trimmed);
      const isShortFollowUp =
        state.lastUserMessage &&
        state.lastUserMessage !== trimmed &&
        currentTokens.length > 0 &&
        currentTokens.length <= 3;

      const combined = isShortFollowUp
        ? `${state.lastUserMessage} ${trimmed}`
        : trimmed;

      // 1) Normalize spelling / language via Gemini
      const normalized = await window.GeminiService.normalizeUserQuery(
        combined
      );
      const lowerNormalized = normalized.toLowerCase();

      // =====================================================
      // 🔹 SPECIAL CASE: TIMING QUERIES (school vs office)
      //  - "timing" (generic) → show ALL timings
      //  - "school timing" → only school timings
      //  - "office timing" → only office timings
      // =====================================================
      if (lowerNormalized.includes("timing")) {
        const asksSchool = lowerNormalized.includes("school");
        const asksOffice = lowerNormalized.includes("office");

        // Get all timing-related entries (check keyword/question text)
        const timingEntries = dataEntries.filter((entry) => {
          const text = getSearchText(entry);
          return text.includes("timing");
        });

        if (timingEntries.length > 0) {
          // ✅ Generic timing → show ALL timings
          if (!asksSchool && !asksOffice) {
            let response = "Here are the timing details:\n\n";

            for (const entry of timingEntries) {
              const friendly = await window.GeminiService.rephraseAnswer(
                entry.answer
              );
              response += `• ${getLabel(entry)}:\n${friendly}\n\n`;
            }

            setTyping(false);
            const finalText = response.trim();
            showBotMessage(finalText);
            window.ChatbotContext.updateLastInteraction(
              trimmed,
              timingEntries.map((m) => getLabel(m)).join(", "),
              "[timings]"
            );
            window.ChatbotContext.addToHistory("assistant", finalText);
            return;
          }

          // ✅ Specific: school timing only
          if (asksSchool && !asksOffice) {
            const schoolTimingEntry = timingEntries.find((entry) => {
              const text = getSearchText(entry);
              return text.includes("school");
            });

            if (schoolTimingEntry) {
              window.ChatbotContext.updateLastInteraction(
                trimmed,
                getLabel(schoolTimingEntry),
                schoolTimingEntry.answer
              );

              const friendlyAnswer =
                await window.GeminiService.rephraseAnswer(
                  schoolTimingEntry.answer
                );

              setTyping(false);
              showBotMessage(friendlyAnswer);
              window.ChatbotContext.addToHistory("assistant", friendlyAnswer);
              return;
            }
          }

          // ✅ Specific: office timing only
          if (asksOffice && !asksSchool) {
            const officeTimingEntry = timingEntries.find((entry) => {
              const text = getSearchText(entry);
              return text.includes("office");
            });

            if (officeTimingEntry) {
              window.ChatbotContext.updateLastInteraction(
                trimmed,
                getLabel(officeTimingEntry),
                officeTimingEntry.answer
              );

              const friendlyAnswer =
                await window.GeminiService.rephraseAnswer(
                  officeTimingEntry.answer
                );

              setTyping(false);
              showBotMessage(friendlyAnswer);
              window.ChatbotContext.addToHistory("assistant", friendlyAnswer);
              return;
            }
          }

          // Fallback: show all timing entries
          let response = "Here are the timing details:\n\n";
          for (const entry of timingEntries) {
            const friendly = await window.GeminiService.rephraseAnswer(
              entry.answer
            );
            response += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }

          setTyping(false);
          const finalText = response.trim();
          showBotMessage(finalText);
          window.ChatbotContext.updateLastInteraction(
            trimmed,
            timingEntries.map((m) => getLabel(m)).join(", "),
            "[timings]"
          );
          window.ChatbotContext.addToHistory("assistant", finalText);
          return;
        }
      }

      // From here on, use tokens for other generic logic
      const tokens = window.ChatbotUtils.tokenize(normalized);

      // ========================================
      // 🔹 CASE 1: SINGLE GENERIC KEYWORD (e.g. "admission")
      // → show all relevant entries whose keyword/question contains that word
      // ========================================
      if (tokens.length === 1) {
        const t = tokens[0].toLowerCase();

        const wideMatches = dataEntries.filter((entry) => {
          const text = getSearchText(entry);
          return text.includes(t);
        });

        if (wideMatches.length >= 2) {
          let response = "Here are the details I found:\n\n";

          for (const entry of wideMatches) {
            const friendly = await window.GeminiService.rephraseAnswer(
              entry.answer
            );
            response += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }

          setTyping(false);
          const finalText = response.trim();
          showBotMessage(finalText);
          window.ChatbotContext.addToHistory("assistant", finalText);
          return;
        }

        if (wideMatches.length === 1) {
          const chosen = wideMatches[0];

          window.ChatbotContext.updateLastInteraction(
            trimmed,
            getLabel(chosen),
            chosen.answer
          );

          const friendlyAnswer =
            await window.GeminiService.rephraseAnswer(chosen.answer);

          setTyping(false);
          showBotMessage(friendlyAnswer);
          window.ChatbotContext.addToHistory("assistant", friendlyAnswer);
          return;
        }
      }

      // ========================================
      // 🔹 CASE 2: TWO-WORD GENERIC QUERY (e.g. "admission fees")
      // → show all entries whose keyword/question contains BOTH words
      // ========================================
      if (tokens.length === 2) {
        const lowerTokens = tokens.map((t) => t.toLowerCase());
        const bothMatches = dataEntries.filter((entry) => {
          const text = getSearchText(entry);
          return lowerTokens.every((t) => text.includes(t));
        });

        if (bothMatches.length >= 2) {
          let response = "Here are the details I found:\n\n";

          for (const entry of bothMatches) {
            const friendly = await window.GeminiService.rephraseAnswer(
              entry.answer
            );
            response += `• ${getLabel(entry)}:\n${friendly}\n\n`;
          }

          setTyping(false);
          const finalText = response.trim();
          showBotMessage(finalText);
          window.ChatbotContext.addToHistory("assistant", finalText);
          return;
        }

        if (bothMatches.length === 1) {
          const chosen = bothMatches[0];

          window.ChatbotContext.updateLastInteraction(
            trimmed,
            getLabel(chosen),
            chosen.answer
          );

          const friendlyAnswer =
            await window.GeminiService.rephraseAnswer(chosen.answer);

          setTyping(false);
          showBotMessage(friendlyAnswer);
          window.ChatbotContext.addToHistory("assistant", friendlyAnswer);
          return;
        }
      }

      // ========================================
      // 🔹 CASE 3: AI-MEANING MATCH
      // Use Gemini to pick the BEST matching entry by meaning
      // ========================================
      if (dataEntries && dataEntries.length > 0) {
        // Use keyword or question as the candidate text
        const candidateKeywords = dataEntries.map(
          (e) => e.keyword || e.question || ""
        );

        const bestIndex =
          await window.GeminiService.pickBestCandidateKeyword(
            normalized,
            candidateKeywords
          );

        if (
          typeof bestIndex === "number" &&
          bestIndex >= 0 &&
          bestIndex < dataEntries.length
        ) {
          const chosen = dataEntries[bestIndex];

          window.ChatbotContext.updateLastInteraction(
            trimmed,
            getLabel(chosen),
            chosen.answer
          );

          const friendlyAnswer =
            await window.GeminiService.rephraseAnswer(chosen.answer);

          setTyping(false);
          showBotMessage(friendlyAnswer);
          window.ChatbotContext.addToHistory("assistant", friendlyAnswer);
          return;
        }
      }

      // ========================================
      // 🔹 CASE 4: FALLBACK TO GENERAL AI
      // ========================================
      const generalReply =
        await window.GeminiService.answerGeneralQuestion(trimmed);

      setTyping(false);
      showBotMessage(generalReply);
      window.ChatbotContext.addToHistory("assistant", generalReply);
    } catch (err) {
      console.error("[MontfortChat] Error:", err);
      setTyping(false);
      const fallback =
        "Something went wrong. Please try again.\nVisit https://montforticse.in/ for more details.";
      showBotMessage(fallback);
      window.ChatbotContext.addToHistory("assistant", fallback);
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    input.value = "";
    handleUserMessage(value);
  });

  // INIT
  loadData();
})();
