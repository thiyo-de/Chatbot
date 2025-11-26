// controllers/chatController.js — FINAL VERSION (UNKNOWN TOPIC PROTECTION)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  correctSpelling,
  normalizeToMeaning,
  embedText,
  summarizeAnswers,
  answerGeneralQuestion,
} from "../services/geminiService.js";

import { findTopMatches } from "../rag/semantic-search.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMB_PATH = path.join(__dirname, "..", "rag", "embeddings.json");

let EMBEDDINGS = [];

/* -----------------------------------------------------------
   LOAD EMBEDDINGS
----------------------------------------------------------- */
function loadEmbeddingsOnce() {
  if (EMBEDDINGS.length > 0) return;

  if (!fs.existsSync(EMB_PATH)) {
    console.error("❌ embeddings.json missing — run: npm run embed");
    return;
  }

  try {
    EMBEDDINGS = JSON.parse(fs.readFileSync(EMB_PATH, "utf8"));
    console.log(`✅ Loaded ${EMBEDDINGS.length} embeddings.`);
  } catch (err) {
    console.error("❌ Failed to parse embeddings.json:", err);
    EMBEDDINGS = [];
  }
}

/* -----------------------------------------------------------
   BASIC TOKEN SIMILARITY
----------------------------------------------------------- */
function similar(a, b) {
  if (!a || !b) return false;
  a = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  b = b.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (a === b) return true;

  let diff = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) diff++;
    if (diff > 2) return false;
  }
  return true;
}

/* -----------------------------------------------------------
   TOKEN TOPIC SIMILARITY
----------------------------------------------------------- */
function topicSimilarTokens(normalized, entry) {
  const queryTokens = normalized.toLowerCase().split(/\s+/);
  const faqTokens = `
    ${entry.question.toLowerCase()}
    ${entry.answer.toLowerCase()}
  `.split(/\s+/);

  return queryTokens.some((qt) =>
    faqTokens.some((ft) => similar(qt, ft))
  );
}

/* -----------------------------------------------------------
   HARD UNKNOWN-TOPIC CHECK
----------------------------------------------------------- */
function unrelatedTopic(normalized, bestEntry) {
  const blacklist = ["water", "drinking", "dining", "food", "meal", "snack"];

  const q = normalized.toLowerCase();
  const ans = bestEntry.answer.toLowerCase();

  const hit = blacklist.some(w => q.includes("canteen") && ans.includes(w));

  return hit;
}

/* -----------------------------------------------------------
   MAIN HANDLER
----------------------------------------------------------- */
export async function handleChat(req, res) {
  try {
    loadEmbeddingsOnce();

    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question is required" });
    }

    const corrected = await correctSpelling(question);
    const wordCount = corrected.trim().split(/\s+/).length;

    const isCategory = wordCount === 1;
    const normalized = isCategory
      ? corrected.trim().toLowerCase()
      : await normalizeToMeaning(corrected);

    console.log("\nUSER =", question);
    console.log("NORMALIZED =", normalized);

    /* Embedding vector */
    const vector = await embedText(normalized);
    if (!vector.length) return fallback(res);

    /* CATEGORY MODE */
    if (isCategory) {
      const top = findTopMatches(vector, EMBEDDINGS, normalized, 5);
      if (top.length > 0) {
        const combined = top
          .map((x) => `Q: ${x.question}\nA: ${x.answer}`)
          .join("\n\n");

        const summary = await summarizeAnswers(combined);

        return res.json({
          answer: summary,
          via: "category-summary",
        });
      }
    }

    /* RANKED MATCHES */
    const matches = findTopMatches(vector, EMBEDDINGS, normalized, 5);
    const best = matches[0];
    const second = matches[1];

    if (!best) return fallback(res);

    const MIN_SCORE = 0.25;
    const GAP = 0.045;

    const topicMatch = topicSimilarTokens(normalized, best);

    /* -----------------------------------------------------------
       UNKNOWN TOPIC PROTECTION (canteen fix)
       If score low AND no token match → fallback
    ----------------------------------------------------------- */
    if (best._score < MIN_SCORE && !topicMatch) {
      return fallback(res);
    }

    /* -----------------------------------------------------------
       SPECIAL: prevent canteen → water
    ----------------------------------------------------------- */
    if (unrelatedTopic(normalized, best)) {
      return fallback(res);
    }

    /* -----------------------------------------------------------
       ambiguous → fallback
    ----------------------------------------------------------- */
    if (second && Math.abs(best._score - second._score) < GAP) {
      return fallback(res);
    }

    /* -----------------------------------------------------------
       Accept match
    ----------------------------------------------------------- */
    return res.json({
      answer: best.answer,
      id: best.id,
      score: best._score,
      via: topicMatch ? "token-topic-match" : "semantic-match",
    });

  } catch (err) {
    console.error("[ERROR]", err);
    return fallback(res);
  }
}

/* -----------------------------------------------------------
   FALLBACK
----------------------------------------------------------- */
function fallback(res) {
  return res.json({
    answer:
      "I don’t have that information in my data. Please visit https://montforticse.in/ or contact the school office for official details.",
    via: "fallback",
  });
}
