// ui.js — FINAL VERSION (Fixed Typing, Clean UI, Safe Buttons)
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

  /* ==========================================================
     HELPERS
  ========================================================== */
  function setInputDisabled(disabled) {
    if (!inputEl || !sendBtn) return;
    inputEl.disabled = disabled;
    sendBtn.disabled = disabled;

    if (disabled) inputEl.classList.add("input-disabled");
    else inputEl.classList.remove("input-disabled");
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 40);
  }

  function linkify(text) {
    return text.replace(
      /(https?:\/\/[^\s]+)/g,
      (url) =>
        `<a href="${url}" target="_blank" style="color:#3b82f6;text-decoration:underline;">${url}</a>`
    );
  }

  function getCurrentTime() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* ==========================================================
     MAIN MESSAGE RENDERER
  ========================================================== */
  function createMessageRow(role, text, isHTML = false) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";

    if (role === "user") {
      avatar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>`;
    } else {
      avatar.innerHTML = `<img src="assets/logo.svg" alt="Bot">`;
    }

    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (isHTML) {
      bubble.innerHTML = text;
      bubble.classList.add("html-message");

      bubble.querySelectorAll(".tour-btn").forEach((btn) => {
        const label = btn.textContent.trim();

        btn.addEventListener("click", () => {
          console.log("[UI] PANO/PROJECT BUTTON:", label);

          if (window.tour?.setMediaByName) {
            window.tour.setMediaByName(label);
          }
        });
      });
    } else {
      bubble.innerHTML = linkify(text);
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

  /* ==========================================================
     TYPING INDICATOR
  ========================================================== */
  function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;

    setInputDisabled(true);

    const row = document.createElement("div");
    row.className = "typing-message";
    row.id = "typing-indicator";

    row.innerHTML = `
      <div class="typing-avatar">
        <img src="assets/logo.svg" alt="Bot">
      </div>
      <div class="typing-bubble">
        <div class="typing-indicator">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>`;

    messagesEl.appendChild(row);
    scrollToBottom();
    if (window.ChatSounds) window.ChatSounds.typing();
  }

  function hideTypingIndicator() {
    isTyping = false;
    document.getElementById("typing-indicator")?.remove();
  }

  /* ==========================================================
     FIXED TYPEWRITER — NO MISSING LETTERS (FINAL VERSION)
  ========================================================== */
  async function typeBotMessage(text, speed = 25) {
    hideTypingIndicator();

    const row = document.createElement("div");
    row.className = "message-row bot";

    row.innerHTML = `
      <div class="message-avatar"><img src="assets/logo.svg"></div>
      <div class="message-content">
        <div class="message-bubble typing-text"></div>
        <div class="message-time">${getCurrentTime()}</div>
      </div>`;

    messagesEl.appendChild(row);

    const bubble = row.querySelector(".message-bubble");

    let i = 0;

    function type() {
      if (i < text.length) {
        bubble.textContent = text.substring(0, i + 1);
        i++;
        scrollToBottom();
        setTimeout(type, speed);
      } else {
        bubble.textContent = text; // FINAL SAFE WRITE
        bubble.classList.remove("typing-text");
        setInputDisabled(false);
        scrollToBottom();
        if (window.ChatSounds) window.ChatSounds.delivered();
      }
    }

    type();
  }

  /* ==========================================================
     OPEN/CLOSE WIDGET
  ========================================================== */
  toggleBtn.addEventListener("click", () => {
    widget.classList.remove("hidden");
    widget.setAttribute("aria-hidden", "false");
    toggleBtn.style.display = "none";

    if (!widget.dataset.welcomeShown) {
      widget.dataset.welcomeShown = "1";

      const welcome =
        "Hello 👋 I'm the Montfort ICSE Virtual Assistant.\n\n" +
        "You can ask about:\n• Admissions\n• Fees\n• Hostel\n• Transport\n• 3D Tour Navigation\n\n" +
        "Type **list all** to see all panoramas & projects.";

      showTypingIndicator();
      setTimeout(() => typeBotMessage(welcome, 20), 600);
    }

    if (window.ChatSounds) window.ChatSounds.open();
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.add("hidden");
    widget.setAttribute("aria-hidden", "true");
    toggleBtn.style.display = "flex";
    if (window.ChatSounds) window.ChatSounds.close();
  });

  /* Click outside closes widget */
  document.addEventListener("click", (e) => {
    if (
      !widget.classList.contains("hidden") &&
      !widget.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      widget.classList.add("hidden");
      toggleBtn.style.display = "flex";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !widget.classList.contains("hidden")) {
      widget.classList.add("hidden");
      toggleBtn.style.display = "flex";
    }
  });

  /* EXPORT API */
  window.ChatUI = {
    createMessageRow,
    showTypingIndicator,
    hideTypingIndicator,
    typeBotMessage,
  };
})();
