// responses.js — all easy-to-tweak replies & matchers live here

/* ===================== Generic quick responses ===================== */
export const GENERIC_RESPONSES = [
  "Hello! 👋",
  "Hi — how can I help?",
  "Hey!",
  "I’m here if you need anything.",
  "Hey there!!",
];

export const GENERIC_REGEXES = [
  /^\s*[:;,.!?~\-\u2014()\[\]]+\s*$/u,
  /^\s*[.]{1,3}\s*$/,
  /^\s*[,;:]\s*$/u,
  /^\s*hi+[\!\.\s]*$/i,
  /^\s*hello+[\!\.\s]*$/i,
  /^\s*hey+[\!\.\s]*$/i,
  /^\s*yo+[\!\.\s]*$/i,
  /^\s*hiya+[\!\.\s]*$/i,
  /^\s*l+o+l+\s*$/i,
  /^\s*k+\s*$/i,
  /^\s*ok+\s*$/i,
  /^\s*brb\s*$/i,
  /^\s*afk\s*$/i,
  /^\s*[a-zA-Z]{1}\s*$/i,
  /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})+$/u,
  /^\s*(thanks|ty|thx|cheers|nice|gg|cool)\s*$/i
];

export function randomGeneric() {
  return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)];
}

/* ===================== Exact matches (fire BEFORE API) ===================== */
/** Edit these pairs. Key is normalized (trim + lowercase). */
export const EXACT_MATCH_ENTRIES = [
  // utility
  ["help", "What d’you need? ✈️"],
  ["hi", "Hi — how can I help?"],
  ["hello", "Hello! 👋"],
  ["hey", "Hey!"],
  ["support", "Pop your message in <#1308448637902131281> and a human will help."],
  ["real support", "Head to <#1308448637902131281> and we’ll sort you out."],
  ["how to get support", "Post in <#1308448637902131281> so we can help."],

  // applications
  ["apply", "Apply here: <#1362419467753361519>"],
  ["how do i apply", "Apply here: <#1362419467753361519>"],
  ["application", "Apply here: <#1362419467753361519>"],

  // flights / joining
  ["when is the next flight", "Check the schedule: <#1331332426647081143>"],
  ["next flight", "Flight times are here: <#1331332426647081143>"],
  ["how do i join a flight", "See <#1331332426647081143> or ask in <#1308448637902131281>."],
  ["i can’t join", "There might be no flight now. Try: Game → Server Selection → server with 15+ players → Play."],
  ["i can't join", "There might be no flight now. Try: Game → Server Selection → server with 15+ players → Play."],
];

export function normalizeExact(s) {
  return (s || "").trim().toLowerCase();
}

export function buildExactMap(entries = EXACT_MATCH_ENTRIES) {
  return new Map(entries.map(([k, v]) => [normalizeExact(k), v]));
}

/* ===================== Keyword/regex library (used on API failure) ===================== */
export const KEYWORD_RESPONSES = [
  {
    patterns: [/apply|application|staff form/i],
    reply: "Apply here: <#1362419467753361519> (good luck!)."
  },
  {
    patterns: [/support|help|ticket|issue|problem/i],
    reply: "Drop it in <#1308448637902131281> and we’ll take a look."
  },
  {
    patterns: [/next\s*flight|when.*flight|flight\s*(time|schedule)/i],
    reply: "Flight schedule’s here: <#1331332426647081143>."
  },
  {
    patterns: [/join.*flight|how.*join/i],
    reply: "See <#1331332426647081143> or ask in <#1308448637902131281>."
  },
  {
    patterns: [/(cant|can't|cannot).*join|join.*fail/i],
    reply: "Might be no active flight. Try: Game → Server Selection → server with 15+ players → Play."
  },
  {
    patterns: [/rules|guidelines|ban|mute|appeal/i],
    reply: "If it’s moderation-related, contact us in <#1308448637902131281>."
  },
  {
    patterns: [/game\s*(link|ip|server)/i],
    reply: "Find active servers via Server Selection. If stuck, ask in <#1308448637902131281>."
  },
  {
    patterns: [/discord|invite|link/i],
    reply: "You’re already here 😄 — if you need a specific link, ask in <#1308448637902131281>."
  },
  {
    patterns: [/dev|developer|commission|hire/i],
    reply: "Pop details in <#1308448637902131281> and we’ll point you right."
  },
  {
    patterns: [/thanks|thank you|ty|cheers/i],
    reply: "Anytime! ✈️"
  }
];

export const FALLBACK_RESPONSES = [
  "Got it — if you need a human, ask in <#1308448637902131281>.",
  "Noted. Want me to point you to support? <#1308448637902131281>",
  "If you’re stuck, check <#1331332426647081143> or ask in <#1308448637902131281>.",
  "I can help with basics — for anything tricky, ping <#1308448637902131281>.",
  "Cool. What else can I do for you? ✈️",
];

export function bestKeywordReply(text) {
  let best = null;
  let bestScore = 0;
  for (const entry of KEYWORD_RESPONSES) {
    let score = 0;
    for (const rx of entry.patterns) if (rx.test(text)) score++;
    if (score > bestScore) { bestScore = score; best = entry.reply; }
  }
  return (bestScore > 0) ? best : null;
}
