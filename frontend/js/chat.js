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
      "hi", "hello", "hey", "hai", "hola", "greetings",
      "good morning", "good evening", "good afternoon",
      "good day", "what's up", "sup", "yo"
    ];
    return greetings.some((g) => t === g || t.startsWith(g));
  }

  async function sendToBackend(question) {
    const url = `${window.ChatbotConfig.API_BASE_URL}/chat`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("[Chat] Backend error:", res.status, txt);
        throw new Error(`Backend error: ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      console.error("[Chat] Network error:", error);
      throw error;
    }
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
          "Hi there! 👋 Welcome to Montfort ICSE!\n\nI can help you with:\n• Admissions & fees\n• Hostel facilities\n• Transport routes\n• Academic programs\n• School timings\n• And much more!\n\nFor official details visit: https://montforticse.in/",
          25
        );
      }, 900);
      return;
    }

    try {
      window.ChatUI.showTypingIndicator();
      const data = await sendToBackend(trimmed);
      const answer = data?.answer || "I'm not able to answer that right now. Please visit our official website for detailed information.";

      setTimeout(() => {
        window.ChatUI.typeBotMessage(answer, 20);
      }, 800);
    } catch (err) {
      console.error(err);
      window.ChatUI.hideTypingIndicator();
      window.ChatUI.createMessageRow(
        "bot",
        "I'm having trouble connecting right now. 😔\n\nPlease try again in a moment, or visit our official website for immediate assistance:\nhttps://montforticse.in/\n\nYou can also contact the school office for urgent queries."
      );
    }
  }

  // Handle quick actions
  window.handleQuickAction = function(question) {
    input.value = question;
    form.dispatchEvent(new Event("submit"));
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    
    // Reset input height
    input.style.height = 'auto';
    input.value = "";
    
    handleUserMessage(value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  // Add some sample questions for demonstration
  const sampleQuestions = [
    "What is the admission process?",
    "Tell me about hostel facilities",
    "What is the fee structure?",
    "Do you provide transport?",
    "What are the school timings?"
  ];

  console.log("Montfort ICSE Chatbot initialized successfully!");
  console.log("Sample questions you can try:", sampleQuestions);
})();