import { ENV } from "../config/env.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_MODEL = "text-embedding-004";

/* ---------------------------------------------------------
   Core Gemini Caller (generateContent)
--------------------------------------------------------- */
async function callGemini(textPrompt, systemInstruction) {
  if (!ENV.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const url = `${BASE_URL}/${ENV.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    ENV.GEMINI_API_KEY
  )}`;

  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${textPrompt}`
    : textPrompt;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 256,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[Gemini] HTTP error", res.status, txt);
    throw new Error("Gemini generateContent failed");
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

/* ---------------------------------------------------------
   Normalize Question
--------------------------------------------------------- */
export async function normalizeQuestion(raw) {
  const systemInstruction =
    "Fix grammar/spelling ONLY for the user's question. Do NOT answer. " +
    "Do NOT change the core meaning. Return only the corrected question.";

  try {
    const out = await callGemini(raw, systemInstruction);
    return out || raw;
  } catch (e) {
    console.error("[Gemini] normalizeQuestion failed:", e);
    return raw;
  }
}

/* ---------------------------------------------------------
   Rephrase Answer (Friendly)
--------------------------------------------------------- */
export async function rephraseAnswer(answer) {
  const systemInstruction =
    "Rewrite this SCHOOL FAQ answer in simple, friendly English. " +
    "Do NOT add, remove, or change any facts. Keep the meaning exactly the same. " +
    "Return within 2–4 short sentences.";

  try {
    const out = await callGemini(answer, systemInstruction);
    return out || answer;
  } catch (e) {
    console.error("[Gemini] rephraseAnswer failed:", e);
    return answer;
  }
}

/* ---------------------------------------------------------
   LLM fallback
--------------------------------------------------------- */
export async function answerGeneralQuestion(question) {
  const systemInstruction =
    "You are the Montfort ICSE school assistant.\n\n" +
    "- If the question is about Montfort ICSE / fees / timings / admissions / contact / address / rules or any SCHOOL-SPECIFIC detail, " +
    "you MUST NOT guess. In that case, return ONLY:\n" +
    "\"I don’t have that information in my data. Please visit https://montforticse.in/ or contact the school office for official details.\"\n\n" +
    "- If the question is general (not school-related), answer normally in simple English.\n" +
    "- Return ONLY the final answer text.";

  try {
    const out = await callGemini(question, systemInstruction);
    return (
      out ||
      "I’m not able to answer that now. Please visit https://montforticse.in/ for official details."
    );
  } catch (e) {
    console.error("[Gemini] answerGeneralQuestion failed:", e);
    return "I’m not able to answer that now. Please visit https://montforticse.in/ for official details.";
  }
}

/* ---------------------------------------------------------
   Create Embeddings (single vector per QA)
--------------------------------------------------------- */
export async function embedText(text) {
  if (!ENV.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const url = `${BASE_URL}/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(
    ENV.GEMINI_API_KEY
  )}`;

  const body = {
    content: {
      parts: [{ text }],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[Gemini] embedText HTTP error", res.status, txt);
    throw new Error("Gemini embedContent failed");
  }

  const data = await res.json();
  return data?.embedding?.values || [];
}
