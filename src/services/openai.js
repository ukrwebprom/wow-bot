// src/services/openai.js
import OpenAI from "openai";
import { buildAnalyzePostPrompt } from "../prompts/analyzePost.prompt.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function cleanJsonish(raw = "") {
  return String(raw)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractFirstJsonObject(text) {
  // Если вдруг модель добавила лишний текст — вытащим первый { ... }
  const s = String(text);
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

export async function analyzePost({ text, imageUrl, profile }) {

  // Get ready prompt here -------------------------------------------------
  const { instructions, userText } = buildAnalyzePostPrompt({
  text,
  profile,
  hasImage: Boolean(imageUrl),
  mode: "strict", // <- тут переключаешь: "strict" | "soft" | "threads"
  });

  const userContent = [{ type: "input_text", text: userText }];
  if (imageUrl) userContent.push({ type: "input_image", image_url: imageUrl });

  const resp = await client.responses.create({
    model: MODEL,
    instructions,
    input: [{ role: "user", content: userContent }],
    max_output_tokens: 700,
  });

  const raw = resp.output_text?.trim() || "";
  const cleaned = cleanJsonish(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) throw new Error("Model output is not valid JSON.");
    return JSON.parse(extracted);
  }
}
