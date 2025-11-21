window.ChatbotContext = (function () {
  const state = {
    lastUserMessage: null,
    lastKeyword: null,
    lastAnswer: null,
    history: [],
  };

  function addToHistory(role, content) {
    state.history.push({ role, content });
    const max = window.ChatbotConfig?.MAX_HISTORY ?? 4;
    if (state.history.length > max * 2) {
      state.history.splice(0, state.history.length - max * 2);
    }
  }

  function updateLastInteraction(userMessage, keyword, answer) {
    state.lastUserMessage = userMessage;
    state.lastKeyword = keyword;
    state.lastAnswer = answer;
  }

  function getState() {
    return state;
  }

  return {
    addToHistory,
    updateLastInteraction,
    getState,
  };
})();
