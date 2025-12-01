(function () {
  /* ================================================================
     CREATE: <link rel="stylesheet">
  ================================================================== */
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "css/style.css";
  document.head.appendChild(style);

  /* ================================================================
     MAIN CONTAINER
  ================================================================== */
  const main = document.createElement("main");
  main.className = "page-content";

  /* ================================================================
     FLOATING ACTION BUTTON
  ================================================================== */
  const chatToggle = document.createElement("button");
  chatToggle.id = "chat-toggle";
  chatToggle.className = "chat-toggle-btn";
  chatToggle.setAttribute("aria-label", "Open Montfort Chatbot");

  chatToggle.innerHTML = `
    <img src="assets/logo.svg" alt="Chat" class="chat-icon" width="24" height="24"/>
    <span class="pulse"></span>
  `;

  /* ================================================================
     CHAT WIDGET SECTION
  ================================================================== */
  const chatWidget = document.createElement("section");
  chatWidget.id = "chat-widget";
  chatWidget.className = "chat-widget hidden";
  chatWidget.setAttribute("aria-hidden", "true");

  /* HEADER */
  chatWidget.innerHTML = `
    <header class="chat-header">
      <div class="chat-title">
        <div class="chat-avatar">
          <img src="assets/logo.svg" alt="Montfort ICSE" width="24" height="24"/>
        </div>
        <div class="chat-title-text">
          <h2>Montfort ICSE Assistant</h2>
          <p class="status">Online • Ready to help</p>
        </div>
      </div>

      <button id="chat-close" class="chat-close-btn" aria-label="Close chat">
        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M18 6L6 18"></path>
          <path d="M6 6l12 12"></path>
        </svg>
      </button>
    </header>

    <div id="chat-messages" class="chat-messages"></div>

    <form id="chat-form" class="chat-form">
      <div class="input-container">
        <textarea id="chat-input" class="chat-input" rows="1" placeholder="Ask Anything..."></textarea>

        <button type="submit" class="chat-send-btn" aria-label="Send message">
          <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>

      <p class="chat-hint">Try: "admission process" or "hostel facilities"</p>
    </form>
  `;

  /* ================================================================
     SOUNDS
  ================================================================== */
  const soundTyping = document.createElement("audio");
  soundTyping.id = "typing-sound";
  soundTyping.src = "assets/typing.mp3";
  soundTyping.preload = "auto";

  const soundDelivered = document.createElement("audio");
  soundDelivered.id = "delivered-sound";
  soundDelivered.src = "assets/delivered.mp3";
  soundDelivered.preload = "auto";

  const soundOpen = document.createElement("audio");
  soundOpen.id = "open-sound";
  soundOpen.src = "assets/open.mp3";
  soundOpen.preload = "auto";

  const soundClose = document.createElement("audio");
  soundClose.id = "close-sound";
  soundClose.src = "assets/close.mp3";
  soundClose.preload = "auto";

  /* ================================================================
     APPEND EVERYTHING
  ================================================================== */
  main.appendChild(chatToggle);
  main.appendChild(chatWidget);

  document.body.appendChild(main);
  document.body.appendChild(soundTyping);
  document.body.appendChild(soundDelivered);
  document.body.appendChild(soundOpen);
  document.body.appendChild(soundClose);

  /* ================================================================
     LOAD SCRIPT FILES (config, sound, ui, chat, vista)
  ================================================================== */
  function loadScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      document.body.appendChild(s);
    });
  }

  (async function loadAllScripts() {
    await loadScript("js/config.js");
    await loadScript("js/sound.js");
    await loadScript("js/ui.js");
    await loadScript("js/chat.js");
    await loadScript("js/vista.js");
  })();
})();
