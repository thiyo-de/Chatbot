// chat.js — FINAL VERSION (Animation Safe + "list all" behaviour)
(function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  if (!form || !input || !window.ChatUI || !window.ChatbotConfig) {
    console.error("[Chat] Missing dependencies");
    return;
  }

  /* ==========================================================
     HELPERS
  ========================================================== */
  function isGreeting(text) {
    const t = text.toLowerCase().trim();
    const greetings = [
      "hi",
      "hello",
      "hey",
      "hai",
      "hola",
      "greetings",
      "good morning",
      "good evening",
      "good afternoon",
      "good day",
      "what's up",
      "sup",
      "yo",
    ];
    return greetings.some((g) => t === g || t.startsWith(g));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function sendToBackend(question) {
    const url = `${window.ChatbotConfig.API_BASE_URL}/chat`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("[Chat] Backend error:", res.status, txt);
        throw new Error(`Backend error: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error("[Chat] Network error:", err);
      throw err;
    }
  }

  // Rough estimate so list appears after message animation
  function estimateDelay(textLength, speed) {
    const ms = textLength * speed * 0.6; // 60% of total typing time
    return Math.max(600, Math.min(ms, 5000)); // between 0.6s and 5s
  }

  /* ==========================================================
     UI: PANORAMA + PROJECT LIST (HTML)
  ========================================================== */
  function createPanoProjectListHTML(panos, projects) {
    let html = `
      <div class="tour-list-box">
        <h3>Available Panoramas</h3>
        <div class="tour-grid">
    `;

    // ✅ IMPORTANT CHANGE: no inline onclick here
    panos.forEach((p) => {
      html += `<button class="tour-btn">${p}</button>`;
    });

    html += `
        </div>

        <h3>Available Projects</h3>
        <div class="tour-grid">
    `;

    // Projects keep inline onclick (they were already working fine)
    projects.forEach((p) => {
      html += `<button class="tour-btn" onclick="window.Vista.openProject('${p.url}')">${p.title}</button>`;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /* ==========================================================
     3D-VISTA INTEGRATION
  ========================================================== */
  async function handleTourActions(text) {
    if (!window.Vista) return false;

    const t = text.toLowerCase().trim();
    const intent = window.Vista.detectTourIntent(text);

    /* -----------------------------------------
       🟦 HELP — ONLY HELP TEXT (no auto list)
    ----------------------------------------- */
    const helpTriggers = [
      "help",
      "guide",
      "how to use",
      "options",
      "what can you do",
      "how do i use",
      "show commands",
      "instructions",
    ];

    if (helpTriggers.some((k) => t.includes(k))) {
      const helpText = `
👋 **Hello! I'm your Montfort Virtual Assistant.**
I help with **School Information** and **3D Virtual Tour Navigation**.

---

📘 **SCHOOL INFORMATION**  
Ask me about:  
- Timings  
- Admissions & Fees  
- Hostel  
- Transport  
- Canteen  
- Labs  
- Sports  

---

🌍 **VIRTUAL TOUR CONTROL**  
Try:  
- "go to library"  
- "open auditorium"  
- "show playground"  

---

🔄 **SWITCH PROJECT**  
Use:  
- "open project CBSE"  
- "open project St Mary's"  

---

📋 **WANT FULL LIST?**  
Type "list all pano and projects" or "list all"  
to see every panorama and project link.
`;

      window.ChatUI.showTypingIndicator();
      await sleep(500);
      window.ChatUI.typeBotMessage(helpText, 15);
      return true;
    }

    /* -----------------------------------------
       🟦 LIST ALL PANOS + PROJECTS
    ----------------------------------------- */
    const isListAll =
      t === "list all" ||
      t === "listall" ||
      t === "show all" ||
      t.includes("list all pano") ||
      t.includes("list all panos") ||
      t.includes("list all panoramas") ||
      t.includes("list all project") ||
      t.includes("list all pano and projects");

    if (isListAll) {
      window.ChatUI.showTypingIndicator();
      await sleep(400);

      const msg = "Here are all available panoramas and projects:";
      const speed = 20;
      window.ChatUI.typeBotMessage(msg, speed);

      const delay = estimateDelay(msg.length, speed);

      setTimeout(async () => {
        const panos = await window.Vista.loadPanoLabels();
        const projects = await window.Vista.loadProjects();
        const listHTML = createPanoProjectListHTML(panos, projects);
        // ⭐ isHTML = true so ui.js will attach pano click handlers
        window.ChatUI.createMessageRow("bot", listHTML, true);
      }, delay);

      return true;
    }

    /* -----------------------------------------
       🟦 OPEN PANORAMA (typed command)
    ----------------------------------------- */
    if (intent === "pano") {
      window.ChatUI.showTypingIndicator();
      const match = await window.Vista.findMatchingPano(text);
      await sleep(400);

      if (match) {
        // Direct open via Vista (works for typed "go to library")
        window.Vista.openPanorama(match);
        window.ChatUI.typeBotMessage(`Opening **${match}** panorama 🔍`, 20);
      } else {
        window.ChatUI.typeBotMessage(
          `I couldn't find that panorama.\n\n➡️ Type **"list all pano and projects"** to view everything.`,
          20
        );
      }

      return true;
    }

    /* -----------------------------------------
       🟦 OPEN PROJECT (typed command)
    ----------------------------------------- */
    if (intent === "project") {
      window.ChatUI.showTypingIndicator();
      const match = await window.Vista.findMatchingProject(text);
      await sleep(400);

      if (match) {
        window.Vista.openProject(match.url);
        window.ChatUI.typeBotMessage(
          `Opening project **${match.title}** 🌐`,
          20
        );
      } else {
        window.ChatUI.typeBotMessage(
          `Project not found.\n\n➡️ Type **"list all pano and projects"** to see full list.`,
          20
        );
      }

      return true;
    }

    return false;
  }

  /* ==========================================================
     SCHOOL CHATBOT
  ========================================================== */
  async function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    window.ChatUI.createMessageRow("user", trimmed);

    // Greetings
    if (isGreeting(trimmed)) {
      window.ChatUI.showTypingIndicator();
      await sleep(700);
      window.ChatUI.typeBotMessage(
        "Hi there! 👋 Welcome to Montfort ICSE!\n\nI can help you with:\n• Admissions & fees\n• Hostel\n• Transport\n• Academics\n• School timings\n• Virtual Tour navigation\n\nFor official details visit: https://montforticse.in/",
        25
      );
      return;
    }

    // 3D-Vista first
    const handled = await handleTourActions(trimmed);
    if (handled) return;

    // School backend
    try {
      window.ChatUI.showTypingIndicator();
      const data = await sendToBackend(trimmed);
      const answer =
        data?.answer ||
        "I'm not able to answer that right now. Please visit our official website.";

      await sleep(400);
      window.ChatUI.typeBotMessage(answer, 20);
    } catch (err) {
      console.error(err);
      window.ChatUI.hideTypingIndicator();
      window.ChatUI.createMessageRow(
        "bot",
        "I'm having trouble connecting. Please try again later."
      );
    }
  }

  /* ==========================================================
     FORM LISTENERS
  ========================================================== */
  window.handleQuickAction = function (question) {
    input.value = question;
    form.dispatchEvent(new Event("submit"));
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    if (!value.trim()) return;

    input.value = "";
    input.style.height = "auto";

    handleUserMessage(value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  console.log(
    "Montfort ICSE Chatbot initialized with 3D-Vista + list-all support!"
  );
})();
