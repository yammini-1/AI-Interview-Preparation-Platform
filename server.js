const express = require('express');
const path = require('path');
const llm = require('./llm');
const store = require('./store');

const app = express();
app.use(express.json({ limit: '200kb' }));

// request logging
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`));
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const ID = /^[\w-]{6,64}$/;
const bad = (res, msg) => res.status(400).json({ error: msg });

app.post('/api/questions', async (req, res, next) => {
  try {
    const { userId, role, level = 'entry-level', count = 5 } = req.body;
    if (!ID.test(userId || '')) return bad(res, 'userId must be 6-64 letters, digits, - or _');
    if (!role || role.length > 80) return bad(res, 'role is required (max 80 characters)');
    const n = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);
    const result = await llm.generateQuestions({ role, level, count: n });
    await store.saveSession(userId, { type: 'questions', role, level, ...result });
    res.json(result);
  } catch (e) { next(e); }
});

app.post('/api/resume', async (req, res, next) => {
  try {
    const { userId, role, resumeText } = req.body;
    if (!ID.test(userId || '')) return bad(res, 'userId must be 6-64 letters, digits, - or _');
    if (!role) return bad(res, 'role is required');
    if (!resumeText || resumeText.length < 100) return bad(res, 'resumeText must be at least 100 characters');
    const fileKey = await store.saveResume(userId, resumeText);
    const result = await llm.resumeFeedback({ role, resumeText });
    await store.saveSession(userId, { type: 'resume', role, fileKey, ...result });
    res.json(result);
  } catch (e) { next(e); }
});

app.get('/api/sessions/:userId', async (req, res, next) => {
  try {
    if (!ID.test(req.params.userId)) return bad(res, 'invalid userId');
    res.json(await store.listSessions(req.params.userId));
  } catch (e) { next(e); }
});
app.post('/api/evaluate', async (req, res, next) => {
  try {
    const { userId, role, question, answer } = req.body;

    if (!ID.test(userId || '')) {
      return bad(res, 'invalid userId');
    }

    if (!role || role.length > 80) {
      return bad(res, 'role is required (max 80 characters)');
    }

    if (!question) {
      return bad(res, 'question is required');
    }

    if (!answer || answer.trim().length < 10) {
      return bad(res, 'Please provide a longer answer');
    }

    const result = await llm.evaluateAnswer({
      role,
      question,
      answer
    });

    await store.saveSession(userId, {
      type: 'evaluation',
      role,
      question,
      score: result.score,
      ...result
    });

    res.json(result);

  } catch (e) {
    next(e);
  }
});
app.use((err, req, res, _next) => {
  console.error('ERROR', req.method, req.originalUrl, err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
