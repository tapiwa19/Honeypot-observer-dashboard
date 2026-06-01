// tests/system/healthCheck.test.js
import request from 'supertest';

const BASE_URL = 'http://localhost:5001';

describe('SYSTEM: Full Stack Health', () => {
  
  it('API server is reachable', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Elasticsearch is connected', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(res.body.elasticsearch).not.toBe('disconnected');
  });

  it('All services are running', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(res.status).toBe(200);
    expect(res.body.services.cowrie).toContain('Running');
    expect(res.body.services.elasticsearch).toContain('Connected');
  });

});