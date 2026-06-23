"use server";

import { roastBacklog, type BacklogStats, type RoastResult } from "@/lib/ai";

export async function getRoast(stats: BacklogStats): Promise<RoastResult> {
  return roastBacklog(stats);
}
