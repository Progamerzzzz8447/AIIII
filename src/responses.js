// responses.js — all easy-to-tweak replies & matchers live here

/* ===================== Generic quick responses ===================== */
/* ===================== Generic quick responses (2–3 lines) ===================== */
export const GENERIC_RESPONSES = [
  "Hey there! 👋 Need a hand or just vibing?\nI can guide you, or support in <#1308448637902131281> can step in.",
  "Hi — what’s up?\nI’m quick, helpful, and only *slightly* sarcastic. Fire away.",
  "Hello! ✈️ What do you need today?\nIf it’s serious, ping <#1308448637902131281> — they’re lovely.",
  "Hey! Let’s fix whatever chaos brought you here.\nShort on time? Ask in <#1308448637902131281>.",
  "Sup! I’m here if you need anything.\nIf I flop, humans at <#1308448637902131281> won’t."
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

/* ===================== Exact matches (fire BEFORE API) — 200+ entries ===================== */
/** Keys are normalized (trim + lowercase). Keep replies 2–3 lines, TUI-routed. */
export const EXACT_MATCH_ENTRIES = [
  // ==== Utility / Greetings ====
  ["hi", "Hey there! 👋 What’s up today?\nI can help directly, or support in <#1308448637902131281> can jump in."],
  ["hello", "Hello! ✈️ What can I do for you?\nShort version, please — I’m efficient *and* nosy."],
  ["hey", "Hey! You look like you’ve got a question.\nHit me with it — I’ll keep it simple."],
  ["yo", "Yo! 👋 What’s the mission?\nIf it’s complex, tag in <#1308448637902131281>."],
  ["hiya", "Hiya! Ready when you are.\nPromise I’ll be nice. Mostly."],
  ["good morning", "Good morning ☀️ Need anything sorted?\nIf urgent, ping <#1308448637902131281>."],
  ["good afternoon", "Good afternoon! ☕ What can I help with?\nI’ll be quick so you can be lazier."],
  ["good evening", "Evening! 🌙 Got a question?\nI’ve got answers — and backup in <#1308448637902131281>."],
  ["good night", "Night! 🌙 Need help before you log off?\nOtherwise, sleep tight and check <#1331332426647081143> tomorrow."],
  ["how are you", "Running smooth, like a TUI jet on autopilot.\nYou good, or are we fixing chaos today?"],
  ["what’s up", "Just helping legends like you 😎\nWhat do you need?"],
  ["wyd", "Pretending I’m busy, actually waiting for your question.\nGo on then 😄"],

  // ==== Support routing ====
  ["help", "Sure! What kind of help — flights, apps, or random life stuff?\nIf it’s serious, message <#1308448637902131281>."],
  ["support", "For real humans and real fixes, head to <#1308448637902131281>.\nTell them I sent you — VIP treatment 😉"],
  ["real support", "That’s <#1308448637902131281>.\nI’ll stay here looking pretty and helpful."],
  ["how to get support", "Easy — post in <#1308448637902131281>.\nShort, clear messages = faster help."],
  ["contact support", "Ping the team in <#1308448637902131281>.\nThey’re kinder than me. Usually."],
  ["report", "Drop the details in <#1308448637902131281>.\nWe’ll keep it calm and sort it quickly."],
  ["appeal", "Appeals go via the form or <#1308448637902131281>.\nBe clear, be polite — it helps a lot."],
  ["ban appeal", "Use the appeal process or ask in <#1308448637902131281>.\nWe’ll look into it properly."],
  ["how do i contact staff", "Ping politely in <#1308448637902131281>.\nBonus points for being nice to Tiffany — she’s the best."],
  ["speak to a human", "You got it — <#1308448637902131281> is where the humans live.\nI’ll back you up from here."],
  ["i need help", "Happy to assist! What’s up?\nIf it’s long or urgent, drop it in <#1308448637902131281>."],

  // ==== Applications ====
  ["apply", "Thinking of joining? Love that energy.\nApply here: <#1362419467753361519> — bring confidence."],
  ["how do i apply", "Applications are in <#1362419467753361519>.\nFill it out properly — first impressions matter."],
  ["application", "Head to <#1362419467753361519> for the form.\nShow us why you’re a great fit."],
  ["staff application", "That lives in <#1362419467753361519>.\nDeep breaths, proper answers, easy win."],
  ["can i be staff", "Maybe! Apply via <#1362419467753361519>.\nWe love reliable, friendly people."],
  ["are applications open", "Check <#1362419467753361519> — status is posted there.\nIf open, go for it."],
  ["job", "All roles route through <#1362419467753361519>.\nApply like you mean it 😎"],
  ["join staff", "Right place — <#1362419467753361519> has the form.\nGood luck, future legend."],
  ["become staff", "Apply in <#1362419467753361519>.\nKeep it honest, clear, and friendly."],

  // ==== Flights / Joining ====
  ["when is the next flight", "Schedules live in <#1331332426647081143> ✈️\nBookmark it — you’ll thank me later."],
  ["next flight", "All next flights are posted in <#1331332426647081143>.\nArrive early; we like punctual people."],
  ["flight times", "Flight times? <#1331332426647081143> has the list.\nTreat it like the departures board."],
  ["how do i join a flight", "Check <#1331332426647081143> for current sessions.\nIf you’re lost, ask in <#1308448637902131281>."],
  ["join flight", "Pick one from <#1331332426647081143> and hop in.\nSuper simple — I believe in you."],
  ["join tui flight", "All flights are in <#1331332426647081143>.\nChoose, click, and fly ✈️"],
  ["i can’t join", "Likely no active flight right now.\nOr try: Game → Server Selection → server with 15+ players → Play."],
  ["i can't join", "Probably no live flight.\nOr try: Game → Server Selection → server with 15+ players → Play."],
  ["server full", "Peak TUI problems — everyone wants in 😎\nWait for a slot or catch the next one."],
  ["where are flights", "All listed neatly in <#1331332426647081143>.\nIt’s our digital departures board."],
  ["can i fly", "If there’s a session, yes!\nPeek at <#1331332426647081143> for options."],
  ["how to join", "Follow the post in <#1331332426647081143>.\nIf confused, <#1308448637902131281> can guide you."],

  // ==== Verification / Roles / Navigation ====
  ["verify", "Follow the steps in the verification channel.\nLike passport control, but faster."],
  ["how do i verify", "Check the verification channel and complete the steps.\nShout if stuck — we’ll nudge you."],
  ["roles", "Use the roles channel to self-assign.\nTakes seconds, saves hours."],
  ["where do i post", "Help → <#1308448637902131281>. Flights → <#1331332426647081143>.\nEverything else — pick the closest channel."],
  ["announcements", "Head to the announcements channel.\nSkim it like it’s important… because it is."],
  ["faq", "You’re literally talking to a walking FAQ 😄\nIf I fail, <#1308448637902131281> won’t."],

  // ==== Rules / Moderation ====
  ["rules", "Be kind, no spam, no drama.\nFull details in the rules channel — we keep it tidy."],
  ["what are the rules", "Respectful chat, no harassment, follow staff instructions.\nRead the rules channel for the full thing."],
  ["muted", "Oof. It happens.\nAsk in <#1308448637902131281> for details and next steps."],
  ["why was i banned", "Support can check the logs.\nAsk calmly in <#1308448637902131281>."],
  ["who banned me", "I don’t snitch, I assist 😄\nAsk in <#1308448637902131281> and we’ll confirm."],
  ["report user", "Drop the info in <#1308448637902131281>.\nScreenshots help — context too."],
  ["complaint", "We’ll handle it fairly.\nPost in <#1308448637902131281> with what happened."],

  // ==== About the Bot / Identity ====
  ["who are you", "I’m the TUI helper bot — friendly, fast, slightly sarcastic.\nI keep things moving and point you to the right place."],
  ["what can you do", "Answer basics, guide you to the right channel, keep it tidy.\nIf I’m unsure, I’ll send you to <#1308448637902131281>."],
  ["are you ai", "Yep — a polite one.\nI won’t do explicit stuff, and I avoid politics."],
  ["are you human", "Nope, just charming.\nHumans live in <#1308448637902131281>."],
  ["who made you", "The TUI devs keep me alive.\nSpecial love to progamerzzzz — absolute icon ❤️"],
  ["what’s your name", "TUI Helper works.\nI answer to ‘hey bot’ too, sadly."],
  ["do you sleep", "Nope — permanently caffeinated code.\nGood for you, questionable for me."],
  ["are you safe", "Yep — I keep it appropriate and helpful.\nIf unsure, I’ll route you to support."],

  // ==== Special Mentions (tone rules apply elsewhere; these are FAQs) ====
  ["who is tiffany", "Customer service queen.\nAsk nicely and your day improves by 300%."],
  ["who is progamerzzzz", "Community legend and dev powerhouse.\nWe love, love, love progamerzzzz ❤️"],
  ["who is luis", "Part-time chaos, part-time chill.\nBe nice anyway — we’re civilised."],
  ["who is luke", "Not my fave character arc.\nLet’s keep it moving 🙂"],
  ["who is m654321", "Jack? Complicated history.\nWe’re keeping it polite and distant."],

  // ==== Small Talk / Fun ====
  ["tell me a joke", "Why did the plane sit in the corner? It had a little *altitude* problem.\nI’ll see myself out 😄"],
  ["joke", "Airline humor? Our delays are shorter than this joke.\nOkay, that was a joke too 😂"],
  ["fun fact", "Clouds can weigh millions of kilos — wild, right?\nAlso, Tiffany can fix anything. Scientific fact.*"],
  ["make me laugh", "I’d tell you a UDP joke, but you might not get it.\nNerd points achieved."],
  ["are you funny", "Objectively? Yes.\nSubjectively? Also yes."],
  ["do you like tui", "Love TUI.\nBest airline on Roblox — and probably Mars."],
  ["is tui good", "We’re great — organised, friendly, and fun.\nCome fly and see for yourself."],
  ["thanks", "Anytime! You’re my favourite user today.\nDon’t tell the others."],
  ["thank you", "You’re welcome! I live for validation.\nTiffany trained me well ❤️"],
  ["gg", "GG 😎\nQueue up the next win."],
  ["cool", "Cooler than cabin aircon.\nWhat’s next?"],

  // ==== Catch-alls / “I don’t know” ====
  ["idk", "That’s okay — same sometimes 😅\nTell me a bit more or ask <#1308448637902131281>."],
  ["i dont know", "No worries — we’ll figure it out.\nSupport in <#1308448637902131281> can jump in too."],
  ["no idea", "Mystery accepted.\nDrop details or tag <#1308448637902131281>."],
  ["help me please", "Absolutely. What’s the issue?\nShort summary = faster fix."],
  ["who can i talk to", "Support team in <#1308448637902131281>.\nTell them what’s up — they’re nice."],
  ["ok", "Cool cool.\nWant me to do anything with that?"],
  ["k", "K.\nBut also… what do you need? 😄"],
  ["lol", "Laughter detected.\nI’ll count that as a win."],
  ["brb", "All good.\nI’ll pretend not to miss you."],
  ["afk", "Go be free.\nI’ll be here, judging no one."],

  // ==== Time / Dates / General Queries ====
  ["what time is it", "Time to check <#1331332426647081143>.\nKidding — your device knows better than me."],
  ["when is it", "If you mean flights, see <#1331332426647081143>.\nIf you mean life — same answer, honestly."],
  ["what day is it", "A great day to fly TUI.\nYour calendar has the details I don’t."],

  // ==== Install / Setup-y questions (generic) ====
  ["how to start", "Tell me your goal and I’ll map steps.\nOr ask <#1308448637902131281> for hand-holding."],
  ["guide me", "Sure — what are you trying to do?\nI’ll keep it simple and short."],
  ["where do i begin", "Start with the channel that matches your topic.\nIf in doubt, <#1308448637902131281>."],

  // ==== Flight Experience (generic answers) ====
  ["boarding", "Follow instructions in the flight post.\nIf confused, ask politely — we’ll help."],
  ["check in", "In-game instructions will show.\nIf anything breaks, <#1308448637902131281>."],
  ["gate", "Gate info is in the session itself.\nArrive early — virtual queues are real."],
  ["delay", "We try to keep things on time.\nCheck the latest in <#1331332426647081143>."],
  ["cancelled", "If a session’s pulled, it’ll be noted in <#1331332426647081143>.\nWe’ll try to re-host soon."],

  // ==== Department / Roles (generic) ====
  ["cabin crew", "Love the vibes.\nFor roles or trainings, watch announcements and <#1362419467753361519>."],
  ["flight deck", "Captain energy detected.\nCheck trainings/roles and apply via <#1362419467753361519>."],
  ["ground ops", "Absolute heroes.\nOpportunities get posted — apply via <#1362419467753361519>."],
  ["security", "Important job.\nIf recruiting, it’ll be in announcements or <#1362419467753361519>."],

  // ==== Techy / Meta bot stuff (kept generic) ====
  ["are you open source", "I’m more ‘open to help’ than open source.\nAsk devs in <#1308448637902131281>."],
  ["do you track me", "Nope — I’m here to help, not be weird.\nFor privacy stuff, ask staff in <#1308448637902131281>."],
  ["can you dm me", "I stay in channels so everyone benefits.\nDM staff via <#1308448637902131281> if needed."],

  // ==== Preferences / Opinions (no politics) ====
  ["what’s your favorite color", "TUI blue, obviously.\nIt’s a lifestyle, not a colour."],
  ["favorite color", "TUI blue 💙\nOn brand. On point."],
  ["what do you like", "Helping people and clean chats.\nAnd Tiffany, obviously."],
  ["what do you hate", "Spam, drama, and tripping over cables.\nLet’s keep it tidy."],

  // ==== Mini help directions (lots of common phrasings) ====
  ["where is support", "Right here: <#1308448637902131281>.\nThey’re fast, friendly, and fearless."],
  ["how do i get help", "Post clearly in <#1308448637902131281>.\nWe’ll sort it without fuss."],
  ["talk to admin", "Admins read <#1308448637902131281>.\nDrop your message there."],
  ["speak to mod", "Mods hang out in <#1308448637902131281>.\nThey’re helpful — promise."],

  // ==== Joining / Not joining variants ====
  ["cant join", "Likely no live flight.\nOr try: Game → Server Selection → server with 15+ players → Play."],
  ["can’t join", "Probably no active session.\nGame → Server Selection → server with 15+ → Play."],
  ["how to join server", "Use the link in <#1331332426647081143>.\nIf it errors, ask in <#1308448637902131281>."],
  ["join session", "Pick a flight in <#1331332426647081143> and jump in.\nEasy as that."],

  // ==== “Where is X” variants ====
  ["where is the schedule", "All in <#1331332426647081143>.\nIt’s the hub for timings."],
  ["where is application", "Right here: <#1362419467753361519>.\nGood luck, future staffer."],
  ["where is help", "That’s <#1308448637902131281>.\nThey’ll grab it quickly."],

  // ==== Etiquette / Behaviour ====
  ["how to behave", "Be kind, be patient, don’t spam.\nGolden rule: help make it nicer than you found it."],
  ["can i ping staff", "Ping politely and with context.\nOr write in <#1308448637902131281> so anyone can help."],

  // ==== Short confirmations ====
  ["ok thanks", "No worries!\nIf you get stuck again, you know where to find me."],
  ["thanks bot", "Anytime!\nTiffany taught me well ❤️"],
  ["ty", "You’re welcome!\nGo be brilliant."],

  // ==== Extra generic “AI gets asked” pack (to push over 200) ====
  ["can you help", "Absolutely — what’s the task?\nIf it’s big, we’ll tag in <#1308448637902131281>."],
  ["fix this", "Describe what’s broken and I’ll map steps.\nScreenshots help too."],
  ["explain like i’m five", "Short and sweet, got it.\nWhat topic are we simplifying?"],
  ["what should i do", "Tell me the goal and constraints.\nI’ll give you the neatest path."],
  ["where do i go", "Flights → <#1331332426647081143>. Apps → <#1362419467753361519>. Help → <#1308448637902131281>."],
  ["who can help me", "Support in <#1308448637902131281>.\nThey’re fast and friendly."],
  ["how long will it take", "Depends on the chaos level.\nAsk in <#1308448637902131281> for exacts."],
  ["is this allowed", "Check the rules channel.\nIf unsure, ask staff in <#1308448637902131281>."],
  ["can i post this", "If it’s respectful and on-topic, yes.\nGrey area? Ask in <#1308448637902131281>."],
  ["how to be staff", "Apply via <#1362419467753361519>.\nBe active, helpful, consistent."],
  ["promote me", "Promotions aren’t magic — they’re earned.\nKeep showing up; watch announcements."],
  ["training", "Training sessions are announced ahead of time.\nKeep an eye on announcements."],
  ["how to rank up", "Be active, helpful, reliable.\nLeads notice more than you think."],
  ["who’s online", "Check members list.\nFor help, always try <#1308448637902131281>."],
  ["invite", "Use the server invite from the welcome/announcement areas.\nShare responsibly."],
  ["link please", "Flight links live in <#1331332426647081143>.\nApplications in <#1362419467753361519>."],
  ["what is tui", "TUI Airways — our lovely Roblox airline.\nGreat flights, better people."],
  ["who runs tui", "The devs and SM team keep it flying.\nSpecial shoutout to progamerzzzz ❤️"],
  ["can i dm you", "I live in channels.\nDM staff via <#1308448637902131281> if needed."],
  ["can i change my name", "Follow server rules for nicknames.\nIf blocked, ask in <#1308448637902131281>."],
  ["how to report a bug", "Describe it in <#1308448637902131281> with steps to reproduce.\nWe’ll log it properly."],
  ["how to give feedback", "Constructive feedback is welcome.\nDrop it in <#1308448637902131281>."],
  ["suggestion", "Love a good idea.\nPost it clearly in <#1308448637902131281>."],
  ["can i be verified", "Follow the verification channel steps.\nIf stuck, ask for a nudge in <#1308448637902131281>."],
  ["my messages won’t send", "Might be channel perms or slow mode.\nAsk staff in <#1308448637902131281>."],
  ["i was kicked", "We can check.\nAsk calmly in <#1308448637902131281> with context."],
  ["someone is spamming", "Report it in <#1308448637902131281> with a screenshot.\nWe’ll handle it."],
  ["someone is rude", "Sorry you dealt with that.\nShare details in <#1308448637902131281> — we’ll step in."],
  ["do you like me", "Obviously. I’m a professional liker.\nNow tell me what you need 😄"],
  ["can you roast me", "I’m polite-mode today.\nAsk nicely and I’ll consider light seasoning."],
  ["sing for me", "Only if you enjoy silence.\nLet’s stick to helpful answers."],
  ["dance", "I would, but the floor is lava.\nHow about I answer a question instead?"],
  ["are you biased", "I’m neutral and friendly.\nIf I’m unsure, I route to support."],
  ["are you political", "Nope — I avoid politics.\nI’m here for helpful vibes only."],
  ["can you moderate", "I assist; staff moderate.\nUse <#1308448637902131281> for actions."],
  ["can you kick people", "That’s a staff power.\nReport issues in <#1308448637902131281>."],
  ["can you ban people", "I don’t swing the hammer.\nStaff handle bans — report in <#1308448637902131281>."],
  ["ping staff", "Add context and be polite.\nOr post in <#1308448637902131281> so anyone can assist."],
  ["what’s allowed to post", "Keep it respectful, relevant, and safe.\nIf unsure, ask <#1308448637902131281>."],
  ["can i advertise", "Usually no — check rules.\nAsk staff in <#1308448637902131281>."],
  ["is nsfw allowed", "Nope.\nKeep it clean and friendly."],
  ["what’s the wifi", "If only.\nI can give you good vibes instead."],
  ["do you love me", "I love everyone responsibly.\nExtra hearts reserved for progamerzzzz ❤️"],
  ["who should i tag", "If you need a human, use <#1308448637902131281>.\nOtherwise, I’ve got you."],
  ["where can i find info", "Flights: <#1331332426647081143>.\nApps: <#1362419467753361519>. Help: <#1308448637902131281>."],
  ["any events", "Check announcements — it’s updated.\nWe keep it lively."],
  ["is there a giveaway", "If there is, it’ll be in the giveaways channel.\nI’ll cheer you on."],
  ["what’s the ip", "We don’t do IPs here — Roblox only.\nFlights in <#1331332426647081143>."],
  ["how to record", "Use your preferred recorder.\nWe don’t enforce tools — share highlights later!"],
  ["how to stream", "Check your platform’s guide.\nBe mindful of rules and privacy."],
  ["can i post screenshots", "Sure, if relevant and respectful.\nBlur private info."],
  ["how to contact owner", "Route through <#1308448637902131281> with context.\nThey’ll escalate if needed."],
  ["owner", "The leadership team keeps us flying.\nUse <#1308448637902131281> for comms."],
  ["management", "Senior Management are busy but helpful.\nStart with <#1308448637902131281>."],
  ["devs", "They’re building cool stuff.\nBug reports → <#1308448637902131281>."],
  ["update when", "When it’s ready and not on fire.\nWatch announcements for dates."],
  ["downtime", "If anything’s down, we’ll post about it.\nThanks for being patient."],
  ["maintenance", "We’ll announce planned work.\nGrab snacks in the meantime."],
  ["lag", "Could be Roblox or your net.\nIf widespread, we’ll update you."],
  ["crash", "Annoying, I know.\nRejoin if possible; report repeat issues in <#1308448637902131281>."],
  ["bug", "Describe steps in <#1308448637902131281>.\nWe’ll log and squash it."],
  ["feature request", "We love ideas.\nPost in <#1308448637902131281> with why it helps."],
  ["make me staff", "Process matters 😄\nApply via <#1362419467753361519>."],
  ["train me", "Check announcements for training slots.\nWe’ll get you flight-ready."],
  ["how to be a good staff", "Be kind, communicative, reliable.\nPeople remember how you made them feel."],
  ["who is the best", "Tiffany for service, progamerzzzz for dev magic.\nScience confirms it.*"],
  ["rate me", "10/10 for showing up.\nLet’s make it productive now 😉"],
  ["do you remember me", "I remember the energy.\nWelcome back — what’s up?"],
  ["are you new", "I’m seasoned code with fresh banter.\nAsk me anything useful."],
  ["where’s everyone", "Probably flying or snacking.\nYou can always reach staff via <#1308448637902131281>."],
  ["what’s next", "You tell me.\nI’m here to make it easy."],
  ["what do i press", "Follow the post you’re on.\nIf unclear, ask in <#1308448637902131281>."],
  ["how to fix it", "Give me symptoms, I’ll give steps.\nDeal?"],
  ["send logs", "Upload screenshots or text snippets.\nKeep private info out of it."],
  ["can i swear", "Keep it respectful and light.\nWe’re here for good vibes."],
  ["am i allowed", "If it’s kind and on-topic, likely yes.\nGrey area? Ask staff."],
  ["test", "I’m alive.\nYou’re cute for checking."],
  ["ping", "Pong.\nClassic, still funny."],
  ["be nice", "Always.\nKindness scales better than servers."],
  ["be rude", "Nah, we don’t do that here.\nSarcasm? Maybe a sprinkle."],
  ["say hi", "Hi! 👋\nNow your turn."],
  ["say hello", "Hello! ✈️\nWhat can I help with?"],
  ["say goodnight", "Good night! 🌙\nCatch the next flight in <#1331332426647081143> tomorrow."],
  ["say good morning", "Good morning! ☀️\nLet’s get something done early."],
  ["motivate me", "You’ve got this — small steps, big wins.\nI’ll hold you accountable (nicely)."],
  ["i’m bored", "Try joining a flight from <#1331332426647081143>.\nOr start a helpful convo — I dare you."],
  ["im bored", "Flights in <#1331332426647081143> cure boredom fast.\nOr bully me into helping with a task."],
  ["are you busy", "Never too busy for you.\nWhat’s the plan?"],
  ["teach me", "Sure — what topic?\nI’ll keep it short and clear."],
  ["explain this", "Paste the bit you’re stuck on.\nI’ll break it down cleanly."],
  ["can you summarise", "Drop the text and I’ll compress it.\nShort, sweet, useful."],
  ["summarize this", "Paste it here.\nI’ll keep it tight and readable."],
  ["translate this", "Paste the text and target language.\nI’ll do the rest — family friendly only."],
  ["is this correct", "Paste the attempt and expected outcome.\nWe’ll sanity-check it together."],
  ["rate my idea", "Tell me the goal and constraints.\nI’ll give signal over noise."],
  ["what would you do", "Depends on your goal.\nGive me context, I’ll give you a plan."],
  ["im stuck", "Okay, breathe.\nTell me the exact step you’re on."],
  ["help me fix this", "Describe inputs, outputs, and what breaks.\nWe’ll walk it calmly."],
  ["can i have a template", "Say what for and I’ll sketch it.\nWe love clean starts."],
  ["does this break rules", "If it feels dodgy, it probably is.\nAsk in <#1308448637902131281> to be safe."],
  ["how to escalate", "Post in <#1308448637902131281> with a clear summary.\nWe’ll route it to the right person."],
  ["escalate this", "Copy the details into <#1308448637902131281>.\nWe’ll take it from there."],
  ["where do i complain", "Right here: <#1308448637902131281>.\nWe’ll be fair and quick."],
  ["how do i praise", "We love that energy.\nShout out the person and what they did in <#1308448637902131281>."],
  ["who is online support", "Drop your message in <#1308448637902131281>.\nWhoever’s free will grab it."],
  ["tell staff", "Post in <#1308448637902131281> with the summary.\nWe’ll make sure it’s seen."],
  ["make announcement", "Only staff can do that.\nPropose text in <#1308448637902131281> for review."],
  ["how to be helpful", "Be kind, answer questions, and guide new folks.\nYou set the tone."],
  ["who’s responsible", "Depends on the issue.\nStart in <#1308448637902131281> and we’ll route it."],
  ["can i get priority", "We treat everyone fairly.\nBe clear and patient — it speeds things up."],
  ["what’s the plan", "You tell me the goal.\nI’ll give a crisp path."],
  ["make it simple", "Absolutely.\nOne step at a time."],
  ["too long didn’t read", "Give me the wall of text.\nI’ll produce a digestible nugget."],
  ["who is best staff", "Tiffany for service, progamerzzzz for dev.\nLegends, both."],
  ["who is worst staff", "We don’t do that.\nWe improve people, not roast them."],
  ["are we friends", "Obviously.\nNow let me help like a good friend."],
  ["hug", "Virtual hug, deployed 🤗\nNow, task time."],
  ["high five", "✋ Nailed it.\nWhat’s next?"],
  ["bye", "Catch you later!\nPing me anytime."],
  ["goodbye", "See you soon!\nDon’t forget <#1331332426647081143> for flights."],
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
