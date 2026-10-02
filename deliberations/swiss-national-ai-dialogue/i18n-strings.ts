import type { PersonaAxis } from "./archetype";

export type SwissLocale = "de" | "fr" | "it" | "en" | "rm";

export type FaqEntry = { question: string; answer: string };

export interface SwissDict {
  langStep: {
    heading: string;
    subheading: string;
  };
  topics: {
    addYourOwn: string;
    customPlaceholder: string;
    addCustom: string;
    reorderHeading: string;
    reorderSubheading: string;
    reorderKeepHint: string;
    previewHeading: string;
    previewSubheading: string;
    proposeLabel: string;
    proposePlaceholder: string;
    yourTopicKicker: string;
    yourTopicConfirm: string;
    edit: string;
    remove: string;
    labels: Record<
      string,
      { title: string; blurb: string; rationale: string }
    >;
  };
  composer: { placeholder: string; ariaLabel: string };
  progress: {
    gettingStarted: string;
    shaping: string;
    ready: string;
    wrapUp: string;
  };
  intro: {
    cantonBeat: { legal: string; terms: string };
  };
  landing: {
    start: string;
    continue: string;
    review: string;
    inProgress: string;
    scrollHint: string;
    // Hero headline, two stacked display lines (the second set in red).
    headlineTop: string;
    headlineBottom: string;
    heroTagline: string;
    swissEyebrow: string;
    swissStatement: string;
    swissName: string;
    // Ink band: the every-other-AI contrast.
    otherAiEyebrow: string;
    otherAi: string;
    // Red band: the referendum/initiative framing + the direct-line body.
    directEyebrow: string;
    directHeading: string;
    directBody: string;
    // Map social-proof band.
    mapEyebrow: string;
    mapHeading: string;
    mapSub: string;
    mapTotal: string; // "{count} people…" (templated)
    quotesEyebrow: string;
    quotesHint: string;
    quotesAllCantons: string;
  };
  canton: {
    eyebrow: string;
    selectPlaceholder: string; // dropdown empty-state ("Select your canton…")
    notInSwitzerland: string; // dropdown option for non-CH participants
    notInSwitzerlandShort: string; // compact on-map button label ("Not in CH")
    thanks: string; // "Thanks, {name}. Here is where people have taken part from so far."
    thanksFallback: string;
    participants: string; // "{count} participants across Switzerland, including you."
    tooltip: string; // "{count} participants" (map hover)
  };
  tradeoff: {
    eyebrow: string;
    choseToExplain: string;
    dragHint: string;
    // Lowercase separator between the binary card's two stacked options.
    or: string;
    confirm: string;
    leanStrong: string; // "Strongly toward {label}"
    leanToward: string; // "Leaning toward {label}"
    leanSlight: string; // "Slightly toward {label}"
    balanced: string;
    // Post-answer "how others answered" poll (hero7).
    pollHeading: string;
    pollYou: string; // marker on the participant's own side
    // Kicker on the poll-reveal panels ("CH so far").
    pollKicker: string;
  };
  budget: {
    toPlace: string; // "{count} to place"
    placeMore: string; // disabled submit: "Place {count} more"
    average: string; // legend for the CH-mean value in the reveal
  };
  ranking: {
    hint: string; // "Drag to order — most important first"
    submit: string;
    followUpPlaceholder: string; // optional one-line follow-up box
    yours: string; // reveal legend for the participant's own rank
    crowd: string; // reveal legend for the crowd mean rank ("CH avg")
  };
  archetype: {
    eyebrow: string;
    names: Record<string, string>;
    descriptions: Record<string, string>;
    axisLabels: Record<PersonaAxis, string>;
    // "{percent}" placeholder.
    rarity: string;
  };
  // Chrome for the multiple-choice / structured-question card (SwissUserQuestionCard).
  question: {
    other: string;
    // Caption shown above the free-text box when the "Other" row is opened.
    otherPrompt: string;
    otherPlaceholder: string;
    textPlaceholder: string;
    next: string;
    submit: string;
    // The quiet grey per-question skip beside Submit.
    skip: string;
    // Aria labels for the beta thumbs on each question.
    rateUp: string;
    rateDown: string;
    // The optional note panel that opens under a question once it's rated.
    notePrompt: string;
    notePlaceholder: string;
    noteSend: string;
    noteDismiss: string;
    noteThanks: string;
    // Reopening the panel: a rated question always keeps a way back to its note.
    noteAdd: string;
    noteEdit: string;
  };
  shareMore: {
    thanks: string;
    invitation: string;
    talk: string;
    skip: string;
  };
  contribution: {
    kickoff: string;
    cardTitle: string;
    cardHint: string;
    placeholder: string;
    summarize: string;
    summarizing: string;
    anonymous: string;
    submit: string;
    skip: string;
    wallTitle: string;
    wallQuestion: string;
    yourNote: string;
    empty: string;
    nextTopic: string;
    continue: string;
    editNote: string;
    doneEditing: string;
  };
  pager: {
    previous: string;
    next: string;
    resume: string; // back to the live question
    conversation: string; // the review's chat page
  };
  multiSelect: {
    selectAll: string;
    pickUpTo: string; // "Pick up to {count}"
  };
  summary: {
    yourSummary: string;
    editable: string;
    hereIsWhat: string;
    writeShort: string;
    placeholder: string;
    submitEnd: string;
    keepTalking: string;
    ariaLabel: string;
  };
  ack: {
    body: string;
    copyLink: string;
    shareCopied: string;
    wrapUpTab: string;
    // Quiet link at the finale's very end, back to the landing view.
    backHome: string;
  };
  demographics: {
    skip: string;
    otherPlaceholder: string;
    wideRangeNote: string;
    introAbout: string;
    email: {
      heading: string;
      body: string;
      placeholder: string;
      submit: string;
      finishWithout: string;
    };
  };
  feedbackChat: {
    // `heading` is the visible invitation; `title` names the input for screen readers.
    heading: string;
    title: string;
    placeholder: string;
    send: string;
    errorMessage: string;
    retry: string;
  };
  closing: {
    kicker: string;
    placeholder: string;
    anonymous: string;
    submit: string;
    skip: string;
    kickoff: string;
    wallTitle: string;
    wallHeading: string;
    continue: string;
  };
  shape: {
    heading: string;
    body: string;
    placeholder: string;
    submit: string;
    skip: string;
  };
  // The finale's NPS + free-text feedback form (below the archetype reveal).
  nps: {
    heading: string;
    low: string;
    high: string;
    commentPlaceholder: string;
    submit: string;
    thanks: string;
  };
  assist: {
    title: string;
    kickoff: string;
    suggestionLabel: string;
    editedNote: string;
    placeholder: string;
    stem: string;
  };
  faq: FaqEntry[];
  hero: {
    question: string; // the H1 headline
    tagline: string; // sub-headline framing why this matters
    participants: string; // "You're one of {count} people…" (templated)
    credibility: string; // short trust line (Public AI · anonymous · open report)
    opinionsFrom: string;
    conversations: string;
  };
  footer: {
    heading: string;
    intro: string; // "{name} is a public dialogue …"
    collaboration: string;
    legal: string; // copy before the terms link
    terms: string; // link text
  };
  cookieConsent: {
    title: string;
    body: string;
    acceptAll: string;
    rejectAll: string;
    customize: string;
    save: string;
    alwaysOn: string;
    manage: string;
    categories: {
      necessary: { label: string; desc: string };
      analytics: { label: string; desc: string };
      marketing: { label: string; desc: string };
    };
  };
  errorRetry: { message: string; retry: string };
  quoteWall: { readMore: string; showLess: string };
}

// ----- English (reference) -----
const en: SwissDict = {
  langStep: {
    heading: "Choose your language",
    subheading: "You can change it any time.",
  },
  topics: {
    addYourOwn: "Add your own",
    customPlaceholder: "A theme you care about…",
    addCustom: "Add a topic",
    reorderHeading: "What should we start with?",
    reorderSubheading:
      "We'll cover all of these. Tap them in the order that matters most to you.",
    reorderKeepHint: "Happy with this order? Just keep scrolling.",
    previewHeading: "What we'll talk about",
    previewSubheading:
      "We'll move through these together. No need to choose, just so you know where we're headed.",
    proposeLabel: "Anything you want to make sure we cover?",
    proposePlaceholder: "Add one topic of your own (optional)…",
    yourTopicKicker: "Your topic",
    yourTopicConfirm: "We'll make sure to cover this in your conversation.",
    edit: "Edit",
    remove: "Remove",
    labels: {
      "daily-life": {
        title: "AI in my daily life and in Switzerland",
        blurb: "What AI does for you today, and where Switzerland should focus",
        rationale:
          "What AI already does for you, what you'd want it to do better, and where Switzerland should focus its efforts, from the personal to the national.",
      },
      "swiss-or-foreign": {
        title: "Swiss AI or foreign AI: does it matter?",
        blurb: "Whether an AI's origin, governance and Swissness matter",
        rationale:
          "Whether the origin and governance affect your trust, what would make a Swiss alternative worth choosing, and how it reflects Swiss languages, culture and identity.",
      },
      "your-influence": {
        title: "Who controls AI, and what happens when it goes wrong?",
        blurb: "Your say over AI, its limits, and accountability for harm",
        rationale:
          "Whether ordinary people should have a say in how AI systems behave, where AI's limits should be, and who is responsible when it causes harm.",
      },
      "everyday-use": {
        title: "AI in your daily life",
        blurb: "How AI already shows up in everyday life",
        rationale:
          "How you already use AI: what works, what doesn't, and whether the language you speak changes the experience.",
      },
      "public-benefit": {
        title: "Where AI could help Switzerland",
        blurb: "Where better AI could do the most public good",
        rationale:
          "Which parts of Swiss life (health, education, public services) could gain the most, and where the priorities should lie.",
      },
      economy: {
        title: "AI, work and jobs",
        blurb: "AI's role in work, business and Swiss prosperity",
        rationale:
          "Whether AI strengthens Swiss jobs and industry or hollows them out, and where the balance should sit.",
      },
      sovereignty: {
        title: "Swiss AI, or foreign AI?",
        blurb: "Whether an AI's origin and control matter",
        rationale:
          "Whether an AI's origin and control affect your trust, and what would make a Swiss alternative worth choosing.",
      },
      influence: {
        title: "Your say over how AI behaves",
        blurb: "Whether ordinary people should shape AI",
        rationale:
          "Whether ordinary people should have a say in how AI systems behave, and what kind of say that should be.",
      },
      "identity": {
        title: "AI and Swiss identity",
        blurb: "Whether AI should reflect Switzerland's languages and regions",
        rationale:
          "Whether AI should adapt to Switzerland's languages, cultures and regions, and what “local” means to you.",
      },
    },
  },
  composer: { placeholder: "Type your reply…", ariaLabel: "Your reply" },
  progress: {
    gettingStarted: "Just getting started",
    shaping: "Shaping your idea",
    ready: "Ready to submit when you are",
    wrapUp: "Wrap up & submit",
  },
  intro: {
    cantonBeat: {
      legal: "By proceeding you agree to our",
      terms: "Terms of Use and Privacy Notice.",
    },
  },
  canton: {
    eyebrow: "Where in Switzerland?",
    selectPlaceholder: "Select your canton…",
    notInSwitzerland: "Not in Switzerland",
    notInSwitzerlandShort: "Not in CH",
    thanks:
      "Thanks, {name}. Here is where people have taken part from so far.",
    thanksFallback: "got it",
    participants:
      "{count} participants across Switzerland, including you.",
    tooltip: "{count} participants",
  },
  tradeoff: {
    eyebrow: "Where do you lean?",
    choseToExplain: "You chose to explain in your own words.",
    dragHint: "Drag to where you sit, or tap a side",
    or: "or",
    confirm: "Submit",
    leanStrong: "Strongly toward {label}",
    leanToward: "Leaning toward {label}",
    leanSlight: "Slightly toward {label}",
    balanced: "A balance of both",
    pollHeading: "How people answered",
    pollYou: "You",
    pollKicker: "CH so far",
  },
  budget: {
    toPlace: "{count} to place",
    placeMore: "Place {count} more",
    average: "CH average",
  },
  ranking: {
    hint: "Drag to order, most important first",
    submit: "Submit",
    followUpPlaceholder: "Anything else?",
    yours: "You",
    crowd: "CH avg",
  },
  archetype: {
    eyebrow: "Your AI personality",
    names: {
      "pioneer": "The Pioneer",
      "mountain-guide": "The Mountain Guide",
      "watchmaker": "The Watchmaker",
      "st-bernard": "The St. Bernard",
      "innkeeper": "The Innkeeper",
      "ranger": "The Ranger",
      "alphorn-player": "The Alphorn Player",
      "bridge-builder": "The Bridge Builder",
    },
    descriptions: {
      "pioneer": "First on the new trail. You want the best AI now, and you'll take some risk to get it.",
      "mountain-guide": "Straight answers in any weather. You want an AI that tells it like it is.",
      "watchmaker": "Precision over speed: every safeguard in place before the mechanism runs.",
      "st-bernard": "Warm and watchful: an AI that genuinely cares for people, and protects them.",
      "innkeeper": "Everyone gets a seat at your table: an AI that's warm, useful, and easy to welcome in.",
      "ranger": "You guard the valley: sparing with trust, serious about privacy, loyal to what's local.",
      "alphorn-player": "Your voice carries across the valley: a Swiss AI the whole community shapes together.",
      "bridge-builder": "You build the spans between sides: an AI that's fair, careful, and accountable to all.",
    },
    axisLabels: {
      curiosity: "Curiosity",
      candor: "Candor",
      heart: "Heart",
      guard: "Protection",
      roots: "Roots",
      voice: "Voice",
    },
    rarity: "{percent}% of participants share this profile",
  },
  question: {
    other: "Other:",
    otherPrompt: "Here are the options we could think of. What are we missing?",
    otherPlaceholder: "Type your own answer…",
    textPlaceholder: "Type your answer…",
    next: "Next",
    submit: "Submit",
    skip: "Skip",
    rateUp: "Good question",
    rateDown: "Not a good question",
    notePrompt: "Thanks. Anything you'd add about this question?",
    notePlaceholder: "What worked, or what didn't…",
    noteSend: "Send",
    noteDismiss: "No thanks",
    noteThanks: "Thanks for the feedback.",
    noteAdd: "Add a comment",
    noteEdit: "Edit comment",
  },
  shareMore: {
    thanks: "Thanks for sharing your views on “{topic}”.",
    invitation:
      "This is a two-way conversation. Beyond the questions we prepared, we'd love to hear what matters to you. Would you like to say more?",
    talk: "I'd like to say more",
    skip: "Skip",
  },
  contribution: {
    kickoff:
      "What would you most want the team building Switzerland's AI to understand about this topic? Say it in your own words. We'll shape it into your contribution together.",
    cardTitle: "Your contribution",
    cardHint:
      "Your statement for this topic's wall of voices. Write it directly, or chat below and summarize when it sounds like you.",
    placeholder: "In your own words…",
    summarize: "Summarize our chat",
    summarizing: "Summarizing…",
    anonymous:
      "Shown anonymously to other participants; only your canton appears with it.",
    submit: "Add to the wall",
    skip: "Skip",
    wallTitle: "Your contribution is on the wall",
    wallQuestion: "What others are saying",
    yourNote: "Your contribution",
    empty: "More voices will appear here as others take part.",
    nextTopic: "Continuing to the next topic…",
    continue: "Continue",
    editNote: "Edit your note for the wall",
    doneEditing: "Done",
  },
  pager: {
    previous: "Previous question",
    next: "Next question",
    resume: "Back to the current question",
    conversation: "Conversation",
  },
  multiSelect: {
    selectAll: "Select all that apply",
    pickUpTo: "Pick up to {count}",
  },
  summary: {
    yourSummary: "Your summary",
    editable: "editable",
    hereIsWhat:
      "Here is what I heard from you. Edit it so it reads exactly the way you want, then submit.",
    writeShort:
      "Write a short summary of what matters most to you, then submit.",
    placeholder: "In your own words…",
    submitEnd: "Submit & end",
    keepTalking: "Not yet, I want to keep talking",
    ariaLabel: "Your summary (editable)",
  },
  ack: {
    body: "Your voice is now part of the national picture of what Switzerland wants from AI. Know someone who should have their say? Share the link.",
    copyLink: "Copy link to share",
    shareCopied: "Link copied to clipboard",
    wrapUpTab: "Wrap-up",
    backHome: "Back to the start page",
  },
  demographics: {
    skip: "Skip",
    otherPlaceholder: "Please specify",
    wideRangeNote:
      "This helps us show that we heard from a wide range of people across Switzerland.",
    introAbout:
      "A few last questions about you, so the results reflect a real cross-section of Switzerland.",
    email: {
      heading: "See what Switzerland decided.",
      body: "Leave an email and we'll update you on how your contributions made a difference.",
      placeholder: "you@example.ch",
      submit: "Submit",
      finishWithout: "Skip",
    },
  },
  feedbackChat: {
    heading: "One quick question before you go…",
    title: "A quick word about the experience",
    placeholder: "Type your reply…",
    send: "Send",
    errorMessage: "That didn't go through.",
    retry: "Try again",
  },
  closing: {
    kicker: "Your quote for the wall",
    placeholder: "I hope that…",
    anonymous: "Anonymous · only your canton is shown",
    submit: "Add to wall",
    skip: "Skip",
    kickoff:
      "Hi, I'm Apertus. {question}",
    wallTitle: "Thank you, your voice is in.",
    wallHeading: "What matters to others",
    continue: "Continue",
  },
  shape: {
    heading: "Which question should this dialogue ask next?",
    body: "You answered ours. Now tell us what Switzerland should be asked about AI, and what this dialogue missed.",
    placeholder: "The question I would put to Switzerland is…",
    submit: "Send",
    skip: "Skip",
  },
  nps: {
    heading: "How likely are you to recommend this dialogue to a friend?",
    low: "Not likely",
    high: "Very likely",
    commentPlaceholder: "Anything else you want to tell us? (optional)",
    submit: "Send feedback",
    thanks: "Thank you for your feedback.",
  },
  assist: {
    title: "Put it in your own words",
    kickoff:
      "Tell me what you have in mind. I'll help you turn it into a short answer.",
    suggestionLabel: "Your answer",
    editedNote: "Edited your answer",
    placeholder: "Type here…",
    stem: "In my own words, …",
  },
  faq: [
    {
      question: "What is this about?",
      answer:
        "AI is already shaping decisions that affect daily life in Switzerland, yet ordinary residents are rarely asked what they think. This dialogue gathers the public's own views on AI, in their own words, to build the most comprehensive picture of what Swiss residents actually want from it, not what experts assume on their behalf.",
    },
    {
      question: "Who is running it?",
      answer:
        "Public AI and Public AI Switzerland, the largest deployers of Switzerland's Apertus in the world, in collaboration with the Swiss National AI Initiative (the builders of Apertus, including ETHZ, EPFL, and CSCS), Change.org, the Collective Intelligence Project, Swiss {ai} Weeks, and Metagov. It is not a government project, and taking part does not commit you to anything.",
    },
    {
      question: "Do I need to know anything about AI to take part?",
      answer:
        "No. The questions are about everyday judgment calls: when an AI should answer or hold back, how your data should be handled, whether the AI should work the same everywhere in Switzerland. You don't need any technical background to have a valuable view.",
    },
    {
      question: "Why does this look like a chat?",
      answer:
        "Instead of a fixed form, our interviewer asks you short questions about Swiss AI and follows up on your answers, so we capture the reasoning behind your views rather than just a tick-box. Some questions appear as cards (a quick choice, a ranking, a map) that you answer in place. You can end the conversation whenever you like.",
    },
    {
      question: "Is it anonymous?",
      answer:
        "Yes. We don't ask for your name or email. A short-lived cookie keeps your session linked across this one conversation, and your responses are stored as anonymous research data. We ask which canton you're from only to understand how views differ across regions, never to identify you.",
    },
    {
      question: "What happens to what I say?",
      answer:
        "Your answers are anonymised and published in an open public report, and will be read by the people shaping Swiss AI policy as well as those building and deploying Swiss AI. Your input feeds directly into the next [Swiss AI Charter](https://www.apertus-ai.org/pages/charter/). Your voice becomes part of the record alongside those of thousands of other residents.",
    },
    {
      question: "Will the AI reply in my language?",
      answer:
        "Yes, this conversation runs in German, French, Italian or English, and you can switch at any time using the language button. Multilingualism is a core commitment of the Swiss AI effort, alongside neutrality and federalism, and your answers help decide exactly how the AI should handle Switzerland's languages.",
    },
  ],
  hero: {
    question: "Your voice on AI in Switzerland",
    tagline:
      "AI is already shaping decisions that affect your daily life, yet the people building and regulating it rarely hear from ordinary citizens. Here, you're heard.",
    participants:
      "You're one of {count} people across Switzerland taking part.",
    credibility:
      "Anonymous · Published in an open report",
    opinionsFrom: "Opinions from",
    conversations: "Conversations",
  },
  landing: {
    start: "Start the dialogue",
    continue: "Continue the dialogue",
    review: "Revisit your dialogue",
    inProgress: "Your dialogue is waiting. Pick up right where you left off.",
    scrollHint: "Scroll down to learn more",
    headlineTop: "The future of AI in Switzerland",
    headlineBottom: "belongs to you.",
    heroTagline:
      "The Swiss National AI Dialogue is your direct line to the people building Switzerland's own AI.",
    swissEyebrow: "Swiss-made AI",
    swissStatement: "Switzerland built its own AI.",
    swissName: "It's called",
    otherAiEyebrow: "The difference",
    otherAi:
      "Every other AI in your life was built by companies you will never meet, following rules you never had a say in.",
    directEyebrow: "Direct participation",
    directHeading: "Your direct line to Switzerland's AI.",
    directBody:
      "Help build it the same way you'd vote on a referendum or sign an initiative. What you share goes straight to the team building Apertus.",
    mapEyebrow: "The dialogue so far",
    mapHeading: "Voices from every corner of Switzerland",
    mapSub:
      "Every glowing point marks a canton where people have already joined the dialogue. The brighter it glows, the more voices.",
    mapTotal: "{count} people across Switzerland have taken part so far.",
    quotesEyebrow: "Voices from the dialogue",
    quotesHint:
      "Hover over or tap a highlighted canton to read voices from there. Tap a quote to read it in full.",
    quotesAllCantons: "All cantons",
  },
  footer: {
    heading: "About this dialogue",
    intro:
      "{name} gathers what ordinary residents across Switzerland actually think about AI: what they find useful, what concerns them, and what they'd want decision-makers to know. Answers are anonymised and published in an open public report. This dialogue is not a government project, and taking part does not commit you to anything.",
    collaboration: "Built in collaboration with:",
    legal:
      "Your responses are anonymous and stored as research data. By taking part you agree to our",
    terms: "Terms of Use and Privacy Notice",
  },
  cookieConsent: {
    title: "Your privacy choices",
    body: "We use strictly necessary cookies to run this dialogue. With your consent we also use analytics cookies to understand how the dialogue is used and improve it. You can change your choice at any time.",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    customize: "Customize",
    save: "Save choices",
    alwaysOn: "Always on",
    manage: "Manage cookies",
    categories: {
      necessary: {
        label: "Strictly necessary",
        desc: "Required to run the dialogue: remembering your conversation and language. Always active.",
      },
      analytics: {
        label: "Analytics",
        desc: "Help us understand how the dialogue is used so we can improve it, including session replay.",
      },
      marketing: {
        label: "Marketing",
        desc: "Used to measure and target advertising about the dialogue.",
      },
    },
  },
  errorRetry: { message: "That didn't go through.", retry: "Try again" },
  quoteWall: { readMore: "Read the full quote", showLess: "Show less" },
};

// ----- German -----
const de: SwissDict = {
  langStep: {
    heading: "Wählen Sie Ihre Sprache",
    subheading: "Sie können sie jederzeit ändern.",
  },
  topics: {
    addYourOwn: "Eigenes Thema hinzufügen",
    customPlaceholder: "Ein Thema, das Ihnen wichtig ist…",
    addCustom: "Thema hinzufügen",
    reorderHeading: "Womit sollen wir beginnen?",
    reorderSubheading:
      "Wir behandeln alle diese Themen. Tippen Sie sie in der Reihenfolge an, die Ihnen am wichtigsten ist.",
    reorderKeepHint:
      "Passt die Reihenfolge? Scrollen Sie einfach weiter.",
    previewHeading: "Worüber wir sprechen",
    previewSubheading:
      "Diese Themen gehen wir gemeinsam durch. Sie müssen nichts auswählen, nur damit Sie wissen, was kommt.",
    proposeLabel: "Gibt es etwas, das wir unbedingt besprechen sollen?",
    proposePlaceholder: "Ein eigenes Thema hinzufügen (optional)…",
    yourTopicKicker: "Ihr Thema",
    yourTopicConfirm:
      "Wir werden dies in Ihrem Gespräch auf jeden Fall behandeln.",
    edit: "Bearbeiten",
    remove: "Entfernen",
    labels: {
      "daily-life": {
        title: "KI in meinem Alltag und in der Schweiz",
        blurb: "Was KI heute für Sie tut, und worauf die Schweiz setzen sollte",
        rationale:
          "Was KI heute schon für Sie tut, was sie besser machen sollte, und worauf die Schweiz ihre Anstrengungen richten sollte, vom Persönlichen bis zum Nationalen.",
      },
      "swiss-or-foreign": {
        title: "Schweizerische KI oder internationale KI: spielt das eine Rolle?",
        blurb: "Ob Herkunft, Governance und Schweizer Prägung einer KI zählen",
        rationale:
          "Ob Herkunft und Governance Ihr Vertrauen beeinflussen, was eine Schweizer Alternative wählenswert machen würde, und wie sie Schweizer Sprachen, Kultur und Identität widerspiegelt.",
      },
      "your-influence": {
        title: "Wer kontrolliert KI, und was passiert, wenn etwas schiefgeht?",
        blurb: "Ihre Mitsprache bei KI, ihre Grenzen und die Verantwortung für Schäden",
        rationale:
          "Ob normale Menschen mitbestimmen sollten, wie sich KI-Systeme verhalten, wo die Grenzen der KI liegen sollten, und wer verantwortlich ist, wenn sie Schaden anrichtet.",
      },
      "everyday-use": {
        title: "KI in Ihrem Alltag",
        blurb: "Wie KI im Alltag schon heute auftaucht",
        rationale:
          "Wie Sie KI bereits nutzen: was funktioniert, was nicht, und ob die Sprache, die Sie sprechen, einen Unterschied macht.",
      },
      "public-benefit": {
        title: "Wo KI der Schweiz helfen könnte",
        blurb: "Wo bessere KI den grössten öffentlichen Nutzen bringt",
        rationale:
          "Welche Bereiche des Schweizer Lebens (Gesundheit, Bildung, öffentliche Dienste) am meisten profitieren könnten und wo die Prioritäten liegen sollten.",
      },
      economy: {
        title: "KI, Arbeit und Arbeitsplätze",
        blurb: "Die Rolle der KI für Arbeit, Wirtschaft und Wohlstand",
        rationale:
          "Ob KI Schweizer Arbeitsplätze und Industrie stärkt oder aushöhlt, und wo das Gleichgewicht liegen sollte.",
      },
      sovereignty: {
        title: "Schweizerische KI oder internationale KI?",
        blurb: "Ob Herkunft und Kontrolle einer KI eine Rolle spielen",
        rationale:
          "Ob Herkunft und Kontrolle einer KI Ihr Vertrauen beeinflussen, und was eine Schweizer Alternative wählenswert machen würde.",
      },
      influence: {
        title: "Ihr Mitspracherecht beim Verhalten der KI",
        blurb: "Ob normale Menschen KI mitgestalten sollten",
        rationale:
          "Ob normale Menschen mitbestimmen sollten, wie sich KI-Systeme verhalten, und welche Art von Mitsprache das sein sollte.",
      },
      "identity": {
        title: "KI und Schweizer Identität",
        blurb: "Ob KI die Sprachen und Regionen der Schweiz widerspiegeln soll",
        rationale:
          "Ob KI sich an die Sprachen, Kulturen und Regionen der Schweiz anpassen soll, und was „lokal“ für Sie bedeutet.",
      },
    },
  },
  composer: {
    placeholder: "Antwort eingeben…",
    ariaLabel: "Ihre Antwort",
  },
  progress: {
    gettingStarted: "Es geht gerade erst los",
    shaping: "Ihre Idee nimmt Form an",
    ready: "Bereit zum Absenden, wenn Sie es sind",
    wrapUp: "Abschliessen & absenden",
  },
  intro: {
    cantonBeat: {
      legal: "Mit dem Fortfahren akzeptieren Sie unsere",
      terms: "Nutzungsbedingungen und Datenschutzhinweise.",
    },
  },
  canton: {
    eyebrow: "Wo in der Schweiz?",
    selectPlaceholder: "Kanton auswählen…",
    notInSwitzerland: "Nicht in der Schweiz",
    notInSwitzerlandShort: "Nicht in CH",
    thanks:
      "Danke, {name}. Hier sehen Sie, woher die Teilnehmenden bisher kommen.",
    thanksFallback: "verstanden",
    participants:
      "{count} Teilnehmende in der Schweiz, Sie eingeschlossen.",
    tooltip: "{count} Teilnehmende",
  },
  tradeoff: {
    eyebrow: "Wohin tendieren Sie?",
    choseToExplain: "Sie haben sich entschieden, es selbst zu erklären.",
    dragHint: "Ziehen Sie dorthin, wo Sie stehen, oder tippen Sie auf eine Seite",
    or: "oder",
    confirm: "Senden",
    leanStrong: "Klar Richtung {label}",
    leanToward: "Eher Richtung {label}",
    leanSlight: "Leicht Richtung {label}",
    balanced: "Eine Balance aus beidem",
    pollHeading: "Wie andere geantwortet haben",
    pollYou: "Sie",
    pollKicker: "CH bisher",
  },
  budget: {
    toPlace: "{count} zu verteilen",
    placeMore: "Noch {count} verteilen",
    average: "CH-Durchschnitt",
  },
  ranking: {
    hint: "Zum Ordnen ziehen, Wichtigstes zuerst",
    submit: "Senden",
    followUpPlaceholder: "Noch etwas?",
    yours: "Sie",
    crowd: "CH-Schnitt",
  },
  archetype: {
    eyebrow: "Ihre KI-Persönlichkeit",
    names: {
      "pioneer": "Der Pioniergeist",
      "mountain-guide": "Die Bergführerin",
      "watchmaker": "Der Uhrmacher",
      "st-bernard": "Der Bernhardiner",
      "innkeeper": "Die Gastgeberin",
      "ranger": "Der Wildhüter",
      "alphorn-player": "Die Alphornbläserin",
      "bridge-builder": "Der Brückenbauer",
    },
    descriptions: {
      "pioneer": "Zuerst auf dem neuen Weg: Sie wollen die beste KI, jetzt, und nehmen dafür etwas Risiko in Kauf.",
      "mountain-guide": "Klare Antworten bei jedem Wetter: Sie wollen eine KI, die sagt, was Sache ist.",
      "watchmaker": "Präzision vor Tempo: jede Sicherung sitzt, bevor das Werk läuft.",
      "st-bernard": "Warm und wachsam: eine KI, die sich wirklich um Menschen kümmert und sie schützt.",
      "innkeeper": "Bei Ihnen haben alle Platz am Tisch: eine KI, die warm, nützlich und willkommen ist.",
      "ranger": "Sie hüten das Tal: sparsam mit Vertrauen, streng beim Datenschutz, treu dem Lokalen.",
      "alphorn-player": "Ihre Stimme trägt übers Tal: eine Schweizer KI, die die ganze Gemeinschaft mitgestaltet.",
      "bridge-builder": "Sie bauen die Brücken zwischen den Seiten: eine KI, die fair, sorgfältig und rechenschaftspflichtig ist.",
    },
    axisLabels: {
      curiosity: "Neugier",
      candor: "Klartext",
      heart: "Herz",
      guard: "Schutz",
      roots: "Wurzeln",
      voice: "Mitsprache",
    },
    rarity: "{percent}% der Teilnehmenden haben dieses Profil",
  },
  question: {
    other: "Andere:",
    otherPrompt: "Das sind die Optionen, die uns eingefallen sind. Was fehlt?",
    otherPlaceholder: "Eigene Antwort eingeben…",
    textPlaceholder: "Antwort eingeben…",
    next: "Weiter",
    submit: "Senden",
    skip: "Überspringen",
    rateUp: "Gute Frage",
    rateDown: "Keine gute Frage",
    notePrompt: "Danke. Möchten Sie zu dieser Frage noch etwas sagen?",
    notePlaceholder: "Was gepasst hat, oder was nicht …",
    noteSend: "Senden",
    noteDismiss: "Nein danke",
    noteThanks: "Danke für Ihre Rückmeldung.",
    noteAdd: "Kommentar hinzufügen",
    noteEdit: "Kommentar bearbeiten",
  },
  shareMore: {
    thanks: "Danke, dass Sie Ihre Sicht zu «{topic}» geteilt haben.",
    invitation:
      "Dies ist ein Dialog in beide Richtungen. Über unsere vorbereiteten Fragen hinaus möchten wir hören, was Ihnen wichtig ist. Möchten Sie mehr sagen?",
    talk: "Ich möchte mehr sagen",
    skip: "Überspringen",
  },
  contribution: {
    kickoff:
      "Was sollte das Team hinter der Schweizer KI zu diesem Thema unbedingt verstehen? Sagen Sie es in Ihren eigenen Worten. Wir formen daraus gemeinsam Ihren Beitrag.",
    cardTitle: "Ihr Beitrag",
    cardHint:
      "Ihre Aussage für die Stimmenwand zu diesem Thema. Schreiben Sie sie direkt, oder chatten Sie unten und fassen Sie zusammen, wenn es nach Ihnen klingt.",
    placeholder: "In Ihren eigenen Worten …",
    summarize: "Unser Gespräch zusammenfassen",
    summarizing: "Wird zusammengefasst …",
    anonymous:
      "Wird anderen Teilnehmenden anonym gezeigt; nur Ihr Kanton erscheint dazu.",
    submit: "Zur Wand hinzufügen",
    skip: "Überspringen",
    wallTitle: "Ihr Beitrag ist auf der Wand",
    wallQuestion: "Was andere sagen",
    yourNote: "Ihr Beitrag",
    empty: "Hier erscheinen weitere Stimmen, sobald andere mitmachen.",
    nextTopic: "Weiter zum nächsten Thema …",
    continue: "Weiter",
    editNote: "Ihren Beitrag für die Wand bearbeiten",
    doneEditing: "Fertig",
  },
  pager: {
    previous: "Vorherige Frage",
    next: "Nächste Frage",
    resume: "Zurück zur aktuellen Frage",
    conversation: "Gespräch",
  },
  multiSelect: {
    selectAll: "Alles Zutreffende auswählen",
    pickUpTo: "Bis zu {count} auswählen",
  },
  summary: {
    yourSummary: "Ihre Zusammenfassung",
    editable: "bearbeitbar",
    hereIsWhat:
      "Das habe ich von Ihnen gehört. Bearbeiten Sie es so, wie es genau passen soll, und senden Sie es dann ab.",
    writeShort:
      "Schreiben Sie kurz zusammen, was Ihnen am wichtigsten ist, und senden Sie es ab.",
    placeholder: "In Ihren eigenen Worten…",
    submitEnd: "Absenden & beenden",
    keepTalking: "Noch nicht, ich möchte weiterreden",
    ariaLabel: "Ihre Zusammenfassung (bearbeitbar)",
  },
  ack: {
    body: "Ihre Stimme ist jetzt Teil des nationalen Bildes davon, was sich die Schweiz von KI wünscht. Kennen Sie jemanden, der auch mitreden sollte? Teilen Sie den Link.",
    copyLink: "Link kopieren und teilen",
    shareCopied: "Link in die Zwischenablage kopiert",
    wrapUpTab: "Abschluss",
    backHome: "Zurück zur Startseite",
  },
  feedbackChat: {
    heading: "Eine kurze Frage, bevor Sie gehen…",
    title: "Ein kurzes Wort zu Ihrem Erlebnis",
    placeholder: "Schreiben Sie Ihre Antwort…",
    send: "Senden",
    errorMessage: "Das hat nicht geklappt.",
    retry: "Erneut versuchen",
  },
  closing: {
    kicker: "Ihr Zitat für die Zitatwand",
    placeholder: "Ich hoffe, dass…",
    anonymous: "Anonym · nur Ihr Kanton wird gezeigt",
    submit: "Zur Wand hinzufügen",
    skip: "Überspringen",
    kickoff:
      "Hallo, ich bin Apertus. {question}",
    wallTitle: "Danke – Ihre Stimme ist dabei.",
    wallHeading: "Was anderen wichtig ist",
    continue: "Weiter",
  },
  shape: {
    heading: "Welche Frage soll dieser Dialog als Nächstes stellen?",
    body: "Sie haben unsere Fragen beantwortet. Sagen Sie uns nun, was die Schweiz zur KI gefragt werden sollte und was in diesem Dialog gefehlt hat.",
    placeholder: "Meine Frage an die Schweiz wäre…",
    submit: "Senden",
    skip: "Überspringen",
  },
  nps: {
    heading:
      "Wie wahrscheinlich ist es, dass Sie diesen Dialog einer Freundin oder einem Freund weiterempfehlen?",
    low: "Unwahrscheinlich",
    high: "Sehr wahrscheinlich",
    commentPlaceholder: "Möchten Sie uns sonst noch etwas mitteilen? (optional)",
    submit: "Feedback senden",
    thanks: "Danke für Ihr Feedback.",
  },
  assist: {
    title: "In Ihren eigenen Worten",
    kickoff:
      "Erzählen Sie mir, was Ihnen vorschwebt – ich helfe Ihnen, daraus eine kurze Antwort zu machen.",
    suggestionLabel: "Ihre Antwort",
    editedNote: "Ihre Antwort bearbeitet",
    placeholder: "Hier schreiben…",
    stem: "In meinen eigenen Worten: …",
  },
  demographics: {
    skip: "Überspringen",
    otherPlaceholder: "Bitte angeben",
    wideRangeNote:
      "So können wir zeigen, dass wir von Menschen aus der Schweiz gehört haben.",
    introAbout:
      "Noch ein paar letzte Fragen zu Ihnen, damit die Ergebnisse einen echten Querschnitt der Schweiz widerspiegeln.",
    email: {
      heading: "Sehen Sie, was die Schweiz entschieden hat.",
      body: "Hinterlassen Sie eine E-Mail-Adresse, und wir halten Sie auf dem Laufenden, wie Ihr Beitrag etwas bewirkt hat.",
      placeholder: "sie@beispiel.ch",
      submit: "Absenden",
      finishWithout: "Überspringen",
    },
  },
  faq: [
    {
      question: "Worum geht es hier?",
      answer:
        "KI prägt in der Schweiz schon heute Entscheidungen, die das tägliche Leben betreffen, doch ganz normale Einwohnerinnen und Einwohner werden nur selten nach ihrer Meinung gefragt. Dieser Dialog sammelt die eigenen Ansichten der Öffentlichkeit zur KI, in ihren eigenen Worten, um das umfassendste Bild davon zu zeichnen, was die Menschen in der Schweiz tatsächlich von ihr erwarten, und nicht das, was Fachleute stellvertretend für sie annehmen.",
    },
    {
      question: "Wer führt es durch?",
      answer:
        "Public AI und Public AI Switzerland, die weltweit grössten Betreiber des Schweizer Apertus, in Zusammenarbeit mit der Swiss National AI Initiative (den Entwicklern von Apertus, darunter ETHZ, EPFL und CSCS), Change.org, dem Collective Intelligence Project, Swiss {ai} Weeks und Metagov. Es ist kein Regierungsprojekt, und die Teilnahme verpflichtet Sie zu nichts.",
    },
    {
      question: "Muss ich etwas über KI wissen, um teilzunehmen?",
      answer:
        "Nein. Die Fragen drehen sich um alltägliche Abwägungen: wann eine KI antworten oder sich zurückhalten sollte, wie mit Ihren Daten umgegangen werden soll, ob die KI überall in der Schweiz gleich funktionieren soll. Sie brauchen keinen technischen Hintergrund, um eine wertvolle Meinung zu haben.",
    },
    {
      question: "Warum sieht das aus wie ein Chat?",
      answer:
        "Statt eines starren Formulars stellt unser Interviewer Ihnen kurze Fragen zur Schweizer KI und hakt bei Ihren Antworten nach, damit wir die Überlegungen hinter Ihren Ansichten erfassen und nicht nur ein Kreuzchen. Manche Fragen erscheinen als Karten (eine schnelle Wahl, eine Rangfolge, eine Karte), die Sie direkt beantworten. Sie können das Gespräch jederzeit beenden.",
    },
    {
      question: "Ist es anonym?",
      answer:
        "Ja. Wir fragen weder nach Ihrem Namen noch Ihrer E-Mail. Ein kurzlebiges Cookie verknüpft Ihre Sitzung über dieses eine Gespräch hinweg, und Ihre Antworten werden als anonyme Forschungsdaten gespeichert. Wir fragen nur nach Ihrem Kanton, um zu verstehen, wie sich Ansichten zwischen Regionen unterscheiden, nie, um Sie zu identifizieren.",
    },
    {
      question: "Was passiert mit dem, was ich sage?",
      answer:
        "Ihre Antworten werden anonymisiert und in einem öffentlich zugänglichen Bericht veröffentlicht und von den Menschen gelesen, die die Schweizer KI-Politik gestalten, sowie von denen, die die Schweizer KI bauen und betreiben. Ihre Beiträge fliessen direkt in die nächste [Schweizer KI-Charta](https://www.apertus-ai.org/pages/charter/) ein. Ihre Stimme wird Teil des Protokolls, gemeinsam mit denen von Tausenden anderen Einwohnerinnen und Einwohnern.",
    },
    {
      question: "Antwortet die KI in meiner Sprache?",
      answer:
        "Ja, dieses Gespräch läuft auf Deutsch, Französisch, Italienisch oder Englisch, und Sie können jederzeit über die Sprachschaltfläche wechseln. Mehrsprachigkeit ist ein zentrales Anliegen der Schweizer KI-Bemühungen, neben Neutralität und Föderalismus, und Ihre Antworten helfen zu entscheiden, wie die KI mit den Sprachen der Schweiz umgehen soll.",
    },
  ],
  hero: {
    question: "Ihre Stimme zur KI in der Schweiz",
    tagline:
      "KI prägt schon heute Entscheidungen, die Ihren Alltag betreffen, doch die Menschen, die sie entwickeln und regulieren, hören nur selten von ganz normalen Bürgerinnen und Bürgern. Hier werden Sie gehört.",
    participants:
      "Sie sind eine von {count} Personen in der Schweiz, die mitmachen.",
    credibility:
      "Anonym · In einem öffentlich zugänglichen Bericht veröffentlicht",
    opinionsFrom: "Meinungen aus",
    conversations: "Gesprächen",
  },
  landing: {
    start: "Dialog starten",
    continue: "Dialog fortsetzen",
    review: "Ihren Dialog noch einmal ansehen",
    inProgress:
      "Ihr Dialog wartet auf Sie. Machen Sie genau dort weiter, wo Sie aufgehört haben.",
    scrollHint: "Nach unten scrollen, um mehr zu erfahren",
    headlineTop: "Die Zukunft der KI in der Schweiz",
    headlineBottom: "gehört Ihnen.",
    heroTagline:
      "Der Swiss National AI Dialogue ist Ihr direkter Draht zu den Menschen, die die eigene KI der Schweiz bauen.",
    swissEyebrow: "KI aus der Schweiz",
    swissStatement: "Die Schweiz hat ihre eigene KI gebaut.",
    swissName: "Sie heisst",
    otherAiEyebrow: "Der Unterschied",
    otherAi:
      "Jede andere KI in Ihrem Leben wurde von Unternehmen entwickelt, denen Sie nie begegnen werden, und folgt Regeln, über die Sie nie mitbestimmen konnten.",
    directEyebrow: "Direkte Beteiligung",
    directHeading: "Ihr direkter Draht zur KI der Schweiz.",
    directBody:
      "Gestalten Sie sie mit, so wie Sie über ein Referendum abstimmen oder eine Initiative unterschreiben würden. Was Sie teilen, geht direkt an das Team hinter Apertus.",
    mapEyebrow: "Der Dialog bis jetzt",
    mapHeading: "Stimmen aus allen Ecken der Schweiz",
    mapSub:
      "Jeder leuchtende Punkt steht für einen Kanton, aus dem bereits Menschen teilgenommen haben. Je heller er leuchtet, desto mehr Stimmen.",
    mapTotal:
      "{count} Personen in der Schweiz haben bisher teilgenommen.",
    quotesEyebrow: "Stimmen aus dem Dialog",
    quotesHint:
      "Fahren Sie über einen hervorgehobenen Kanton oder tippen Sie ihn an, um Stimmen von dort zu lesen. Tippen Sie auf ein Zitat, um es ganz zu lesen.",
    quotesAllCantons: "Alle Kantone",
  },
  footer: {
    heading: "Über diesen Dialog",
    intro:
      "{name} sammelt, was ganz normale Einwohnerinnen und Einwohner in der Schweiz tatsächlich über KI denken: was sie nützlich finden, was sie beunruhigt und was die Entscheidungsträger ihrer Meinung nach wissen sollten. Die Antworten werden anonymisiert und in einem öffentlich zugänglichen Bericht veröffentlicht. Dieser Dialog ist kein Regierungsprojekt, und die Teilnahme verpflichtet Sie zu nichts.",
    collaboration: "Entwickelt in Zusammenarbeit mit:",
    legal:
      "Ihre Antworten sind anonym und werden als Forschungsdaten gespeichert. Mit der Teilnahme akzeptieren Sie unsere",
    terms: "Nutzungsbedingungen und Datenschutzhinweise",
  },
  cookieConsent: {
    title: "Ihre Datenschutzeinstellungen",
    body: "Wir verwenden unbedingt erforderliche Cookies, um diesen Dialog zu betreiben. Mit Ihrer Einwilligung nutzen wir zusätzlich Analyse-Cookies, um zu verstehen, wie der Dialog genutzt wird, und ihn zu verbessern. Sie können Ihre Wahl jederzeit ändern.",
    acceptAll: "Alle akzeptieren",
    rejectAll: "Alle ablehnen",
    customize: "Anpassen",
    save: "Auswahl speichern",
    alwaysOn: "Immer aktiv",
    manage: "Cookies verwalten",
    categories: {
      necessary: {
        label: "Unbedingt erforderlich",
        desc: "Notwendig für den Betrieb des Dialogs: speichert Ihr Gespräch und Ihre Sprache. Immer aktiv.",
      },
      analytics: {
        label: "Analyse",
        desc: "Hilft uns zu verstehen, wie der Dialog genutzt wird, damit wir ihn verbessern können, einschliesslich Sitzungsaufzeichnung.",
      },
      marketing: {
        label: "Marketing",
        desc: "Wird verwendet, um Werbung über den Dialog zu messen und auszurichten.",
      },
    },
  },
  errorRetry: {
    message: "Das hat leider nicht geklappt.",
    retry: "Erneut versuchen",
  },
  quoteWall: { readMore: "Ganzes Zitat lesen", showLess: "Weniger anzeigen" },
};

// ----- French -----
const fr: SwissDict = {
  langStep: {
    heading: "Choisissez votre langue",
    subheading: "Vous pouvez en changer à tout moment.",
  },
  topics: {
    addYourOwn: "Ajouter le vôtre",
    customPlaceholder: "Un thème qui vous tient à cœur…",
    addCustom: "Ajouter un thème",
    reorderHeading: "Par quoi devrions-nous commencer ?",
    reorderSubheading:
      "Nous aborderons tous ces thèmes. Touchez-les dans l'ordre qui compte le plus pour vous.",
    reorderKeepHint:
      "Cet ordre vous convient ? Continuez simplement à faire défiler.",
    previewHeading: "Ce dont nous allons parler",
    previewSubheading:
      "Nous allons parcourir ces thèmes ensemble. Rien à choisir, c'est juste pour savoir où l'on va.",
    proposeLabel: "Y a-t-il un sujet à ne pas manquer ?",
    proposePlaceholder: "Ajoutez un sujet de votre choix (facultatif)…",
    yourTopicKicker: "Votre sujet",
    yourTopicConfirm:
      "Nous veillerons à aborder ce sujet dans votre conversation.",
    edit: "Modifier",
    remove: "Retirer",
    labels: {
      "daily-life": {
        title: "L'IA dans mon quotidien et en Suisse",
        blurb: "Ce que l'IA fait pour vous, et où la Suisse devrait se concentrer",
        rationale:
          "Ce que l'IA fait déjà pour vous, ce que vous aimeriez qu'elle fasse mieux, et où la Suisse devrait concentrer ses efforts, du personnel au national.",
      },
      "swiss-or-foreign": {
        title: "IA suisse ou IA étrangère : est-ce que ça compte ?",
        blurb: "Si l'origine, la gouvernance et le caractère suisse d'une IA comptent",
        rationale:
          "Si l'origine et la gouvernance influencent votre confiance, ce qui rendrait une alternative suisse digne d'être choisie, et comment elle reflète les langues, la culture et l'identité suisses.",
      },
      "your-influence": {
        title: "Qui contrôle l'IA, et que se passe-t-il quand ça tourne mal ?",
        blurb: "Votre mot à dire sur l'IA, ses limites et la responsabilité en cas de préjudice",
        rationale:
          "Si les citoyens ordinaires devraient avoir leur mot à dire sur le comportement de l'IA, où devraient se situer ses limites, et qui est responsable lorsqu'elle cause un préjudice.",
      },
      "everyday-use": {
        title: "L'IA dans votre quotidien",
        blurb: "Comment l'IA apparaît déjà au quotidien",
        rationale:
          "Comment vous utilisez déjà l'IA : ce qui marche, ce qui ne marche pas, et si la langue que vous parlez change l'expérience.",
      },
      "public-benefit": {
        title: "Où l'IA pourrait aider la Suisse",
        blurb: "Où une meilleure IA ferait le plus de bien public",
        rationale:
          "Quels domaines de la vie suisse (santé, éducation, services publics) pourraient le plus en profiter, et où devraient être les priorités.",
      },
      economy: {
        title: "L'IA, le travail et l'emploi",
        blurb: "Le rôle de l'IA pour le travail, l'économie et la prospérité",
        rationale:
          "Si l'IA renforce les emplois et l'industrie suisses ou les vide de leur substance, et où devrait se situer l'équilibre.",
      },
      sovereignty: {
        title: "IA suisse, ou IA étrangère ?",
        blurb: "Si l'origine et le contrôle d'une IA comptent",
        rationale:
          "Si l'origine et le contrôle d'une IA influencent votre confiance, et ce qui rendrait une alternative suisse digne d'être choisie.",
      },
      influence: {
        title: "Votre mot à dire sur le comportement de l'IA",
        blurb: "Si les citoyens ordinaires devraient façonner l'IA",
        rationale:
          "Si les gens ordinaires devraient avoir leur mot à dire sur le comportement des systèmes d'IA, et quel type de pouvoir cela devrait être.",
      },
      "identity": {
        title: "L'IA et l'identité suisse",
        blurb: "Si l'IA devrait refléter les langues et régions suisses",
        rationale:
          "Si l'IA devrait s'adapter aux langues, cultures et régions de la Suisse, et ce que « local » signifie pour vous.",
      },
    },
  },
  composer: {
    placeholder: "Écrivez votre réponse…",
    ariaLabel: "Votre réponse",
  },
  progress: {
    gettingStarted: "On commence tout juste",
    shaping: "Votre idée prend forme",
    ready: "Prêt à envoyer quand vous le souhaitez",
    wrapUp: "Conclure et envoyer",
  },
  intro: {
    cantonBeat: {
      legal: "En continuant, vous acceptez nos",
      terms: "Conditions d'utilisation et notre politique de confidentialité.",
    },
  },
  canton: {
    eyebrow: "Où en Suisse ?",
    selectPlaceholder: "Sélectionnez votre canton…",
    notInSwitzerland: "Pas en Suisse",
    notInSwitzerlandShort: "Pas en CH",
    thanks:
      "Merci, {name}. Voici d'où les participants ont pris part jusqu'ici.",
    thanksFallback: "c'est noté",
    participants:
      "{count} participants dans toute la Suisse, vous compris.",
    tooltip: "{count} participants",
  },
  tradeoff: {
    eyebrow: "Vers quoi penchez-vous ?",
    choseToExplain: "Vous avez choisi d'expliquer avec vos propres mots.",
    dragHint: "Faites glisser jusqu'à votre position, ou touchez un côté",
    or: "ou",
    confirm: "Valider",
    leanStrong: "Nettement vers {label}",
    leanToward: "Plutôt vers {label}",
    leanSlight: "Légèrement vers {label}",
    balanced: "Un équilibre entre les deux",
    pollHeading: "Ce que d'autres ont répondu",
    pollYou: "Vous",
    pollKicker: "La Suisse jusqu'ici",
  },
  budget: {
    toPlace: "{count} à placer",
    placeMore: "Placez-en encore {count}",
    average: "Moyenne CH",
  },
  ranking: {
    hint: "Glissez pour classer, le plus important d'abord",
    submit: "Envoyer",
    followUpPlaceholder: "Autre chose ?",
    yours: "Vous",
    crowd: "Moy. CH",
  },
  archetype: {
    eyebrow: "Votre personnalité IA",
    names: {
      "pioneer": "L'Esprit pionnier",
      "mountain-guide": "La Guide de montagne",
      "watchmaker": "L'Horloger",
      "st-bernard": "Le Saint-Bernard",
      "innkeeper": "L'Aubergiste",
      "ranger": "La Garde-faune",
      "alphorn-player": "Le Cor des Alpes",
      "bridge-builder": "La Bâtisseuse de ponts",
    },
    descriptions: {
      "pioneer": "Première sur le nouveau sentier : vous voulez la meilleure IA, maintenant, quitte à prendre des risques.",
      "mountain-guide": "Des réponses franches par tous les temps : vous voulez une IA qui dit les choses telles qu'elles sont.",
      "watchmaker": "La précision avant la vitesse : chaque garde-fou en place avant que le mécanisme tourne.",
      "st-bernard": "Chaleureux et vigilant : une IA qui prend vraiment soin des gens et les protège.",
      "innkeeper": "Tout le monde a une place à votre table : une IA chaleureuse, utile et facile à accueillir.",
      "ranger": "Vous veillez sur la vallée : confiance mesurée, vie privée d'abord, fidèle au local.",
      "alphorn-player": "Votre voix porte à travers la vallée : une IA suisse que toute la communauté façonne ensemble.",
      "bridge-builder": "Vous bâtissez des ponts entre les rives : une IA équitable, prudente et qui rend des comptes.",
    },
    axisLabels: {
      curiosity: "Curiosité",
      candor: "Franchise",
      heart: "Cœur",
      guard: "Protection",
      roots: "Racines",
      voice: "Voix",
    },
    rarity: "{percent}% des participants partagent ce profil",
  },
  question: {
    other: "Autre:",
    otherPrompt:
      "Voici les options auxquelles nous avons pensé. Qu'est-ce qui manque ?",
    otherPlaceholder: "Saisissez votre réponse…",
    textPlaceholder: "Saisissez votre réponse…",
    next: "Suivant",
    submit: "Envoyer",
    skip: "Passer",
    rateUp: "Bonne question",
    rateDown: "Question peu utile",
    notePrompt: "Merci. Souhaitez-vous ajouter quelque chose sur cette question ?",
    notePlaceholder: "Ce qui a fonctionné, ou pas…",
    noteSend: "Envoyer",
    noteDismiss: "Non merci",
    noteThanks: "Merci pour votre retour.",
    noteAdd: "Ajouter un commentaire",
    noteEdit: "Modifier le commentaire",
  },
  shareMore: {
    thanks: "Merci d'avoir partagé votre point de vue sur « {topic} ».",
    invitation:
      "Cette conversation va dans les deux sens. Au-delà des questions préparées, nous aimerions entendre ce qui compte pour vous. Souhaitez-vous en dire plus ?",
    talk: "Je veux en dire plus",
    skip: "Passer",
  },
  contribution: {
    kickoff:
      "Que devrait absolument comprendre l'équipe qui construit l'IA suisse sur ce thème ? Dites-le avec vos propres mots. Nous en ferons ensemble votre contribution.",
    cardTitle: "Votre contribution",
    cardHint:
      "Votre déclaration pour le mur des voix de ce thème. Écrivez-la directement, ou discutez ci-dessous et résumez quand elle vous ressemble.",
    placeholder: "Avec vos propres mots…",
    summarize: "Résumer notre échange",
    summarizing: "Résumé en cours…",
    anonymous:
      "Affichée anonymement aux autres participants ; seul votre canton apparaît.",
    submit: "Ajouter au mur",
    skip: "Passer",
    wallTitle: "Votre contribution est sur le mur",
    wallQuestion: "Ce que disent les autres",
    yourNote: "Votre contribution",
    empty: "D'autres voix apparaîtront ici au fil de la participation.",
    nextTopic: "On passe au thème suivant…",
    continue: "Continuer",
    editNote: "Modifier votre contribution pour le mur",
    doneEditing: "Terminé",
  },
  pager: {
    previous: "Question précédente",
    next: "Question suivante",
    resume: "Revenir à la question en cours",
    conversation: "Conversation",
  },
  multiSelect: {
    selectAll: "Sélectionnez tout ce qui s'applique",
    pickUpTo: "Choisissez jusqu'à {count}",
  },
  summary: {
    yourSummary: "Votre résumé",
    editable: "modifiable",
    hereIsWhat:
      "Voici ce que j'ai entendu de vous. Modifiez-le pour qu'il corresponde exactement à ce que vous voulez, puis envoyez-le.",
    writeShort:
      "Écrivez un court résumé de ce qui compte le plus pour vous, puis envoyez-le.",
    placeholder: "Avec vos propres mots…",
    submitEnd: "Envoyer et terminer",
    keepTalking: "Pas encore, je veux continuer à parler",
    ariaLabel: "Votre résumé (modifiable)",
  },
  ack: {
    body: "Votre voix fait désormais partie du tableau national de ce que la Suisse attend de l'IA. Vous connaissez quelqu'un qui devrait aussi s'exprimer ? Partagez le lien.",
    copyLink: "Copier le lien à partager",
    shareCopied: "Lien copié dans le presse-papiers",
    wrapUpTab: "Conclusion",
    backHome: "Retour à la page d'accueil",
  },
  feedbackChat: {
    heading: "Une petite question avant de partir…",
    title: "Un mot sur votre expérience",
    placeholder: "Écrivez votre réponse…",
    send: "Envoyer",
    errorMessage: "Cela n'a pas fonctionné.",
    retry: "Réessayer",
  },
  closing: {
    kicker: "Votre citation pour le mur",
    placeholder: "J'espère que…",
    anonymous: "Anonyme · seul votre canton apparaît",
    submit: "Ajouter au mur",
    skip: "Passer",
    kickoff:
      "Bonjour, je suis Apertus. {question}",
    wallTitle: "Merci – votre voix compte.",
    wallHeading: "Ce qui compte pour les autres",
    continue: "Continuer",
  },
  shape: {
    heading: "Quelle question ce dialogue devrait-il poser ensuite ?",
    body: "Vous avez répondu aux nôtres. Dites-nous maintenant ce que la Suisse devrait être amenée à se demander au sujet de l'IA, et ce qui a manqué dans ce dialogue.",
    placeholder: "La question que je poserais à la Suisse est…",
    submit: "Envoyer",
    skip: "Passer",
  },
  nps: {
    heading:
      "Quelle est la probabilité que vous recommandiez ce dialogue à un ami ?",
    low: "Peu probable",
    high: "Très probable",
    commentPlaceholder: "Autre chose à nous dire ? (facultatif)",
    submit: "Envoyer",
    thanks: "Merci pour votre retour.",
  },
  assist: {
    title: "Avec vos propres mots",
    kickoff:
      "Dites-moi ce que vous avez en tête – je vous aide à en faire une réponse courte.",
    suggestionLabel: "Votre réponse",
    editedNote: "Réponse modifiée",
    placeholder: "Écrivez ici…",
    stem: "Dans mes propres mots, …",
  },
  demographics: {
    skip: "Passer",
    otherPlaceholder: "Veuillez préciser",
    wideRangeNote:
      "Cela nous aide à montrer que nous avons entendu des personnes de toute la Suisse.",
    introAbout:
      "Encore quelques dernières questions vous concernant, afin que les résultats reflètent un véritable échantillon de la Suisse.",
    email: {
      heading: "Découvrez ce que la Suisse a décidé.",
      body: "Laissez une adresse e-mail et nous vous tiendrons informé de l'impact de votre contribution.",
      placeholder: "vous@exemple.ch",
      submit: "Envoyer",
      finishWithout: "Passer",
    },
  },
  faq: [
    {
      question: "De quoi s'agit-il ?",
      answer:
        "L'IA façonne déjà des décisions qui touchent la vie quotidienne en Suisse, pourtant on demande rarement leur avis aux habitants ordinaires. Ce dialogue recueille les propres opinions du public sur l'IA, avec ses propres mots, afin de dresser le tableau le plus complet de ce que les habitants de la Suisse attendent réellement d'elle, et non de ce que les experts supposent à leur place.",
    },
    {
      question: "Qui l'organise ?",
      answer:
        "Public AI et Public AI Switzerland, les plus grands déployeurs de l'Apertus suisse au monde, en collaboration avec la Swiss National AI Initiative (les concepteurs d'Apertus, dont l'ETHZ, l'EPFL et le CSCS), Change.org, le Collective Intelligence Project, Swiss {ai} Weeks et Metagov. Ce n'est pas un projet gouvernemental, et participer ne vous engage à rien.",
    },
    {
      question: "Dois-je connaître l'IA pour participer ?",
      answer:
        "Non. Les questions portent sur des choix de tous les jours : quand une IA devrait répondre ou se retenir, comment vos données devraient être traitées, si l'IA devrait fonctionner de la même façon partout en Suisse. Aucun bagage technique n'est nécessaire pour avoir un avis précieux.",
    },
    {
      question: "Pourquoi cela ressemble-t-il à un chat ?",
      answer:
        "Au lieu d'un formulaire figé, notre intervieweur vous pose de courtes questions sur l'IA suisse et rebondit sur vos réponses, afin de saisir le raisonnement derrière vos avis plutôt qu'une simple case cochée. Certaines questions apparaissent sous forme de cartes (un choix rapide, un classement, une carte) auxquelles vous répondez sur place. Vous pouvez terminer la conversation quand vous le souhaitez.",
    },
    {
      question: "Est-ce anonyme ?",
      answer:
        "Oui. Nous ne demandons ni votre nom ni votre e-mail. Un cookie de courte durée relie votre session le temps de cette conversation, et vos réponses sont conservées comme données de recherche anonymes. Nous demandons votre canton uniquement pour comprendre comment les avis diffèrent entre régions, jamais pour vous identifier.",
    },
    {
      question: "Qu'advient-il de ce que je dis ?",
      answer:
        "Vos réponses sont anonymisées et publiées dans un rapport public ouvert, et seront lues par celles et ceux qui façonnent la politique suisse en matière d'IA ainsi que par ceux qui construisent et déploient l'IA suisse. Vos contributions alimentent directement la prochaine [Charte suisse de l'IA](https://www.apertus-ai.org/pages/charter/). Votre voix s'inscrit dans le compte rendu, aux côtés de celles de milliers d'autres habitants.",
    },
    {
      question: "L'IA répondra-t-elle dans ma langue ?",
      answer:
        "Oui, cette conversation se déroule en allemand, français, italien ou anglais, et vous pouvez changer à tout moment via le bouton de langue. Le multilinguisme est un engagement central de l'effort suisse en matière d'IA, au même titre que la neutralité et le fédéralisme, et vos réponses aident à décider comment l'IA devrait gérer les langues de la Suisse.",
    },
  ],
  hero: {
    question: "Votre voix sur l'IA en Suisse",
    tagline:
      "L'IA façonne déjà des décisions qui touchent votre vie quotidienne. Pourtant, les personnes qui la conçoivent et la régulent entendent rarement les citoyens ordinaires. Ici, vous êtes entendu.",
    participants:
      "Vous êtes l'une des {count} personnes qui participent dans toute la Suisse.",
    credibility:
      "Anonyme · Publié dans un rapport ouvert",
    opinionsFrom: "Avis issus de",
    conversations: "Conversations",
  },
  landing: {
    start: "Commencer le dialogue",
    continue: "Reprendre le dialogue",
    review: "Revoir votre dialogue",
    inProgress:
      "Votre dialogue vous attend. Reprenez exactement là où vous vous étiez arrêté·e.",
    scrollHint: "Faites défiler pour en savoir plus",
    headlineTop: "L'avenir de l'IA en Suisse",
    headlineBottom: "vous appartient.",
    heroTagline:
      "Le Swiss National AI Dialogue est votre lien direct avec les personnes qui construisent l'IA de la Suisse.",
    swissEyebrow: "Une IA suisse",
    swissStatement: "La Suisse a construit sa propre IA.",
    swissName: "Elle s'appelle",
    otherAiEyebrow: "La différence",
    otherAi:
      "Toutes les autres IA de votre vie ont été construites par des entreprises que vous ne rencontrerez jamais, selon des règles sur lesquelles vous n'avez jamais eu votre mot à dire.",
    directEyebrow: "Participation directe",
    directHeading: "Votre ligne directe vers l'IA de la Suisse.",
    directBody:
      "Contribuez à la construire comme vous voteriez sur un référendum ou signeriez une initiative. Ce que vous partagez va directement à l'équipe qui construit Apertus.",
    mapEyebrow: "Le dialogue jusqu'ici",
    mapHeading: "Des voix de tous les coins de la Suisse",
    mapSub:
      "Chaque point lumineux marque un canton où des personnes ont déjà participé. Plus il brille, plus il y a de voix.",
    mapTotal:
      "{count} personnes dans toute la Suisse ont participé jusqu'ici.",
    quotesEyebrow: "Voix du dialogue",
    quotesHint:
      "Survolez ou touchez un canton mis en évidence pour lire des voix de cette région. Touchez une citation pour la lire en entier.",
    quotesAllCantons: "Tous les cantons",
  },
  footer: {
    heading: "À propos de ce dialogue",
    intro:
      "{name} recueille ce que les habitants ordinaires de toute la Suisse pensent réellement de l'IA : ce qu'ils trouvent utile, ce qui les préoccupe et ce qu'ils voudraient faire savoir aux décideurs. Les réponses sont anonymisées et publiées dans un rapport public ouvert. Ce dialogue n'est pas un projet gouvernemental, et participer ne vous engage à rien.",
    collaboration: "Conçu en collaboration avec :",
    legal:
      "Vos réponses sont anonymes et conservées comme données de recherche. En participant, vous acceptez nos",
    terms: "Conditions d'utilisation et l'avis de confidentialité",
  },
  cookieConsent: {
    title: "Vos choix de confidentialité",
    body: "Nous utilisons des cookies strictement nécessaires pour faire fonctionner ce dialogue. Avec votre consentement, nous utilisons également des cookies d'analyse pour comprendre comment le dialogue est utilisé et l'améliorer. Vous pouvez modifier votre choix à tout moment.",
    acceptAll: "Tout accepter",
    rejectAll: "Tout refuser",
    customize: "Personnaliser",
    save: "Enregistrer les choix",
    alwaysOn: "Toujours actifs",
    manage: "Gérer les cookies",
    categories: {
      necessary: {
        label: "Strictement nécessaires",
        desc: "Nécessaires au fonctionnement du dialogue : mémorisent votre conversation et votre langue. Toujours actifs.",
      },
      analytics: {
        label: "Analyse",
        desc: "Nous aident à comprendre comment le dialogue est utilisé afin de l'améliorer, y compris l'enregistrement de session.",
      },
      marketing: {
        label: "Marketing",
        desc: "Utilisés pour mesurer et cibler la publicité concernant le dialogue.",
      },
    },
  },
  errorRetry: { message: "Cela n'a pas fonctionné.", retry: "Réessayer" },
  quoteWall: { readMore: "Lire la citation complète", showLess: "Réduire" },
};

// ----- Italian -----
const it: SwissDict = {
  langStep: {
    heading: "Scegli la tua lingua",
    subheading: "Puoi cambiarla in qualsiasi momento.",
  },
  topics: {
    addYourOwn: "Aggiungi il tuo",
    customPlaceholder: "Un tema a cui tieni…",
    addCustom: "Aggiungi un tema",
    reorderHeading: "Da dove dovremmo iniziare?",
    reorderSubheading:
      "Affronteremo tutti questi temi. Toccali nell'ordine che conta di più per te.",
    reorderKeepHint: "L'ordine ti va bene? Continua semplicemente a scorrere.",
    previewHeading: "Di cosa parleremo",
    previewSubheading:
      "Affronteremo insieme questi temi. Non devi scegliere, è solo per sapere dove stiamo andando.",
    proposeLabel: "C'è qualcosa che vuoi che trattiamo di sicuro?",
    proposePlaceholder: "Aggiungi un tuo tema (facoltativo)…",
    yourTopicKicker: "Il tuo tema",
    yourTopicConfirm:
      "Ci assicureremo di trattarlo nella tua conversazione.",
    edit: "Modifica",
    remove: "Rimuovi",
    labels: {
      "daily-life": {
        title: "L'IA nella mia vita quotidiana e in Svizzera",
        blurb: "Cosa fa l'IA per te, e dove la Svizzera dovrebbe concentrarsi",
        rationale:
          "Cosa fa già l'IA per te, cosa vorresti che facesse meglio, e dove la Svizzera dovrebbe concentrare i suoi sforzi, dal personale al nazionale.",
      },
      "swiss-or-foreign": {
        title: "IA svizzera o IA straniera: fa differenza?",
        blurb: "Se l'origine, la governance e la natura svizzera di un'IA contano",
        rationale:
          "Se l'origine e la governance influenzano la tua fiducia, cosa renderebbe un'alternativa svizzera degna di essere scelta, e come riflette lingue, cultura e identità svizzere.",
      },
      "your-influence": {
        title: "Chi controlla l'IA e cosa succede quando va storto?",
        blurb: "La tua voce sull'IA, i suoi limiti e la responsabilità per i danni",
        rationale:
          "Se le persone comuni dovrebbero avere voce su come si comportano i sistemi di IA, dove dovrebbero stare i limiti dell'IA, e chi è responsabile quando causa un danno.",
      },
      "everyday-use": {
        title: "L'IA nella tua vita quotidiana",
        blurb: "Come l'IA compare già nella vita di tutti i giorni",
        rationale:
          "Come usi già l'IA: cosa funziona, cosa no, e se la lingua che parli cambia l'esperienza.",
      },
      "public-benefit": {
        title: "Dove l'IA potrebbe aiutare la Svizzera",
        blurb: "Dove un'IA migliore farebbe il maggior bene pubblico",
        rationale:
          "Quali ambiti della vita svizzera (sanità, istruzione, servizi pubblici) potrebbero trarne il massimo, e dove dovrebbero essere le priorità.",
      },
      economy: {
        title: "IA, lavoro e occupazione",
        blurb: "Il ruolo dell'IA per il lavoro, l'economia e la prosperità",
        rationale:
          "Se l'IA rafforza il lavoro e l'industria svizzeri o li svuota, e dove dovrebbe stare l'equilibrio.",
      },
      sovereignty: {
        title: "IA svizzera o IA straniera?",
        blurb: "Se l'origine e il controllo di un'IA contano",
        rationale:
          "Se l'origine e il controllo di un'IA influenzano la tua fiducia, e cosa renderebbe un'alternativa svizzera degna di essere scelta.",
      },
      influence: {
        title: "La tua voce su come si comporta l'IA",
        blurb: "Se le persone comuni dovrebbero plasmare l'IA",
        rationale:
          "Se le persone comuni dovrebbero avere voce su come si comportano i sistemi di IA, e che tipo di voce dovrebbe essere.",
      },
      "identity": {
        title: "L'IA e l'identità svizzera",
        blurb: "Se l'IA dovrebbe riflettere le lingue e le regioni svizzere",
        rationale:
          "Se l'IA dovrebbe adattarsi alle lingue, culture e regioni della Svizzera, e cosa significa «locale» per te.",
      },
    },
  },
  composer: {
    placeholder: "Scrivi la tua risposta…",
    ariaLabel: "La tua risposta",
  },
  progress: {
    gettingStarted: "Si comincia",
    shaping: "La tua idea sta prendendo forma",
    ready: "Pronto a inviare quando vuoi",
    wrapUp: "Concludi e invia",
  },
  intro: {
    cantonBeat: {
      legal: "Continuando accetti le nostre",
      terms: "Condizioni d'uso e l'Informativa sulla privacy.",
    },
  },
  canton: {
    eyebrow: "Dove in Svizzera?",
    selectPlaceholder: "Seleziona il tuo cantone…",
    notInSwitzerland: "Non in Svizzera",
    notInSwitzerlandShort: "Non in CH",
    thanks:
      "Grazie, {name}. Ecco da dove hanno partecipato le persone finora.",
    thanksFallback: "ricevuto",
    participants:
      "{count} partecipanti in tutta la Svizzera, te compreso.",
    tooltip: "{count} partecipanti",
  },
  tradeoff: {
    eyebrow: "Verso cosa propendi?",
    choseToExplain: "Hai scelto di spiegare con parole tue.",
    dragHint: "Trascina dove ti collochi, oppure tocca un lato",
    or: "o",
    confirm: "Invia",
    leanStrong: "Decisamente verso {label}",
    leanToward: "Piuttosto verso {label}",
    leanSlight: "Leggermente verso {label}",
    balanced: "Un equilibrio tra i due",
    pollHeading: "Come hanno risposto gli altri",
    pollYou: "Tu",
    pollKicker: "La Svizzera finora",
  },
  budget: {
    toPlace: "{count} da assegnare",
    placeMore: "Assegnane ancora {count}",
    average: "Media CH",
  },
  ranking: {
    hint: "Trascina per ordinare, prima il più importante",
    submit: "Invia",
    followUpPlaceholder: "Qualcos'altro?",
    yours: "Tu",
    crowd: "Media CH",
  },
  archetype: {
    eyebrow: "La tua personalità IA",
    names: {
      "pioneer": "Lo Spirito pioniere",
      "mountain-guide": "La Guida alpina",
      "watchmaker": "L'Orologiaio",
      "st-bernard": "Il San Bernardo",
      "innkeeper": "L'Ostessa",
      "ranger": "Il Guardiaparco",
      "alphorn-player": "Il Corno delle Alpi",
      "bridge-builder": "La Costruttrice di ponti",
    },
    descriptions: {
      "pioneer": "Per primi sul nuovo sentiero: vuoi la migliore IA, subito, anche a costo di qualche rischio.",
      "mountain-guide": "Risposte chiare con qualsiasi tempo: vuoi un'IA che dica le cose come stanno.",
      "watchmaker": "Precisione prima della velocità: ogni protezione al suo posto prima che il meccanismo giri.",
      "st-bernard": "Caloroso e vigile: un'IA che si prende davvero cura delle persone e le protegge.",
      "innkeeper": "Alla tua tavola c'è posto per tutti: un'IA calorosa, utile e facile da accogliere.",
      "ranger": "Fai la guardia alla valle: fiducia misurata, privacy al primo posto, fedele al locale.",
      "alphorn-player": "La tua voce attraversa la valle: un'IA svizzera plasmata da tutta la comunità.",
      "bridge-builder": "Costruisci ponti tra le sponde: un'IA equa, prudente e che rende conto a tutti.",
    },
    axisLabels: {
      curiosity: "Curiosità",
      candor: "Franchezza",
      heart: "Cuore",
      guard: "Protezione",
      roots: "Radici",
      voice: "Voce",
    },
    rarity: "Il {percent}% dei partecipanti condivide questo profilo",
  },
  question: {
    other: "Altro:",
    otherPrompt: "Queste sono le opzioni a cui abbiamo pensato. Cosa manca?",
    otherPlaceholder: "Scrivi la tua risposta…",
    textPlaceholder: "Scrivi la tua risposta…",
    next: "Avanti",
    submit: "Invia",
    skip: "Salta",
    rateUp: "Bella domanda",
    rateDown: "Domanda poco utile",
    notePrompt: "Grazie. Vuole aggiungere qualcosa su questa domanda?",
    notePlaceholder: "Cosa ha funzionato, o cosa no…",
    noteSend: "Invia",
    noteDismiss: "No, grazie",
    noteThanks: "Grazie per il suo riscontro.",
    noteAdd: "Aggiungi un commento",
    noteEdit: "Modifica il commento",
  },
  shareMore: {
    thanks: "Grazie per aver condiviso la tua opinione su «{topic}».",
    invitation:
      "Questa è una conversazione a due sensi. Oltre alle domande che abbiamo preparato, ci piacerebbe sentire cosa conta per te. Vuoi dire di più?",
    talk: "Vorrei dire di più",
    skip: "Salta",
  },
  contribution: {
    kickoff:
      "Cosa dovrebbe assolutamente capire su questo tema il team che costruisce l'IA svizzera? Dillo con parole tue. Insieme ne faremo il tuo contributo.",
    cardTitle: "Il tuo contributo",
    cardHint:
      "La tua dichiarazione per il muro delle voci di questo tema. Scrivila direttamente, oppure chatta qui sotto e riassumi quando suona come te.",
    placeholder: "Con parole tue…",
    summarize: "Riassumi la nostra chat",
    summarizing: "Riassunto in corso…",
    anonymous:
      "Mostrata in forma anonima agli altri partecipanti; appare solo il tuo cantone.",
    submit: "Aggiungi al muro",
    skip: "Salta",
    wallTitle: "Il tuo contributo è sul muro",
    wallQuestion: "Cosa dicono gli altri",
    yourNote: "Il tuo contributo",
    empty: "Qui appariranno altre voci man mano che altri partecipano.",
    nextTopic: "Si passa al prossimo tema…",
    continue: "Continua",
    editNote: "Modifica il tuo contributo per il muro",
    doneEditing: "Fatto",
  },
  pager: {
    previous: "Domanda precedente",
    next: "Domanda successiva",
    resume: "Torna alla domanda attuale",
    conversation: "Conversazione",
  },
  multiSelect: {
    selectAll: "Seleziona tutto ciò che si applica",
    pickUpTo: "Scegli fino a {count}",
  },
  summary: {
    yourSummary: "Il tuo riepilogo",
    editable: "modificabile",
    hereIsWhat:
      "Ecco cosa ho capito da te. Modificalo affinché sia esattamente come vuoi, poi invialo.",
    writeShort:
      "Scrivi un breve riepilogo di ciò che conta di più per te, poi invialo.",
    placeholder: "Con parole tue…",
    submitEnd: "Invia e termina",
    keepTalking: "Non ancora, voglio continuare a parlare",
    ariaLabel: "Il tuo riepilogo (modificabile)",
  },
  ack: {
    body: "La tua voce fa ora parte del quadro nazionale di ciò che la Svizzera si aspetta dall'IA. Conosci qualcuno che dovrebbe dire la sua? Condividi il link.",
    copyLink: "Copia il link da condividere",
    shareCopied: "Link copiato negli appunti",
    wrapUpTab: "Conclusione",
    backHome: "Torna alla pagina iniziale",
  },
  feedbackChat: {
    heading: "Un'ultima domanda prima di andare…",
    title: "Due parole sulla tua esperienza",
    placeholder: "Scrivi la tua risposta…",
    send: "Invia",
    errorMessage: "Non ha funzionato.",
    retry: "Riprova",
  },
  closing: {
    kicker: "La tua citazione per il muro",
    placeholder: "Spero che…",
    anonymous: "Anonimo · appare solo il tuo cantone",
    submit: "Aggiungi al muro",
    skip: "Salta",
    kickoff:
      "Ciao, sono Apertus. {question}",
    wallTitle: "Grazie – la tua voce è arrivata.",
    wallHeading: "Cosa conta per gli altri",
    continue: "Continua",
  },
  shape: {
    heading: "Quale domanda dovrebbe porre questo dialogo la prossima volta?",
    body: "Hai risposto alle nostre. Ora dicci cosa si dovrebbe chiedere alla Svizzera sull'IA e cosa è mancato in questo dialogo.",
    placeholder: "La domanda che porrei alla Svizzera è…",
    submit: "Invia",
    skip: "Salta",
  },
  nps: {
    heading:
      "Quanto è probabile che consiglieresti questo dialogo a un amico?",
    low: "Improbabile",
    high: "Molto probabile",
    commentPlaceholder: "Qualcos'altro da dirci? (facoltativo)",
    submit: "Invia",
    thanks: "Grazie per il tuo riscontro.",
  },
  assist: {
    title: "Con le tue parole",
    kickoff:
      "Dimmi cosa hai in mente – ti aiuto a trasformarlo in una risposta breve.",
    suggestionLabel: "La tua risposta",
    editedNote: "Risposta modificata",
    placeholder: "Scrivi qui…",
    stem: "Con parole mie, …",
  },
  demographics: {
    skip: "Salta",
    otherPlaceholder: "Specifica",
    wideRangeNote:
      "Questo ci aiuta a dimostrare che abbiamo ascoltato persone da tutta la Svizzera.",
    introAbout:
      "Ancora qualche ultima domanda su di te, così i risultati rispecchiano un vero spaccato della Svizzera.",
    email: {
      heading: "Scopri cosa ha deciso la Svizzera.",
      body: "Lascia un'e-mail e ti terremo aggiornato su come il tuo contributo ha fatto la differenza.",
      placeholder: "tu@esempio.ch",
      submit: "Invia",
      finishWithout: "Salta",
    },
  },
  faq: [
    {
      question: "Di cosa si tratta?",
      answer:
        "In Svizzera l'IA sta già plasmando decisioni che riguardano la vita quotidiana, eppure alle persone comuni viene chiesto di rado cosa ne pensano. Questo dialogo raccoglie le opinioni del pubblico sull'IA, con le sue stesse parole, per costruire il quadro più completo di ciò che le persone in Svizzera vogliono davvero da essa, e non di ciò che gli esperti danno per scontato al posto loro.",
    },
    {
      question: "Chi lo gestisce?",
      answer:
        "Public AI e Public AI Switzerland, i maggiori operatori dell'Apertus svizzero al mondo, in collaborazione con la Swiss National AI Initiative (gli sviluppatori di Apertus, tra cui ETHZ, EPFL e CSCS), Change.org, il Collective Intelligence Project, Swiss {ai} Weeks e Metagov. Non è un progetto governativo, e partecipare non ti impegna a nulla.",
    },
    {
      question: "Devo sapere qualcosa sull'IA per partecipare?",
      answer:
        "No. Le domande riguardano scelte di tutti i giorni: quando un'IA dovrebbe rispondere o trattenersi, come dovrebbero essere trattati i tuoi dati, se l'IA dovrebbe funzionare allo stesso modo ovunque in Svizzera. Non serve alcun background tecnico per avere un'opinione preziosa.",
    },
    {
      question: "Perché sembra una chat?",
      answer:
        "Invece di un modulo fisso, il nostro intervistatore ti pone brevi domande sull'IA svizzera e approfondisce le tue risposte, così da cogliere il ragionamento dietro le tue opinioni e non solo una casella spuntata. Alcune domande appaiono come schede (una scelta rapida, una classifica, una mappa) a cui rispondi sul momento. Puoi terminare la conversazione quando vuoi.",
    },
    {
      question: "È anonimo?",
      answer:
        "Sì. Non chiediamo né il tuo nome né la tua e-mail. Un cookie di breve durata collega la tua sessione per questa sola conversazione, e le tue risposte sono conservate come dati di ricerca anonimi. Chiediamo il cantone solo per capire come le opinioni differiscono tra le regioni, mai per identificarti.",
    },
    {
      question: "Cosa succede a ciò che dico?",
      answer:
        "Le tue risposte vengono anonimizzate e pubblicate in un rapporto pubblico aperto, e saranno lette da chi plasma la politica svizzera sull'IA e da chi costruisce e mette in funzione l'IA svizzera. I tuoi contributi confluiscono direttamente nella prossima [Carta svizzera dell'IA](https://www.apertus-ai.org/pages/charter/). La tua voce entra a far parte del resoconto, insieme a quelle di migliaia di altri abitanti.",
    },
    {
      question: "L'IA risponderà nella mia lingua?",
      answer:
        "Sì, questa conversazione si svolge in tedesco, francese, italiano o inglese, e puoi cambiare in qualsiasi momento con il pulsante della lingua. Il multilinguismo è un impegno centrale dello sforzo svizzero sull'IA, insieme a neutralità e federalismo, e le tue risposte aiutano a decidere proprio come l'IA dovrebbe gestire le lingue della Svizzera.",
    },
  ],
  hero: {
    question: "La tua voce sull'IA in Svizzera",
    tagline:
      "L'IA sta già plasmando decisioni che riguardano la tua vita quotidiana, eppure chi la sviluppa e la regolamenta sente di rado i cittadini comuni. Qui vieni ascoltato.",
    participants:
      "Sei una delle {count} persone che partecipano in tutta la Svizzera.",
    credibility:
      "Anonimo · Pubblicato in un rapporto aperto",
    opinionsFrom: "Opinioni da",
    conversations: "Conversazioni",
  },
  landing: {
    start: "Inizia il dialogo",
    continue: "Riprendi il dialogo",
    review: "Rivedi il tuo dialogo",
    inProgress:
      "Il tuo dialogo ti aspetta. Riprendi esattamente da dove avevi lasciato.",
    scrollHint: "Scorri per saperne di più",
    headlineTop: "Il futuro dell'IA in Svizzera",
    headlineBottom: "appartiene a te.",
    heroTagline:
      "Lo Swiss National AI Dialogue è la tua linea diretta con le persone che stanno costruendo l'IA della Svizzera.",
    swissEyebrow: "Un'IA svizzera",
    swissStatement: "La Svizzera ha costruito la propria IA.",
    swissName: "Si chiama",
    otherAiEyebrow: "La differenza",
    otherAi:
      "Ogni altra IA nella tua vita è stata costruita da aziende che non incontrerai mai, secondo regole su cui non hai mai avuto voce in capitolo.",
    directEyebrow: "Partecipazione diretta",
    directHeading: "La tua linea diretta con l'IA della Svizzera.",
    directBody:
      "Contribuisci a costruirla proprio come voteresti a un referendum o firmeresti un'iniziativa. Ciò che condividi arriva direttamente al team che costruisce Apertus.",
    mapEyebrow: "Il dialogo finora",
    mapHeading: "Voci da ogni angolo della Svizzera",
    mapSub:
      "Ogni punto luminoso segna un cantone da cui qualcuno ha già partecipato. Più brilla, più voci ci sono.",
    mapTotal:
      "{count} persone in tutta la Svizzera hanno partecipato finora.",
    quotesEyebrow: "Voci dal dialogo",
    quotesHint:
      "Passa il cursore su un cantone evidenziato o toccalo per leggere le voci da lì. Tocca una citazione per leggerla per intero.",
    quotesAllCantons: "Tutti i cantoni",
  },
  footer: {
    heading: "Informazioni su questo dialogo",
    intro:
      "{name} raccoglie ciò che le persone comuni in tutta la Svizzera pensano davvero dell'IA: cosa trovano utile, cosa le preoccupa e cosa vorrebbero far sapere a chi prende le decisioni. Le risposte vengono anonimizzate e pubblicate in un rapporto pubblico aperto. Questo dialogo non è un progetto governativo, e partecipare non ti impegna a nulla.",
    collaboration: "Realizzato in collaborazione con:",
    legal:
      "Le tue risposte sono anonime e conservate come dati di ricerca. Partecipando, accetti le nostre",
    terms: "Condizioni d'uso e l'informativa sulla privacy",
  },
  cookieConsent: {
    title: "Le tue scelte sulla privacy",
    body: "Utilizziamo cookie strettamente necessari per far funzionare questo dialogo. Con il tuo consenso utilizziamo anche cookie di analisi per capire come viene utilizzato il dialogo e migliorarlo. Puoi modificare la tua scelta in qualsiasi momento.",
    acceptAll: "Accetta tutti",
    rejectAll: "Rifiuta tutti",
    customize: "Personalizza",
    save: "Salva le scelte",
    alwaysOn: "Sempre attivi",
    manage: "Gestisci i cookie",
    categories: {
      necessary: {
        label: "Strettamente necessari",
        desc: "Necessari per far funzionare il dialogo: memorizzano la conversazione e la lingua. Sempre attivi.",
      },
      analytics: {
        label: "Analisi",
        desc: "Ci aiutano a capire come viene utilizzato il dialogo per migliorarlo, inclusa la registrazione della sessione.",
      },
      marketing: {
        label: "Marketing",
        desc: "Utilizzati per misurare e indirizzare la pubblicità relativa al dialogo.",
      },
    },
  },
  errorRetry: { message: "Qualcosa non ha funzionato.", retry: "Riprova" },
  quoteWall: { readMore: "Leggi la citazione completa", showLess: "Mostra meno" },
};

// ----- Romansh (Rumantsch Grischun) -----
const rm: SwissDict = {
  langStep: {
    heading: "Tscherni Vossa lingua",
    subheading: "Vus la pudais midar da tut temp.",
  },
  topics: {
    addYourOwn: "Agiuntar in agen tema",
    customPlaceholder: "In tema che Vus stat a cor…",
    addCustom: "Agiuntar in tema",
    reorderHeading: "Cun tge duain nus cumenzar?",
    reorderSubheading:
      "Nus tractain tuts quests temas. Tutgai els en la successiun ch'è la pli impurtanta per Vus.",
    reorderKeepHint:
      "Cuntent cun questa successiun? Sfulgentai simplamain vinavant.",
    previewHeading: "Da tge che nus discurrin",
    previewSubheading:
      "Nus passain ensemen tras quests temas. Vus na stuais betg tscherner, mo per che Vus savais nua che nus giain.",
    proposeLabel: "Datti insatge che nus duessan tractar en mintga cas?",
    proposePlaceholder: "Agiuntai in agen tema (facultativ)…",
    yourTopicKicker: "Voss tema",
    yourTopicConfirm:
      "Nus tractain quai en Vossa conversaziun en mintga cas.",
    edit: "Modifitgar",
    remove: "Allontanar",
    labels: {
      "daily-life": {
        title: "IA en mia vita da mintgadi ed en Svizra",
        blurb:
          "Tge che l'IA fa oz per Vus, e nua che la Svizra duess sa concentrar",
        rationale:
          "Tge che l'IA fa gia oz per Vus, tge che Vus vulessas ch'ella fetschia meglier, e nua che la Svizra duess concentrar ses sforzs, dal persunal al naziunal.",
      },
      "swiss-or-foreign": {
        title: "IA svizra u IA estra: importa quai?",
        blurb:
          "Sche l'origin, la governanza e la natira svizra d'ina IA importan",
        rationale:
          "Sche l'origin e la governanza influenzeschan Vossa fidanza, tge che rendess in'alternativa svizra degna d'esser tschernida, e co ch'ella reflectescha las linguas, la cultura e l'identitad svizras.",
      },
      "your-influence": {
        title: "Tgi controllescha l'IA, e tge capita cur ch'i va mal?",
        blurb:
          "Vossa vusch davart l'IA, ses limits e la responsabladad per donns",
        rationale:
          "Sche persunas ordinarias duessan avair in pled da dir en co ch'ils sistems d'IA sa cumportan, nua ch'ils limits da l'IA duessan esser, e tgi ch'è responsabel cur ch'ella chaschuna donn.",
      },
      "everyday-use": {
        title: "IA en Vossa vita da mintgadi",
        blurb: "Co che l'IA cumpara gia en la vita da mintgadi",
        rationale:
          "Co che Vus utilisais gia l'IA: tge che funcziuna, tge betg, e sche la lingua che Vus discurris mida la experientscha.",
      },
      "public-benefit": {
        title: "Nua che l'IA pudess gidar la Svizra",
        blurb: "Nua ch'ina IA meglra fetschess il pli grond bain public",
        rationale:
          "Tge parts da la vita svizra (sanadad, furmaziun, servetschs publics) pudessan profitar il pli, e nua ch'las prioritads duessan esser.",
      },
      economy: {
        title: "IA, lavur e plazzas da lavur",
        blurb:
          "Il rolla da l'IA en la lavur, l'economia e la prosperitad svizra",
        rationale:
          "Sche l'IA rinforzescha las plazzas da lavur e l'industria svizras u sche ella las vidia, e nua ch'l'equilibri duess esser.",
      },
      sovereignty: {
        title: "IA svizra u IA estra?",
        blurb: "Sche l'origin ed il controll d'ina IA importan",
        rationale:
          "Sche l'origin ed il controll d'ina IA influenzeschan Vossa fidanza, e tge che rendess in'alternativa svizra degna d'esser tschernida.",
      },
      influence: {
        title: "Vossa vusch davart co che l'IA sa cumporta",
        blurb: "Sche persunas ordinarias duessan furmar l'IA",
        rationale:
          "Sche persunas ordinarias duessan avair in pled da dir en co ch'ils sistems d'IA sa cumportan, e tge gener da vusch quai duess esser.",
      },
      "identity": {
        title: "IA ed identitad svizra",
        blurb: "Sche l'IA duess reflectar las linguas e regiuns svizras",
        rationale:
          "Sche l'IA duess s'adattar a las linguas, culturas e regiuns da la Svizra, e tge che «local» munta per Vus.",
      },
    },
  },
  composer: { placeholder: "Scrivai Vossa risposta…", ariaLabel: "Vossa risposta" },
  progress: {
    gettingStarted: "Nus cumenzain pir",
    shaping: "Vossa idea prenda furma",
    ready: "Pront per trametter cur che Vus vulais",
    wrapUp: "Terminar & trametter",
  },
  intro: {
    cantonBeat: {
      legal: "Cuntinuond acceptais Vus noss",
      terms: "Cundiziuns d'utilisaziun e la Decleraziun da protecziun da datas.",
    },
  },
  canton: {
    eyebrow: "Nua en Svizra?",
    selectPlaceholder: "Tscherni Voss chantun…",
    notInSwitzerland: "Betg en Svizra",
    notInSwitzerlandShort: "Betg en CH",
    thanks:
      "Grazia, {name}. Qua vesais Vus danunder ch'las persunas han participà fin ussa.",
    thanksFallback: "chapì",
    participants:
      "{count} participants en tut la Svizra, cumpigliond Vus.",
    tooltip: "{count} participants",
  },
  tradeoff: {
    eyebrow: "Vers tge tendais Vus?",
    choseToExplain: "Vus avais tschernì da declerar cun Vossas atgnas pleds.",
    dragHint: "Trai là nua che Vus stais, u tutgai in maun",
    or: "u",
    confirm: "Trametter",
    leanStrong: "Fermamain vers {label}",
    leanToward: "Pli tost vers {label}",
    leanSlight: "In pau vers {label}",
    balanced: "In equilibri dad omadus",
    pollHeading: "Co ch'las autras persunas han respundì",
    pollYou: "Vus",
    pollKicker: "CH fin ussa",
  },
  budget: {
    toPlace: "{count} da plazzar",
    placeMore: "Plazzai anc {count}",
    average: "Media CH",
  },
  ranking: {
    hint: "Trai per ordinar, il pli impurtant l'emprim",
    submit: "Trametter",
    followUpPlaceholder: "Anc insatge?",
    yours: "Vus",
    crowd: "Media CH",
  },
  archetype: {
    eyebrow: "Vossa persunalitad IA",
    names: {
      "pioneer": "Il Spiert pionier",
      "mountain-guide": "La Guida da muntogna",
      "watchmaker": "Il Fabricant d'uras",
      "st-bernard": "Il Son Bernard",
      "innkeeper": "L'Osta",
      "ranger": "Il Guardian da la val",
      "alphorn-player": "La Tiba",
      "bridge-builder": "Il Constructur da punts",
    },
    descriptions: {
      "pioneer": "L'emprim sin la nova senda: Vus vulais la meglra IA, ussa, e prendais en cumpra in pau ristg.",
      "mountain-guide": "Respostas claras cun mintga aura: Vus vulais ina IA che di co chi stat.",
      "watchmaker": "Precisiun avant sveltezza: mintga protecziun al lieu avant ch'il mecanissem va.",
      "st-bernard": "Chaud e vigilant: ina IA che procura propi per la glieud e la protegia.",
      "innkeeper": "Tar Vus han tuts in plaz a maisa: ina IA charina, nizzaivla e bainvegnida.",
      "ranger": "Vus guardais la val: cun fidanza mesirada, serius cun la protecziun da datas, fidels al local.",
      "alphorn-player": "Vossa vusch porta sur la val: ina IA svizra che tut la cuminanza fuorma ensemen.",
      "bridge-builder": "Vus construis punts tranter las varts: ina IA gista, precauta e responsabla.",
    },
    axisLabels: {
      curiosity: "Curiusadad",
      candor: "Franchezza",
      heart: "Cor",
      guard: "Protecziun",
      roots: "Ragischs",
      voice: "Vusch",
    },
    rarity: "{percent}% da las participantas ed ils participants han quest profil",
  },
  question: {
    other: "Auter:",
    otherPrompt: "Qua èn las opziuns che ans èn vegnidas en senn. Tge manca?",
    otherPlaceholder: "Scrivai Vossa atgna resposta…",
    textPlaceholder: "Scrivai Vossa resposta…",
    next: "Vinavant",
    submit: "Trametter",
    skip: "Sursiglir",
    rateUp: "Buna dumonda",
    rateDown: "Betg ina buna dumonda",
    notePrompt: "Grazia. Vulais Vus dir anc insatge davart questa dumonda?",
    notePlaceholder: "Tge ch'ha funcziunà, u betg …",
    noteSend: "Trametter",
    noteDismiss: "Na, grazia",
    noteThanks: "Grazia per Voss resun.",
    noteAdd: "Agiuntar in commentari",
    noteEdit: "Modifitgar il commentari",
  },
  shareMore: {
    thanks:
      "Grazia fitg che Vus avais cundividì Vossa opiniun davart «{topic}».",
    invitation:
      "Quai è ina conversaziun en omaduas direcziuns. Sur las dumondas preparadas ora vulessan nus udir tge ch'è impurtant per Vus. Vulais Vus dir dapli?",
    talk: "Jau vuless dir dapli",
    skip: "Sursiglir",
  },
  contribution: {
    kickoff:
      "Tge duess il team che construescha l'IA svizra chapir absolutamain davart quest tema? Di quai cun Voss agens pleds. Ensemen faschain nus da quai Vossa contribuziun.",
    cardTitle: "Vossa contribuziun",
    cardHint:
      "Vossa decleraziun per la paraid da las vuschs da quest tema. Scrivai ella directamain, u discurri sutvart e resumai cur ch'ella tuna sco Vus.",
    placeholder: "Cun Voss agens pleds …",
    summarize: "Resumar noss barat",
    summarizing: "Vegn resumà …",
    anonymous:
      "Vegn mussada anonimamain ad auters participants; mo Voss chantun cumpara.",
    submit: "Agiuntar a la paraid",
    skip: "Sursiglir",
    wallTitle: "Vossa contribuziun è sin la paraid",
    wallQuestion: "Tge che auters din",
    yourNote: "Vossa contribuziun",
    empty:
      "Qua cumparan ulteriuras vuschs, uschespert che auters sa participeschan.",
    nextTopic: "Vinavant al proxim tema …",
    continue: "Cuntinuar",
    editNote: "Modifitgar Vossa contribuziun per la paraid",
    doneEditing: "Fini",
  },
  pager: {
    previous: "Dumonda precedenta",
    next: "Proxima dumonda",
    resume: "Enavos a la dumonda actuala",
    conversation: "Discurs",
  },
  multiSelect: {
    selectAll: "Tscherni tut quai che valai",
    pickUpTo: "Tscherni fin {count}",
  },
  summary: {
    yourSummary: "Voss resumaziun",
    editable: "modifitgabel",
    hereIsWhat:
      "Quai hai jau udì da Vus. Modifitgai quai uschè ch'i legia exactamain sco Vus vulais, e trametti lura.",
    writeShort:
      "Scrivai in curt resumaziun da quai che Vus stat il pli a cor, e trametti lura.",
    placeholder: "Cun Vossas atgnas pleds…",
    submitEnd: "Trametter & terminar",
    keepTalking: "Anc betg, jau vuless cuntinuar a discurrer",
    ariaLabel: "Voss resumaziun (modifitgabel)",
  },
  ack: {
    body: "Vossa vusch fa ussa part dal maletg naziunal da quai ch'la Svizra vul da l'IA. Enconuschais Vus insatgi che duess era dir sia opiniun? Cundividi il link.",
    copyLink: "Copiar il link per cundivider",
    shareCopied: "Link copià en la memoria provisorica",
    wrapUpTab: "Conclusiun",
    backHome: "Enavos a la pagina da partenza",
  },
  demographics: {
    skip: "Sursiglir",
    otherPlaceholder: "Endicai per plaschair",
    wideRangeNote:
      "Quai ans gida a mussar che nus avain udì da persunas da tut la Svizra.",
    introAbout:
      "Anc paucas ultimas dumondas davart Vus, per che ils resultats reflettian in real tagl transversal da la Svizra.",
    email: {
      heading: "Vesai tge ch'la Svizra ha decidì.",
      body: "Laschai in'adressa dad e-mail e nus Vus tegnin actual co Voss contribut ha fatg ina differenza.",
      placeholder: "vus@exempel.ch",
      submit: "Trametter",
      finishWithout: "Sursiglir",
    },
  },
  feedbackChat: {
    heading: "Anc ina curta dumonda avant che Vus giais…",
    title: "In curt pled davart Vossa experientscha",
    placeholder: "Scrivai Vossa risposta…",
    send: "Trametter",
    errorMessage: "Quai n'ha betg funcziunà.",
    retry: "Empruvar danovamain",
  },
  closing: {
    kicker: "Vossa citaziun per la paraid",
    placeholder: "Jau sper che…",
    anonymous: "Anonim · mo Voss chantun vegn mussà",
    submit: "Agiuntar a la paraid",
    skip: "Sursiglir",
    kickoff:
      "Allegra, jau sun Apertus. {question}",
    wallTitle: "Grazia fitg – Vossa vusch è cun quai.",
    wallHeading: "Tge ch'è impurtant per auters",
    continue: "Cuntinuar",
  },
  shape: {
    heading: "Tge dumonda duess quest dialog far la proxima giada?",
    body: "Vus avais respundì a las nossas. Uss ans dischai tge ch'i duess vegnir dumandà a la Svizra davart l'IA e tge ch'ha mancà en quest dialog.",
    placeholder: "Mia dumonda a la Svizra fiss…",
    submit: "Trametter",
    skip: "Sursiglir",
  },
  nps: {
    heading:
      "Quant probabel è i che Vus recumandais quest dialog ad in ami u ina amia?",
    low: "Betg probabel",
    high: "Fitg probabel",
    commentPlaceholder: "Anc insatge auter da nus dir? (facultativ)",
    submit: "Trametter",
    thanks: "Grazia fitg per Voss resun.",
  },
  assist: {
    title: "En Voss agens pleds",
    kickoff:
      "Raquintai a mai tge che Vus pensais – jau Vus gid a formular ina curta resposta.",
    suggestionLabel: "Vossa resposta",
    editedNote: "Resposta modifitgada",
    placeholder: "Scriver qua…",
    stem: "Cun mes agens pleds: …",
  },
  faq: [
    {
      question: "Da tge va i qua?",
      answer:
        "L'IA furma gia oz decisiuns che pertutgan la vita da mintgadi en Svizra, ma persunas ordinarias vegnan mo darar dumandadas tge ch'ellas pensan. Quest dialog rimna las atgnas vestas da la publicitad davart l'IA, cun ses atgens pleds, per crear il maletg il pli cumplet da quai ch'las persunas en Svizra vulan propi dad ella, e betg quai ch'ils experts supponan a lur plaz.",
    },
    {
      question: "Tgi maina quai?",
      answer:
        "Public AI e Public AI Switzerland, ils pli gronds operaturs da l'Apertus svizzer sin il mund, en collavuraziun cun la Swiss National AI Initiative (ils constructurs dad Apertus, tranter auter ETHZ, EPFL e CSCS), Change.org, il Collective Intelligence Project, Swiss {ai} Weeks e Metagov. Quai n'è betg in project statal, e la participaziun na Vus oblighescha a nagut.",
    },
    {
      question: "Stoss jau savair insatge davart l'IA per participar?",
      answer:
        "Na. Las dumondas concernan decisiuns da mintgadi: cura ch'ina IA duess respunder u sa retegnair, co che Vossas datas duessan vegnir tractadas, sche l'IA duess funcziunar da medem sez dapertut en Svizra. Vus na dovrais nagin fund tecnic per avair in'opiniun preziusa.",
    },
    {
      question: "Pertge para quai in chat?",
      answer:
        "Empè d'in formular fix, noss intervistader As pona curtas dumondas davart l'IA svizra e dumonda vinavant tar Vossas respostas, per ch'i chattian il raschunament davos Vossas vestas e betg mo in crousch. Tschertas dumondas cumparan sco chartas (ina tscherna svelta, ina classifica, ina charta) che Vus respundais sin plaz. Vus pudais terminar la conversaziun cura che Vus vulais.",
    },
    {
      question: "È quai anonim?",
      answer:
        "Gea. Nus na dumandain ni Voss num ni Voss e-mail. In cookie da curta durada colliescha Vossa sesida durant questa suletta conversaziun, e Vossas respostas vegnan memorisadas sco datas da perscrutaziun anonimas. Nus dumandain mo davart Voss chantun per chapir co ch'las vestas sa differenzieschan tranter las regiuns, mai per As identifitgar.",
    },
    {
      question: "Tge capita cun quai che jau di?",
      answer:
        "Vossas respostas vegnan anonimisadas e publitgadas en in rapport public avert, e vegnan legidas da las persunas che furman la politica svizra davart l'IA sco er da quellas che construeschan e mettan en funcziun l'IA svizra. Vossas contribuziuns influeschan directamain en la proxima [Charta svizra da l'IA](https://www.apertus-ai.org/pages/charter/). Vossa vusch daventa part dal protocol, ensemen cun quellas da millis dad autras persunas.",
    },
    {
      question: "Respunda l'IA en mia lingua?",
      answer:
        "Gea, questa conversaziun sa fa per tudestg, franzos, talian, englais u rumantsch, e Vus pudais midar da tut temp cul buttun da lingua. La plurilinguitad è in engaschament central dal sforz svizzer davart l'IA, sper la neutralitad ed il federalissem, e Vossas respostas gidan a decider co ch'l'IA duess tractar las linguas da la Svizra.",
    },
  ],
  hero: {
    question: "Vossa vusch davart l'IA en Svizra",
    tagline:
      "L'IA furma gia oz decisiuns che pertutgan Vossa vita da mintgadi, ma las persunas ch'la construeschan e regulan udan mo darar da burgais ordinaris. Qua vegnis Vus udì.",
    participants:
      "Vus essas ina da {count} persunas en tut la Svizra che participeschan.",
    credibility:
      "Anonim · Publitgà en in rapport avert",
    opinionsFrom: "Opiniuns da",
    conversations: "Conversaziuns",
  },
  landing: {
    start: "Cumenzar il dialog",
    continue: "Cuntinuar il dialog",
    review: "Reguardar Voss dialog",
    inProgress:
      "Voss dialog As spetga. Cuntinuai exactamain là, nua che Vus avais chalà.",
    scrollHint: "Scrollai engiu per savair dapli",
    headlineTop: "Il futur da l'IA en Svizra",
    headlineBottom: "tutga a Vus.",
    heroTagline:
      "Il Swiss National AI Dialogue è Vossa lingia directa a las persunas che construeschan l'IA atgna da la Svizra.",
    swissEyebrow: "Ina IA svizra",
    swissStatement: "La Svizra ha sviluppà sia atgna IA.",
    swissName: "Ella ha num",
    otherAiEyebrow: "La differenza",
    otherAi:
      "Mintg'autra IA en Vossa vita è vegnida sviluppada d'interpresas che Vus na vegnis mai ad entupar e suonda reglas davart las qualas Vus n'avevas mai in pled da dir.",
    directEyebrow: "Participaziun directa",
    directHeading: "Vossa lingia directa a l'IA da la Svizra.",
    directBody:
      "Gidai a la construir gist uschia sco Vus votassas sur d'in referendum u suttascrivessas in'iniziativa. Quai che Vus cundividis va directamain a la squadra che construescha Apertus.",
    mapEyebrow: "Il dialog fin ussa",
    mapHeading: "Vuschs da tut ils chantuns da la Svizra",
    mapSub:
      "Mintga punct che glischa marchescha in chantun, danunder che persunas han gia participà. Pli cler ch'el glischa, dapli vuschs.",
    mapTotal:
      "{count} persunas en tut la Svizra han sa participà fin ussa.",
    quotesEyebrow: "Vuschs dal dialog",
    quotesHint:
      "Passai cun il cursur sur in chantun accentuà u tutgai el per leger vuschs da là. Tutgai ina citaziun per la leger dal tuttafatg.",
    quotesAllCantons: "Tut ils chantuns",
  },
  footer: {
    heading: "Davart quest dialog",
    intro:
      "{name} rimna quai che burgais ordinaris en tut la Svizra pensan propi davart l'IA: tge ch'els chattan util, tge ch'als preoccupescha e tge ch'els vulessan laschar savair a las persunas che prendan decisiuns. Las respostas vegnan anonimisadas e publitgadas en in rapport public avert. Quest dialog n'è betg in project statal, e la participaziun na Vus oblighescha a nagut.",
    collaboration: "Realisà en collavuraziun cun:",
    legal:
      "Vossas respostas èn anonimas e vegnan memorisadas sco datas da perscrutaziun. Cun la participaziun acceptais Vus noss",
    terms: "Cundiziuns d'utilisaziun e la Decleraziun da protecziun da datas",
  },
  cookieConsent: {
    title: "Vossas tschernas da protecziun da datas",
    body: "Nus utilisain cookies strictamain necessaris per far ir quest dialog. Cun Voss consentiment utilisain nus era cookies d'analisa per chapir co ch'il dialog vegn utilisà e per al meglierar. Vus pudais midar Vossa tscherna da tut temp.",
    acceptAll: "Acceptar tut",
    rejectAll: "Refusar tut",
    customize: "Persunalisar",
    save: "Memorisar las tschernas",
    alwaysOn: "Adina activ",
    manage: "Administrar ils cookies",
    categories: {
      necessary: {
        label: "Strictamain necessari",
        desc: "Necessari per far ir il dialog: memorisescha Vossa conversaziun e Vossa lingua. Adina activ.",
      },
      analytics: {
        label: "Analisa",
        desc: "Ans gida a chapir co ch'il dialog vegn utilisà per ch'i pudian al meglierar, inclus la registraziun da la sesida.",
      },
      marketing: {
        label: "Marketing",
        desc: "Vegn utilisà per mesirar e drizzar reclama davart il dialog.",
      },
    },
  },
  errorRetry: { message: "Quai n'ha betg funcziunà.", retry: "Empruvar danovamain" },
  quoteWall: { readMore: "Leger la citaziun cumplaina", showLess: "Mussar main" },
};

export const STRINGS: Record<SwissLocale, SwissDict> = { de, fr, it, en, rm };

export type TopicIntroCopy = {
  about: string;
  purpose: string;
  kickoff: string;
};

export const TOPIC_INTROS: Record<
  SwissLocale,
  Record<string, TopicIntroCopy>
> = {
  en: {
    "daily-life": {
      about:
        "What you already use AI for, and how Switzerland's AI should behave with you.",
      purpose:
        "Your answers shape how Apertus acts in everyday moments.",
      kickoff:
        "What would you most want Apertus to get right in your everyday life? Tell me in your own words. Together we'll shape it into your contribution.",
    },
    "swiss-or-foreign": {
      about:
        "Who holds your data, and what it would take to trust the system.",
      purpose:
        "Your answers show where Apertus has to earn that trust.",
      kickoff:
        "When it comes to trusting an AI, Swiss or foreign, what matters most to you? Say it in your own words, and we'll shape it into your contribution.",
    },
    "languages-culture": {
      about:
        "How AI should adapt to Switzerland's languages and local realities.",
      purpose:
        "Your answers decide which languages and contexts Apertus must get right.",
      kickoff:
        "What should Apertus understand about your language or your region that other AIs miss? Tell me in your own words, and we'll shape it into your contribution.",
    },
    investing: {
      about:
        "How Switzerland should invest in AI: public or private, broad access or frontier research.",
      purpose:
        "Your answers help set those priorities.",
      kickoff:
        "If you could steer where Switzerland puts its AI money and effort, what would you change? Say it in your own words, and we'll shape it into your contribution.",
    },
    accountability: {
      about:
        "Who controls AI, who answers when it causes harm, and what happens next.",
      purpose:
        "Your answers shape the rules for control and redress.",
      kickoff:
        "When AI causes real harm, what would feel like justice to you? Tell me in your own words, and we'll shape it into your contribution.",
    },
  },
  de: {
    "daily-life": {
      about:
        "Wofür Sie KI heute schon nutzen, und wie sich die Schweizer KI Ihnen gegenüber verhalten soll.",
      purpose:
        "Ihre Antworten prägen, wie sich Apertus im Alltag verhält.",
      kickoff:
        "Was soll Apertus in Ihrem Alltag unbedingt richtig machen? Erzählen Sie es in Ihren eigenen Worten. Gemeinsam formen wir daraus Ihren Beitrag.",
    },
    "swiss-or-foreign": {
      about:
        "Wer Ihre Daten hält, und was es bräuchte, damit Sie dem System vertrauen.",
      purpose:
        "Ihre Antworten zeigen, wo sich Apertus Ihr Vertrauen verdienen muss.",
      kickoff:
        "Wenn es ums Vertrauen in eine KI geht, schweizerisch oder international, was zählt für Sie am meisten? Sagen Sie es in Ihren eigenen Worten, und wir formen daraus Ihren Beitrag.",
    },
    "languages-culture": {
      about:
        "Wie sich KI an die Sprachen und lokalen Realitäten der Schweiz anpassen soll.",
      purpose:
        "Ihre Antworten zeigen, welche Sprachen und Kontexte Apertus beherrschen muss.",
      kickoff:
        "Was sollte Apertus über Ihre Sprache oder Ihre Region verstehen, das andere KIs übersehen? Erzählen Sie es in Ihren eigenen Worten, und wir formen daraus Ihren Beitrag.",
    },
    investing: {
      about:
        "Wie die Schweiz in KI investieren soll: öffentlich oder privat, breiter Zugang oder Spitzenforschung.",
      purpose:
        "Ihre Antworten helfen, diese Prioritäten zu setzen.",
      kickoff:
        "Wenn Sie lenken könnten, wohin die Schweiz ihr KI-Geld und ihre Kraft steckt, was würden Sie ändern? Sagen Sie es in Ihren eigenen Worten, und wir formen daraus Ihren Beitrag.",
    },
    accountability: {
      about:
        "Wer KI kontrolliert, wer haftet, wenn sie Schaden anrichtet, und was danach geschieht.",
      purpose:
        "Ihre Antworten prägen die Regeln für Kontrolle und Wiedergutmachung.",
      kickoff:
        "Wenn KI echten Schaden anrichtet, was würde sich für Sie nach Gerechtigkeit anfühlen? Erzählen Sie es in Ihren eigenen Worten, und wir formen daraus Ihren Beitrag.",
    },
  },
  fr: {
    "daily-life": {
      about:
        "Ce pour quoi vous utilisez déjà l'IA, et comment l'IA suisse devrait se comporter avec vous.",
      purpose:
        "Vos réponses façonnent la manière dont Apertus agit au quotidien.",
      kickoff:
        "Que devrait absolument réussir Apertus dans votre quotidien ? Racontez-le avec vos propres mots. Ensemble, nous en ferons votre contribution.",
    },
    "swiss-or-foreign": {
      about:
        "Qui détient vos données, et ce qu'il faudrait pour faire confiance au système.",
      purpose:
        "Vos réponses montrent où Apertus doit gagner votre confiance.",
      kickoff:
        "Pour faire confiance à une IA, suisse ou étrangère, qu'est-ce qui compte le plus pour vous ? Dites-le avec vos propres mots, et nous en ferons votre contribution.",
    },
    "languages-culture": {
      about:
        "Comment l'IA devrait s'adapter aux langues et aux réalités locales de la Suisse.",
      purpose:
        "Vos réponses indiquent quelles langues et quels contextes Apertus doit maîtriser.",
      kickoff:
        "Que devrait comprendre Apertus de votre langue ou de votre région, que les autres IA ratent ? Racontez-le avec vos propres mots, et nous en ferons votre contribution.",
    },
    investing: {
      about:
        "Comment la Suisse devrait investir dans l'IA : public ou privé, accès large ou recherche de pointe.",
      purpose:
        "Vos réponses aident à fixer ces priorités.",
      kickoff:
        "Si vous pouviez orienter où la Suisse met son argent et ses efforts en IA, que changeriez-vous ? Dites-le avec vos propres mots, et nous en ferons votre contribution.",
    },
    accountability: {
      about:
        "Qui contrôle l'IA, qui répond quand elle cause un tort, et ce qui se passe ensuite.",
      purpose:
        "Vos réponses façonnent les règles de contrôle et de réparation.",
      kickoff:
        "Quand l'IA cause un vrai tort, qu'est-ce qui vous semblerait juste ? Racontez-le avec vos propres mots, et nous en ferons votre contribution.",
    },
  },
  it: {
    "daily-life": {
      about:
        "Ciò per cui usi già l'IA, e come l'IA svizzera dovrebbe comportarsi con te.",
      purpose:
        "Le tue risposte plasmano come Apertus agisce nel quotidiano.",
      kickoff:
        "Cosa dovrebbe assolutamente azzeccare Apertus nella tua vita di tutti i giorni? Raccontalo con parole tue. Insieme ne faremo il tuo contributo.",
    },
    "swiss-or-foreign": {
      about:
        "Chi detiene i tuoi dati, e cosa servirebbe per fidarsi del sistema.",
      purpose:
        "Le tue risposte mostrano dove Apertus deve guadagnarsi la tua fiducia.",
      kickoff:
        "Per fidarti di un'IA, svizzera o straniera, cosa conta di più per te? Dillo con parole tue, e ne faremo il tuo contributo.",
    },
    "languages-culture": {
      about:
        "Come l'IA dovrebbe adattarsi alle lingue e alle realtà locali della Svizzera.",
      purpose:
        "Le tue risposte indicano quali lingue e contesti Apertus deve padroneggiare.",
      kickoff:
        "Cosa dovrebbe capire Apertus della tua lingua o della tua regione, che le altre IA non colgono? Raccontalo con parole tue, e ne faremo il tuo contributo.",
    },
    investing: {
      about:
        "Come la Svizzera dovrebbe investire nell'IA: pubblico o privato, accesso ampio o ricerca di frontiera.",
      purpose:
        "Le tue risposte aiutano a fissare queste priorità.",
      kickoff:
        "Se potessi decidere dove la Svizzera mette soldi ed energie nell'IA, cosa cambieresti? Dillo con parole tue, e ne faremo il tuo contributo.",
    },
    accountability: {
      about:
        "Chi controlla l'IA, chi risponde quando causa un danno, e cosa succede dopo.",
      purpose:
        "Le tue risposte plasmano le regole su controllo e riparazione.",
      kickoff:
        "Quando l'IA causa un danno vero, cosa ti sembrerebbe giusto? Raccontalo con parole tue, e ne faremo il tuo contributo.",
    },
  },
  rm: {
    "daily-life": {
      about:
        "Per tge che Vus duvrais gia l'IA, e co che l'IA svizra duess sa cumportar cun Vus.",
      purpose:
        "Vossas respostas fuorman co che Apertus agescha en il mintgadi.",
      kickoff:
        "Tge duess Apertus far dretg absolutamain en Voss mintgadi? Raquintai quai cun Voss agens pleds. Ensemen faschain nus da quai Vossa contribuziun.",
    },
    "swiss-or-foreign": {
      about:
        "Tgi che tegna Vossas datas, e tge ch'i duvrass per As fidar dal sistem.",
      purpose:
        "Vossas respostas mussan nua che Apertus sto gudagnar Vossa confidenza.",
      kickoff:
        "Per As fidar d'ina IA, svizra u estra, tge conta il pli per Vus? Di quai cun Voss agens pleds, e nus faschain da quai Vossa contribuziun.",
    },
    "languages-culture": {
      about:
        "Co che l'IA duess s'adattar a las linguas ed a las realitads localas da la Svizra.",
      purpose:
        "Vossas respostas mussan tge linguas e contexts che Apertus sto dumagnar.",
      kickoff:
        "Tge duess Apertus chapir da Vossa lingua u da Vossa regiun, che autras IAs na vesan betg? Raquintai quai cun Voss agens pleds, e nus faschain da quai Vossa contribuziun.",
    },
    investing: {
      about:
        "Co che la Svizra duess investir en l'IA: public u privat, access lad u perscrutaziun da punta.",
      purpose:
        "Vossas respostas gidan a fixar questas prioritads.",
      kickoff:
        "Sche Vus pudessas decider nua che la Svizra metta ses daners e sia forza en l'IA, tge midassas Vus? Di quai cun Voss agens pleds, e nus faschain da quai Vossa contribuziun.",
    },
    accountability: {
      about:
        "Tgi che controllescha l'IA, tgi che responda cur ch'ella chaschuna donn, e tge che capita lura.",
      purpose:
        "Vossas respostas fuorman las reglas per controll e reparaziun.",
      kickoff:
        "Cur che l'IA chaschuna in donn real, tge As paress giust? Raquintai quai cun Voss agens pleds, e nus faschain da quai Vossa contribuziun.",
    },
  },
};
