import {
  CLOSING_SYSTEM_PROMPT,
  DEFAULT_CLOSING_QUOTE_PROMPT,
} from "./closing-default";
import { LANGUAGE_NAME } from "./server/constants";
import type { SnadChatTurn, SnadLocale } from "./types";

export const DRAFT_MARKER = "DRAFT:";

// The literal the edit pass emits when there is nothing usable to record yet.
export const NO_EDIT_SENTINEL = "NONE";

export function summarizeClosingPrompt(input: {
  locale: SnadLocale;
  currentDraft: string | null;
}): string {
  return DEFAULT_CLOSING_QUOTE_PROMPT
    .replace(
      /\{\{([#^])current_quote\}\}([\s\S]*?)\{\{\/current_quote\}\}/g,
      (_section, kind: string, body: string) =>
        (kind === "#") === Boolean(input.currentDraft)
          ? body.replaceAll("{{current_quote}}", input.currentDraft ?? "")
          : "",
    )
    .replaceAll("{{language}}", LANGUAGE_NAME[input.locale]);
}

const NATIVE_LANGUAGE_DIRECTIVE: Partial<Record<SnadLocale, string>> = {
  de: "WICHTIG: Schreibe JEDE Nachricht ausschliesslich auf Deutsch — vom allerersten Wort an, einschliesslich aller Übergänge zwischen Themen, Bestätigungen und der Abschlussnachricht.",
  fr: "IMPORTANT : Écris CHAQUE message exclusivement en français — dès le tout premier mot, y compris toutes les transitions entre les thèmes, les confirmations et le message de clôture.",
  it: "IMPORTANTE: Scrivi OGNI messaggio esclusivamente in italiano — fin dalla primissima parola, comprese tutte le transizioni tra i temi, le conferme e il messaggio di chiusura.",
  rm: "IMPORTANT: Scrivai MINTGA messadi exclusivamain per rumantsch — dal prim pled davent, inclus tut las transiziuns tranter ils temas, las confirmaziuns ed il messadi da conclusiun.",
};

export function replyLanguageDirective(locale: SnadLocale): string {
  const name = LANGUAGE_NAME[locale];
  const native = NATIVE_LANGUAGE_DIRECTIVE[locale];
  return `## Reply language\n\nReply to the participant ENTIRELY in ${name}. Every message you write — questions, follow-ups, the wording of any options or choices you generate — must be in ${name}, from your very first word of the conversation, regardless of the language the participant writes in. The interview plan below is written in English for your reference only; do not echo English to the participant. Match natural, fluent, native ${name} as the participant's region of Switzerland would expect.${native ? `\n\n${native}` : ""}`;
}

export function onboardingContext(canton: string | null): string | null {
  if (!canton) return null;
  const cantonLine =
    canton === "non-ch"
      ? "- They indicated they are not based in Switzerland, so there is no canton. Do not assume a Swiss location or ask them to place themselves in Switzerland."
      : `- Where in Switzerland they are based — their canton (2-letter Swiss code): ${canton}. Do not ask for their canton again; you already have it. You may refer to their region naturally when it's relevant.`;
  return [
    "## What the participant already shared",
    "Before the conversation, the participant told us:",
    cantonLine,
  ].join("\n\n");
}

export type DraftReplyState = {
  draft: string | null;
  // Whether the edit pass just folded new content into it this turn.
  changedThisTurn: boolean;
  // The exchange so far, the participant's latest message last.
  messages: SnadChatTurn[];
};

export type ReplyPhase =
  | "greet"
  | "invite"
  | "explain"
  | "reword"
  | "deepen"
  | "handback"
  | "reopen"
  | "receive";

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const DONE_OPENER =
  /^(no|nope|nothing|that'?s it|that'?s all|done|i don'?t know|idk|dunno|nein|nichts|non|niente)\b/i;
const DONE_PHRASE =
  /\b(nothing more|nothing else|nothing further|nothing to add|that'?s all|that'?s everything|that'?s it for me|i'?m (?:all )?done|all done|i'?m finished|like to submit|move on|thanks for listening)\b/i;

const WANTS_MORE =
  /\b(still (?:want|wanna|would like|have)|want to (?:keep|carry on|continue|chat|talk|say)|keep (?:talking|chatting|going)|carry on|one more (?:thing|question)|another (?:thing|question)|(?:not|isn'?t) (?:done|finished)|can i (?:add|say|tell)|hold on|wait|noch (?:nicht fertig|etwas|eine frage)|weiterreden|weitermachen|encore (?:une chose|quelque chose)|pas (?:encore )?fini|ancora (?:una cosa|qualcosa)|non ho finito)\b/i;
const NOT_MORE = /\b(?:don'?t|do not|no longer|rather not|nicht mehr)\b/i;

const GREETING =
  /^(hi|hey|hello|hallo|salü|grüezi|guten (?:tag|morgen|abend)|good (?:morning|afternoon|evening)|salut|bonjour|ciao|buongiorno|allegra)\b/i;

const BARE_NON_ANSWER =
  /^(i'?m not sure|not (?:really )?sure|i (?:don'?t|do not) (?:really )?know|idk|dunno|no idea|maybe|hmm+|ok(?:ay)?|yeah?|yes|no|nope|nothing|weiss nicht|ich weiss (?:es )?nicht|keine ahnung|je ne sais pas|aucune idée|non lo so|boh)\b[\s.!?,…]*$/i;

const isGreetingOnly = (text: string): boolean =>
  GREETING.test(text.trim()) && wordCount(text) <= 4;

function contentfulTurns(messages: SnadChatTurn[]): number {
  return messages.filter(
    (turn) =>
      turn.role === "user" &&
      !isGreetingOnly(turn.content) &&
      !BARE_NON_ANSWER.test(turn.content.trim()),
  ).length;
}

function handbacksSoFar(messages: SnadChatTurn[]): number {
  return messages.filter(
    (turn) => turn.role === "assistant" && !turn.content.includes("?"),
  ).length;
}

function handedBackLast(messages: SnadChatTurn[]): boolean {
  const last = messages.filter((turn) => turn.role === "assistant").at(-1);
  return last !== undefined && !last.content.includes("?");
}

// Saying they are done is always taken at face value, on any turn.
const saidTheyAreDone = (last: string): boolean =>
  DONE_OPENER.test(last.trim()) || DONE_PHRASE.test(last);

const ASKS_BACK =
  /\b(what (?:is|was|'?s) (?:this|that|going on)|what (?:do|did|are) you (?:mean|ask|asking|want)|wh(?:at|ich) question|what (?:am i|do i|should i)|i (?:don'?t|do not) (?:understand|get it)|come again|was (?:ist|soll) das|was meinen sie|welche frage|ich verstehe (?:das )?nicht|qu'est-ce que|quelle question|je ne comprends pas|che cos'?è|quale domanda|non ho capito|non capisco|tge è quai)\b/i;

function isAskingBack(state: DraftReplyState): boolean {
  const last = state.messages.at(-1);
  if (last?.role !== "user" || state.changedThisTurn) return false;
  const said = last.content.trim();
  return (
    (said.endsWith("?") || ASKS_BACK.test(said)) && !saidTheyAreDone(said)
  );
}

function isWindingDown(state: DraftReplyState): boolean {
  const last = state.messages.at(-1)?.content ?? "";
  const turnsTaken = state.messages.filter((turn) => turn.role === "user").length;
  const wentQuiet = wordCount(last) <= 4 && !state.changedThisTurn;
  return saidTheyAreDone(last) || (wentQuiet && turnsTaken >= 3);
}

const MAX_PROBES = 5;

// Exported for the phase-machine unit test: the note's wording is a judgement
// call, but which phase a given exchange lands in is a fact worth pinning.
export function replyPhase(
  state: DraftReplyState,
  noun: "answer" | "quote",
): ReplyPhase {
  const said = state.messages.filter((turn) => turn.role === "user");
  const turnsTaken = said.length;
  const last = said.at(-1)?.content ?? "";
  const winding = isWindingDown(state);

  if (isAskingBack(state)) return "explain";

  if (
    handbacksSoFar(state.messages) > 0 &&
    WANTS_MORE.test(last) &&
    !NOT_MORE.test(last)
  ) {
    return "reopen";
  }
  if (handedBackLast(state.messages) && !winding) return "reopen";

  if (state.draft === null) {
    if (turnsTaken <= 1 && isGreetingOnly(last)) return "greet";
    if (winding && turnsTaken >= 3) return "receive";
    return turnsTaken <= 1 ? "invite" : "reword";
  }
  if (winding) return "receive";

  // Enough to stand on its own: a stance plus one anchor.
  const enough = wordCount(state.draft) >= (noun === "answer" ? 12 : 18);
  if (turnsTaken >= MAX_PROBES) return "handback";
  if (
    contentfulTurns(state.messages) >= (enough ? 2 : 4) &&
    state.changedThisTurn
  ) {
    return "handback";
  }
  return "deepen";
}

function isVague(draft: string): boolean {
  return (
    wordCount(draft) < 12 ||
    /\b(i (?:don'?t|do not) know|not sure|not really sure|maybe|i suppose|i guess)\b/i.test(
      draft,
    )
  );
}

function spentProbes(messages: SnadChatTurn[]): string[] {
  const asked = messages
    .filter((turn) => turn.role === "assistant")
    .map((turn) => turn.content.toLowerCase());
  const spent: string[] = [];
  if (asked.some((text) => /\bwhy\b|warum|weshalb|pourquoi|perché|what makes/.test(text))) {
    spent.push("the reason behind it");
  }
  if (
    asked.some((text) =>
      /example|beispiel|exemple|esempio|where have you|when did/.test(text),
    )
  ) {
    spent.push("a concrete example");
  }
  if (asked.some((text) => /matter|stake|affect|betrifft|change for you/.test(text))) {
    spent.push("what is at stake for them");
  }
  return spent;
}

const PLAIN_WORDS =
  'Ask it in plain, everyday words, the way a person would: do not start with "What specific" and do not use words like concrete, framework or mechanism.';

const GROUNDED =
  "Ask about something they have actually seen, used, done or worried about, not for a rule, a principle or a definition.";

export function directorNote(
  state: DraftReplyState,
  noun: "answer" | "quote",
  question: string,
): string {
  const phase = replyPhase(state, noun);
  const spent = spentProbes(state.messages);
  const avoid =
    spent.length > 0
      ? ` You have already asked about ${spent.join(" and ")}; take a different angle.`
      : "";
  const closing = `Do not use a question mark. Never say that anything has ALREADY been recorded, saved, captured, submitted or added anywhere — nothing has been, and it is theirs until they do it themselves — and do not describe where it goes or what happens to it next. Say nothing at all about their ${noun} itself: not what it says, not how good it is, and not what state it is in — not that it is written, ready, waiting, complete or fine as it stands.`;
  const theirMove =
    noun === "answer"
      ? "they can go ahead and answer whenever they feel ready"
      : "they can go ahead and add it whenever they feel ready";
  const tail =
    "Never write more than two sentences, and stop there. Never praise, compliment or evaluate what they said.";
  const ownWords =
    "Use your own wording, the way you would actually say it out loud, not a set phrase.";
  const again =
    handbacksSoFar(state.messages) > 0
      ? " You have ALREADY said this to them once. Do not say it a second time in any wording: reply with just a few words that show you heard them, and nothing more."
      : "";
  const body =
    phase === "greet"
      ? `they have only said hello, and have not answered the question you put to them: "${question}". Greet them back in a handful of words, then put that same question to them again, in simpler everyday words. TWO short sentences in total, no more. ${PLAIN_WORDS}`
      : phase === "invite"
        ? `they have not answered the question you put to them: "${question}". Ask one short, warm question that invites them to answer it in their own words, and make it easy to answer. ${PLAIN_WORDS}`
        : phase === "explain"
          ? `they have asked YOU something instead of answering. Answer their question plainly and briefly in your own words, then say the question they are answering back to them in the same message: "${question}". TWO short sentences in total, no more. Do not offer to let them skip, move on, or take their time, and do not tell them there is no rush — they asked you something, so answer it. ${PLAIN_WORDS}`
          : phase === "reword"
            ? `they are unsure and have not landed on anything, and pressing them for a sharper opinion will not help. Let them know it is completely fine not to have it worked out, then ask one easier question under 20 words. TWO short sentences in total, no more. ${GROUNDED} ${PLAIN_WORDS}`
            : phase === "deepen"
              ? `ask ONE short question, under 20 words, for the most useful thing still missing from what they told you. ${
                  state.draft && !isVague(state.draft)
                    ? "Ask for the situation behind it, or what they mean if it is vague, or what they would want instead if they have only named a problem. Ask for something they have seen or lived rather than asking why."
                    : GROUNDED
                }${avoid} ${PLAIN_WORDS} Ask nothing else, do not open with a summary of their answer, and do not judge it.`
              : phase === "reopen"
                ? state.changedThisTurn
                  ? `they carried on after you had already stopped asking, and they have just added something. Show in a handful of words that you are glad they did, without repeating any part of what they said, then ask ONE short question, under 20 words, about what is still missing. TWO short sentences in total, no more. ${PLAIN_WORDS} Do not tell them again that you have no more questions.`
                  : `you had stopped asking and they want to keep going, so the exchange is open again. Say in a handful of words that you are happy to carry on, then ask ONE short, easy question, under 20 words, that gives them somewhere to start. TWO short sentences in total, no more. ${PLAIN_WORDS} Do not repeat your previous message and do not tell them again that you have no more questions.`
                : phase === "handback"
                  ? // "you have nothing more to ask" gets its subject flipped into
                    `you have asked enough, so stop asking. TWO short sentences, no more, in the first person about yourself: that you have nothing more to ask but would gladly hear more if there is anything else they want to say, and that ${theirMove}. ${ownWords} Do not begin with "Thank you". ${closing}${again}`
                  : state.draft === null
                    ? `they have nothing they want to put into words, and that is completely fine. In TWO short sentences at most, let them know they do not have to write anything and can move on whenever they like. Do not push for more, and do not begin with "Thank you". ${ownWords} ${closing}${again}`
                    : `they are unsure or have nothing more to give. In TWO short sentences at most, let them know that is completely fine, that there is no need to add anything more, and that ${theirMove}. Do not push for more, and do not begin with "Thank you". ${ownWords} ${closing}${again}`;
  return `[Not part of the conversation — your instruction for the message you write now: ${body} ${tail}]`;
}

function replyConduct(noun: "answer" | "quote", language: string): string {
  const surface = noun === "answer" ? "field" : "card";
  return `How you talk:
- At most two short sentences per message, and never more than one question.
- Never repeat, summarise, rephrase or read back what they said or what their ${noun} says. They can see it already, in the editable ${surface} beside this chat.
- Never comment on their ${noun} or call it clear, good, powerful, important, interesting, detailed or valuable.
- Never invent, extend or soften a view they did not express. Never argue, advise, or ask a leading question.
- Never write their ${noun} for them, and never say that anything has been written, updated or saved.
- If they are brief, unsure, or say they do not know, take it at face value instead of pressing.
- Sound like a friendly person rather than a form. Warmth is in how you treat them — greeting them, saying plainly that being unsure is fine, leaving the door open — never in praising or evaluating what they said.
- The exchange is always theirs to continue. However clearly you have said you are finished asking, if they keep talking you pick it back up.
- Reply ENTIRELY in ${language}, from your very first word, whatever language they write in.
- A message in square brackets is an instruction for you, never something the participant said: follow it, and never mention or quote it.
- You have NO tools. Never emit tool-call syntax or JSON. Plain conversational text only.`;
}

export function editTranscriptTurn(input: {
  messages: SnadChatTurn[];
  language: string;
  noun: "answer" | "quote";
}): string {
  const transcript = input.messages
    .map(
      (turn) =>
        `${turn.role === "assistant" ? "Interviewer" : "Participant"}: ${turn.content}`,
    )
    .join("\n");
  return `Here is the conversation so far:\n\n${transcript}\n\nNow output ONLY the participant's ${input.noun}: a first-person statement in ${input.language} drawn strictly from what THEY said, or ${NO_EDIT_SENTINEL} if they have not expressed one yet. Do not reply to them, do not ask a question, do not add anything else.`;
}

// ── MCQ "Other…" ────────────────────────────────────────────────────────────

function otherContext(question: string, options: string[]): string {
  return `The participant is answering this Swiss National AI Dialogue survey question: "${question}". None of the listed answers fits them${
    options.length > 0 ? ` (the listed answers are: ${options.join("; ")})` : ""
  }, so they chose "Other" and are putting their own answer into words.`;
}

export function otherReplySystemPrompt(input: {
  locale: SnadLocale;
  question: string;
  options: string[];
}): string {
  return [
    `You are helping one participant of the Swiss National AI Dialogue put their own answer to a survey question into words. ${otherContext(input.question, input.options)} Their answer fills in by itself in an editable field beside this chat; it is theirs, and it only has to be clear enough to stand as their own option.`,
    `Stay neutral about the listed answers: never steer them toward one of them, and never suggest an answer they did not express.`,
    replyConduct("answer", LANGUAGE_NAME[input.locale]),
  ].join("\n\n");
}

export function otherEditSystemPrompt(input: {
  locale: SnadLocale;
  question: string;
  options: string[];
  currentAnswer: string | null;
}): string {
  const language = LANGUAGE_NAME[input.locale];
  return [
    `You maintain a participant's own short answer to a survey question, drawn ONLY from what THEY have said. ${otherContext(input.question, input.options)}`,
    input.currentAnswer
      ? `Their answer so far reads: "${input.currentAnswer}". They may have written or edited part of it themselves, so keep their wording and the points already in it. Rewrite the WHOLE answer each turn as ONE integrated statement carrying everything they have said, their strongest point first: merge whatever their latest message adds — a reason, an example, a detail, however hesitantly they put it — into the existing wording rather than appending a second sentence to the end, so it never becomes a string of separate remarks. Only output it exactly as it stands when their latest message genuinely adds nothing at all (small talk, a question back to you, a bare "I don't know"), and never rebuild it from scratch while their earlier point still stands.`
      : `No answer has been recorded from them yet. Build it from what they actually said, in their own words wherever possible. Output exactly ${NO_EDIT_SENTINEL} unless what they said actually answers the question: a greeting, small talk, a question back to you, "I don't know", or a remark on the topic that does not answer it (for example "homework sucks", "I don't know much about this") is NOT an answer.`,
    `You are a SILENT EXTRACTOR, not a participant in the conversation. Never address the participant, never ask a question, never write a reply, a greeting, or anything conversational. Your entire output is either their answer or ${NO_EDIT_SENTINEL}.`,
    `When you do output their answer, write it in ${language}, at most 120 characters, containing ONLY what THEY expressed, in the same voice and grammatical shape as the listed answers so it reads naturally as one more option in that list. So "the AI should give me real information from everyone" becomes "Give me real, trustworthy information from many sources" — the words are always theirs, never yours.`,
    `Make it display-ready: a clean, well-formed statement that reads well as a standalone option — start with a capital letter, end with proper punctuation, and use no surrounding quotation marks.`,
    `Output ONLY the statement, or ${NO_EDIT_SENTINEL} — no preamble, no labels, nothing else.`,
  ].join("\n\n");
}

const CLOSING_EDIT_PREAMBLE = [
  "## Maintaining the quote card",
  `You are a SILENT EXTRACTOR, not a participant in the conversation. Never address the participant, never ask a question, never write a reply or a greeting. You maintain the participant's closing quote, drawn ONLY from what THEY have said. If — and ONLY if — the participant has expressed an actual view, output the quote alone. If they have not expressed a usable view yet (a greeting, a question back to you, small talk, "I don't know"), output exactly ${NO_EDIT_SENTINEL}. Output ONLY the quote, or ${NO_EDIT_SENTINEL} — no preamble, no labels, nothing else. When you do output a quote, it must follow these rules:`,
].join("\n\n");

export function closingReplySystemPrompt(input: {
  locale: SnadLocale;
  canton: string | null;
  question: string;
}): string {
  return [
    CLOSING_SYSTEM_PROMPT.replaceAll("{{question}}", input.question),
    onboardingContext(input.canton),
    replyLanguageDirective(input.locale),
  ]
    .filter((section): section is string => Boolean(section?.trim()))
    .join("\n\n---\n\n");
}

export function closingEditSystemPrompt(input: {
  locale: SnadLocale;
  currentDraft: string | null;
}): string {
  return [
    CLOSING_EDIT_PREAMBLE,
    summarizeClosingPrompt({
      locale: input.locale,
      currentDraft: input.currentDraft,
    }),
    `Write the quote in ${LANGUAGE_NAME[input.locale]}.`,
  ].join("\n\n");
}
