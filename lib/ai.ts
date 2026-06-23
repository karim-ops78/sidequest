// Provider-agnostic AI layer (server-only).
//
// Uses Google Gemini (free tier) via its REST API — no SDK, no extra deps.
// Everything funnels through this file, so swapping in another provider later
// means editing one place. Real calls when GEMINI_API_KEY is set; deterministic
// mocks otherwise, so every flow works on localhost without a key.

function apiKey() {
  return process.env.GEMINI_API_KEY?.trim() || null;
}


// The picker fires often (every time/mood combo), so it uses flash-lite — same
// quality for this lightweight reasoning, but a more generous free-tier quota.
const PICKER_MODEL = "gemini-2.5-flash-lite";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST to Gemini, retrying transient server overload (503 / other 5xx) with a
// short backoff. 4xx (e.g. 429 quota, 400 bad request) return immediately —
// retrying those wouldn't help. Callers handle the final non-ok response.
async function geminiPost(
  model: string,
  key: string,
  body: unknown,
  retries = 2
): Promise<Response> {
  let res!: Response;
  for (let attempt = 0; attempt <= retries; attempt++) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      }
    );
    if (res.ok || res.status < 500) return res; // success or non-transient
    if (attempt < retries) await sleep(700 * (attempt + 1));
  }
  return res; // exhausted retries — hand the last (still failing) response back
}

// ===== Game Picker — "What should I play right now?" (the core feature) =====
//
// Fights decision paralysis: given the player's real Steam library plus their
// available time and current mood, the AI recommends the ONE game to launch now
// and explains why. The model already knows these games, so we only need to send
// names + playtime — it reasons about genre, session length and vibe itself.

export type PickerTime = "short" | "medium" | "long";
export type PickerMood = "chill" | "story" | "challenge" | "quick";

export type PickerGame = {
  appid: number;
  name: string;
  playtimeMin: number;
  /** Minutes played in the last 2 weeks — a strong "currently into it" signal. */
  recentMin?: number;
};

export type RecommendInput = {
  library: PickerGame[];
  /** Genres the player said they enjoy, from their profile. */
  favoriteGenres?: string[];
  time: PickerTime;
  /** A preset mood; omitted when the player typed their own. */
  mood?: PickerMood;
  /** Free-text mood in the player's own words — takes priority over `mood`. */
  customMood?: string;
  /** Hard exclusions — games the player just rejected ("not this one"). */
  excludeAppids?: number[];
  /** Soft avoid — recently recommended games; don't repeat unless clearly best. */
  recentAppids?: number[];
};

export type RecommendPick = {
  appid: number;
  name: string;
  /** 2-3 sentences: why THIS game, right now, for this time + mood. */
  reason: string;
};

export type Recommendation = {
  pick: RecommendPick;
  /** 1-2 runner-up games, each with a one-line justification. */
  alternatives: { appid: number; name: string; reason: string }[];
};

export type RecommendResult =
  | { ok: true; recommendation: Recommendation; isMock: boolean; note?: string }
  | { ok: false; error: string };

const TIME_DESC: Record<PickerTime, string> = {
  short: "about 30 minutes — a quick one",
  medium: "1 to 2 hours — a proper session",
  long: "the whole evening — a deep dive",
};

const MOOD_DESC: Record<PickerMood, string> = {
  chill: "chill / relaxed — wants an easy headspace, low stress",
  story: "in the mood for story — wants to be immersed in a narrative",
  challenge: "wants a challenge — something demanding and skill-testing",
  quick: "quick fun — pick-up-and-play, fast gratification, no big commitment",
};

const RECOMMEND_SCHEMA = {
  type: "object",
  properties: {
    pick: {
      type: "object",
      properties: {
        appid: { type: "integer" },
        name: { type: "string" },
        reason: { type: "string" },
      },
      required: ["appid", "name", "reason"],
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          appid: { type: "integer" },
          name: { type: "string" },
          reason: { type: "string" },
        },
        required: ["appid", "name", "reason"],
      },
    },
  },
  required: ["pick", "alternatives"],
};

function buildRecommendPrompt(input: RecommendInput): string {
  const lib = input.library
    .map((g) => {
      const hrs = g.playtimeMin > 0 ? `${Math.round(g.playtimeMin / 60)}h played` : "never played";
      const recent = g.recentMin && g.recentMin > 0 ? `, ${Math.round(g.recentMin / 60)}h in the last 2 weeks` : "";
      return `- [${g.appid}] ${g.name} (${hrs}${recent})`;
    })
    .join("\n");

  const recentlyInto = input.library
    .filter((g) => (g.recentMin ?? 0) > 0)
    .sort((a, b) => (b.recentMin ?? 0) - (a.recentMin ?? 0))
    .slice(0, 3)
    .map((g) => g.name);

  const genres =
    input.favoriteGenres && input.favoriteGenres.length
      ? input.favoriteGenres.join(", ")
      : "(not specified)";

  const custom = input.customMood?.trim();
  const moodLine = custom
    ? `${custom} (the player described their mood in their own words — read it carefully and honour the specific vibe they're asking for)`
    : input.mood
      ? MOOD_DESC[input.mood]
      : "(not specified)";

  const recentNames = (input.recentAppids ?? [])
    .map((id) => input.library.find((g) => g.appid === id)?.name)
    .filter(Boolean);
  const recentLine = recentNames.length
    ? `Recently recommended already: ${recentNames.join(", ")}. Suggest something DIFFERENT unless one is clearly the single best fit for this mood + time.`
    : "";

  return [
    "You are SideQuest, an assistant that kills decision paralysis for gamers.",
    "The player has a large backlog and only a short window to play. Pick the SINGLE best game",
    "from THEIR library to launch right now, then suggest 1-2 alternatives.",
    "",
    "The player right now has:",
    `- Time available: ${TIME_DESC[input.time]}`,
    `- Mood: ${moodLine}`,
    `- Favourite genres: ${genres}`,
    "",
    "Their Steam library (appid, name, playtime — use playtime as a signal):",
    lib,
    "",
    "How to reason:",
    "- You already know these games — judge each one's genre, typical session length and vibe yourself.",
    "- Match the game to BOTH the time window and the mood. A 100h CRPG is a bad call for a 30-min chill window.",
    "- Use playtime smartly: a barely-played game can be the perfect 'finally start this' pick; a heavily-played",
    "  one is a reliable comfort choice. Lean toward rescuing the backlog when it fits the mood and time.",
    "- Respect favourite genres when given, but the time + mood fit matters most.",
    recentlyInto.length
      ? `- The player has been actively playing ${recentlyInto.join(", ")} over the last 2 weeks. If the mood/time fits, recommending one of these to CONTINUE the momentum is great and explicitly mention they're picking up where they left off. But if they seem to want a change of pace, suggest something fresh instead — read the mood.`
      : "",
    recentLine ? `- ${recentLine}` : "",
    "",
    "Only ever recommend games from the list above, using their exact appid and name.",
    "For the pick, write 2-3 sentences explaining why THIS game, right now — concrete and specific to the game,",
    "not generic. Reference the time window and mood. For each alternative, one short sentence.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function recommendGame(input: RecommendInput): Promise<RecommendResult> {
  if (!input.library?.length) {
    return { ok: false, error: "Import your Steam library first so I have something to pick from." };
  }

  // Drop rejected games from the pool — but never empty it out (if the player
  // rejected everything, fall back to the full library rather than failing).
  const exclude = new Set(input.excludeAppids ?? []);
  const pool = input.library.filter((g) => !exclude.has(g.appid));
  const eff: RecommendInput = { ...input, library: pool.length ? pool : input.library };

  const key = apiKey();
  if (!key) return mockRecommend(eff);

  try {
    const res = await geminiPost(PICKER_MODEL, key, {
      contents: [{ parts: [{ text: buildRecommendPrompt(eff) }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: RECOMMEND_SCHEMA,
      },
    });

    if (!res.ok) {
      // Quota (429) or Gemini overloaded (503, even after retries): degrade
      // gracefully to a local pick instead of dead-ending.
      if (res.status === 429) {
        return mockRecommend(
          eff,
          "Gemini's free-tier quota is maxed out for now — here's a quick local pick instead. Try the AI pick again in a minute."
        );
      }
      if (res.status === 503) {
        return mockRecommend(
          eff,
          "Gemini is overloaded right now (high demand) — here's a quick local pick. Try the AI pick again in a moment."
        );
      }
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}${detail ? ` — ${detail.slice(0, 140)}` : ""}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("The AI returned an empty response. Try again.");

    const parsed = JSON.parse(text) as Partial<Recommendation>;
    if (!parsed.pick?.name || !parsed.pick.reason) {
      throw new Error("The AI response was incomplete. Try again.");
    }

    // Trust the library, not the model, for ids/names: snap each suggestion back
    // to a real game so covers and links always resolve.
    const byId = new Map(eff.library.map((g) => [g.appid, g]));
    const byName = new Map(eff.library.map((g) => [g.name.toLowerCase(), g]));
    const resolve = (appid?: number, name?: string) =>
      (appid && byId.get(appid)) || (name && byName.get(name.toLowerCase())) || null;

    const pickGame = resolve(parsed.pick.appid, parsed.pick.name) ?? eff.library[0];
    const alternatives = (parsed.alternatives ?? [])
      .map((a) => {
        const g = resolve(a.appid, a.name);
        return g ? { appid: g.appid, name: g.name, reason: a.reason } : null;
      })
      .filter((a): a is { appid: number; name: string; reason: string } => !!a)
      .filter((a) => a.appid !== pickGame.appid)
      .slice(0, 2);

    return {
      ok: true,
      isMock: false,
      recommendation: {
        pick: { appid: pickGame.appid, name: pickGame.name, reason: parsed.pick.reason },
        alternatives,
      },
    };
  } catch (e) {
    // Network / parse / empty-response failures: still hand back a usable pick.
    return mockRecommend(
      eff,
      `Couldn't reach the AI just now (${e instanceof Error ? e.message : "unknown error"}) — showing a quick local pick instead.`
    );
  }
}

// Deterministic fallback so the picker always returns something — used without a
// key, on quota (429), or on any AI failure. `note` explains why, for the UI.
function mockRecommend(input: RecommendInput, note?: string): RecommendResult {
  const ranked = [...input.library].sort((a, b) => {
    // chill/story (and custom) lean to already-invested games; quick/challenge spread out.
    if (input.mood === "quick" || input.mood === "challenge") return a.playtimeMin - b.playtimeMin;
    return b.playtimeMin - a.playtimeMin;
  });
  // Prefer a game not recommended recently as the top pick, for variety.
  const recent = new Set(input.recentAppids ?? []);
  const fresh = ranked.filter((g) => !recent.has(g.appid));
  const ordered = fresh.length ? [...fresh, ...ranked.filter((g) => recent.has(g.appid))] : ranked;
  const [pick, ...rest] = ordered;
  const window = TIME_DESC[input.time].split(" — ")[0];
  const moodLabel = input.customMood?.trim() || input.mood || "any";
  return {
    ok: true,
    isMock: true,
    note:
      note ??
      "Add a GEMINI_API_KEY for real AI reasoning across your whole library.",
    recommendation: {
      pick: {
        appid: pick.appid,
        name: pick.name,
        reason: `A solid pick for a ${window} window in a "${moodLabel}" mood, based on your playtime.`,
      },
      alternatives: rest.slice(0, 2).map((g) => ({
        appid: g.appid,
        name: g.name,
        reason: "Another option that fits your time and mood.",
      })),
    },
  };
}

// ===== Suggest games to add — "Play on other platforms too?" =====
//
// A Steam library isn't the player's whole gaming life (Epic, console, games
// they don't own yet). After import we suggest well-known games that fit their
// taste so they can round out the library the picker draws from. The AI returns
// NAMES only; the caller resolves each to a real appid + cover via Steam search.

export type SuggestInput = {
  /** Names of games already in the library — never suggest these. */
  ownedNames: string[];
  favoriteGenres?: string[];
};

export type GameSuggestion = { name: string; reason: string };

export type SuggestResult =
  | { ok: true; suggestions: GameSuggestion[]; isMock: boolean }
  | { ok: false; error: string };

const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
        },
        required: ["name", "reason"],
      },
    },
  },
  required: ["suggestions"],
};

function buildSuggestPrompt(input: SuggestInput): string {
  const owned = input.ownedNames.length
    ? input.ownedNames.slice(0, 60).join(", ")
    : "(none yet)";
  const genres =
    input.favoriteGenres && input.favoriteGenres.length
      ? input.favoriteGenres.join(", ")
      : "(not specified)";

  return [
    "You are SideQuest. The player imported their Steam library, but they also play games",
    "on other platforms (Epic, consoles) or simply don't own some great fits yet.",
    "Suggest 10 games they likely play or would love, to round out the library our picker draws from.",
    "",
    `Their favourite genres: ${genres}`,
    "Games already in their library (do NOT suggest any of these or close duplicates / other editions):",
    owned,
    "",
    "Selection rules:",
    "- Infer their taste from the owned games + stated genres, then suggest games that match it.",
    "- Strongly favour WELL-KNOWN, popular, acclaimed titles — names that resolve cleanly on Steam.",
    "- Prefer cross-platform hits they might own elsewhere (e.g. console/Epic exclusives that are also on Steam).",
    "- Variety is good, but every pick must plausibly fit their taste. No obscure or shovelware titles.",
    "- Use each game's exact, common Steam title so it can be looked up.",
    "",
    "Return 10 suggestions, each with the game name and a one-line reason tied to their taste.",
  ].join("\n");
}

export async function suggestGames(input: SuggestInput): Promise<SuggestResult> {
  const key = apiKey();
  if (!key) return mockSuggest(input);

  try {
    const res = await geminiPost(PICKER_MODEL, key, {
      contents: [{ parts: [{ text: buildSuggestPrompt(input) }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: SUGGEST_SCHEMA,
      },
    });

    if (!res.ok) {
      // Quota (429) or overloaded (503): fall back to a generic popular list.
      if (res.status === 429 || res.status === 503) return mockSuggest(input);
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}${detail ? ` — ${detail.slice(0, 140)}` : ""}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("The AI returned an empty response.");

    const parsed = JSON.parse(text) as { suggestions?: GameSuggestion[] };
    const owned = new Set(input.ownedNames.map((n) => n.toLowerCase()));
    const suggestions = (parsed.suggestions ?? [])
      .filter((s) => s?.name && !owned.has(s.name.toLowerCase()))
      .slice(0, 10);

    return { ok: true, isMock: false, suggestions };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suggestion failed." };
  }
}

// Generic popular picks when there's no key / on quota — still useful to demo.
function mockSuggest(input: SuggestInput): SuggestResult {
  const owned = new Set(input.ownedNames.map((n) => n.toLowerCase()));
  const pool: GameSuggestion[] = [
    { name: "God of War", reason: "Acclaimed cinematic action — a console hit now on Steam." },
    { name: "Hades", reason: "Tight, replayable roguelike loved across the board." },
    { name: "Disco Elysium", reason: "A standout if you like deep, story-rich RPGs." },
    { name: "Celeste", reason: "Precision platformer with heart — great in short bursts." },
    { name: "Sekiro: Shadows Die Twice", reason: "For when you want a real combat challenge." },
    { name: "Stardew Valley", reason: "The go-to cozy game to unwind with." },
    { name: "Portal 2", reason: "Beloved puzzle classic everyone should have." },
    { name: "Hollow Knight", reason: "Atmospheric metroidvania, huge and rewarding." },
    { name: "Cyberpunk 2077", reason: "Big open-world RPG, great after its turnaround." },
    { name: "Outer Wilds", reason: "A one-of-a-kind exploration mystery." },
  ];
  return {
    ok: true,
    isMock: true,
    suggestions: pool.filter((s) => !owned.has(s.name.toLowerCase())).slice(0, 10),
  };
}

// ===== Detect favourite genres from the library =====
//
// Saves the player from hand-picking genre chips: infer their taste from the
// games they own and how much they've played each, constrained to OUR fixed
// genre list so the result drops straight into the profile + picker signals.
// Returns NAMES from the allowed list only — the caller filters defensively.

export type DetectGenresInput = {
  games: { name: string; playtimeMin: number }[];
  /** The fixed genre vocabulary to choose from (GENRE_OPTIONS). */
  allowedGenres: string[];
};

export type DetectGenresResult =
  | { ok: true; genres: string[]; isMock: boolean; note?: string }
  | { ok: false; error: string };

function buildDetectGenresPrompt(input: DetectGenresInput): string {
  // Sort by playtime so the most-played (strongest taste signal) lead the list.
  const lib = [...input.games]
    .sort((a, b) => b.playtimeMin - a.playtimeMin)
    .slice(0, 80)
    .map((g) => {
      const hrs =
        g.playtimeMin > 0 ? `${Math.round(g.playtimeMin / 60)}h played` : "never played";
      return `- ${g.name} (${hrs})`;
    })
    .join("\n");

  return [
    "You are SideQuest. Infer which genres a player enjoys from their Steam library.",
    "Weight by playtime: games with many hours reveal real taste; never-played games are weak signals.",
    "",
    "Choose ONLY from this exact list of genres (use the exact strings, nothing else):",
    input.allowedGenres.join(", "),
    "",
    "The player's library (name, playtime):",
    lib,
    "",
    "Return the 3-6 genres that best describe this player's taste, most representative first.",
    "Only include a genre if the library clearly supports it.",
  ].join("\n");
}

export async function detectGenres(
  input: DetectGenresInput
): Promise<DetectGenresResult> {
  if (!input.games?.length) {
    return { ok: false, error: "Import your Steam library first so I can read your taste." };
  }

  const allowed = new Set(input.allowedGenres);
  const key = apiKey();
  // Without a key we can't infer genres from names alone — be honest rather
  // than guess. The picker still works without favourite genres set.
  if (!key) {
    return {
      ok: true,
      isMock: true,
      genres: [],
      note: "Add a GEMINI_API_KEY to auto-detect your genres — or pick them by hand below.",
    };
  }

  const schema = {
    type: "object",
    properties: {
      genres: {
        type: "array",
        items: { type: "string", enum: input.allowedGenres },
      },
    },
    required: ["genres"],
  };

  try {
    const res = await geminiPost(PICKER_MODEL, key, {
      contents: [{ parts: [{ text: buildDetectGenresPrompt(input) }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        return {
          ok: true,
          isMock: true,
          genres: [],
          note: "Gemini's free-tier quota is maxed out — pick your genres by hand for now, or try again in a minute.",
        };
      }
      if (res.status === 503) {
        return {
          ok: true,
          isMock: true,
          genres: [],
          note: "Gemini is overloaded right now — pick your genres by hand, or try again in a moment.",
        };
      }
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}${detail ? ` — ${detail.slice(0, 140)}` : ""}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("The AI returned an empty response.");

    const parsed = JSON.parse(text) as { genres?: string[] };
    // Defensive: keep only valid, de-duplicated genres from our list.
    const genres = [...new Set(parsed.genres ?? [])].filter((g) => allowed.has(g));

    return { ok: true, isMock: false, genres };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Genre detection failed." };
  }
}

// ===== Backlog Roast — the fun, shareable one =====
//
// Takes computed library stats and has the AI roast the player's backlog:
// savage-but-affectionate, specific, funny. Zero extra data needed beyond what
// we already have (games + playtime).

export type BacklogStats = {
  total: number;
  played: number; // games with any playtime
  neverPlayed: number;
  barelyPlayed: number; // started but under 2h
  totalHours: number;
  topGame?: { name: string; hours: number };
  /** A few never-played game names, for flavour. */
  shelfOfShame: string[];
};

export type Roast = {
  /** One punchy headline verdict. */
  verdict: string;
  /** 3-5 roast lines. */
  lines: string[];
  /** One (slightly) encouraging closer. */
  redemption: string;
};

export type RoastResult =
  | { ok: true; roast: Roast; isMock: boolean }
  | { ok: false; error: string };

const ROAST_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string" },
    lines: { type: "array", items: { type: "string" } },
    redemption: { type: "string" },
  },
  required: ["verdict", "lines", "redemption"],
};

function buildRoastPrompt(s: BacklogStats): string {
  const pctUnplayed = s.total ? Math.round((s.neverPlayed / s.total) * 100) : 0;
  return [
    "You are a witty, savage-but-affectionate roast comedian whose only subject is a gamer's backlog.",
    "Roast this player based on their real library stats. Be funny and specific, a little brutal,",
    "but never genuinely mean — the player should laugh, not cry. Reference the actual numbers and game names.",
    "",
    "Stats:",
    `- Games owned: ${s.total}`,
    `- Games actually played: ${s.played}`,
    `- Never launched: ${s.neverPlayed} (${pctUnplayed}% of the library)`,
    `- Started then abandoned under 2 hours: ${s.barelyPlayed}`,
    `- Total hours across everything: ${s.totalHours}`,
    s.topGame ? `- Most played: ${s.topGame.name} (${s.topGame.hours}h)` : "",
    s.shelfOfShame.length
      ? `- Some games gathering dust, never played: ${s.shelfOfShame.join(", ")}`
      : "",
    "",
    "Return: verdict (one punchy headline, e.g. about a museum vs an arcade), lines (3-5 short roast jabs",
    "using the real numbers/names), redemption (one short, slightly hopeful closing line).",
    "Keep it PG-13. No slurs. Punch at the habits, not the person.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function roastBacklog(stats: BacklogStats): Promise<RoastResult> {
  if (!stats.total) {
    return { ok: false, error: "Import a library first — I can't roast an empty shelf." };
  }

  const key = apiKey();
  if (!key) return mockRoast(stats);

  try {
    const res = await geminiPost(PICKER_MODEL, key, {
      contents: [{ parts: [{ text: buildRoastPrompt(stats) }] }],
      generationConfig: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: ROAST_SCHEMA,
      },
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 503) return mockRoast(stats);
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}${detail ? ` — ${detail.slice(0, 140)}` : ""}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("The AI returned an empty response.");

    const parsed = JSON.parse(text) as Partial<Roast>;
    if (!parsed.verdict || !Array.isArray(parsed.lines)) {
      throw new Error("The AI response was incomplete.");
    }
    return {
      ok: true,
      isMock: false,
      roast: {
        verdict: parsed.verdict,
        lines: parsed.lines,
        redemption: parsed.redemption ?? "There's still hope. Maybe.",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Roast failed." };
  }
}

function mockRoast(s: BacklogStats): RoastResult {
  const pct = s.total ? Math.round((s.neverPlayed / s.total) * 100) : 0;
  return {
    ok: true,
    isMock: true,
    roast: {
      verdict: `You own ${s.total} games and have played ${s.played}. This is a museum, not a game room.`,
      lines: [
        `${s.neverPlayed} games (${pct}%) have never even been launched. They're not a library, they're hostages.`,
        s.topGame
          ? `${s.topGame.name} ate ${s.topGame.hours}h while ${s.neverPlayed} others gathered dust.`
          : `Your playtime is spread thinner than a Steam sale wishlist.`,
        `${s.barelyPlayed} games got the "under 2 hours then never again" treatment. Brutal.`,
      ],
      redemption:
        "Add a GEMINI_API_KEY for a properly savage AI roast — but honestly, this one already stings.",
    },
  };
}

