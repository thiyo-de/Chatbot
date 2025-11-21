window.ChatbotSearch = (function () {
  const { tokenize, overlapScore } = window.ChatbotUtils;

  // Basic keyword overlap search (currently not used by main.js,
  // but kept for future use if needed)
  function getRankedCandidates(query, entries, maxCandidates = 8) {
    if (!entries || !entries.length) return [];

    const queryTokens = tokenize(query || "");
    if (!queryTokens.length) return [];

    const scored = [];

    for (const entry of entries) {
      const key = entry.keyword || entry.question || "";
      const keywordTokens = tokenize(key);
      const score = overlapScore(keywordTokens, queryTokens);

      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    if (!scored.length) return [];

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxCandidates).map((s) => s.entry);
  }

  return {
    getRankedCandidates,
  };
})();
