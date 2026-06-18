import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MODEL = "claude-opus-4-8";

export function hasAiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function client() {
  return new Anthropic(); // reads ANTHROPIC_API_KEY from env
}

export type AiError = { ok: false; error: string };

// ----- Session recap -----
const RecapSchema = z.object({
  whatIDid: z.string().describe("1-2 sentences summarizing what the player did this session."),
  whereIStopped: z.string().describe("Where the player left off / their current location or state."),
  nextObjective: z.string().describe("The single most likely next objective. If unclear from the notes, say so plainly."),
});
export type RecapResult =
  | ({ ok: true } & z.infer<typeof RecapSchema>)
  | AiError;

const RECAP_SYSTEM = `You are SideQuest AI, a gaming progress assistant.
Turn a player's rough session notes into a clean, structured recap.
Rules:
- Base everything ONLY on the notes and prior memory provided. Never invent quests, items, or events.
- If the notes don't say where they stopped or what's next, say that honestly rather than guessing.
- Keep it concise and concrete. No spoilers about content the player hasn't reached.`;

export async function generateSessionRecap(input: {
  gameName: string;
  notes: string;
  priorMemory?: string;
}): Promise<RecapResult> {
  if (!hasAiKey()) {
    return { ok: false, error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local to enable recaps." };
  }
  if (!input.notes.trim()) {
    return { ok: false, error: "Write a few notes about your session first." };
  }
  try {
    const res = await client().messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: RECAP_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(RecapSchema) },
      messages: [
        {
          role: "user",
          content:
            `Game: ${input.gameName}\n` +
            (input.priorMemory ? `Prior memory of this save:\n${input.priorMemory}\n\n` : "") +
            `My session notes:\n${input.notes}`,
        },
      ],
    });
    if (!res.parsed_output) {
      return { ok: false, error: "The model returned an unexpected format. Try again." };
    }
    return { ok: true, ...res.parsed_output };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

// ----- Screenshot analysis (vision) -----
const ScreenshotSchema = z.object({
  detectedType: z
    .enum(["menu", "quest", "map", "inventory", "scoreboard", "cutscene", "dialogue", "other"])
    .describe("What kind of game screen this is."),
  extracted: z
    .array(z.string())
    .describe("Key facts readable in the screenshot (quest names, objectives, item counts, location, level, etc.)."),
  note: z
    .string()
    .describe("A one-line progress note a player could save to remember this moment."),
});
export type ScreenshotResult =
  | ({ ok: true } & z.infer<typeof ScreenshotSchema>)
  | AiError;

const SCREENSHOT_SYSTEM = `You are SideQuest AI's vision analyzer for game screenshots.
Identify the kind of screen, then extract only what is actually visible and legible.
Rules:
- Only report text and details you can actually read in the image. Do not guess hidden values.
- If something is unreadable, omit it rather than inventing it.
- The 'note' should help the player remember where they are, with no spoilers.`;

export async function analyzeScreenshot(input: {
  gameName: string;
  imageBase64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}): Promise<ScreenshotResult> {
  if (!hasAiKey()) {
    return { ok: false, error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local to enable screenshot analysis." };
  }
  try {
    const res = await client().messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: SCREENSHOT_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(ScreenshotSchema) },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
            },
            {
              type: "text",
              text: `This is a screenshot from ${input.gameName}. Identify the screen and extract useful progress info.`,
            },
          ],
        },
      ],
    });
    if (!res.parsed_output) {
      return { ok: false, error: "Couldn't read that screenshot. Try a clearer image." };
    }
    return { ok: true, ...res.parsed_output };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Invalid ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.RateLimitError) return "Rate limited — wait a moment and try again.";
  if (e instanceof Anthropic.APIError) return `AI request failed (${e.status}). Try again.`;
  return "Something went wrong generating the recap.";
}
