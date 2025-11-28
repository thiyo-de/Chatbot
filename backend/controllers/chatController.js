// controllers/chatController.js — INTENT VERSION (Option A)
// Fully updated for multi-question variations + intent-based embeddings

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  correctSpelling,
  normalizeToMeaning,
  embedText,
  answerGeneralQuestion,
} from "../services/geminiService.js";

import { findTopMatches } from "../rag/semantic-search.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🟣 DEBUG SWITCH  
const DEBUG = true;
const log = (...msg) => DEBUG && console.log("[DEBUG]", ...msg);

// 🧠 MEM for small follow-ups  
let memory = "";

// ⚡ Embedding Cache  
const EMB_CACHE = new Map();

// Load embeddings  
const EMB_PATH = path.join(__dirname, "..", "rag", "embeddings.json");
let EMBEDDINGS = [];

/* ---------------------------------------------------------
   LOAD EMBEDDINGS (single time)
--------------------------------------------------------- */
function loadEmbeddingsOnce() {
  if (EMBEDDINGS.length > 0) return;

  if (!fs.existsSync(EMB_PATH)) {
    EMBEDDINGS = [];
    return;
  }

  try {
    EMBEDDINGS = JSON.parse(fs.readFileSync(EMB_PATH, "utf8"));
    log(`Loaded ${EMBEDDINGS.length} embeddings`);
  } catch {
    EMBEDDINGS = [];
  }
}

/* ---------------------------------------------------------
   SMART FALLBACK
--------------------------------------------------------- */
async function smartFallback(question) {
  return "I don’t have that information in my data. Please visit https://montforticse.in/ or contact the school office for official details.";
}


/* ---------------------------------------------------------
   LLM VALIDATION — INTENT MATCH
--------------------------------------------------------- */
async function llmMeaningMatch(userQ, candidateQ) {
  const prompt = `
Do these questions have EXACTLY the same meaning?

Rules:
- Grammar changes do NOT matter
- Word order does NOT matter
- Spelling mistakes do NOT matter
- "school" = "campus"
- "class start time" = "school timing"
- "classes begin" = "school starting time"
- "secured campus" = "safety measures"
- "hostel food" = "mess food"
- "canteen" = "snack area"

If SAME meaning → reply EXACTLY "yes"
If NOT → reply EXACTLY "no"

User: "${userQ}"
Reference: "${candidateQ}"
`;

  const out = await answerGeneralQuestion(prompt);
  const ans = (out || "").trim().toLowerCase();

  log("LLM Meaning:", ans);

  return ans === "yes";
}

/* ---------------------------------------------------------
   MAIN CHAT HANDLER
--------------------------------------------------------- */
export async function handleChat(req, res) {
  try {
    loadEmbeddingsOnce();

    let { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.json({ answer: "question is required" });
    }

    question = question.trim();
    log("USER:", question);

    /* ---------------------------------
       1) MEMORY
    ----------------------------------- */
    let finalUser = question;

    if (memory && finalUser.length <= 4) {
      finalUser = `${memory} ${finalUser}`;
      log("MEMORY:", finalUser);
    }
    memory = question;

    /* ---------------------------------
       2) SPELLING FIX
    ----------------------------------- */
    const corrected = await correctSpelling(finalUser);
    log("SPELL:", corrected);

    /* ---------------------------------
       3) NORMALIZE
    ----------------------------------- */
    const normalized = await normalizeToMeaning(corrected);
    log("NORM:", normalized);

    /* ---------------------------------
       4) GET EMBEDDING (cached)
    ----------------------------------- */
    let vector = EMB_CACHE.get(normalized);
    if (!vector) {
      log("GENERATING EMBEDDING...");
      vector = await embedText(normalized);
      EMB_CACHE.set(normalized, vector);
    }

    if (!vector.length) {
      log("NO VECTOR → FALLBACK");
      return res.json({
        answer: await smartFallback(normalized),
        via: "no-vector",
      });
    }

    if (!EMBEDDINGS.length) {
      log("NO EMBEDDINGS FILE");
      return res.json({
        answer: await smartFallback(normalized),
        via: "no-embeddings",
      });
    }

    /* ---------------------------------
       5) SEMANTIC SEARCH
    ----------------------------------- */
    const matches = findTopMatches(vector, EMBEDDINGS, normalized, 5);
    const best = matches[0];
    const second = matches[1];

    log("BEST:", best);
    log("SECOND:", second);

    if (!best) {
      return res.json({
        answer: await smartFallback(normalized),
        via: "no-match",
      });
    }

    /* ---------------------------------
       6) SCORE CHECK
    ----------------------------------- */
    const MIN = 0.11;      // slightly higher for Option A
    const GAP = 0.06;

    const low = best._score < MIN;
    const ambi = second && Math.abs(best._score - second._score) < GAP;

    log("Score:", best._score, "LOW?", low, "AMBIG?", ambi);

    /* ---------------------------------
       7) LLM CONFIRMATION (when needed)
    ----------------------------------- */
    if (low || ambi) {
      log("LLM VALIDATING...");
      const ok = await llmMeaningMatch(normalized, best.question);
      if (ok) {
        return res.json({
          answer: best.answer,
          via: "llm-validated",
        });
      }

      return res.json({
        answer: await smartFallback(normalized),
        via: low ? "low-score" : "ambiguous",
      });
    }

    /* ---------------------------------
       8) Direct match
    ----------------------------------- */
    return res.json({
      answer: best.answer,
      via: "semantic",
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.json({
      answer: await smartFallback(req.body?.question || ""),
      via: "error",
    });
  }
}
