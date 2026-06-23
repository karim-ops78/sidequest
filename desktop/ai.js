// Gemini call for the overlay. Vision + game-specific system prompt + wiki
// grounding. Kept standalone (no build step).
const https = require("https");

const MODEL = "gemini-2.5-flash";

const HELP_SCHEMA = {
  type: "object",
  properties: {
    game: { type: "string" },
    answer: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "steps"],
};

function buildPrompt({ profile, question, wikiContext }) {
  return [
    profile.system,
    "",
    wikiContext
      ? "Reference material from the game's wiki — treat this as your source of truth and prefer it over guessing:\n\"\"\"\n" +
        wikiContext +
        "\n\"\"\""
      : "",
    "",
    "A screenshot of the player's current screen is attached. Use it ONLY to understand the player's situation (location, enemy, menu, gear, quest). " +
      "Do NOT simply describe what is on screen — pure screen commentary has zero value.",
    "",
    question
      ? `The player's question: "${question}"`
      : "The player pressed the help bind without typing a question. From their on-screen situation and your knowledge of this game, give the single most useful piece of progression or combat help right now.",
    "",
    "Rules:",
    "- Give specific, actionable, game-aware help: mechanics, strategy, what to use, where to go.",
    "- Ground answers in the wiki reference when present. If it's not covered and you're unsure, say so briefly rather than inventing.",
    "- Be concise — this renders in a small overlay.",
    "Respond with: game (the title), answer (1-2 sentences of direct help), steps (2-4 short actionable steps).",
  ]
    .filter(Boolean)
    .join("\n");
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// { apiKey, question, imageBase64, profile, wikiContext } -> { game, answer, steps }
async function askOverlay({ apiKey, question, imageBase64, profile, wikiContext }) {
  if (!apiKey) {
    return {
      game: profile?.name || "Unknown",
      answer: "No GEMINI_API_KEY found. Add it to .env.local in the project root.",
      steps: ["Set GEMINI_API_KEY", "Restart SideQuest", "Press the bind again"],
    };
  }

  const parts = [{ text: buildPrompt({ profile, question, wikiContext }) }];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
  }

  const { status, body } = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: HELP_SCHEMA,
      },
    }
  );

  if (status !== 200) {
    throw new Error(`Gemini API ${status} — ${body.slice(0, 160)}`);
  }

  const json = JSON.parse(body);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini.");
  const parsed = JSON.parse(text);
  return {
    game: parsed.game || profile?.name || "Unknown",
    answer: parsed.answer || "",
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
  };
}

module.exports = { askOverlay };
