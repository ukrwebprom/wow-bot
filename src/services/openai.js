// src/services/openai.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini"; // текст+картинки ок :contentReference[oaicite:1]{index=1}

export async function analyzePost({ text, imageUrl, profile }) {
  const instructions =
    `You are WOW Advisor. Analyze a draft social post and return STRICT JSON only.\n` +
    `No markdown, no extra text.\n\n` +
    `Output schema:\n` +
    `{\n` +
    `  "strengths": string[],\n` +
    `  "issues": string[],\n` +
    `  "recommendations": string[],\n` +
    `  "meta": {\n` +
    `    "length": number,\n` +
    `    "has_image": boolean,\n` +
    `    "platform": string|null,\n` +
    `    "goal": string|null,\n` +
    `    "voice": string|null,\n` +
    `    "niche": string|null\n` +
    `  }\n` +
    `}`;

  // Профайл пока не сохраняем — но если он есть в памяти, он сильно помогает анализу.
  const profileHint = profile
    ? `Profile context:\n${JSON.stringify(profile)}\n`
    : `Profile context: null\n`;

  const userContent = [
    { type: "input_text", text: profileHint + "\nPOST TEXT:\n" + (text || "") },
  ];

  if (imageUrl) {
    userContent.push({ type: "input_image", image_url: imageUrl });
  }

  const resp = await client.responses.create({
    model: MODEL,
    instructions,
    input: [{ role: "user", content: userContent }],
    // Можно ограничить выдачу:
    max_output_tokens: 700,
  });

  // Responses API даёт удобный output_text :contentReference[oaicite:2]{index=2}
  const raw = resp.output_text?.trim() || "";

  // Если модель вдруг обернула в ```json ... ```
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}
