// rag/generate-embeddings.js — FINAL HIGH-QUALITY VERSION

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { ENV } from "../config/env.js";
import { embedText } from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_INPUT_PATH = path.join(__dirname, "school-data.json");
const UNDERSTOOD_OUTPUT_PATH = path.join(__dirname, "school-data-understood.json");
const EMBEDDINGS_OUTPUT_PATH = path.join(__dirname, "embeddings.json");

/* ---------------------------------------------------------
   Build strong semantic text for each Q&A
--------------------------------------------------------- */
function buildSemanticEntry(entry, index) {
  const question = (entry.question || "").trim();
  const answer = (entry.answer || "").trim();

  const semanticBlock = [
    `This is official Montfort ICSE School FAQ content.`,
    `User question: "${question}".`,
    `Verified school answer: "${answer}".`,
    `This FAQ is about school academics, admissions, hostel, dining, sports, safety, communication or facilities.`,
    `This description improves embedding clarity and topic separation such as avoiding mixing food, water, or hostel content.`,
    `Answer meaning must remain unchanged.`,
  ];

  const tokens = `${question} ${answer}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);

  const keywords = [...new Set(tokens)].join(", ");

  const embeddingText =
    `QUESTION: ${question}\n` +
    `ANSWER: ${answer}\n\n` +
    `MEANING BLOCK: ${semanticBlock.join(" ")}\n\n` +
    `KEYWORDS: ${keywords}, montfort, icse, school, hostel, admission, academics, facilities`;

  return {
    id: `item_${index}`,
    question,
    answer,
    embedding_text: embeddingText,
    keyword: keywords,
  };
}

/* ---------------------------------------------------------
   MAIN PROCESS
--------------------------------------------------------- */
async function main() {
  if (!ENV.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing");
    process.exit(1);
  }

  console.log("📥 Loading school-data.json");
  const raw = fs.readFileSync(RAW_INPUT_PATH, "utf8");
  const items = JSON.parse(raw);

  const understood = [];
  const embeddings = [];

  for (let i = 0; i < items.length; i++) {
    const block = buildSemanticEntry(items[i], i);
    understood.push(block);

    console.log(`🧠 Processing embedding ${i + 1}/${items.length}`);

    let vector = [];
    try {
      vector = await embedText(block.embedding_text);
    } catch (err) {
      console.error("❌ Embedding failed", err);
    }

    embeddings.push({
      id: block.id,
      question: block.question,
      answer: block.answer,
      keyword: block.keyword,
      vector,
    });
  }

  fs.writeFileSync(UNDERSTOOD_OUTPUT_PATH, JSON.stringify(understood, null, 2));
  fs.writeFileSync(EMBEDDINGS_OUTPUT_PATH, JSON.stringify(embeddings, null, 2));

  console.log("🎉 Embeddings generated successfully!");
}

main();
