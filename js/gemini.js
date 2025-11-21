window.GeminiService = (function () {
  const { GEMINI_API_KEY, MODEL, TEMPERATURE } = window.ChatbotConfig;

  const BASE_URL =
    "https://generativelanguage.googleapis.com/v1beta/models";

  // --------------------------
  // Core Gemini Caller
  // --------------------------
  async function callGemini(textPrompt, systemInstruction) {
    if (!GEMINI_API_KEY) {
      console.warn("[Gemini] API key missing. Returning original text.");
      return textPrompt;
    }

    const url = `${BASE_URL}/${MODEL}:generateContent?key=${encodeURIComponent(
      GEMINI_API_KEY
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
        temperature: TEMPERATURE ?? 0.2,
        maxOutputTokens: 200,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[Gemini] HTTP error:", res.status, await res.text());
      throw new Error("Gemini API call failed");
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || textPrompt;

    return text.trim();
  }

  // --------------------------
  // Normalize user question
  // --------------------------
  async function normalizeUserQuery(raw) {
    const systemInstruction =
      "Fix grammar/spelling ONLY for the user's question. Do NOT answer. " +
      "Do NOT change the core meaning. Return only the corrected question text.";

    try {
      return await callGemini(raw, systemInstruction);
    } catch (err) {
      console.error("[Gemini] normalizeUserQuery failed:", err);
      return raw;
    }
  }

  // --------------------------
  // Rephrase answers safely
  // --------------------------
  async function rephraseAnswer(answer) {
    const systemInstruction =
      "Rewrite this SCHOOL answer in simple, friendly English. " +
      "Do NOT add, remove, or change any facts. Keep the meaning and details exactly the same. " +
      "Keep it within 2–4 sentences.";

    try {
      return await callGemini(answer, systemInstruction);
    } catch (err) {
      console.error("[Gemini] rephraseAnswer failed:", err);
      return answer;
    }
  }

  // --------------------------
  // PURE SEMANTIC KEYWORD MATCHING
  // --------------------------
  async function pickBestCandidateKeyword(userQuestion, candidateKeywords) {
    if (!candidateKeywords?.length) return null;

    const numberedList = candidateKeywords
      .map((kw, i) => `${i + 1}. ${kw}`)
      .join("\n");

    const systemInstruction =
      "You are helping a school FAQ chatbot choose the most relevant entry by MEANING.\n" +
      "Pick the BEST matching keyword number ONLY based on the meaning of the USER question.\n" +
      "Do NOT guess. If nothing matches well, return 'none'.\n" +
      "Return ONLY the number (e.g., '3').";

    const prompt =
      `User question:\n${userQuestion}\n\n` +
      `Keyword list:\n${numberedList}\n\n` +
      "Which keyword number best matches the user's meaning?";

    try {
      const raw = await callGemini(prompt, systemInstruction);
      const cleaned = raw.toLowerCase().trim();

      if (cleaned.includes("none")) return null;

      const match = cleaned.match(/\b([0-9]+)\b/);
      if (!match) return null;

      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= candidateKeywords.length) return null;

      return index;
    } catch (err) {
      console.error("[Gemini] pickBestCandidateKeyword failed:", err);
      return null;
    }
  }

  // --------------------------
  // AI fallback for general questions
  // --------------------------
  async function answerGeneralQuestion(userQuestion) {
    const systemInstruction =
      "You are the Montfort ICSE school assistant.\n\n" +
      "- If the question is about Montfort ICSE / the school / fees / timings / admissions / contact / rules / address or any SCHOOL-SPECIFIC detail, " +
      "you MUST NOT invent or guess. In that case, reply politely:\n" +
      "\"I don’t have that information in my data. Please refer to https://montforticse.in/ or contact the school office for official details.\"\n\n" +
      "- If the question is general (not about the school), you may answer normally in helpful, simple English.\n" +
      "- Do NOT mention that you are an AI model. Do NOT talk about 'data' or 'JSON'.\n" +
      "- Return ONLY the final answer text.";

    try {
      return await callGemini(userQuestion, systemInstruction);
    } catch (err) {
      console.error("[Gemini] answerGeneralQuestion failed:", err);
      return "I’m not able to answer that now. Please visit https://montforticse.in/ for official details.";
    }
  }

  return {
    normalizeUserQuery,
    rephraseAnswer,
    pickBestCandidateKeyword,
    answerGeneralQuestion,
  };
})();
