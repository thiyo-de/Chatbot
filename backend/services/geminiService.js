// services/geminiService.js — FINAL SAFE VERSION (NO GUESSING, NO HALLUCINATION)

import { ENV } from "../config/env.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_MODEL = "text-embedding-004";
const CHAT_MODEL = ENV.GEMINI_MODEL || "gemini-1.5-flash";

/* ---------------------------------------------------------
   INTERNAL GEMINI CALLER
--------------------------------------------------------- */
async function callGemini(prompt, instruction = "") {
  if (!ENV.GEMINI_API_KEY) {
    console.error("[Gemini] Missing API key");
    return "";
  }

  const url = `${BASE_URL}/${CHAT_MODEL}:generateContent?key=${encodeURIComponent(
    ENV.GEMINI_API_KEY
  )}`;

  const finalPrompt = instruction
    ? `${instruction}\n\nUSER: ${prompt}`
    : prompt;

  const body = {
    contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
    generationConfig: {
      temperature: 0.15, // lower = no guessing, no hallucination
      maxOutputTokens: 200,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[Gemini] HTTP error", res.status, await res.text());
      return "";
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch (err) {
    console.error("[Gemini] callGemini error:", err);
    return "";
  }
}

/* ---------------------------------------------------------
   SPELLING CORRECTION — SAFE FOR LOW-LITERACY USERS
   ❗ No guessing unfamiliar words
--------------------------------------------------------- */
export async function correctSpelling(text) {
  if (!text) return "";

  const cleaned = text.trim();
  if (!cleaned) return cleaned;

  const wc = cleaned.split(/\s+/).length;

  // ❗ 1-word queries should NEVER be corrected
  //    ("wifi", "hostel", "fees", "canteen", "timing")
  if (wc === 1) return cleaned.toLowerCase();

  // ❗ If any word is long and weird → DO NOT correct
  const tooCorrupted = cleaned
    .split(/\s+/)
    .some((w) => w.length > 10 || /[^a-zA-Z]/.test(w));

  if (tooCorrupted) return cleaned.toLowerCase();

  const inst = `
Correct ONLY simple spelling mistakes.
Do NOT guess complicated, unfamiliar, or unclear words.
Do NOT replace words with similar-sounding alternatives.
Do NOT change the meaning.
Return ONLY the corrected text.
`;

  try {
    const out = await callGemini(cleaned, inst);
    return out || cleaned;
  } catch {
    return cleaned;
  }
}

/* ---------------------------------------------------------
   MEANING NORMALIZER — Category-Safe
   ❗ Never rewrite < 3 words
   ❗ Never guess unclear words
--------------------------------------------------------- */
export async function normalizeToMeaning(text) {
  if (!text) return "";

  const cleaned = text.trim();
  if (!cleaned) return cleaned;

  const wc = cleaned.split(/\s+/).length;

  // ❗ DO NOT rewrite category queries:
  //    ("wifi available", "fees", "hostel", "admission")
  if (wc <= 2) return cleaned.toLowerCase();

  // ❗ Do NOT normalize if corruption detected
  const tooCorrupted = cleaned
    .split(/\s+/)
    .some((w) => w.length > 10 || /[^a-zA-Z]/.test(w));

  if (tooCorrupted) return cleaned.toLowerCase();

  const inst = `
Rewrite the user's message into a clear, complete question.
Fix grammar ONLY if all words are valid English.
Do NOT guess unclear or misspelled words.
Do NOT add new meaning.
Do NOT answer the question.
Return only the rewritten question.
`;

  try {
    const out = await callGemini(cleaned, inst);
    return out || cleaned;
  } catch {
    return cleaned;
  }
}

/* ---------------------------------------------------------
   CATEGORY SUMMARY — Safe summarizer
--------------------------------------------------------- */
export async function summarizeAnswers(text) {
  const inst = `
Summarize these school answers into simple bullet points.
Do NOT add new facts.
Do NOT guess missing information.
Keep it accurate and parent-friendly.
Return only the summary text.
`;
  try {
    const out = await callGemini(text, inst);
    return out || text;
  } catch {
    return text;
  }
}

/* ---------------------------------------------------------
   GENERAL QUESTIONS — Safe fallback
--------------------------------------------------------- */
export async function answerGeneralQuestion(text) {
  const inst = `
If the question is related to Montfort ICSE School AND information is missing,
reply EXACTLY:
"I don’t have that information in my data. Please visit https://montforticse.in/ or contact the school office for official details."

If it is a general question (not about the school), answer normally.

Return ONLY the final answer.
`;

  try {
    const out = await callGemini(text, inst);
    return (
      out ||
      "I don’t have that information in my data. Please visit https://montforticse.in/ or contact the school office for official details."
    );
  } catch {
    return "I don’t have that information in my data. Please visit https://montforticse.in/ for official details.";
  }
}

/* ---------------------------------------------------------
   EMBEDDINGS API
--------------------------------------------------------- */
export async function embedText(text) {
  if (!ENV.GEMINI_API_KEY) {
    console.error("[Gemini] Missing GEMINI_API_KEY for embeddings");
    return [];
  }

  const url = `${BASE_URL}/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(
    ENV.GEMINI_API_KEY
  )}`;

  const body = { content: { parts: [{ text }] } };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[embedText Error]", await res.text());
      return [];
    }

    const data = await res.json();
    return data?.embedding?.values || [];
  } catch (err) {
    console.error("[embedText catch]", err);
    return [];
  }
}
