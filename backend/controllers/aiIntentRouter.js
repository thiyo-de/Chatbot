// controllers/aiIntentRouter.js — ULTRA-STABLE FINAL VERSION
// Panorama + Project Intent Router (Case-insensitive + Fuzzy Matching)

export function aiIntentRouter(question, panoNames = [], projectNames = []) {
  if (!question) return { intent: "school" };

  /* ------------------------------------------------------------
     1) BASIC NORMALIZATION
  ------------------------------------------------------------ */
  let raw = question.toLowerCase().trim();

  // Remove navigation verbs
  raw = raw.replace(
    /\b(go to|go|goto|open|show|view|take me to|take me|navigate|visit|see|check|look at)\b/g,
    ""
  );

  // Remove articles & filler words
  raw = raw.replace(/\b(the|a|an|please|pls|kindly|can you|could you)\b/g, "");

  // Remove punctuation + numbers
  let cleaned = raw
    .replace(/[^\w\s]/g, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return { intent: "school" };

  /* ============================================================
     2) EXACT PANORAMA MATCH (strict)
  ============================================================ */
  const panoExact = panoNames.find(
    (p) => p.toLowerCase() === cleaned
  );
  if (panoExact) {
    return { intent: "pano", target: panoExact };
  }

  /* ============================================================
     3) PANORAMA — STRONG FUZZY MATCH
     Handles:
     ✓ guest room
     ✓ guestroom
     ✓ gust room
     ✓ gest rum
     ✓ gues rom
  ============================================================ */
  const panoFuzzy = panoNames.find((p) => {
    const t = p.toLowerCase();

    return (
      t.includes(cleaned) ||
      cleaned.includes(t) ||
      levenshteinDistance(t, cleaned) <= 2
    );
  });

  if (panoFuzzy) {
    return { intent: "pano", target: panoFuzzy };
  }

  /* ============================================================
     4) EXACT PROJECT MATCH
  ============================================================ */
  const projExact = projectNames.find(
    (p) => p.toLowerCase() === cleaned
  );
  if (projExact) {
    return { intent: "project", target: projExact };
  }

  /* ============================================================
     5) PROJECT — STRONG FUZZY MATCH
  ============================================================ */
  const projFuzzy = projectNames.find((p) => {
    const t = p.toLowerCase();

    return (
      t.includes(cleaned) ||
      cleaned.includes(t) ||
      levenshteinDistance(t, cleaned) <= 2
    );
  });

  if (projFuzzy) {
    return { intent: "project", target: projFuzzy };
  }

  /* ============================================================
     6) DEFAULT → SCHOOL CHATBOT
  ============================================================ */
  return { intent: "school" };
}

/* ------------------------------------------------------------
   LEVENSHTEIN DISTANCE
   Used for fuzzy matching user typos & merged words.
------------------------------------------------------------ */
function levenshteinDistance(a, b) {
  if (!a || !b) return 99;

  const m = a.length;
  const n = b.length;

  const dp = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
