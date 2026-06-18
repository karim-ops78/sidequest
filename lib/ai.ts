import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const CLAUDE_MODEL = "claude-opus-4-8";
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

export type AiMode = "gemini" | "anthropic" | "mock";

// Provider is chosen by which key is present. Gemini first (free tier),
// then Claude, then a local mock so the flow works with no key at all.
export function aiMode(): AiMode {
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return "mock";
}

export type AiError = { ok: false; error: string };

// ---------- Schemas ----------
const RecapSchema = z.object({
  whatIDid: z.string().describe("1-2 sentences summarizing what the player did this session."),
  whereIStopped: z.string().describe("Where the player left off / their current location or state."),
  nextObjective: z.string().describe("The single most likely next objective. If unclear, say so plainly."),
});
export type RecapResult = ({ ok: true; demo?: boolean } & z.infer<typeof RecapSchema>) | AiError;

const ScreenshotSchema = z.object({
  detectedType: z.enum(["menu", "quest", "map", "inventory", "scoreboard", "cutscene", "dialogue", "other"]),
  extracted: z.array(z.string()),
  note: z.string(),
});
export type ScreenshotResult = ({ ok: true; demo?: boolean } & z.infer<typeof ScreenshotSchema>) | AiError;

const RECAP_SYSTEM = `You are SideQuest AI, a gaming progress assistant.
Turn a player's rough session notes into a clean, structured recap.
Rules:
- Base everything ONLY on the notes and prior memory provided. Never invent quests, items, or events.
- If the notes don't say where they stopped or what's next, say that honestly rather than guessing.
- Keep it concise and concrete. No spoilers about content the player hasn't reached.`;

const SCREENSHOT_SYSTEM = `You are SideQuest AI's vision analyzer for game screenshots.
Identify the kind of screen, then extract only what is actually visible and legible.
Rules:
- Only report text and details you can actually read in the image. Do not guess hidden values.
- If something is unreadable, omit it rather than inventing it.
- The 'note' should help the player remember where they are, with no spoilers.`;

// ---------- Public API ----------
export async function generateSessionRecap(input: {
  gameName: string;
  notes: string;
  priorMemory?: string;
}): Promise<RecapResult> {
  if (!input.notes.trim()) {
    return { ok: false, error: "Write a few notes about your session first." };
  }
  const userText =
    `Game: ${input.gameName}\n` +
    (input.priorMemory ? `Prior memory of this save:\n${input.priorMemory}\n\n` : "") +
    `My session notes:\n${input.notes}`;

  const mode = aiMode();
  try {
    if (mode === "mock") return { ok: true, demo: true, ...mockRecap(input.gameName, input.notes) };
    if (mode === "gemini") {
      const raw = await geminiJson({
        system: RECAP_SYSTEM,
        parts: [{ text: userText }],
        shape: `{"whatIDid": string, "whereIStopped": string, "nextObjective": string}`,
      });
      const parsed = RecapSchema.safeParse(raw);
      return parsed.success ? { ok: true, ...parsed.data } : formatError();
    }
    // anthropic
    const res = await anthropic().messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: RECAP_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(RecapSchema) },
      messages: [{ role: "user", content: userText }],
    });
    return res.parsed_output ? { ok: true, ...res.parsed_output } : formatError();
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

export async function analyzeScreenshot(input: {
  gameName: string;
  imageBase64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}): Promise<ScreenshotResult> {
  const mode = aiMode();
  const promptText = `This is a screenshot from ${input.gameName}. Identify the screen and extract useful progress info.`;
  try {
    if (mode === "mock") return { ok: true, demo: true, ...mockScreenshot(input.gameName) };
    if (mode === "gemini") {
      const raw = await geminiJson({
        system: SCREENSHOT_SYSTEM,
        parts: [
          { inlineData: { mimeType: input.mediaType, data: input.imageBase64 } },
          { text: promptText },
        ],
        shape: `{"detectedType": "menu|quest|map|inventory|scoreboard|cutscene|dialogue|other", "extracted": string[], "note": string}`,
      });
      const parsed = ScreenshotSchema.safeParse(raw);
      return parsed.success ? { ok: true, ...parsed.data } : formatError();
    }
    // anthropic
    const res = await anthropic().messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SCREENSHOT_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(ScreenshotSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 } },
            { type: "text", text: promptText },
          ],
        },
      ],
    });
    return res.parsed_output ? { ok: true, ...res.parsed_output } : formatError();
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

// ---------- Providers ----------
function anthropic() {
  return new Anthropic();
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function geminiJson(args: {
  system: string;
  parts: GeminiPart[];
  shape: string;
}): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: `${args.system}\n\nReturn ONLY valid JSON of the form: ${args.shape}`,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const result = await model.generateContent(args.parts);
  return JSON.parse(result.response.text());
}

// ---------- Mock (no key) ----------
function mockRecap(gameName: string, notes: string) {
  const clean = notes.trim().replace(/\s+/g, " ");
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const stop = sentences.find((s) =>
    /stop|left off|end|sav(e|ed)|paused|checkpoint|grace|bonfire|rest/i.test(s)
  );
  return {
    whatIDid: sentences.slice(0, 2).join(" ") || clean || "Played a session.",
    whereIStopped: stop ?? "Not clearly stated in your notes.",
    nextObjective: `Continue from where you left off in ${gameName}.`,
  };
}

function mockScreenshot(gameName: string) {
  return {
    detectedType: "other" as const,
    extracted: ["Demo mode — reading a screenshot needs real vision AI."],
    note: `Add a free Gemini key (aistudio.google.com) to analyze ${gameName} screenshots for real.`,
  };
}

// ---------- Errors ----------
function formatError(): AiError {
  return { ok: false, error: "The model returned an unexpected format. Try again." };
}

function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Invalid ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.RateLimitError) return "Rate limited — wait a moment and try again.";
  if (e instanceof Anthropic.APIError) {
    const msg = String(e.message ?? "").toLowerCase();
    if (msg.includes("credit") || msg.includes("billing")) {
      return "Your Anthropic account is out of credit. Add credit at console.anthropic.com → Billing, then try again.";
    }
    return `AI request failed (${e.status}). Try again.`;
  }
  const m = String((e as Error)?.message ?? "").toLowerCase();
  if (m.includes("api key") || m.includes("api_key")) return "Invalid GEMINI_API_KEY.";
  if (m.includes("quota") || m.includes("rate")) return "Gemini quota/rate limit hit — wait a moment and try again.";
  return "Something went wrong generating the recap.";
}
