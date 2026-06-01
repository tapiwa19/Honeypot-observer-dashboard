// tests/system/notifications.test.js
import request from 'supertest';

const BASE_URL = 'http://localhost:5001';

describe('SYSTEM: Notifications Pipeline', () => {

  it('notification config endpoint is reachable', async () => {
    const res = await request(BASE_URL).get('/api/notifications/config');
    expect(res.status).toBe(200);
  });

  it('test notification fires without error', async () => {
    const res = await request(BASE_URL)
      .post('/api/notifications/test/slack'); // or 'email', 'ntfy'
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

});