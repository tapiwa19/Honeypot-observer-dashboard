// tests/system/dashboardFlow.test.js
import request from 'supertest';

const BASE_URL = 'http://localhost:5001';

describe('SYSTEM: Dashboard Data Flow', () => {

  it('dashboard stats return real data from Elasticsearch', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/stats');
    
    expect(res.status).toBe(200);
    expect(res.body.totalAttacks).toBeGreaterThan(0); // real data exists
    expect(res.body.threatLevel).toMatch(/LOW|MEDIUM|HIGH/);
    expect(res.body.countriesDetected).toBeGreaterThanOrEqual(0);
  });

  it('attack feed returns recent events', async () => {
    const res = await request(BASE_URL)
      .get('/api/dashboard/attacks?range=now-24h&limit=10');
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    if (res.body.length > 0) {
      const attack = res.body[0];
      expect(attack).toHaveProperty('ip');
      expect(attack).toHaveProperty('timestamp');
      expect(attack).toHaveProperty('type');
      expect(attack).toHaveProperty('severity');
    }
  });

  it('credentials table populates from real login events', async () => {
    const res = await request(BASE_URL)
      .get('/api/credentials/table?range=now-7d');
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('username');
      expect(res.body[0]).toHaveProperty('password');
      expect(res.body[0]).toHaveProperty('attempts');
    }
  });

});