(function () {
  const widget = document.getElementById("chat-widget");
  const toggleBtn = document.getElementById("chat-toggle");
  const closeBtn = document.getElementById("chat-close");
  const messagesEl = document.getElementById("chat-messages");

  if (!widget || !toggleBtn || !closeBtn || !messagesEl) {
    console.error("[UI] Missing DOM elements");
    return;
  }

  let isTyping = false;

  function scrollToBottom() {
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" style="color:#2563eb;text-decoration:underline;">${url}</a>`;
    });
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
    if (role === "bot") {
      bubble.innerHTML = linkify(text);
    } else {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    if (window.ChatSounds) window.ChatSounds.delivered();
  }

  function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;

    const row = document.createElement("div");
    row.className = "typing-message";
    row.id = "typing-indicator";

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
  }

  async function typeBotMessage(text, speed = 20) {
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
    let current = "";

    function step() {
      if (i < text.length) {
        current += text.charAt(i);
        bubble.innerHTML = linkify(current);
        i++;
        const delay = speed + (Math.random() * 10 - 5);
        setTimeout(step, delay);
        scrollToBottom();
      } else {
        bubble.classList.remove("typing-text");
        if (window.ChatSounds) window.ChatSounds.delivered();
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

  window.ChatUI = {
    createMessageRow,
    showTypingIndicator,
    hideTypingIndicator,
    typeBotMessage
  };
})();
