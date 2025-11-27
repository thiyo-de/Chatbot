// rag/semantic-search.js — AUTO TOPIC-AWARE SEMANTIC ENGINE (NO MANUAL RULES)

/* ---------------------------------------------------------
   COSINE SIMILARITY
--------------------------------------------------------- */
export function cosineSimilarity(a, b) {
  if (!a || !b || !a.length || !b.length) return 0;

  let dot = 0,
    normA = 0,
    normB = 0;
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
   TOKENIZER
--------------------------------------------------------- */
function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* ---------------------------------------------------------
   BUILD TOKEN STATS (AUTO TOPIC LEARNING)
   - Learns topic relevance automatically from FAQ corpus.
--------------------------------------------------------- */
function buildTokenStats(entries) {
  const df = new Map(); // token → doc frequency
  let totalDocs = 0;

  for (const entry of entries) {
    const text = (entry.keyword || entry.question || "").toLowerCase();
    const tokens = new Set(tokenize(text));

    if (!tokens.size) continue;
    totalDocs++;

    for (const t of tokens) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }

  return { df, totalDocs };
}

/* ---------------------------------------------------------
   IDF — Rare Token Weighting
   Makes “textbooks” > “provide”
   Makes “canteen” > “campus”
--------------------------------------------------------- */
function idf(token, dfMap, totalDocs) {
  const df = dfMap.get(token) || 0;
  return Math.log((totalDocs + 1) / (df + 1)) + 1; // normalized
}

/* ---------------------------------------------------------
   KEYWORD SCORE (IDF-WEIGHTED)
--------------------------------------------------------- */
function keywordScore(userTokens, entryTokens, dfMap, totalDocs) {
  if (!userTokens.length || !entryTokens.length || !totalDocs) return 0;

  const entrySet = new Set(entryTokens);
  const uniqueUser = Array.from(new Set(userTokens));

  let num = 0;
  let den = 0;

  for (const t of uniqueUser) {
    const weight = idf(t, dfMap, totalDocs);
    den += weight;

    if (entrySet.has(t)) {
      num += weight;
    }
  }

  if (!den) return 0;
  return num / den;
}

/* ---------------------------------------------------------
   TOP MATCHES — AUTO TOPIC-AWARE
--------------------------------------------------------- */
export function findTopMatches(userVector, entries, userQuery = "", limit = 5) {
  const userTokens = tokenize((userQuery || "").toLowerCase());
  const results = [];

  if (!entries || !entries.length) return results;

  const { df, totalDocs } = buildTokenStats(entries);
  const isShortQuery = userTokens.length <= 2;

  const SEM_WEIGHT = isShortQuery ? 0.70 : 0.65;
  const KEY_WEIGHT = isShortQuery ? 0.30 : 0.35;

  for (const entry of entries) {
    if (!entry.vector?.length) continue;

    const semantic = cosineSimilarity(userVector, entry.vector);
    const entryTokens = tokenize(entry.keyword || entry.question || "");
    const key = keywordScore(userTokens, entryTokens, df, totalDocs);

    // AUTO-OVERLAP BOOST (tiny)
    const hasOverlap = userTokens.some((t) => entryTokens.includes(t));
    const topicBoost = hasOverlap ? 0.05 : 0;

    const score = semantic * SEM_WEIGHT + key * KEY_WEIGHT + topicBoost;

    results.push({
      ...entry,
      _score: score,
    });
  }

  return results.sort((a, b) => b._score - a._score).slice(0, limit);
}

/* ---------------------------------------------------------
   BEST MATCH (single item)
--------------------------------------------------------- */
export function findBestMatch(userVector, entries, userQuery = "") {
  const list = findTopMatches(userVector, entries, userQuery, 1);
  return list[0] || null;
}
