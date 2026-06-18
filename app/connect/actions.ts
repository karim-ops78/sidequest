"use server";

import { importSteamLibrary, type SteamImportResult } from "@/lib/steam";

export async function connectSteam(
  _prev: SteamImportResult | null,
  formData: FormData
): Promise<SteamImportResult> {
  const input = String(formData.get("steam") ?? "");
  return importSteamLibrary(input);
}
