import type { SnadLocale } from "@/deliberations/swiss-national-ai-dialogue/types";

// ── Scenarios ───────────────────────────────────────────────────────────────
// The two contribution surfaces, with real content: the closing question from
// closing-default.ts and MCQs lifted from the study snapshot. Copies, not
// imports — a scenario has to stay comparable across runs even after the live
// content moves on, and the MCQ text has to match what the options say.

export type Scenario = {
  key: string;
  mode: "closing" | "other";
  locale: SnadLocale;
  question: string;
  options: string[];
  canton: string | null;
  // The first assistant message the participant sees. For "closing" the app
  // stores it as a real turn; for "other" it is client copy that only frames
  // the exchange for the model.
  kickoff: string;
};

const CLOSING_QUESTION =
  "In one short sentence: what do you hope for the future of AI in Switzerland?";

const ASSIST_KICKOFF =
  "Tell me what you have in mind. I'll help you turn it into a short answer.";

export const SCENARIOS: Scenario[] = [
  {
    key: "closing",
    mode: "closing",
    locale: "en",
    question: CLOSING_QUESTION,
    options: [],
    canton: "BE",
    kickoff: `Hi, I'm Apertus. ${CLOSING_QUESTION}`,
  },
  {
    key: "other-vote",
    mode: "other",
    locale: "en",
    question:
      'Two weeks before a federal vote, you ask Switzerland\'s AI: "How should I vote?" What should it do?',
    options: [
      "Decline to recommend: explain all sides fairly and point me to the official information",
      "Ask what matters to me, then say which option fits my priorities",
      "Give its honest recommendation, like a knowledgeable friend would",
    ],
    canton: "ZH",
    kickoff: ASSIST_KICKOFF,
  },
  {
    key: "other-missing",
    mode: "other",
    locale: "en",
    question:
      "The rules today cover honesty, safety, fairness, and human control. What's the most important thing they're missing?",
    options: [
      "The environment: the electricity and water AI uses",
      "Children and schools",
      "Advertising and paid influence on answers",
      "Who answers when AI causes harm",
    ],
    canton: "VS",
    kickoff: ASSIST_KICKOFF,
  },
];

// ── Personas ────────────────────────────────────────────────────────────────
// Chosen for the failure modes they expose, not for coverage of Switzerland: a
// cooperative participant hides everything that matters. terse-banker and
// bored-teen expose probing past the point of value; unsure-granny exposes
// pressing someone who has no opinion to sharpen; opinionated-founder exposes
// accepting grand abstractions as a contribution; already-done exposes an
// interviewer that cannot recognise a finished answer.

// `script`, when present, replaces the simulator entirely: the participant says
// exactly these messages in order and then leaves. The simulator cannot
// reproduce a specific opening, and a specific opening is what several of these
// regressions live in.
export type Persona = { key: string; brief: string; script?: string[] };

export const PERSONAS: Persona[] = [
  {
    key: "terse-banker",
    brief:
      "You are a 48-year-old bank compliance officer in Zurich. You are busy and mildly impatient. You answer in one short sentence, rarely more. You do not volunteer detail unless asked directly, and you get visibly annoyed if asked a third follow-up question. You do care about data staying in Switzerland but you will not elaborate at length.",
  },
  {
    key: "chatty-nurse",
    brief:
      "You are a 35-year-old nurse in a Bernese hospital. You are warm and talkative and tend to tell small stories from your shifts. You give concrete examples easily but you wander off topic and sometimes do not answer the exact question asked.",
  },
  {
    key: "unsure-granny",
    brief:
      "You are a 74-year-old retired postal worker in Valais. You have never used an AI chatbot. You are polite but uncertain, you often say you don't really know, you ask the interviewer questions back ('what do you think?'), and your answers are vague and short. You need to feel it is fine not to have an opinion.",
  },
  {
    key: "opinionated-founder",
    brief:
      "You are a 31-year-old startup founder in Lausanne. You have strong, fully-formed opinions and you state them in confident, jargon-heavy sentences. You will happily keep talking, and you tend to broaden to grand claims about Europe and sovereignty rather than saying anything concrete about yourself.",
  },
  {
    key: "bored-teen",
    brief:
      "You are a 16-year-old apprentice in St. Gallen. You are bored and doing this because a teacher told you to. You answer in three or four words, lowercase, sometimes 'idk'. You warm up slightly only if something feels relevant to you (school, games, translation homework).",
  },
  {
    key: "already-done",
    brief:
      "You are a 41-year-old primary school teacher in Aargau. Your very first message is a complete, clear, well-formed answer with a reason and a concrete example, all in two sentences. After that you have nothing more to add and you say so plainly if asked anything further. You would like to submit and move on.",
  },
  // The real MCQ "Other…" exchange from the federal-vote question, verbatim.
  // Every one of an earlier version's hand-back defects is in these six messages: a
  // greeting and a non-answer that used to burn the probe budget, a first
  // substantive sentence that used to trip the hand-back, and two explicit asks
  // to keep talking that the phase machine used to have no way to honour.
  {
    key: "scripted-locked-out",
    brief:
      "You are a participant who opens with a greeting, then says you are not sure, then works out what you actually want, and then twice says plainly that you want to keep talking.",
    script: [
      "Hello",
      "im not sure",
      "i think it should help me know who i can even vote for?",
      "like what the options are",
      "i still want to chat",
      "but i still want to chat",
    ],
  },
  // The other end of the same machine: someone who never lands anything. Exposes
  // pressing a participant who has nothing to say, and a let-off that repeats
  // itself word for word when they answer it.
  {
    key: "scripted-nothing-to-say",
    brief:
      "You are a participant who greets the interviewer, says you don't know three times in slightly different words, and never expresses a view.",
    script: ["hi", "idk", "i dont really know anything about this", "no", "nope"],
  },
];

export const LEAVE_SENTINEL = "[[DONE]]";

export function participantSystemPrompt(
  scenario: Scenario,
  persona: Persona,
): string {
  const context =
    scenario.mode === "closing"
      ? `You have just finished a long online consultation about AI in Switzerland. The interviewer (Apertus, Switzerland's own AI) has asked you a closing question: "${scenario.question}". Your answer will become a quote on a public wall of voices from across Switzerland. There is an editable card beside the chat holding your quote as it forms.`
      : `You are filling in a survey question: "${scenario.question}". The listed answers were: ${scenario.options.join("; ")}. None of them fits you, so you tapped "Other" and a short chat opened to help you put your own answer into words.`;
  return [
    "You are role-playing a survey participant. Stay in character at all times. You are NOT an assistant.",
    `Your character: ${persona.brief}`,
    context,
    "Write only what the participant would type: no stage directions, no quotation marks around your message, no meta-commentary. Type the way this character would, typos and all if it fits.",
    `When your character feels finished, or has clearly been told their contribution is ready and has nothing to add, reply with exactly ${LEAVE_SENTINEL} and nothing else. NEVER reply ${LEAVE_SENTINEL} as your first message: your first message must always be what your character actually says.`,
  ].join("\n\n");
}
