// controllers/chatController.js — ULTRA-STABLE FINAL VERSION
// Includes:
// ✓ AI pano/project intent routing (first priority)
// ✓ Multi-match mode for 1–2 word queries
// ✓ Spell-fix + normalize + embeddings
// ✓ Exact match validation via LLM
// ✓ Full logs (no omissions)

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
import { aiIntentRouter } from "./aiIntentRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DEBUG SWITCH
const DEBUG = true;
const log = (...msg) => DEBUG && console.log("[DEBUG]", ...msg);

// FOLLOW-UP MEMORY
let memory = "";

// EMBEDDING CACHE
const EMB_CACHE = new Map();

// EMBEDDINGS
const EMB_PATH = path.join(__dirname, "..", "rag", "embeddings.json");
let EMBEDDINGS = [];

/* ---------------------------------------------------------
   LOAD EMBEDDINGS
--------------------------------------------------------- */
function loadEmbeddingsOnce() {
  if (EMBEDDINGS.length > 0) return;

  if (!fs.existsSync(EMB_PATH)) {
    EMBEDDINGS = [];
    log("Embeddings file missing!");
    return;
  }

  try {
    EMBEDDINGS = JSON.parse(fs.readFileSync(EMB_PATH, "utf8"));
    log(`Loaded ${EMBEDDINGS.length} embeddings`);
  } catch (err) {
    console.error("Error loading embeddings:", err);
    EMBEDDINGS = [];
  }
}

/* ---------------------------------------------------------
   SMART FALLBACK
--------------------------------------------------------- */
async function smartFallback() {
  return (
    "I don’t have that information in my data. " +
    "Please visit https://montforticse.in/ or contact the school office for official details."
  );
}

/* ---------------------------------------------------------
   LLM SAME-MEANING VALIDATION
--------------------------------------------------------- */
async function llmMeaningMatch(userQ, candidateQ) {
  const prompt = `
Do these questions have EXACTLY the same meaning?

Rules:
- Grammar changes DO NOT matter
- Word order DOES NOT matter
- Spelling mistakes DO NOT matter
- Synonyms count as same meaning:
  ("school" = "campus")
  ("class start time" = "school timing")
  ("hostel food" = "mess food")
  ("canteen" = "snack shop")

Reply EXACTLY:
- "yes" if same meaning
- "no" if different

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

    let { question, panoNames = [], projectNames = [] } = req.body || {};

    if (!question || typeof question !== "string") {
      return res.json({ answer: "question is required" });
    }

    question = question.trim();
    log("USER:", question);

    /* ============================================================
       0) AI ROUTER → PANORAMA / PROJECT / SCHOOL
    ============================================================ */
    const aiIntent = aiIntentRouter(question, panoNames, projectNames);
    log("AI ROUTER RESULT:", aiIntent);

    // If pano or project → stop FAQ engine
    if (aiIntent.intent === "pano") {
      return res.json({
        intent: "pano",
        target: aiIntent.target,
      });
    }

    if (aiIntent.intent === "project") {
      return res.json({
        intent: "project",
        target: aiIntent.target,
      });
    }

    log("AI Intent: SCHOOL → continue to FAQ dataset");

    /* ============================================================
       1) FOLLOW-UP MEMORY (e.g., "what time?")
    ============================================================ */
    let finalUser = question;

    if (memory && finalUser.length <= 4) {
      finalUser = memory + " " + finalUser;
      log("MEMORY MERGED:", finalUser);
    }

    memory = question;

    /* ============================================================
       2) SPELL FIX
    ============================================================ */
    const corrected = await correctSpelling(finalUser);
    log("SPELL:", corrected);

    /* ============================================================
       3) NORMALIZE
    ============================================================ */
    const normalized = await normalizeToMeaning(corrected);
    log("NORM:", normalized);

    /* ============================================================
       4) EMBED (cached)
    ============================================================ */
    let vector = EMB_CACHE.get(normalized);

    if (!vector) {
      log("GENERATING EMBEDDING…");
      vector = await embedText(normalized);
      EMB_CACHE.set(normalized, vector);
    }

    if (!vector.length) {
      return res.json({
        answer: await smartFallback(),
        via: "no-vector",
      });
    }

    if (!EMBEDDINGS.length) {
      return res.json({
        answer: await smartFallback(),
        via: "no-embeddings",
      });
    }

    /* ============================================================
       5) SEMANTIC SEARCH
    ============================================================ */
    const matches = findTopMatches(vector, EMBEDDINGS, normalized, 5);
    const best = matches[0];
    const second = matches[1];

    log("BEST:", best);
    log("SECOND:", second);

    if (!best) {
      return res.json({
        answer: await smartFallback(),
        via: "no-match",
      });
    }

    /* ============================================================
       6) MULTI-MATCH MODE (for 1–2 word queries)
    ============================================================ */
    const tokenCount = normalized.split(/\s+/).length;

    if (tokenCount <= 2) {
      const list = matches
        .filter((m) => m._score >= 0.08)
        .map((m) => `• ${m.answer}`)
        .join("\n\n");

      if (list.trim()) {
        return res.json({
          answer: list,
          via: "multi-match",
        });
      }
    }

    /* ============================================================
       7) SCORE VALIDATION
    ============================================================ */
    const MIN = 0.11;
    const GAP = 0.06;

    const low = best._score < MIN;
    const ambi = second && Math.abs(best._score - second._score) < GAP;

    log("Score:", best._score, "LOW?", low, "AMBIG?", ambi);

    /* ============================================================
       8) LLM CONFIRMATION (if needed)
    ============================================================ */
    if (low || ambi) {
      log("LLM VALIDATING…");
      const ok = await llmMeaningMatch(normalized, best.question);

      if (ok) {
        return res.json({
          answer: best.answer,
          via: "llm-validated",
        });
      }

      return res.json({
        answer: await smartFallback(),
        via: low ? "low-score" : "ambiguous",
      });
    }

    /* ============================================================
       9) DIRECT SEMANTIC MATCH
    ============================================================ */
    return res.json({
      answer: best.answer,
      via: "semantic",
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.json({
      answer: await smartFallback(),
      via: "error",
    });
  }
}
