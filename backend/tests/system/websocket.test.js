// tests/system/websocket.test.js
import { io as Client } from 'socket.io-client';

describe('SYSTEM: WebSocket Live Feed', () => {

  let socket;

  beforeEach(() => {
    socket = Client('http://localhost:5001', {
      transports: ['websocket']
    });
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('connects to WebSocket server', (done) => {
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });
  });

  it('receives threat intel updates within 35 seconds', (done) => {
    socket.on('threat_intel_update', (data) => {
      expect(data).toHaveProperty('topAttackers');
      expect(data).toHaveProperty('commonCommands');
      expect(Array.isArray(data.topAttackers)).toBe(true);
      done();
    });
  }, 35000); // threat intel broadcasts every 30s

  it('receives attack events within 10 seconds', (done) => {
    socket.on('new_attack', (data) => {
      expect(data).toHaveProperty('ip');
      expect(data).toHaveProperty('type');
      done();
    });
  }, 10000);

});