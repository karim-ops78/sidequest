export type GameStatus = "playing" | "paused" | "done" | "backlog";

export type Recap = {
  whatIDid: string;
  whereIStopped: string;
  nextObjective: string;
};

export type Session = {
  id: string;
  date: string; // ISO
  durationMin: number;
  source: "manual" | "screenshot" | "steam";
  recap: Recap;
};

export type Game = {
  id: string;
  name: string;
  status: GameStatus;
  genre: string;
  cover: { from: string; to: string }; // gradient cover
  totalPlaytimeMin: number;
  lastPlayed: string; // ISO
  steamAppId?: number;
  memory: {
    longTermSummary: string;
    currentObjectives: string[];
  };
  sessions: Session[];
};

export const games: Game[] = [
  {
    id: "elden-ring",
    name: "Elden Ring",
    status: "playing",
    genre: "Souls / Open-world RPG",
    cover: { from: "#3b2f1a", to: "#caa24a" },
    totalPlaytimeMin: 4720,
    lastPlayed: "2026-06-14T22:10:00Z",
    steamAppId: 1245620,
    memory: {
      longTermSummary:
        "You're a Tarnished deep into the Mountaintops of the Giants. You've beaten Morgott and Rykard, your build is a Faith/Strength hybrid running the Blasphemous Blade. Two great runes are active.",
      currentObjectives: [
        "Reach the Forge of the Giants and light the flame",
        "Find a way past the Fire Giant blocking the path",
        "Level Vigor — you keep getting two-shot",
      ],
    },
    sessions: [
      {
        id: "er-3",
        date: "2026-06-14T20:00:00Z",
        durationMin: 130,
        source: "screenshot",
        recap: {
          whatIDid:
            "Pushed through the Mountaintops of the Giants, cleared the Spiritcaller Cave and grabbed two Golden Seeds.",
          whereIStopped:
            "Resting at the Foot of the Forge site of grace, right before the Fire Giant arena.",
          nextObjective:
            "Beat the Fire Giant to open the road to the Forge of the Giants.",
        },
      },
      {
        id: "er-2",
        date: "2026-06-08T19:30:00Z",
        durationMin: 95,
        source: "manual",
        recap: {
          whatIDid: "Killed Morgott the Omen King after a few attempts.",
          whereIStopped: "Just got the Rold Medallion from Melina.",
          nextObjective: "Use the Grand Lift of Rold to reach the Mountaintops.",
        },
      },
    ],
  },
  {
    id: "baldurs-gate-3",
    name: "Baldur's Gate 3",
    status: "playing",
    genre: "CRPG",
    cover: { from: "#2a1212", to: "#b23a48" },
    totalPlaytimeMin: 6180,
    lastPlayed: "2026-06-16T23:40:00Z",
    steamAppId: 1086940,
    memory: {
      longTermSummary:
        "Act 2, mid-game. Your party is Tav (Warlock), Shadowheart, Astarion and Karlach. You've reached the Shadow-Cursed Lands and are sheltering at Last Light Inn. The tadpole situation is escalating.",
      currentObjectives: [
        "Decide whether to trust the Nightsong",
        "Confront Ketheric Thorm at Moonrise Towers",
        "Resolve Shadowheart's loyalty to Shar",
      ],
    },
    sessions: [
      {
        id: "bg-2",
        date: "2026-06-16T21:00:00Z",
        durationMin: 160,
        source: "manual",
        recap: {
          whatIDid:
            "Saved Isobel at Last Light Inn and recruited the Harpers as allies.",
          whereIStopped:
            "Standing at the gates of Moonrise Towers, party at full health.",
          nextObjective: "Infiltrate Moonrise Towers and find the Nightsong.",
        },
      },
    ],
  },
  {
    id: "hollow-knight",
    name: "Hollow Knight",
    status: "paused",
    genre: "Metroidvania",
    cover: { from: "#0c1622", to: "#3a6ea5" },
    totalPlaytimeMin: 1490,
    lastPlayed: "2026-05-20T18:00:00Z",
    steamAppId: 367520,
    memory: {
      longTermSummary:
        "Explored most of Hallownest. You have the Mantis Claw, Mothwing Cloak and Crystal Heart. Currently stuck trying to reach the City of Tears properly.",
      currentObjectives: [
        "Get the Monarch Wings to double jump",
        "Beat the Soul Master in the Soul Sanctum",
      ],
    },
    sessions: [
      {
        id: "hk-1",
        date: "2026-05-20T16:30:00Z",
        durationMin: 75,
        source: "manual",
        recap: {
          whatIDid: "Explored the Fungal Wastes and beat the Mantis Lords.",
          whereIStopped: "At the bench just outside the City of Tears.",
          nextObjective: "Find the Soul Sanctum and the Soul Master boss.",
        },
      },
    ],
  },
  {
    id: "cyberpunk-2077",
    name: "Cyberpunk 2077",
    status: "backlog",
    genre: "Action RPG",
    cover: { from: "#1a1a05", to: "#f2d600" },
    totalPlaytimeMin: 320,
    lastPlayed: "2026-04-02T21:00:00Z",
    steamAppId: 1091500,
    memory: {
      longTermSummary:
        "Early game. Just finished the heist with Jackie. The Relic situation has started. Still figuring out a Netrunner build.",
      currentObjectives: ["Meet with Dexter DeShawn aftermath", "Find a ripperdoc"],
    },
    sessions: [],
  },
];

export function getGame(id: string) {
  return games.find((g) => g.id === id);
}

export function formatPlaytime(min: number) {
  const h = Math.floor(min / 60);
  return `${h}h`;
}

export function timeAgo(iso: string) {
  const days = Math.floor(
    (Date.parse("2026-06-17T12:00:00Z") - Date.parse(iso)) / 86400000
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
