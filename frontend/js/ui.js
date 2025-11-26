(function () {
  const widget = document.getElementById("chat-widget");
  const toggleBtn = document.getElementById("chat-toggle");
  const closeBtn = document.getElementById("chat-close");
  const messagesEl = document.getElementById("chat-messages");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.querySelector(".chat-send-btn");

  if (!widget || !toggleBtn || !closeBtn || !messagesEl) {
    console.error("[UI] Missing DOM elements");
    return;
  }

  let isTyping = false;

  function setInputDisabled(disabled) {
    if (!inputEl || !sendBtn) return;
    inputEl.disabled = disabled;
    sendBtn.disabled = disabled;

    if (disabled) {
      inputEl.classList.add("input-disabled");
    } else {
      inputEl.classList.remove("input-disabled");
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" style="color:#3b82f6;text-decoration:underline;font-weight:500;">${url}</a>`;
    });
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function createMessageRow(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";

    if (role === "user") {
      // Keep simple user icon
      avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>`;
    } else {
      // BOT: use logo.svg instead of message icon
      avatar.innerHTML = `<img src="assets/logo.svg" alt="Montfort ICSE">`;
    }

    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    if (role === "bot") {
      bubble.innerHTML = linkify(text);
    } else {
      bubble.textContent = text;
    }

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = getCurrentTime();

    content.appendChild(bubble);
    content.appendChild(time);
    
    row.appendChild(avatar);
    row.appendChild(content);
    messagesEl.appendChild(row);
    scrollToBottom();
    if (window.ChatSounds) window.ChatSounds.delivered();
  }

  function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;

    setInputDisabled(true);

    const row = document.createElement("div");
    row.className = "typing-message";
    row.id = "typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "typing-avatar";
    // BOT typing avatar uses logo
    avatar.innerHTML = `<img src="assets/logo.svg" alt="Montfort ICSE">`;

    const bubble = document.createElement("div");
    bubble.className = "typing-bubble";

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML =
      '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

    bubble.appendChild(indicator);
    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);

    scrollToBottom();
    if (window.ChatSounds) window.ChatSounds.typing();
  }

  function hideTypingIndicator() {
    isTyping = false;
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
    // Do NOT enable input here; we enable after bot finishes typing message
  }

  async function typeBotMessage(text, speed = 20) {
    hideTypingIndicator();

    const row = document.createElement("div");
    row.className = "message-row bot";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    // BOT message avatar uses logo
    avatar.innerHTML = `<img src="assets/logo.svg" alt="Montfort ICSE">`;

    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble typing-text";

    const time = document.createElement("div");
    time.className = "message-time";

    content.appendChild(bubble);
    content.appendChild(time);
    row.appendChild(avatar);
    row.appendChild(content);
    messagesEl.appendChild(row);

    let i = 0;
    let current = "";

    // Keep user blocked while bot is typing
    setInputDisabled(true);

    function step() {
      if (i < text.length) {
        current += text.charAt(i);
        bubble.innerHTML = linkify(current);
        time.textContent = getCurrentTime();
        i++;
        const delay = speed + (Math.random() * 10 - 5);
        setTimeout(step, delay);
        scrollToBottom();
      } else {
        bubble.classList.remove("typing-text");
        if (window.ChatSounds) window.ChatSounds.delivered();
        // Bot finished typing → re-enable user input
        setInputDisabled(false);
      }
    }

    step();
  }

  function openChat() {
    widget.classList.remove("hidden");
    widget.setAttribute("aria-hidden", "false");
    toggleBtn.style.display = "none";
    if (window.ChatSounds) window.ChatSounds.open();

    if (!messagesEl.dataset.initialized) {
      messagesEl.dataset.initialized = "1";
      const welcome =
        "Hello! I'm the Montfort ICSE school assistant.\n\n" +
        "Ask me about admissions, hostel, fees, transport, academics and more.\n" +
        "For official details, please visit https://montforticse.in/";
      showTypingIndicator();
      setTimeout(() => typeBotMessage(welcome, 25), 900);
    }
  }

  function closeChat() {
    widget.classList.add("hidden");
    widget.setAttribute("aria-hidden", "true");
    toggleBtn.style.display = "block";
    if (window.ChatSounds) window.ChatSounds.close();
  }

  toggleBtn.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  // Close chat when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !widget.classList.contains("hidden") &&
      !widget.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      closeChat();
    }
  });

  // Escape key to close chat
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !widget.classList.contains("hidden")) {
      closeChat();
    }
  });

  window.ChatUI = {
    createMessageRow,
    showTypingIndicator,
    hideTypingIndicator,
    typeBotMessage,
  };
})();
