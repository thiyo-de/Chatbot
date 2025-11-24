import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "../config/env.js";
import { embedText } from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, "school-data.json");
const OUTPUT_PATH = path.join(__dirname, "embeddings.json");

async function main() {
  if (!ENV.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing in .env");
    process.exit(1);
  }

  console.log("📥 Reading:", INPUT_PATH);
  const raw = fs.readFileSync(INPUT_PATH, "utf8");
  const items = JSON.parse(raw);

  if (!Array.isArray(items)) {
    throw new Error("school-data.json must be an array");
  }

  const out = [];

  for (let i = 0; i < items.length; i++) {
    const entry = items[i];
    const question = entry.question || "";
    const answer = entry.answer || "";
    const keyword = entry.keyword || question;

    console.log(`Embedding ${i + 1}/${items.length}...`);
    const combined = `${question}\n${answer}`;
    const vector = await embedText(combined);

    out.push({
      id: `item_${i}`,
      question,
      answer,
      keyword,
      vector,
    });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("✅ Wrote embeddings to", OUTPUT_PATH);
}

main().catch((err) => {
  console.error("❌ Embedding generation failed:", err);
  process.exit(1);
});
