// chat.js — FINAL AI READY VERSION (Intent Routing + Help + Name + Clean UI)
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
      "hi", "hello", "hey", "hai", "hola", "greetings",
      "good morning", "good evening", "good afternoon",
      "good day", "what's up", "sup", "yo"
    ];
    return greetings.some((g) => t === g || t.startsWith(g));
  }

  function isHelp(text) {
    const t = text.toLowerCase().trim();
    return (
      t === "help" ||
      t === "menu" ||
      t === "guide" ||
      t === "options" ||
      t.includes("how to use") ||
      t.includes("what can you do") ||
      t.includes("what are your features")
    );
  }

  function isNameQuery(text) {
    const t = text.toLowerCase().trim();
    return (
      t.includes("your name") ||
      t.includes("who are you") ||
      t === "name" ||
      t.includes("what should i call you") ||
      t.includes("who am i chatting with")
    );
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function estimateDelay(textLength, speed) {
    const ms = textLength * speed * 0.6;
    return Math.max(600, Math.min(ms, 5000));
  }

  /* ==========================================================
     SEND TO BACKEND (includes panoNames + projectNames)
  ========================================================== */
  async function sendToBackend(question) {
    const url = `${window.ChatbotConfig.API_BASE_URL}/chat`;

    try {
      const body = {
        question,
        panoNames: window.VistaPanos || [],
        projectNames: window.VistaProjects || [],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error("[Chat] Backend error:", res.status);
        throw new Error("Backend error");
      }

      return await res.json();
    } catch (err) {
      console.error("[Chat] Network error:", err);
      throw err;
    }
  }

  /* ==========================================================
     LIST-ALL UI
  ========================================================== */
  function createPanoProjectListHTML(panos, projects) {
    let html = `
      <div class="tour-list-box">
        <h3>Available Panoramas</h3>
        <div class="tour-grid">
    `;
    panos.forEach((p) => {
      html += `<button class="tour-btn" data-pano="${p}">${p}</button>`;
    });

    html += `
        </div>
        <h3>Available Projects</h3>
        <div class="tour-grid">
    `;
    projects.forEach((p) => {
      html += `<button class="tour-btn" data-project="${p.url}">${p.title}</button>`;
    });

    html += `
        </div>
      </div>
    `;
    return html;
  }

  async function handleListAll() {
    window.ChatUI.showTypingIndicator();
    await sleep(400);

    const msg = "Here are all the panoramas and projects available.";
    const speed = 20;
    window.ChatUI.typeBotMessage(msg, speed);

    const delay = estimateDelay(msg.length, speed);

    setTimeout(async () => {
      const panos = await window.Vista.loadPanoLabels();
      const projects = await window.Vista.loadProjects();
      const html = createPanoProjectListHTML(panos, projects);
      window.ChatUI.createMessageRow("bot", html, true);
    }, delay);

    return true;
  }

/* ==========================================================
   PROCESS AI RESPONSE FROM BACKEND
========================================================== */
async function handleAIResponse(data) {
  // OPEN PANORAMA
  if (data.intent === "pano") {
    await sleep(300);
    window.Vista.openPanorama(data.target);
    window.ChatUI.typeBotMessage(`Opening ${data.target} panorama`, 22);
    return true;
  }

  // OPEN PROJECT
  if (data.intent === "project") {
    await sleep(300);
    window.Vista.openProject(data.target);
    window.ChatUI.typeBotMessage(`Opening project: ${data.target}`, 22);
    return true;
  }

  return false;
}


  /* ==========================================================
     MAIN MESSAGE HANDLER
  ========================================================== */
  async function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    window.ChatUI.createMessageRow("user", trimmed);

    const t = trimmed.toLowerCase();

    /* -----------------------------------------
       GREETINGS
    ----------------------------------------- */
    if (isGreeting(trimmed)) {
      window.ChatUI.showTypingIndicator();
      await sleep(600);

      window.ChatUI.typeBotMessage(
        "Hi there! Welcome to the Montfort ICSE Assistant.\n\nYou can ask about:\n• Admissions\n• Fees\n• Hostel\n• Transport\n• School timings\n• Rules\n• Or navigate panoramas like: go to boys hostel",
        22
      );
      return;
    }

    /* -----------------------------------------
       HELP
    ----------------------------------------- */
    if (isHelp(trimmed)) {
      window.ChatUI.showTypingIndicator();
      await sleep(500);

      window.ChatUI.typeBotMessage(
        "Here’s what I can assist you with:\n\n• Admissions & Fees\n• Hostel & Transport\n• School timings\n• Rules & Facilities\n• Virtual tour navigation\n• Show all panoramas and projects\n\nAsk anything anytime.",
        22
      );
      return;
    }

    /* -----------------------------------------
       NAME QUERY
    ----------------------------------------- */
    if (isNameQuery(trimmed)) {
      window.ChatUI.showTypingIndicator();
      await sleep(500);

      window.ChatUI.typeBotMessage(
        "I'm your Montfort ICSE Assistant, here to guide you anytime.",
        22
      );
      return;
    }

    /* -----------------------------------------
       LIST ALL
    ----------------------------------------- */
    const isList =
      t === "list all" ||
      t === "show all" ||
      t === "listall" ||
      t.includes("list all pano") ||
      t.includes("list all panos") ||
      t.includes("list all project") ||
      t.includes("list all panorama") ||
      t.includes("list all tours");

    if (isList) {
      return await handleListAll();
    }

    /* -----------------------------------------
       SEND TO BACKEND
    ----------------------------------------- */
    try {
      window.ChatUI.showTypingIndicator();
      const data = await sendToBackend(trimmed);

      const handled = await handleAIResponse(data);
      if (handled) return;

      const answer =
        data?.answer ||
        "I'm not able to answer that right now. Please try again.";

      await sleep(400);
      window.ChatUI.typeBotMessage(answer, 20);
    } catch (err) {
      console.error(err);
      window.ChatUI.hideTypingIndicator();
      window.ChatUI.createMessageRow(
        "bot",
        "I’m having trouble connecting right now. Please try again later."
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
    const val = input.value;
    if (!val.trim()) return;

    input.value = "";
    input.style.height = "auto";
    handleUserMessage(val);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  console.log("%c[Chat] AI-ready chat.js loaded successfully", "color:#2962FF; font-weight:bold;");
})();
