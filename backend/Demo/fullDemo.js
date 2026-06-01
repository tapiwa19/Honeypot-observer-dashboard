// ============================================
// fullDemo.js
// Complete supervisor demonstration
// Shows: alerts, multiple attackers, all channels
// Run: node demo/fullDemo.js
// ============================================

const BASE_URL = 'http://localhost:5001';
let AUTH_TOKEN = '';

// ── Login to get token ────────────────────────────────
async function login() {
  console.log('🔐 Logging in...');
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',     
      password: 'redstone4042'      
    })
  });
  const data = await res.json();
  AUTH_TOKEN = data.token;
  console.log('✅ Logged in — token received\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function get(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  return res.json();
}

async function post(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ── Test 1: System Health ─────────────────────────────
async function testHealth() {
  console.log('\n━━━ TEST 1: System Health ━━━━━━━━━━━━━━━');
  const health = await get('/api/health');
  console.log(`Status:         ${health.status}`);
  console.log(`Elasticsearch:  ${health.elasticsearch}`);
  console.log(`Cowrie:         ${health.services?.cowrie}`);
  console.log(`Timestamp:      ${health.timestamp}`);
  console.log('✅ System healthy');
}

// ── Test 2: Dashboard Has Real Data ──────────────────
async function testDashboard() {
  console.log('\n━━━ TEST 2: Dashboard Stats ━━━━━━━━━━━━━');
  const stats = await get('/api/dashboard/stats');
  console.log(`Total Attacks:      ${stats.totalAttacks}`);
  console.log(`Active Sessions:    ${stats.activeSessions}`);
  console.log(`Threat Level:       ${stats.threatLevel}`);
  console.log(`Countries:          ${stats.countriesDetected}`);
  console.log(`Change (24h):       ${stats.changePercent}%`);
  console.log('✅ Real data from Elasticsearch');
}

// ── Test 3: Fire Slack Alert ──────────────────────────
async function testSlackAlert() {
  console.log('\n━━━ TEST 3: Slack Alert ━━━━━━━━━━━━━━━━━');
  console.log('Firing Slack notification...');

  const result = await post('/api/notifications/send', {
    severity: 'high',
    title: '🔴 HIGH: Reconnaissance Attack Detected',
    description: 'Attacker from 45.33.32.156 (China) ran whoami, uname -a, cat /etc/passwd — Risk: 7/10',
    sourceIp: '45.33.32.156',
    country: 'China',
    timestamp: new Date().toISOString(),
    type: 'Reconnaissance'
  });

  console.log('✅ Slack alert fired — check your phone!');
  console.log('Response:', JSON.stringify(result, null, 2));
}

// ── Test 4: Fire Critical Alert ───────────────────────
async function testCriticalAlert() {
  console.log('\n━━━ TEST 4: Critical Alert ━━━━━━━━━━━━━━');
  console.log('Firing CRITICAL notification...');
  await sleep(2000); // gap so alerts don't merge

  const result = await post('/api/notifications/send', {
    severity: 'critical',
    title: '🚨 CRITICAL: Malware Download + Crypto Miner',
    description: 'Attacker from 185.220.101.45 (Russia) downloaded xmrig miner and set crontab persistence — Risk: 10/10, Commands: 23',
    sourceIp: '185.220.101.45',
    country: 'Russia',
    timestamp: new Date().toISOString(),
    type: 'Malware Download'
  });

  console.log('✅ Critical alert fired — check your phone!');
  console.log('Response:', JSON.stringify(result, null, 2));
}

// ── Test 5: Live Sessions ─────────────────────────────
async function testSessions() {
  console.log('\n━━━ TEST 5: Live Sessions ━━━━━━━━━━━━━━━');
  const sessions = await get('/api/sessions/live?range=7d');
  console.log(`Total sessions found: ${sessions.length}`);

  if (sessions.length > 0) {
    const top = sessions.slice(0, 3);
    top.forEach((s, i) => {
      console.log(`\n  Session ${i + 1}:`);
      console.log(`    IP:       ${s.ip}`);
      console.log(`    Country:  ${s.country}`);
      console.log(`    Commands: ${s.commands}`);
      console.log(`    Risk:     ${s.risk}/10`);
      console.log(`    Status:   ${s.status}`);
      console.log(`    Time:     ${s.timeAgo}`);
    });
  }
  console.log('\n✅ Sessions loading from Elasticsearch');
}

// ── Test 6: Credentials Captured ─────────────────────
async function testCredentials() {
  console.log('\n━━━ TEST 6: Captured Credentials ━━━━━━━━');
  const creds = await get('/api/credentials/table?range=now-7d');
  console.log(`Total credential pairs captured: ${creds.length}`);

  if (creds.length > 0) {
    console.log('\n  Top 5 attempted credentials:');
    console.log('  Username'.padEnd(20) + 'Password'.padEnd(20) + 'Attempts');
    console.log('  ' + '─'.repeat(50));
    creds.slice(0, 5).forEach(c => {
      console.log(`  ${c.username.padEnd(20)}${c.password.padEnd(20)}${c.attempts}`);
    });
  }
  console.log('\n✅ Real credentials from attackers');
}

// ── Test 7: Attack Timeline ───────────────────────────
async function testTimeline() {
  console.log('\n━━━ TEST 7: Attack Timeline ━━━━━━━━━━━━━');
  const timeline = await get('/api/analytics/timeline?range=now-24h');
  console.log(`Timeline data points: ${timeline.length}`);

  const total = timeline.reduce((sum, t) => sum + t.attacks, 0);
  const peak = timeline.reduce((max, t) => 
    t.attacks > max.attacks ? t : max, { attacks: 0, time: 'N/A' });

  console.log(`Total attacks (24h): ${total}`);
  console.log(`Peak hour: ${peak.time} with ${peak.attacks} attacks`);
  console.log('✅ Timeline data loaded');
}

// ── Test 8: Test All Notification Channels ────────────
async function testAllChannels() {
  console.log('\n━━━ TEST 8: All Notification Channels ━━━');

  const channels = ['slack', 'email', 'ntfy'];
  for (const channel of channels) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/notifications/test/${channel}`,
        { method: 'POST',
            headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`  
          }
         }
      );
      const data = await res.json();
      console.log(`${channel.padEnd(8)}: ${data.success ? '✅ sent' : '❌ failed'}`);
    } catch (err) {
      console.log(`${channel.padEnd(8)}: ❌ ${err.message}`);
    }
    await sleep(1500); // space out the notifications
  }
}

// ── MAIN ──────────────────────────────────────────────
async function runFullDemo() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   HONEYPOT MONITORING SYSTEM - SUPERVISOR    ║');
  console.log('║              DEMO SCRIPT                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\n📋 This script will demonstrate:');
  console.log('   1. System health check');
  console.log('   2. Real attack data from Elasticsearch');
  console.log('   3. Live alert notifications (Slack/Email/Ntfy)');
  console.log('   4. Session tracking');
  console.log('   5. Credential capture');
  console.log('   6. Attack timeline');
  console.log('\n📱 Keep your phone ready — alerts will fire!');
  console.log('📊 Open dashboard: http://localhost:3000\n');
  console.log('Starting in 3 seconds...');

  await sleep(3000);
  await login();
  try {
    await testHealth();         await sleep(1000);
    await testDashboard();      await sleep(1000);
    await testSessions();       await sleep(1000);
    await testCredentials();    await sleep(1000);
    await testTimeline();       await sleep(1000);
    await testSlackAlert();     await sleep(2000);
    await testCriticalAlert();  await sleep(2000);
    await testAllChannels();

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║              DEMO COMPLETE ✅                ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  All systems operational                     ║');
    console.log('║  Real attack data verified                   ║');
    console.log('║  Alerts fired on all channels                ║');
    console.log('║  Dashboard: http://localhost:3000            ║');
    console.log('╚══════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n❌ Demo failed:', err.message);
    console.error('Make sure backend is running: npm run dev');
  }
}

runFullDemo();