// 1. COSINE SIMILARITY
export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 2. SIMPLE TOKENIZER
function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// 3. KEYWORD OVERLAP SCORE (0–1)
function keywordOverlapScore(userTokens, entryTokens) {
  if (!userTokens.length || !entryTokens.length) return 0;

  let matches = 0;
  for (const t of userTokens) {
    if (entryTokens.includes(t)) matches += 1;
  }

  return matches / userTokens.length;
}

// 4. HYBRID BEST MATCH
export function findBestMatch(userVector, entries, userQuery = "") {
  let best = null;
  let bestScore = -Infinity;

  const userTokens = tokenize(userQuery);

  for (const entry of entries) {
    if (!entry.vector || !entry.vector.length) continue;

    const semanticScore = cosineSimilarity(userVector, entry.vector);
    const entryTokens = tokenize(entry.question || entry.keyword || "");
    const kScore = keywordOverlapScore(userTokens, entryTokens);

    const finalScore = 0.6 * semanticScore + 0.4 * kScore;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = entry;
    }
  }

  return { best, score: bestScore };
}
