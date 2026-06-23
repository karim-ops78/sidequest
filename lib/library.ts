// Client-side persistence for the player's library + profile (V1, local-first).
// Swapped for Supabase later — keep all storage access behind these helpers so
// that migration touches one file.

export type StoredGame = {
  appid: number;
  name: string;
  playtimeMin: number;
  coverUrl: string;
  /** True for games the player added manually (not from the Steam import). */
  added?: boolean;
  /** Minutes played in the last 2 weeks, captured at import. 0/undefined = none. */
  recentMin?: number;
};

export type StoredProfile = {
  /** Genres the player says they enjoy, used as a recommendation signal. */
  favoriteGenres: string[];
  /** The connected SteamID64, kept so we can refresh data later. */
  steamId?: string;
};

import type { BacklogStats } from "@/lib/ai";

const LIBRARY_KEY = "sidequest:library";
const PROFILE_KEY = "sidequest:profile";
const BLACKLIST_KEY = "sidequest:blacklist";

export const GENRE_OPTIONS = [
  "Action",
  "RPG",
  "Story-rich",
  "Open world",
  "Shooter",
  "Strategy",
  "Roguelike",
  "Metroidvania",
  "Cozy / relaxing",
  "Multiplayer",
  "Indie",
  "Soulslike",
] as const;

function cover(appid: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

// Used when the player hasn't imported a real library yet, so the picker still
// demos end-to-end. Mirrors the mock Steam import.
export const SAMPLE_LIBRARY: StoredGame[] = [
  { appid: 1086940, name: "Baldur's Gate 3", playtimeMin: 6180, coverUrl: cover(1086940) },
  { appid: 1245620, name: "Elden Ring", playtimeMin: 4720, coverUrl: cover(1245620) },
  { appid: 367520, name: "Hollow Knight", playtimeMin: 1490, coverUrl: cover(367520) },
  { appid: 1091500, name: "Cyberpunk 2077", playtimeMin: 320, coverUrl: cover(1091500) },
  { appid: 1174180, name: "Red Dead Redemption 2", playtimeMin: 2880, coverUrl: cover(1174180) },
  { appid: 105600, name: "Terraria", playtimeMin: 940, coverUrl: cover(105600) },
  { appid: 292030, name: "The Witcher 3: Wild Hunt", playtimeMin: 5210, coverUrl: cover(292030) },
  { appid: 1145360, name: "Hades", playtimeMin: 1130, coverUrl: cover(1145360) },
  { appid: 271590, name: "Grand Theft Auto V", playtimeMin: 760, coverUrl: cover(271590) },
  { appid: 413150, name: "Stardew Valley", playtimeMin: 2010, coverUrl: cover(413150) },
];

export function saveLibrary(games: StoredGame[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(games));
}

export function loadLibrary(): StoredGame[] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LIBRARY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as StoredGame[]) : null;
  } catch {
    return null;
  }
}

// Append a manually-added game if it isn't already in the library, and persist.
// Returns the updated library.
export function addGameToLibrary(game: {
  appid: number;
  name: string;
  coverUrl: string;
}): StoredGame[] {
  const current = loadLibrary() ?? [];
  if (current.some((g) => g.appid === game.appid)) return current;
  const next = [
    ...current,
    { appid: game.appid, name: game.name, coverUrl: game.coverUrl, playtimeMin: 0, added: true },
  ];
  saveLibrary(next);
  return next;
}

// ----- Blacklist: games the player never wants recommended again -----
// Kept separate from the library so hiding a game from the picker doesn't remove
// it from their actual Steam library view.

export function loadBlacklist(): number[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(BLACKLIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as number[]) : [];
  } catch {
    return [];
  }
}

export function addToBlacklist(appid: number): number[] {
  const next = [...new Set([...loadBlacklist(), appid])];
  if (typeof window !== "undefined") {
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify(next));
  }
  return next;
}

export function removeFromBlacklist(appid: number): number[] {
  const next = loadBlacklist().filter((id) => id !== appid);
  if (typeof window !== "undefined") {
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify(next));
  }
  return next;
}

// Derived backlog metrics — feeds the Roast (and, later, Gaming DNA).
export function computeBacklogStats(library: StoredGame[]): BacklogStats {
  const total = library.length;
  const played = library.filter((g) => g.playtimeMin > 0).length;
  const neverPlayed = library.filter((g) => g.playtimeMin === 0).length;
  const barelyPlayed = library.filter(
    (g) => g.playtimeMin > 0 && g.playtimeMin < 120
  ).length;
  const totalHours = Math.round(
    library.reduce((s, g) => s + g.playtimeMin, 0) / 60
  );
  const top = [...library].sort((a, b) => b.playtimeMin - a.playtimeMin)[0];
  const topGame =
    top && top.playtimeMin > 0
      ? { name: top.name, hours: Math.round(top.playtimeMin / 60) }
      : undefined;
  const shelfOfShame = library
    .filter((g) => g.playtimeMin === 0)
    .slice(0, 6)
    .map((g) => g.name);
  return { total, played, neverPlayed, barelyPlayed, totalHours, topGame, shelfOfShame };
}

// Merge so updating one field (e.g. genres) never wipes another (e.g. steamId).
export function saveProfile(patch: Partial<StoredProfile>) {
  if (typeof window === "undefined") return;
  const next = { ...loadProfile(), ...patch };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
}

export function loadProfile(): StoredProfile {
  if (typeof window === "undefined") return { favoriteGenres: [] };
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return { favoriteGenres: [] };
  try {
    const parsed = JSON.parse(raw) as StoredProfile;
    return { favoriteGenres: parsed.favoriteGenres ?? [], steamId: parsed.steamId };
  } catch {
    return { favoriteGenres: [] };
  }
}
