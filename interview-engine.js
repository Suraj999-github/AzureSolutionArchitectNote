/**
 * interview-engine.js
 * Fully local interview engine — zero API calls, zero backend.
 * Drives the entire interview flow using the question bank.
 */

window.InterviewEngine = (function () {

  // ── internal state ─────────────────────────────────────────
  let _candidate = { name: '', level: '', focus: '' };
  let _phase = 0;          // 0–5  (5 = complete)
  let _qIndex = 0;         // question index within current phase
  let _score = { csharp: [], oop: [], coding: [], agile: [] };
  let _phaseQueues = {};   // shuffled question list per phase
  let _waitingForAnswer = false;
  let _onMessage = null;   // callback(role, text, meta)
  let _onPhaseChange = null;
  let _onComplete = null;
  let _msgDelay = 900;     // ms typing simulation

  // map phase index → data key
  const PHASE_KEYS = ['introduction', 'csharp', 'oop', 'coding', 'agile'];
  const PHASE_NAMES = ['Introduction', 'C# & .NET', 'OOP & Patterns', 'Coding Exercise', 'Agile & Communication'];
  const SCORE_KEYS  = [null, 'csharp', 'oop', 'coding', 'agile'];

  // how many questions to ask per phase
  const PHASE_Q_COUNTS = { introduction: 2, csharp: 5, oop: 4, coding: 2, agile: 3 };

  // ── helpers ────────────────────────────────────────────────
  function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function emit(role, text, meta = {}) {
    if (_onMessage) _onMessage(role, text, meta);
  }

  function emitPhaseChange(n) {
    if (_onPhaseChange) _onPhaseChange(n);
  }

  function pickQuestions(phaseKey) {
    const all = (window.INTERVIEW_QUESTIONS || {})[phaseKey] || [];
    const level = _candidate.level;
    // Prefer matching difficulty; fall back to all
    let filtered = all.filter(q => !q.difficulty ||
      q.difficulty === level ||
      (level === 'lead' && q.difficulty === 'senior'));
    if (filtered.length < 2) filtered = all;
    return shuffle(filtered).slice(0, PHASE_Q_COUNTS[phaseKey] || 3);
  }

  // ── scripted AI responses ──────────────────────────────────

  const INTRO_GREETINGS = [
    (name, level) => `Hello ${name}! 👋 I'm your AI technical interviewer for today's session. We'll be covering C# & .NET fundamentals, OOP and design patterns, a coding exercise, and some questions around remote Agile collaboration.\n\nYou have up to **43 minutes** total. I'll adapt the difficulty to your ${level} experience level.\n\nLet's start with a quick introduction — **tell me a bit about yourself**: your background, how long you've been working with .NET, and what kind of projects you've been involved in recently.`,
    (name, level) => `Welcome, ${name}! Great to have you here. I'll be guiding you through a structured C# & .NET interview covering four main areas over the next 43 minutes.\n\nSince you've indicated **${level}** experience, I'll tailor my questions accordingly.\n\nFirst things first — **please introduce yourself**: your experience with .NET, your current or most recent role, and what you enjoy most about backend development.`,
  ];

  const TRANSITION_MSGS = {
    1: () => `Great, thanks for the introduction! Let's dive into the **technical section** now.\n\nI'll ask you some questions on C# and the .NET ecosystem — covering topics like async programming, memory management, LINQ, dependency injection, and API design. Take your time and think out loud if that helps.`,
    2: () => `Excellent work on the technical questions! Now let's shift to **OOP principles and design patterns**.\n\nI'll present some scenario-based questions — I'm interested in your reasoning process, not just definitions.`,
    3: () => `Nice! Time for the **coding exercise**.\n\nI'll give you a realistic C# problem. Walk me through your approach as you go — clean, readable code matters more than a perfect solution. You can type your code directly in the answer box.`,
    4: () => `Great coding session! Last section — **Agile methodology and communication**.\n\nThese are behavioural questions. Draw from real experiences where possible, and be specific about what you did and what the outcome was.`,
  };

  const FOLLOW_UPS = {
    csharp: [
      "Interesting — can you elaborate on how that would behave under high concurrency?",
      "Good point. How would you handle that differently in a microservices context?",
      "That's correct. Can you walk me through a real scenario where you applied this?",
      "Nice. What are the potential pitfalls of that approach?",
      "Solid answer. How would you test that behaviour in a unit test?",
    ],
    oop: [
      "Good reasoning. Can you show a brief code sketch of that pattern?",
      "Interesting trade-off. When would you NOT use that pattern?",
      "Correct. How does that principle help with testability?",
      "Nice. How does this compare to the approach you'd take with a smaller codebase?",
    ],
    coding: [
      "Good start. What is the time complexity of your solution?",
      "Nice. How would you make this thread-safe?",
      "Correct approach. Can you handle edge cases like null input or empty collections?",
      "Well done. How would you write a unit test for this?",
    ],
    agile: [
      "Can you be more specific — what was the outcome of that approach?",
      "Interesting. How did the team respond to that?",
      "Good. What would you do differently if you faced that situation again?",
      "That's a mature perspective. How do you scale that approach across larger teams?",
    ],
  };

  const POSITIVE_FEEDBACK = [
    "Good answer!",
    "That's correct.",
    "Solid understanding.",
    "Well explained.",
    "That's a strong response.",
    "Exactly right.",
    "Good, you clearly have hands-on experience with this.",
  ];

  const ENCOURAGING = [
    "No worries — this is a tricky area. Let's move on.",
    "That's a reasonable direction. There's more nuance here, but we can revisit.",
    "Good attempt — the key thing to remember is the distinction in how the runtime handles this.",
    "Fair enough — let's continue and come back to this concept.",
  ];

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── scoring ────────────────────────────────────────────────
  // Simple heuristic: score based on answer length + keyword presence
  const KEYWORDS = {
    csharp: ['async','await','task','thread','linq','gc','garbage','disposed','middleware','dependency','injection','interface','nullable','stream','memory','heap','stack','exception','handler'],
    oop: ['solid','single','open','closed','liskov','interface','dependency','inversion','factory','singleton','repository','decorator','strategy','pattern','abstraction','encapsulation','polymorphism','inherit'],
    coding: ['class','public','private','return','list','dictionary','queue','stack','foreach','var','new','null','async','await','int','string','bool','interface','override','virtual'],
    agile: ['sprint','scrum','standup','retrospective','backlog','story','ticket','pr','review','merge','remote','async','communication','conflict','estimate','velocity'],
  };

  function scoreAnswer(phaseKey, answer) {
    if (!answer || answer.trim().length < 20) return 30;
    const lower = answer.toLowerCase();
    const words = (KEYWORDS[phaseKey] || []);
    const hits = words.filter(w => lower.includes(w)).length;
    const lengthScore = Math.min(40, Math.floor(answer.trim().length / 8));
    const keywordScore = Math.min(45, hits * 7);
    const base = 35;
    return Math.min(100, base + lengthScore + keywordScore);
  }

  // ── phase flow ─────────────────────────────────────────────

  async function startPhase(n) {
    _phase = n;
    _qIndex = 0;
    emitPhaseChange(n);

    if (n === 0) {
      // Introduction — no question bank, just greeting
      const greet = randomFrom(INTRO_GREETINGS)(_candidate.name, _candidate.level);
      await delay(_msgDelay);
      emit('ai', greet, { phase: 0 });
      return;
    }

    if (n === 5) {
      // Complete
      await delay(_msgDelay);
      await finishInterview();
      return;
    }

    // Transition message
    const trans = TRANSITION_MSGS[n];
    if (trans) {
      await delay(_msgDelay);
      emit('ai', trans(), { phase: n, type: 'transition' });
      await delay(600);
    }

    // Set up queue
    const phaseKey = PHASE_KEYS[n];
    _phaseQueues[n] = pickQuestions(phaseKey);
    await askNextQuestion(n);
  }

  async function askNextQuestion(n) {
    const queue = _phaseQueues[n] || [];
    if (_qIndex >= queue.length) {
      // Phase done — move on
      await startPhase(n + 1);
      return;
    }

    const q = queue[_qIndex];
    const phaseKey = PHASE_KEYS[n];
    const total = queue.length;
    const num = _qIndex + 1;

    let header = '';
    if (n > 0 && n < 5) {
      header = `**Question ${num} of ${total}** — ${PHASE_NAMES[n]}\n\n`;
    }

    let questionText = header + q.question;

    // For coding, append note about typing code
    if (n === 3) {
      questionText += '\n\n*Type your approach and/or C# code in the answer box below. Walk me through your thinking.*';
    }

    await delay(_msgDelay);
    emit('ai', questionText, { phase: n, qId: q.id, type: 'question' });
    _waitingForAnswer = true;
  }

  async function handleUserAnswer(text) {
    if (!_waitingForAnswer) return;
    _waitingForAnswer = false;

    const n = _phase;
    const phaseKey = PHASE_KEYS[n];

    if (n === 0) {
      // After intro answer, move to phase 1
      await delay(_msgDelay);
      emit('ai', `Thanks for sharing that, ${_candidate.name.split(' ')[0]}! Great background. Let's get started with the technical portion.`, { phase: 0 });
      await delay(500);
      await startPhase(1);
      return;
    }

    // Score this answer
    const s = scoreAnswer(phaseKey, text);
    const scoreKey = SCORE_KEYS[n];
    if (scoreKey) _score[scoreKey].push(s);

    // Feedback
    const feedback = s >= 65 ? randomFrom(POSITIVE_FEEDBACK) : randomFrom(ENCOURAGING);

    // Maybe ask a follow-up (30% chance, only if not last question)
    const queue = _phaseQueues[n] || [];
    const isLast = _qIndex >= queue.length - 1;
    const doFollowUp = !isLast && Math.random() < 0.35 && n > 0;

    if (doFollowUp) {
      const followUps = FOLLOW_UPS[phaseKey] || [];
      const fu = randomFrom(followUps);
      await delay(_msgDelay);
      emit('ai', `${feedback}\n\n${fu}`, { phase: n, type: 'followup' });
      // Treat follow-up as a mini-question; next user message advances
      _waitingForAnswer = true;
      // After follow-up answered, skip follow-up scoring
      _skipNextScore = true;
      return;
    }

    // Move to next question
    _qIndex++;
    await delay(400);
    emit('ai', feedback, { phase: n, type: 'feedback' });
    await delay(300);
    await askNextQuestion(n);
  }

  let _skipNextScore = false;

  async function handleFollowUpAnswer() {
    _waitingForAnswer = false;
    _skipNextScore = false;
    _qIndex++;
    await delay(400);
    emit('ai', randomFrom(POSITIVE_FEEDBACK), { type: 'feedback' });
    await delay(300);
    await askNextQuestion(_phase);
  }

  async function finishInterview() {
    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 60;

    const cs = avg(_score.csharp);
    const oop = avg(_score.oop);
    const coding = avg(_score.coding);
    const agile = avg(_score.agile);
    const overall = Math.round((cs * 0.3 + oop * 0.25 + coding * 0.25 + agile * 0.2));

    const rec = overall >= 75 ? 'Strong Hire' : overall >= 55 ? 'Hire' : 'No Hire';

    const feedbackMap = {
      csharp: generateFeedback('csharp', cs),
      oop: generateFeedback('oop', oop),
      coding: generateFeedback('coding', coding),
      agile: generateFeedback('agile', agile),
    };

    await delay(_msgDelay);
    emit('ai',
      `That wraps up our interview, ${_candidate.name.split(' ')[0]}! Thank you for your time and thoughtful answers.\n\nI'm now compiling your results — the full report will appear in just a moment. 📋`,
      { phase: 5, type: 'closing' }
    );

    await delay(1400);

    const result = {
      overall_score: overall,
      csharp_score: cs,
      csharp_feedback: feedbackMap.csharp,
      oop_score: oop,
      oop_feedback: feedbackMap.oop,
      coding_score: coding,
      coding_feedback: feedbackMap.coding,
      agile_score: agile,
      agile_feedback: feedbackMap.agile,
      strengths: buildStrengths(cs, oop, coding, agile),
      improvements: buildImprovements(cs, oop, coding, agile),
      recommendation: rec
    };

    if (_onComplete) _onComplete(result);
  }

  function generateFeedback(area, score) {
    const feedback = {
      csharp: {
        high: 'Demonstrated strong command of C# internals including async patterns, memory management, and DI. Clear articulation of concepts with practical examples.',
        mid: 'Solid grasp of C# fundamentals with some gaps in advanced areas like async internals or memory model. Good practical awareness.',
        low: 'Basic familiarity with C# but needs deeper understanding of core concepts like async/await behaviour, garbage collection, and dependency injection.',
      },
      oop: {
        high: 'Excellent understanding of SOLID principles and design patterns. Demonstrated ability to apply patterns contextually with strong reasoning on trade-offs.',
        mid: 'Good knowledge of common design patterns. Could benefit from more practice applying them in complex scenarios and articulating trade-offs.',
        low: 'Understanding of OOP concepts is surface-level. Needs more work on applying design patterns in real-world scenarios and SOLID principles.',
      },
      coding: {
        high: 'Produced clean, well-structured C# code. Good awareness of edge cases, complexity, and thread safety. Communicated approach clearly.',
        mid: 'Functional solutions with reasonable structure. Some areas to improve around edge case handling, efficiency, or code clarity.',
        low: 'Solutions showed basic programming ability but lacked attention to edge cases, efficiency, or idiomatic C# practices.',
      },
      agile: {
        high: 'Strong communication skills and mature Agile mindset. Clear, specific examples from experience with remote and async team dynamics.',
        mid: 'Good understanding of Agile practices with room to develop more structured communication in remote collaboration scenarios.',
        low: 'Limited Agile and remote collaboration experience evident. Would benefit from more exposure to structured sprint workflows and communication strategies.',
      }
    };

    const level = score >= 75 ? 'high' : score >= 55 ? 'mid' : 'low';
    return feedback[area][level];
  }

  function buildStrengths(cs, oop, coding, agile) {
    const strengths = [];
    if (cs >= 70) strengths.push('Strong command of C# language features and .NET ecosystem concepts');
    if (oop >= 70) strengths.push('Solid application of OOP principles and design patterns with good reasoning');
    if (coding >= 70) strengths.push('Writes clean, structured C# code and communicates approach effectively');
    if (agile >= 70) strengths.push('Mature Agile mindset and clear communication style suited for remote teams');
    if (Math.max(cs, oop, coding, agile) >= 80) strengths.push('Demonstrates above-average depth in at least one core competency area');
    if (strengths.length === 0) strengths.push('Shows foundational knowledge and willingness to engage with complex topics');
    return strengths.slice(0, 4);
  }

  function buildImprovements(cs, oop, coding, agile) {
    const items = [];
    if (cs < 70) items.push('Deepen understanding of async/await internals, garbage collection, and DI lifetime management');
    if (oop < 70) items.push('Practice applying design patterns in realistic scenarios and articulating trade-offs');
    if (coding < 70) items.push('Focus on edge case handling, algorithm complexity, and idiomatic C# code style');
    if (agile < 70) items.push('Build more experience with structured Agile ceremonies and remote async communication strategies');
    if (items.length === 0) items.push('Continue to deepen expertise in advanced distributed systems and .NET performance tuning');
    return items.slice(0, 4);
  }

  // ── public API ─────────────────────────────────────────────
  return {
    init({ candidate, onMessage, onPhaseChange, onComplete, typingDelay = 900 }) {
      _candidate = candidate;
      _onMessage = onMessage;
      _onPhaseChange = onPhaseChange;
      _onComplete = onComplete;
      _msgDelay = typingDelay;
      _phase = 0;
      _qIndex = 0;
      _score = { csharp: [], oop: [], coding: [], agile: [] };
      _phaseQueues = {};
      _waitingForAnswer = false;
      _skipNextScore = false;
    },

    start() {
      startPhase(0);
    },

    async respond(text) {
      if (_skipNextScore) {
        await handleFollowUpAnswer();
      } else {
        await handleUserAnswer(text);
      }
    },

    getCurrentPhase() { return _phase; },
    isWaiting() { return _waitingForAnswer; },
    getPhaseNames() { return PHASE_NAMES; },
    getPhaseKeys() { return PHASE_KEYS; },
  };

})();
