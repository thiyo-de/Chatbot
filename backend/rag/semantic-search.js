// rag/semantic-search.js — FINAL TOKEN + SEMANTIC ENGINE

/* ---------------------------------------------------------
   COSINE SIMILARITY
--------------------------------------------------------- */
export function cosineSimilarity(a, b) {
  if (!a || !b || !a.length || !b.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ---------------------------------------------------------
   TOKENIZER (safe)
--------------------------------------------------------- */
function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* ---------------------------------------------------------
   KEYWORD SCORE
--------------------------------------------------------- */
function keywordScore(userTokens, entryTokens) {
  if (!userTokens.length || !entryTokens.length) return 0;

  let match = 0;
  for (const t of userTokens) {
    if (entryTokens.includes(t)) match++;
  }
  return match / userTokens.length;
}

/* ---------------------------------------------------------
   BEST MATCH (Single)
--------------------------------------------------------- */
export function findBestMatch(userVector, entries, userQuery = "") {
  const userTokens = tokenize((userQuery || "").toLowerCase());

  let best = null;
  let bestScore = -Infinity;

  const short = userTokens.length <= 2;
  const SEM_WEIGHT = short ? 0.55 : 0.65;  // semantic more important
  const KEY_WEIGHT = short ? 0.45 : 0.35;

  for (const entry of entries) {
    if (!entry.vector?.length) continue;

    const semantic = cosineSimilarity(userVector, entry.vector);
    const entryTokens = tokenize(entry.keyword || entry.question || "");

    const key = keywordScore(userTokens, entryTokens);
    const score = semantic * SEM_WEIGHT + key * KEY_WEIGHT;

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return { best, score: bestScore };
}

/* ---------------------------------------------------------
   TOP MATCHES (Category mode)
--------------------------------------------------------- */
export function findTopMatches(userVector, entries, userQuery = "", limit = 5) {
  const userTokens = tokenize((userQuery || "").toLowerCase());
  const results = [];

  for (const entry of entries) {
    if (!entry.vector?.length) continue;

    const semantic = cosineSimilarity(userVector, entry.vector);
    const entryTokens = tokenize(entry.keyword || entry.question || "");

    const key = keywordScore(userTokens, entryTokens);

    const score =
      semantic * 0.60 +   // semantic dominates
      key * 0.40;         // token match still matters

    results.push({ ...entry, _score: score });
  }

  return results.sort((a, b) => b._score - a._score).slice(0, limit);
}
