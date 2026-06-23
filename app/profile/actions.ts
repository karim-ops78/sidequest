"use server";

import { detectGenres, type DetectGenresResult } from "@/lib/ai";

// AI reads the player's library (game names + playtime) and returns the genres
// from our fixed list that best match their taste. The client passes the
// allowed vocabulary (GENRE_OPTIONS) so the result snaps straight into the chips.
export async function detectGenresFromLibrary(req: {
  games: { name: string; playtimeMin: number }[];
  allowedGenres: string[];
}): Promise<DetectGenresResult> {
  return detectGenres({ games: req.games, allowedGenres: req.allowedGenres });
}
