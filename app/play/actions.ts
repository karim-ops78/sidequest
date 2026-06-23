"use server";

import {
  recommendGame,
  type PickerTime,
  type PickerMood,
  type RecommendResult,
} from "@/lib/ai";

export type PickerRequest = {
  library: { appid: number; name: string; playtimeMin: number; recentMin?: number }[];
  favoriteGenres: string[];
  time: PickerTime;
  mood?: PickerMood;
  customMood?: string;
  excludeAppids?: number[];
  recentAppids?: number[];
};

export async function getRecommendation(
  req: PickerRequest
): Promise<RecommendResult> {
  return recommendGame({
    library: req.library,
    favoriteGenres: req.favoriteGenres,
    time: req.time,
    mood: req.mood,
    customMood: req.customMood,
    excludeAppids: req.excludeAppids,
    recentAppids: req.recentAppids,
  });
}
