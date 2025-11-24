import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  normalizeQuestion,
  rephraseAnswer,
  answerGeneralQuestion,
  embedText,
} from "../services/geminiService.js";
import { findBestMatch } from "../rag/semantic-search.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMB_PATH = path.join(__dirname, "..", "rag", "embeddings.json");

let EMBEDDINGS = [];

function loadEmbeddingsOnce() {
  if (EMBEDDINGS.length) return;
  if (!fs.existsSync(EMB_PATH)) {
    console.error("❌ embeddings.json not found. Run: npm run embed");
    return;
  }
  const raw = fs.readFileSync(EMB_PATH, "utf8");
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) {
    throw new Error("embeddings.json must be an array");
  }
  EMBEDDINGS = arr;
  console.log(`✅ Loaded ${EMBEDDINGS.length} embeddings into memory`);
}

export async function handleChat(req, res) {
  try {
    loadEmbeddingsOnce();

    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question is required" });
    }

    // 1) Normalize question (for better matching)
    const normalized = await normalizeQuestion(question);
    console.log("User:", question);
    console.log("Normalized:", normalized);

    // 2) Embed user question
    const userVector = await embedText(normalized);

    // 3) Hybrid semantic search (cosine + keyword)
    let best = null;
    let score = 0;

    if (userVector && userVector.length && EMBEDDINGS.length) {
      // IMPORTANT: pass normalized as third arg for keyword scoring
      const r = findBestMatch(userVector, EMBEDDINGS, normalized);
      best = r.best;
      score = r.score || 0;
    }

    const THRESHOLD = 0.40; // can tweak based on testing

    if (best && score >= THRESHOLD) {
      const friendly = await rephraseAnswer(best.answer);
      return res.json({
        answer: friendly,
        sourceId: best.id,
        score,
        fromData: true,
        via: "hybrid-semantic",
      });
    }

    // 4) Fallback to general answer logic (non-school/general questions)
    const fallback = await answerGeneralQuestion(normalized);
    return res.json({
      answer: fallback,
      fromData: false,
      via: "llm-fallback",
    });
  } catch (err) {
    console.error("[handleChat] error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
