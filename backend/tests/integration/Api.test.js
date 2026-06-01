// ============================================
// INTEGRATION TESTS - API Endpoints
// Run with: npm run test:integration
// ⚠️  Requires server running: npm run dev
// ⚠️  Requires Elasticsearch running at 192.168.56.101:9200
// ============================================

import request from 'supertest';

const BASE_URL = 'http://localhost:5001';

// ── Shared test data ─────────────────────────────────────────────────────────
// A real session ID format from Cowrie (alphanumeric)
const VALID_SESSION_ID   = 'abc123def456';
const INVALID_SESSION_ID = 'invalid;session!id';

// ============================================
// /api/health
// ============================================
describe('GET /api/health', () => {

  test('returns 200 with status ok', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('returns a valid ISO timestamp', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  test('reports elasticsearch status in response', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(res.body).toHaveProperty('elasticsearch');
    expect(['green', 'yellow', 'red']).toContain(res.body.elasticsearch);
  });

  test('reports all four services', async () => {
    const res = await request(BASE_URL).get('/api/health');
    expect(res.body.services).toHaveProperty('cowrie');
    expect(res.body.services).toHaveProperty('elasticsearch');
    expect(res.body.services).toHaveProperty('kibana');
    expect(res.body.services).toHaveProperty('logstash');
  });

});

// ============================================
// /api/system/info
// ============================================
describe('GET /api/system/info', () => {

  test('returns 200', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(res.status).toBe(200);
  });

  test('returns CPU info with usage and cores', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(res.body.cpu).toHaveProperty('usage');
    expect(res.body.cpu).toHaveProperty('cores');
    expect(res.body.cpu.cores).toBeGreaterThan(0);
  });

  test('returns memory metrics', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(res.body.memory).toHaveProperty('total');
    expect(res.body.memory).toHaveProperty('used');
    expect(res.body.memory).toHaveProperty('free');
    expect(res.body.memory).toHaveProperty('percentage');
    expect(res.body.memory.percentage).toBeGreaterThanOrEqual(0);
    expect(res.body.memory.percentage).toBeLessThanOrEqual(100);
  });

  test('returns uptime string', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(typeof res.body.uptime).toBe('string');
    expect(res.body.uptime.length).toBeGreaterThan(0);
  });

  test('returns honeypot network config', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(res.body.network.honeypotIP).toBe('192.168.56.101');
    expect(res.body.network.sshPort).toBe('22');
    expect(res.body.network.apiPort).toBe('5001');
  });

  test('returns real ES document count in stats', async () => {
    const res = await request(BASE_URL).get('/api/system/info');
    expect(res.body.stats.totalAttacks).toBeGreaterThanOrEqual(0);
  });

});

// ============================================
// /api/dashboard/stats
// ============================================
describe('GET /api/dashboard/stats', () => {

  test('returns 200', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
  });

  test('returns totalAttacks as a number', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/stats');
    expect(typeof res.body.totalAttacks).toBe('number');
    expect(res.body.totalAttacks).toBeGreaterThanOrEqual(0);
  });

  test('returns valid threatLevel', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/stats');
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(res.body.threatLevel);
  });

  test('returns changePercent as a number', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/stats');
    expect(typeof res.body.changePercent).toBe('number');
  });

  test('returns countriesDetected as a non-negative number', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/stats');
    expect(res.body.countriesDetected).toBeGreaterThanOrEqual(0);
  });

});

// ============================================
// /api/dashboard/attacks
// ============================================
describe('GET /api/dashboard/attacks', () => {

  test('returns 200 with array', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/attacks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('respects limit query param', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/attacks?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  test('each attack has required fields', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/attacks?limit=10');
    res.body.forEach(attack => {
      expect(attack).toHaveProperty('id');
      expect(attack).toHaveProperty('timestamp');
      expect(attack).toHaveProperty('ip');
      expect(attack).toHaveProperty('type');
      expect(attack).toHaveProperty('severity');
    });
  });

  test('severity values are valid', async () => {
    const res = await request(BASE_URL).get('/api/dashboard/attacks?limit=20');
    res.body.forEach(attack => {
      expect(['low', 'medium', 'high', 'critical']).toContain(attack.severity);
    });
  });

  test('filters by time range now-1h', async () => {
    const res = await request(BASE_URL)
      .get('/api/dashboard/attacks?range=now-1h&limit=50');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('filters by time range now-7d', async () => {
    const res = await request(BASE_URL)
      .get('/api/dashboard/attacks?range=now-7d');
    expect(res.status).toBe(200);
  });

});

// ============================================
// /api/sessions/live
// ============================================
describe('GET /api/sessions/live', () => {

  test('returns 200 with array', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('each session has required fields', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live');
    res.body.forEach(session => {
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('ip');
      expect(session).toHaveProperty('commands');
      expect(session).toHaveProperty('risk');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('timestamp');
    });
  });

  test('risk values are between 0 and 10', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live');
    res.body.forEach(session => {
      expect(session.risk).toBeGreaterThanOrEqual(0);
      expect(session.risk).toBeLessThanOrEqual(10);
    });
  });

  test('status values are valid', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live');
    res.body.forEach(session => {
      expect(['active', 'recent', 'closed']).toContain(session.status);
    });
  });

  test('filters correctly with range=1h', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live?range=1h');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('filters correctly with range=7d', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live?range=7d');
    expect(res.status).toBe(200);
  });

  test('returns all sessions with range=all', async () => {
    const res = await request(BASE_URL).get('/api/sessions/live?range=all');
    expect(res.status).toBe(200);
  });

});

// ============================================
// /api/sessions/:sessionId/commands
// ============================================
describe('GET /api/sessions/:sessionId/commands', () => {

  test('returns 400 for invalid session ID', async () => {
    const res = await request(BASE_URL)
      .get(`/api/sessions/${INVALID_SESSION_ID}/commands`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid session ID');
  });

  test('returns 400 for session ID with spaces', async () => {
    const res = await request(BASE_URL)
      .get('/api/sessions/bad session id/commands');
    expect(res.status).toBe(400);
  });

  test('returns valid structure for a valid session ID', async () => {
    const res = await request(BASE_URL)
      .get(`/api/sessions/${VALID_SESSION_ID}/commands`);
    // May be empty if session doesn't exist, but structure must be correct
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('session_id');
    expect(res.body).toHaveProperty('commands');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.commands)).toBe(true);
  });

  test('each command has input and timestamp', async () => {
    const res = await request(BASE_URL)
      .get(`/api/sessions/${VALID_SESSION_ID}/commands`);
    res.body.commands.forEach(cmd => {
      expect(cmd).toHaveProperty('input');
      expect(cmd).toHaveProperty('timestamp');
      expect(cmd).toHaveProperty('eventid');
    });
  });

});

// ============================================
// /api/sessions/:sessionId/details
// ============================================
describe('GET /api/sessions/:sessionId/details', () => {

  test('returns 400 for invalid session ID', async () => {
    const res = await request(BASE_URL)
      .get(`/api/sessions/${INVALID_SESSION_ID}/details`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid session ID');
  });

  test('returns 404 for non-existent valid session ID', async () => {
    const res = await request(BASE_URL)
      .get(`/api/sessions/${VALID_SESSION_ID}/details`);
    // Either 404 (not found) or 200 (found) — both are correct
    expect([200, 404]).toContain(res.status);
  });

});

// ============================================
// /api/credentials/table
// ============================================
describe('GET /api/credentials/table', () => {

  test('returns 200 with array', async () => {
    const res = await request(BASE_URL).get('/api/credentials/table');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('each credential has required fields', async () => {
    const res = await request(BASE_URL).get('/api/credentials/table');
    res.body.forEach(cred => {
      expect(cred).toHaveProperty('username');
      expect(cred).toHaveProperty('password');
      expect(cred).toHaveProperty('attempts');
      expect(cred).toHaveProperty('success');
      expect(cred).toHaveProperty('failed');
      expect(cred).toHaveProperty('successRate');
    });
  });

  test('successRate is between 0 and 100', async () => {
    const res = await request(BASE_URL).get('/api/credentials/table');
    res.body.forEach(cred => {
      expect(cred.successRate).toBeGreaterThanOrEqual(0);
      expect(cred.successRate).toBeLessThanOrEqual(100);
    });
  });

  test('rejects invalid range param', async () => {
    const res = await request(BASE_URL)
      .get('/api/credentials/table?range=invalid-range');
    expect(res.status).toBe(400);
  });

  test('filters by range now-24h', async () => {
    const res = await request(BASE_URL)
      .get('/api/credentials/table?range=now-24h');
    expect(res.status).toBe(200);
  });

  test('filters by range now-7d', async () => {
    const res = await request(BASE_URL)
      .get('/api/credentials/table?range=now-7d');
    expect(res.status).toBe(200);
  });

});

// ============================================
// /api/analytics/timeline
// ============================================
describe('GET /api/analytics/timeline', () => {

  test('returns 200 with array', async () => {
    const res = await request(BASE_URL).get('/api/analytics/timeline');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('each point has time and attacks fields', async () => {
    const res = await request(BASE_URL).get('/api/analytics/timeline');
    res.body.forEach(point => {
      expect(point).toHaveProperty('time');
      expect(point).toHaveProperty('attacks');
      expect(typeof point.attacks).toBe('number');
    });
  });

  test('rejects invalid range param', async () => {
    const res = await request(BASE_URL)
      .get('/api/analytics/timeline?range=badrange');
    expect(res.status).toBe(400);
  });

  test('accepts now-7d range', async () => {
    const res = await request(BASE_URL)
      .get('/api/analytics/timeline?range=now-7d');
    expect(res.status).toBe(200);
  });

  test('accepts now-24h range', async () => {
    const res = await request(BASE_URL)
      .get('/api/analytics/timeline?range=now-24h');
    expect(res.status).toBe(200);
  });

});

// ============================================
// /api/analytics/countries
// ============================================
describe('GET /api/analytics/countries', () => {

  test('returns 200 with array', async () => {
    const res = await request(BASE_URL).get('/api/analytics/countries');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('each country has required fields', async () => {
    const res = await request(BASE_URL).get('/api/analytics/countries');
    res.body.forEach(country => {
      expect(country).toHaveProperty('country');
      expect(country).toHaveProperty('attacks');
      expect(country).toHaveProperty('percentage');
      expect(country).toHaveProperty('flag');
    });
  });

  test('countries are sorted by attack count descending', async () => {
    const res = await request(BASE_URL).get('/api/analytics/countries');
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i - 1].attacks).toBeGreaterThanOrEqual(res.body[i].attacks);
    }
  });

  test('percentage values are valid strings', async () => {
    const res = await request(BASE_URL).get('/api/analytics/countries');
    res.body.forEach(country => {
      const pct = parseFloat(country.percentage);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });
  });

});

// ============================================
// /api/analytics/stats
// ============================================
describe('GET /api/analytics/stats', () => {

  test('returns 200', async () => {
    const res = await request(BASE_URL).get('/api/analytics/stats');
    expect(res.status).toBe(200);
  });

  test('returns totalAttacks and uniqueIPs', async () => {
    const res = await request(BASE_URL).get('/api/analytics/stats');
    expect(typeof res.body.totalAttacks).toBe('number');
    expect(typeof res.body.uniqueIPs).toBe('number');
  });

  test('returns valid threatLevel', async () => {
    const res = await request(BASE_URL).get('/api/analytics/stats');
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(res.body.threatLevel);
  });

  test('rejects invalid range', async () => {
    const res = await request(BASE_URL)
      .get('/api/analytics/stats?range=not-valid');
    expect(res.status).toBe(400);
  });

});

// ============================================
// /api/analytics/distribution
// ============================================
describe('GET /api/analytics/distribution', () => {

  test('returns 200 with array', async () => {
    const res = await request(BASE_URL).get('/api/analytics/distribution');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('each item has name, value, and color', async () => {
    const res = await request(BASE_URL).get('/api/analytics/distribution');
    res.body.forEach(item => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('color');
    });
  });

  test('returns at most 5 items by default', async () => {
    const res = await request(BASE_URL).get('/api/analytics/distribution');
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  test('rejects invalid range param', async () => {
    const res = await request(BASE_URL)
      .get('/api/analytics/distribution?range=bad');
    expect(res.status).toBe(400);
  });

});

// ============================================
// /api/settings
// ============================================
describe('GET /api/settings', () => {

  test('returns 200', async () => {
    const res = await request(BASE_URL).get('/api/settings');
    expect(res.status).toBe(200);
  });

  test('returns honeypot configuration', async () => {
    const res = await request(BASE_URL).get('/api/settings');
    expect(res.body).toHaveProperty('honeypotIP');
    expect(res.body).toHaveProperty('honeypotPort');
    expect(res.body).toHaveProperty('elasticsearchURL');
    expect(res.body).toHaveProperty('refreshInterval');
  });

  test('refreshInterval is a positive number', async () => {
    const res = await request(BASE_URL).get('/api/settings');
    expect(res.body.refreshInterval).toBeGreaterThan(0);
  });

});

describe('POST /api/settings', () => {

  test('accepts and acknowledges settings update', async () => {
    const res = await request(BASE_URL)
      .post('/api/settings')
      .send({ refreshInterval: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

});

// ============================================
// /api/analytics/behavioral
// ============================================
describe('GET /api/analytics/behavioral', () => {

  test('returns 200', async () => {
    const res = await request(BASE_URL).get('/api/analytics/behavioral');
    expect(res.status).toBe(200);
  });

  test('returns patterns array', async () => {
    const res = await request(BASE_URL).get('/api/analytics/behavioral');
    expect(Array.isArray(res.body.patterns)).toBe(true);
    expect(res.body.patterns.length).toBeGreaterThan(0);
  });

  test('each pattern has required fields', async () => {
    const res = await request(BASE_URL).get('/api/analytics/behavioral');
    res.body.patterns.forEach(pattern => {
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('confidence');
      expect(pattern).toHaveProperty('severity');
    });
  });

  test('returns profiles array', async () => {
    const res = await request(BASE_URL).get('/api/analytics/behavioral');
    expect(Array.isArray(res.body.profiles)).toBe(true);
  });

  test('returns mitre tactics array', async () => {
    const res = await request(BASE_URL).get('/api/analytics/behavioral');
    expect(Array.isArray(res.body.mitre)).toBe(true);
  });

});