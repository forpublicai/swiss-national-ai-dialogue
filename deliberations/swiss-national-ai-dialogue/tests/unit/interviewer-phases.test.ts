import {
  replyPhase,
  type ReplyPhase,
} from "@/deliberations/swiss-national-ai-dialogue/interviewer-prompts";
import type { SnadChatTurn } from "@/deliberations/swiss-national-ai-dialogue/types";

type Beat = { said: string; card: string | null; reply: string };

const phasesOf = (beats: Beat[], noun: "answer" | "quote"): ReplyPhase[] => {
  const messages: SnadChatTurn[] = [];
  let draft: string | null = null;
  return beats.map((beat) => {
    messages.push({ role: "user", content: beat.said });
    const changedThisTurn = beat.card !== draft;
    draft = beat.card;
    const phase = replyPhase({ draft, changedThisTurn, messages }, noun);
    messages.push({ role: "assistant", content: beat.reply });
    return phase;
  });
};

const PROBE = "What would that look like for you?";
const STOPPED_ASKING =
  "I have nothing more to ask, though I'd gladly hear more if you want to keep going. You can use it as your answer whenever you're happy with it.";

const theExchangeThatLockedTheParticipantOut = (): Beat[] => [
  { said: "Hello", card: null, reply: PROBE },
  { said: "im not sure", card: null, reply: PROBE },
  {
    said: "i think it should help me know who i can even vote for?",
    card: "It should help me know who I can even vote for",
    reply: PROBE,
  },
  {
    said: "like what the options are",
    card: "It should show me who I can vote for and what the options are",
    reply: STOPPED_ASKING,
  },
  {
    said: "i still want to chat",
    card: "It should show me who I can vote for and what the options are",
    reply: PROBE,
  },
  {
    said: "but i still want to chat",
    card: "It should show me who I can vote for and what the options are",
    reply: STOPPED_ASKING,
  },
];

const theExchangeThatNeverAnsweredTheQuestion = (): Beat[] => [
  { said: "Hello!", card: null, reply: PROBE },
  { said: "what is this?", card: null, reply: PROBE },
  { said: "what is this about", card: null, reply: PROBE },
  { said: "what question is this?", card: null, reply: PROBE },
  { said: "what did you ask?", card: null, reply: PROBE },
];

describe("contribution interviewer phase machine", () => {
  it("answers a participant who asks a question back instead of brushing them off", () => {
    const phases = phasesOf(theExchangeThatNeverAnsweredTheQuestion(), "quote");

    expect(phases).toEqual([
      "greet",
      "explain",
      "explain",
      "explain",
      "explain",
    ]);
  });

  it("still takes a participant who is finished at their word when they end on a question mark", () => {
    const card = "I hope AI stays in Swiss hands";

    const phases = phasesOf(
      [
        { said: "I hope AI stays in Swiss hands", card, reply: PROBE },
        { said: "that's all I have, ok?", card, reply: PROBE },
      ],
      "quote",
    );

    expect(phases[1]).toBe("receive");
  });

  it("spends the probe budget on content, not on a greeting or a shrug", () => {
    const phases = phasesOf(theExchangeThatLockedTheParticipantOut(), "answer");

    expect(phases.slice(0, 4)).toEqual(["greet", "reword", "deepen", "handback"]);
  });

  it("reopens the exchange whenever the participant keeps talking after a hand-back", () => {
    const phases = phasesOf(theExchangeThatLockedTheParticipantOut(), "answer");

    expect(phases.slice(4)).toEqual(["reopen", "reopen"]);
  });

  it("reopens on any further message, not just an explicit ask to carry on", () => {
    const carriedOnWithSomethingNew: Beat = {
      said: "especially for the cantonal ones, those are the confusing ones",
      card: "It should show me who I can vote for, especially for the confusing cantonal votes",
      reply: PROBE,
    };

    const phases = phasesOf(
      [
        ...theExchangeThatLockedTheParticipantOut().slice(0, 4),
        carriedOnWithSomethingNew,
      ],
      "answer",
    );

    expect(phases[4]).toBe("reopen");
  });

  it("lets a participant who never lands anything off the hook instead of pressing a third time", () => {
    const phases = phasesOf(
      [
        { said: "hi", card: null, reply: PROBE },
        { said: "idk", card: null, reply: PROBE },
        { said: "i dont really know anything about this", card: null, reply: PROBE },
        { said: "no", card: null, reply: STOPPED_ASKING },
      ],
      "answer",
    );

    expect(phases).toEqual(["greet", "reword", "reword", "receive"]);
  });

  it("keeps drawing out a thin contribution rather than handing back on the first sentence", () => {
    const phases = phasesOf(
      [
        { said: "more privacy", card: "I want more privacy", reply: PROBE },
        {
          said: "with my health data mostly",
          card: "I want more privacy, mostly with my health data",
          reply: PROBE,
        },
      ],
      "quote",
    );

    expect(phases).toEqual(["deepen", "deepen"]);
  });

  it.each([
    "I think maybe that's all I have to say. Thanks for listening",
    "I'm all done for now",
    "that's everything from me",
    "nothing to add really",
  ])("does not reopen after the hand-back when the participant said %p", (said) => {
    const card = "I hope AI is used carefully in Swiss hospitals and schools, not just for profit";

    const phases = phasesOf(
      [
        { said: "AI should be used carefully in hospitals and schools", card, reply: STOPPED_ASKING },
        { said, card, reply: PROBE },
      ],
      "quote",
    );

    expect(phases[1]).toBe("receive");
  });

  it("keeps going when a terse participant goes quiet early rather than treating it as finished", () => {
    const phases = phasesOf(
      [
        { said: "translation homework", card: "AI should help with translation homework", reply: PROBE },
        { said: "ok cool", card: "AI should help with translation homework", reply: PROBE },
      ],
      "quote",
    );

    expect(phases[1]).toBe("deepen");
  });

  it("takes a participant who says they are finished at their word", () => {
    const finished =
      "I hope AI stays under Swiss control and is used in schools to help the kids who fall behind, like my slower readers.";

    const phases = phasesOf(
      [
        {
          said: "I hope AI stays under Swiss control and gets used in schools to help kids who fall behind, like my slower readers.",
          card: finished,
          reply: PROBE,
        },
        { said: "nothing more to add", card: finished, reply: STOPPED_ASKING },
      ],
      "quote",
    );

    expect(phases[1]).toBe("receive");
  });
});
