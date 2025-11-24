(function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  if (!form || !input || !window.ChatUI || !window.ChatbotConfig) {
    console.error("[Chat] Missing dependencies");
    return;
  }

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
      "good afternoon"
    ];
    return greetings.some((g) => t === g || t.startsWith(g));
  }

  async function sendToBackend(question) {
    const url = `${window.ChatbotConfig.API_BASE_URL}/chat`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[Chat] Backend error:", res.status, txt);
      throw new Error("Backend error");
    }

    return res.json();
  }

  async function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Show user message
    window.ChatUI.createMessageRow("user", trimmed);

    // Short greeting shortcut
    if (isGreeting(trimmed)) {
      window.ChatUI.showTypingIndicator();
      setTimeout(() => {
        window.ChatUI.typeBotMessage(
          "Hi there! 👋 Ask me about admissions, hostel, fees, timings, and more.\nFor full details visit https://montforticse.in/",
          25
        );
      }, 900);
      return;
    }

    try {
      window.ChatUI.showTypingIndicator();
      const data = await sendToBackend(trimmed);
      const answer = data?.answer || "I'm not able to answer that right now.";

      setTimeout(() => {
        window.ChatUI.typeBotMessage(answer, 20);
      }, 800);
    } catch (err) {
      console.error(err);
      window.ChatUI.hideTypingIndicator();
      window.ChatUI.createMessageRow(
        "bot",
        "Something went wrong. Please try again later.\nVisit https://montforticse.in/ for official information."
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

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });
})();
