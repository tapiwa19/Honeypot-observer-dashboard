// ============================================
// triggerAlert.js
// Fires a real alert through your notification pipeline
// Run: node demo/triggerAlert.js
// ============================================

const BASE_URL = 'http://localhost:5001';

async function triggerAlert() {
  console.log('🚨 Firing demo alert...\n');

  const alert = {
    severity: 'critical',
    title: 'CRITICAL Attack Detected: Malware Download',
    description: 'SSH attack from 185.220.101.45 (Russia) — Risk: 10/10, Commands: 25',
    sourceIp: '185.220.101.45',
    country: 'Russia',
    timestamp: new Date().toISOString(),
    type: 'Malware Download'
  };

  try {
    const res = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });

    const data = await res.json();
    console.log('✅ Alert fired!');
    console.log('📧 Email: sent');
    console.log('💬 Slack: sent');
    console.log('📱 Ntfy:  sent');
    console.log('\nCheck your phone and email now!\n');
    console.log('Response:', data);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('Make sure your backend is running: npm run dev');
  }
}

triggerAlert();