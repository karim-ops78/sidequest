// Steam Web API client (server-only).
// Real calls when STEAM_API_KEY is set; deterministic mock otherwise so the
// demo flow works on localhost without a key.

export type SteamGame = {
  appid: number;
  name: string;
  playtimeMin: number;
  coverUrl: string;
};

export type SteamProfile = {
  steamId: string;
  name: string;
  avatar: string;
  profileUrl: string;
  visibility: number; // 1 = private, 3 = public (community visibility state)
};

export type SteamImportResult =
  | { ok: true; profile: SteamProfile; games: SteamGame[]; isMock: boolean }
  | { ok: false; error: string };

const STEAMID64_RE = /^7656119\d{10}$/;

export function coverFor(appid: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

function apiKey() {
  return process.env.STEAM_API_KEY?.trim() || null;
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Steam API ${res.status}`);
  return res.json();
}

// Accepts a SteamID64, a full profile URL, or a vanity name.
function parseInput(raw: string) {
  const v = raw.trim().replace(/\/$/, "");
  const idMatch = v.match(/(7656119\d{10})/);
  if (idMatch) return { kind: "id" as const, value: idMatch[1] };
  const vanityMatch = v.match(/steamcommunity\.com\/id\/([^/]+)/i);
  if (vanityMatch) return { kind: "vanity" as const, value: vanityMatch[1] };
  if (STEAMID64_RE.test(v)) return { kind: "id" as const, value: v };
  return { kind: "vanity" as const, value: v };
}

async function resolveVanity(name: string, key: string): Promise<string> {
  const data = await getJson(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(
      name
    )}`
  );
  if (data?.response?.success !== 1 || !data.response.steamid) {
    throw new Error("Could not resolve that Steam profile name.");
  }
  return data.response.steamid as string;
}

async function fetchProfile(
  steamId: string,
  key: string
): Promise<SteamProfile> {
  const data = await getJson(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`
  );
  const p = data?.response?.players?.[0];
  if (!p) throw new Error("Steam profile not found — check the ID or URL.");
  return {
    steamId,
    name: p.personaname ?? "Unknown",
    avatar: p.avatarfull ?? "",
    profileUrl: p.profileurl ?? "",
    visibility: p.communityvisibilitystate ?? 1,
  };
}

async function fetchOwnedGames(
  steamId: string,
  key: string
): Promise<SteamGame[]> {
  const data = await getJson(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`
  );
  const list = data?.response?.games;
  if (!Array.isArray(list)) {
    throw new Error(
      "Your profile is public but its game details are private. In Steam → Edit Profile → Privacy Settings, set ‘Game details’ to Public, then try again."
    );
  }
  return list
    .map(
      (g: { appid: number; name: string; playtime_forever: number }): SteamGame => ({
        appid: g.appid,
        name: g.name,
        playtimeMin: g.playtime_forever ?? 0,
        coverUrl: coverFor(g.appid),
      })
    )
    .sort((a: SteamGame, b: SteamGame) => b.playtimeMin - a.playtimeMin);
}

export async function importSteamLibrary(
  rawInput: string
): Promise<SteamImportResult> {
  const raw = rawInput?.trim();
  if (!raw) return { ok: false, error: "Enter your SteamID or profile URL." };

  const key = apiKey();
  if (!key) return mockImport(raw);

  try {
    const parsed = parseInput(raw);
    const steamId =
      parsed.kind === "id"
        ? parsed.value
        : await resolveVanity(parsed.value, key);
    const profile = await fetchProfile(steamId, key);
    if (profile.visibility !== 3) {
      return {
        ok: false,
        error:
          "This Steam profile is private. In Steam → Edit Profile → Privacy Settings, set ‘My profile’ and ‘Game details’ to Public, then try again.",
      };
    }
    const games = await fetchOwnedGames(steamId, key);
    return { ok: true, profile, games, isMock: false };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Steam import failed.",
    };
  }
}

// ----- Mock (no API key) -----
const MOCK_GAMES: SteamGame[] = [
  { appid: 1086940, name: "Baldur's Gate 3", playtimeMin: 6180, coverUrl: coverFor(1086940) },
  { appid: 1245620, name: "Elden Ring", playtimeMin: 4720, coverUrl: coverFor(1245620) },
  { appid: 367520, name: "Hollow Knight", playtimeMin: 1490, coverUrl: coverFor(367520) },
  { appid: 1091500, name: "Cyberpunk 2077", playtimeMin: 320, coverUrl: coverFor(1091500) },
  { appid: 1174180, name: "Red Dead Redemption 2", playtimeMin: 2880, coverUrl: coverFor(1174180) },
  { appid: 105600, name: "Terraria", playtimeMin: 940, coverUrl: coverFor(105600) },
  { appid: 292030, name: "The Witcher 3: Wild Hunt", playtimeMin: 5210, coverUrl: coverFor(292030) },
  { appid: 1145360, name: "Hades", playtimeMin: 1130, coverUrl: coverFor(1145360) },
  { appid: 271590, name: "Grand Theft Auto V", playtimeMin: 760, coverUrl: coverFor(271590) },
  { appid: 413150, name: "Stardew Valley", playtimeMin: 2010, coverUrl: coverFor(413150) },
];

function mockImport(_raw: string): SteamImportResult {
  // Deliberately does NOT echo the user's input — this is sample data, not
  // their real account. Naming it after their profile would be misleading.
  return {
    ok: true,
    isMock: true,
    profile: {
      steamId: "—",
      name: "Sample Player",
      avatar: "",
      profileUrl: "https://steamcommunity.com/",
      visibility: 3,
    },
    games: MOCK_GAMES,
  };
}
