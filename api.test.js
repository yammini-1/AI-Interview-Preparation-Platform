const request = require('supertest');
jest.mock('../llm', () => ({
  generateQuestions: jest.fn(async ({ count }) => ({ source: 'fallback', questions: Array(count).fill({ q: 'Q?', tip: 'T' }) })),
  resumeFeedback: jest.fn(async () => ({ source: 'fallback', score: 70, strengths: ['a'], improvements: ['b'] })),
}));
const app = require('../server');
const uid = 'user-test-1';

describe('questions', () => {
  it('rejects a bad userId', async () => {
    const r = await request(app).post('/api/questions').send({ userId: 'x', role: 'SDE' });
    expect(r.status).toBe(400);
  });
  it('rejects a missing role', async () => {
    const r = await request(app).post('/api/questions').send({ userId: uid });
    expect(r.status).toBe(400);
  });
  it('clamps count to 10', async () => {
    const r = await request(app).post('/api/questions').send({ userId: uid, role: 'SDE', count: 99 });
    expect(r.body.questions).toHaveLength(10);
  });
});

describe('resume + history', () => {
  it('rejects short resume text', async () => {
    const r = await request(app).post('/api/resume').send({ userId: uid, role: 'SDE', resumeText: 'hi' });
    expect(r.status).toBe(400);
  });
  it('returns feedback and records the session', async () => {
    const text = 'Built a REST API and cut query time by 47%. '.repeat(5);
    const r = await request(app).post('/api/resume').send({ userId: uid, role: 'SDE', resumeText: text });
    expect(r.body.score).toBe(70);
    const h = await request(app).get(`/api/sessions/${uid}`);
    expect(h.body.some((s) => s.type === 'resume')).toBe(true);
  });
});
