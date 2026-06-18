"use server";

import { getGame } from "@/lib/seed";
import {
  generateSessionRecap,
  analyzeScreenshot,
  type RecapResult,
  type ScreenshotResult,
} from "@/lib/ai";

export async function recapAction(
  _prev: RecapResult | null,
  formData: FormData
): Promise<RecapResult> {
  const gameId = String(formData.get("gameId") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const game = getGame(gameId);
  if (!game) return { ok: false, error: "Unknown game." };

  return generateSessionRecap({
    gameName: game.name,
    notes,
    priorMemory: game.memory.longTermSummary,
  });
}

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type AllowedType = (typeof ALLOWED)[number];

export async function screenshotAction(
  _prev: ScreenshotResult | null,
  formData: FormData
): Promise<ScreenshotResult> {
  const gameId = String(formData.get("gameId") ?? "");
  const game = getGame(gameId);
  if (!game) return { ok: false, error: "Unknown game." };

  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a screenshot to analyze." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Image is too large (max 8 MB)." };
  }
  if (!ALLOWED.includes(file.type as AllowedType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPEG, WebP or GIF." };
  }

  // Read into memory, send to the vision API, never persist the image.
  const bytes = Buffer.from(await file.arrayBuffer());
  const imageBase64 = bytes.toString("base64");

  return analyzeScreenshot({
    gameName: game.name,
    imageBase64,
    mediaType: file.type as AllowedType,
  });
}
