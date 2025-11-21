window.ChatbotUtils = (function () {
  const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "for",
    "and",
    "or",
    "to",
    "of",
    "is",
    "in",
    "on",
    "at",
    "about",
    "please",
    "tell",
    "me",
    "info",
    "information",
    "hi",
    "hello",
    "hey",
    "hai",
    "good",
    "morning",
    "evening",
    "afternoon",
  ]);

  function normalizeText(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[\r\n]+/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(text) {
    const normalized = normalizeText(text);
    if (!normalized) return [];
    return normalized
      .split(" ")
      .filter((t) => t && !STOP_WORDS.has(t.toLowerCase()));
  }

  function overlapScore(tokensA, tokensB) {
    if (!tokensA.length || !tokensB.length) return 0;
    const setA = new Set(tokensA);
    let score = 0;
    for (const t of tokensB) {
      if (setA.has(t)) score += 1;
    }
    return score;
  }

  function isEmptyString(str) {
    return !str || !String(str).trim();
  }

  return {
    normalizeText,
    tokenize,
    overlapScore,
    isEmptyString,
  };
})();
