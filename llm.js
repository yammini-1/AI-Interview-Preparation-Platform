// LLM client: timeout + retries with backoff + fallback when the API fails.

const MODEL = process.env.LLM_MODEL || 'claude-sonnet-5-5';

/*
 * Make one request to Anthropic.
 */
async function once(prompt, ms) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!r.ok) {
      throw new Error(`LLM status ${r.status}`);
    }

    const d = await r.json();

    if (!d.content || !Array.isArray(d.content)) {
      throw new Error('Invalid LLM response');
    }

    return d.content
      .map((c) => c.text || '')
      .join('');
  } finally {
    clearTimeout(timer);
  }
}

/*
 * Ask the LLM with retries.
 */
async function ask(
  prompt,
  { retries = 2, timeoutMs = 15000 } = {}
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  for (let i = 0; ; i++) {
    try {
      return await once(prompt, timeoutMs);
    } catch (e) {
      if (i >= retries) {
        throw e;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 500 * 2 ** i);
      });
    }
  }
}

/*
 * Parse JSON returned by the LLM.
 */
function parse(s) {
  const cleaned = String(s)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(cleaned);
}

/*
 * Built-in interview question bank.
 */
const BANK = [
  {
    q: 'Walk me through a project you are proud of and your exact contribution.',
    tip: 'Use situation, action, result. Give one number.'
  },
  {
    q: 'How would you design a URL shortener? Cover storage and collisions.',
    tip: 'State requirements first, then data model, then scale.'
  },
  {
    q: 'Explain the difference between a process and a thread.',
    tip: 'Mention memory sharing and context-switch cost.'
  },
  {
    q: 'Tell me about a bug that took you a long time to find.',
    tip: 'Show how you narrowed it down, not just the fix.'
  },
  {
    q: 'What is a database index and when can it hurt performance?',
    tip: 'Talk about write cost and low-selectivity columns.'
  },
  {
    q: 'How do you prevent two users booking the same slot at once?',
    tip: 'Transactions, unique constraints, retries.'
  }
];

/*
 * Generate mock interview questions.
 */
async function generateQuestions({ role, level, count }) {
  try {
    const out = await ask(
      `Create ${count} mock interview questions for a ${level} ${role}.
Reply with ONLY a JSON array of objects in this format:
[
  {
    "q": "question",
    "tip": "one short sentence on how to answer well"
  }
]`
    );

    const arr = parse(out);

    if (!Array.isArray(arr) || !arr.length) {
      throw new Error('Invalid question response');
    }

    return {
      source: 'ai',
      questions: arr.slice(0, count)
    };
  } catch (e) {
    console.warn('questions fallback:', e.message);

    return {
      source: 'fallback',
      questions: BANK.slice(0, count)
    };
  }
}

/*
 * Offline resume analysis.
 *
 * This runs whenever the AI API is unavailable.
 */
function heuristic(text) {
  const cleanText = String(text || '');

  /*
   * Count measurable information.
   */
  const metrics = (
    cleanText.match(
      /\d+%|\d+\+?\s?(ms|users|tests|problems)|\b\d{2,}\b/gi
    ) || []
  ).length;

  /*
   * IMPORTANT:
   * Keep this regex on ONE LINE.
   * JavaScript regex literals cannot contain normal line breaks.
   */
  const verbs = (
    cleanText.match(
      /\b(built|designed|deployed|reduced|cut|wrote|implemented|optimized|led|developed|created|improved|integrated|engineered|automated|analyzed|managed)\b/gi
    ) || []
  ).length;

  const strengths = [];
  const improvements = [];

  /*
   * Check measurable achievements.
   */
  if (metrics >= 3) {
    strengths.push(
      'Good use of numbers to show impact.'
    );
  } else {
    improvements.push(
      'Add measurable results such as percentages, time saved, users, accuracy, or performance improvements.'
    );
  }

  /*
   * Check action verbs.
   */
  if (verbs >= 4) {
    strengths.push(
      'Bullets start with strong action verbs.'
    );
  } else {
    improvements.push(
      'Start more bullet points with strong action verbs such as built, developed, implemented, optimized, or deployed.'
    );
  }

  /*
   * Check resume length.
   */
  if (cleanText.length >= 800) {
    strengths.push(
      'Resume contains enough detail to demonstrate relevant experience.'
    );
  } else {
    improvements.push(
      'Add more detail about your projects, responsibilities, technical contributions, and achievements.'
    );
  }

  /*
   * Add useful improvements even when the resume
   * already performs well.
   */
  if (metrics >= 3) {
    improvements.push(
      'Make project achievements more specific by connecting each metric to a clear outcome.'
    );
  }

  if (verbs >= 4) {
    improvements.push(
      'Strengthen project bullets by explaining the technology used and the problem you solved.'
    );
  }

  improvements.push(
    'Tailor technical keywords and project descriptions to the specific role you are applying for.'
  );

  /*
   * Calculate score.
   */
  const score = Math.min(
    95,
    50 + metrics * 4 + verbs * 3
  );

  return {
    score,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3)
  };
}

/*
 * AI resume feedback.
 */
async function resumeFeedback({ role, resumeText }) {
  try {
    const out = await ask(
      `You are a strict recruiter hiring a ${role}.

Review this resume.

Reply with ONLY valid JSON in exactly this structure:

{
  "score": 85,
  "strengths": [
    "specific strength 1",
    "specific strength 2",
    "specific strength 3"
  ],
  "improvements": [
    "specific improvement 1",
    "specific improvement 2",
    "specific improvement 3"
  ]
}

Rules:
- score must be between 0 and 100
- provide exactly 3 strengths
- provide exactly 3 improvements
- every point must be concrete and specific
- focus on ATS compatibility, technical relevance, measurable impact, clarity, and recruiter appeal
- do not use markdown
- do not write anything outside the JSON object

Resume:

${String(resumeText || '').slice(0, 8000)}`
    );

    const result = parse(out);

    if (
      typeof result.score !== 'number' ||
      !Array.isArray(result.strengths) ||
      !Array.isArray(result.improvements)
    ) {
      throw new Error('Invalid AI response format');
    }

    return {
      source: 'ai',
      score: Math.max(
        0,
        Math.min(100, result.score)
      ),
      strengths: result.strengths.slice(0, 3),
      improvements: result.improvements.slice(0, 3)
    };
  } catch (e) {
    console.warn('feedback fallback:', e.message);

    return {
      source: 'fallback',
      ...heuristic(resumeText)
    };
  }
}

/*
 * Export functions used by server.js.
 */
async function evaluateAnswer({ role, question, answer }) {
  try {
    const out = await ask(
      `You are an expert interview coach evaluating a candidate's answer.

Role: ${role}

Interview Question:
${question}

Candidate's Answer:
${answer}

Evaluate the answer and reply with ONLY valid JSON:

{
  "score": 85,
  "strengths": [
    "specific strength",
    "specific strength"
  ],
  "improvements": [
    "specific improvement",
    "specific improvement"
  ],
  "betterApproach": "A concise explanation of how the candidate could structure a stronger answer."
}

Rules:
- score must be between 0 and 100
- focus on correctness, clarity, relevance, technical depth, and communication
- be specific
- do not use markdown
- return only JSON`
    );

    const result = parse(out);

    if (
      typeof result.score !== 'number' ||
      !Array.isArray(result.strengths) ||
      !Array.isArray(result.improvements)
    ) {
      throw new Error('Invalid evaluation response');
    }

    return {
      source: 'ai',
      score: Math.max(0, Math.min(100, result.score)),
      strengths: result.strengths.slice(0, 3),
      improvements: result.improvements.slice(0, 3),
      betterApproach: String(result.betterApproach || '')
    };

  } catch (e) {
    console.warn('answer evaluation fallback:', e.message);

    return {
      source: 'fallback',
      score: 75,
      strengths: [
        'Your answer directly addresses the interview question.',
        'You clearly explained your technical contribution.',
        'You mentioned the technologies used in the project.'
      ],
      improvements: [
        'Add a specific challenge you faced and how you solved it.',
        'Include a measurable result or outcome.',
        'Structure the answer using Situation, Action, and Result.'
      ],
      betterApproach:
        'Start with the problem, explain your exact contribution, mention the technologies and key decisions, and finish with a measurable result.'
    };
  }
}
module.exports = {
  generateQuestions,
  resumeFeedback,
  evaluateAnswer
};