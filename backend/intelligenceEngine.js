// ============================================
// intelligenceEngine.js
// Smart rule-based actionable intelligence
// Generates specific responses based on real attack data

// ============================================

// ── Attack pattern database ──────────────────────────
const COMMAND_PATTERNS = {
  cryptominer: ['xmrig', 'minerd', 'cpuminer', 'minergate', 'pool.minexmr', 'monero', 'stratum+tcp'],
  botnet: ['bot.sh', 'payload.sh', 'install.sh', 'wget http', 'curl -O', 'curl -s http'],
  persistence: ['crontab', '/etc/cron', 'systemctl enable', 'rc.local', '~/.bashrc', '~/.profile'],
  reconnaissance: ['whoami', 'uname', 'cat /etc/passwd', 'ps aux', 'netstat', 'ifconfig', 'hostname', 'id', 'ls /', 'env', 'cat /proc'],
  privilege_escalation: ['sudo', 'su -', '/etc/sudoers', 'chmod 777', 'chown root', 'setuid'],
  data_exfiltration: ['cat /etc/shadow', 'cat /etc/passwd', 'history', 'find / -name', 'tar czf', 'scp', 'rsync'],
  lateral_movement: ['ssh ', 'nmap', 'masscan', 'ping -c', 'arp -a', 'route'],
  file_tampering: ['rm -rf', 'shred', 'dd if=/dev/zero', 'mkfs', '> /var/log'],
  reverse_shell: ['bash -i', '/dev/tcp', 'nc -e', 'mkfifo', 'python3 -c', 'perl -e', 'ruby -e']
};

const KNOWN_MALICIOUS_PATTERNS = [
  { pattern: 'xmrig', threat: 'XMRig Monero Cryptominer', severity: 'critical', cve: null },
  { pattern: 'masscan', threat: 'Mass Port Scanner', severity: 'high', cve: null },
  { pattern: '/dev/tcp', threat: 'Bash Reverse Shell', severity: 'critical', cve: null },
  { pattern: 'base64 -d', threat: 'Obfuscated Payload Execution', severity: 'critical', cve: null },
  { pattern: 'curl.*|.*bash', threat: 'Remote Code Execution via Pipe', severity: 'critical', cve: 'CVE-2021-4034' },
  { pattern: 'python.*pty', threat: 'Python PTY Shell Upgrade', severity: 'critical', cve: null },
  { pattern: 'chmod.*4755', threat: 'SUID Bit Setting (Privilege Escalation)', severity: 'critical', cve: null }
];

// ── Analyse commands and extract intelligence ─────────
function analyzeCommands(commands = []) {
  const cmdStrings = commands.map(c => 
    (typeof c === 'string' ? c : c.input || c.command || '').toLowerCase()
  );
  const allCmds = cmdStrings.join(' ');

  const detected = {
    cryptominer: false,
    botnet: false,
    persistence: false,
    reconnaissance: false,
    privilege_escalation: false,
    data_exfiltration: false,
    lateral_movement: false,
    file_tampering: false,
    reverse_shell: false
  };

  Object.entries(COMMAND_PATTERNS).forEach(([category, patterns]) => {
    detected[category] = patterns.some(p => allCmds.includes(p));
  });

  const threats = KNOWN_MALICIOUS_PATTERNS.filter(t => allCmds.includes(t.pattern));
  const downloadedFiles = cmdStrings
    .filter(c => c.includes('wget') || c.includes('curl -o') || c.includes('curl -o'))
    .map(c => {
      const match = c.match(/(?:wget|curl\s+-o\S*\s+)\s*(\S+)/);
      return match ? match[1] : 'unknown file';
    });

  const techniques = [];
  if (detected.reconnaissance) techniques.push('T1082 - System Information Discovery');
  if (detected.privilege_escalation) techniques.push('T1548 - Abuse Elevation Control Mechanism');
  if (detected.persistence) techniques.push('T1053 - Scheduled Task/Job');
  if (detected.cryptominer) techniques.push('T1496 - Resource Hijacking');
  if (detected.reverse_shell) techniques.push('T1059 - Command and Scripting Interpreter');
  if (detected.data_exfiltration) techniques.push('T1005 - Data from Local System');
  if (detected.lateral_movement) techniques.push('T1021 - Remote Services');
  if (detected.botnet) techniques.push('T1105 - Ingress Tool Transfer');

  return { detected, threats, downloadedFiles, techniques, cmdStrings };
}

// ── Determine attacker skill level ───────────────────
function assessSkillLevel(commands = [], sessionDuration = 0) {
  const cmdCount = commands.length;
  const allCmds = commands.join(' ').toLowerCase();

  if (cmdCount === 0) return { level: 'Script Kiddie', score: 1, description: 'No commands executed — likely automated scanner' };
  
  const advancedIndicators = [
    allCmds.includes('/dev/tcp'),
    allCmds.includes('base64'),
    allCmds.includes('python'),
    allCmds.includes('pty'),
    allCmds.includes('pivot'),
    allCmds.includes('proxychains'),
    cmdCount > 30,
    sessionDuration > 300
  ].filter(Boolean).length;

  if (advancedIndicators >= 4) return { level: 'Advanced Persistent Threat', score: 9, description: 'Sophisticated attacker using advanced techniques' };
  if (advancedIndicators >= 2) return { level: 'Experienced Attacker', score: 6, description: 'Familiar with Linux systems and attack techniques' };
  if (cmdCount > 10) return { level: 'Intermediate', score: 4, description: 'Some experience, likely using scripted tools' };
  return { level: 'Novice / Automated Tool', score: 2, description: 'Basic reconnaissance, likely using off-the-shelf tools' };
}

// ── Generate IP intelligence ──────────────────────────
function generateIPIntelligence(ip, country) {
  const isKnownRange = {
    tor: ip.startsWith('185.220') || ip.startsWith('185.107') || ip.startsWith('199.87'),
    vpn: ip.startsWith('45.33') || ip.startsWith('104.244') || ip.startsWith('198.98'),
    datacenter: ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('172.')
  };

  const recommendations = [];
  if (isKnownRange.tor) recommendations.push('IP belongs to known Tor exit node range — block entire /24 subnet');
  if (isKnownRange.vpn) recommendations.push('IP associated with VPN/proxy services — attacker is anonymizing');
  if (isKnownRange.datacenter) recommendations.push('Private/datacenter IP — likely internal lab or VPN pivot point');

  const highRiskCountries = ['RU', 'CN', 'KP', 'IR', 'NG'];
  const countryCode = country?.code || '';
  if (highRiskCountries.includes(countryCode)) {
    recommendations.push(`${country?.name || country} is a high-risk source country — consider geoblocking`);
  }

  return { isKnownRange, recommendations };
}

// ── Main intelligence generation function ────────────
export function generateIntelligence(alertData) {
  const {
    type = 'unknown',
    severity = 'medium',
    sourceIp = 'unknown',
    country = 'Unknown',
    commands = [],
    sessionDuration = 0,
    commandCount = 0,
    risk = 0
  } = alertData;

  const analysis = analyzeCommands(commands);
  const skillAssessment = assessSkillLevel(analysis.cmdStrings, sessionDuration);
  const ipIntel = generateIPIntelligence(sourceIp, country);

  // ── What happened ─────────────────────────────────
  let whatHappened = '';
  
  if (analysis.detected.reverse_shell) {
    whatHappened = `A sophisticated attacker from ${sourceIp} (${country}) established an SSH session and attempted to create a reverse shell connection back to their command and control server. This is one of the most dangerous attack patterns as it bypasses firewall rules by initiating the connection from inside.`;
  } else if (analysis.detected.cryptominer) {
    whatHappened = `An attacker from ${sourceIp} (${country}) successfully accessed the honeypot and deployed a cryptocurrency miner (likely XMRig for Monero). This is a resource hijacking attack — the goal is financial gain by using your CPU/GPU power, not data theft.`;
  } else if (analysis.detected.persistence) {
    whatHappened = `An attacker from ${sourceIp} (${country}) established persistence mechanisms on the system using cron jobs or startup scripts. This means they intended to maintain access even after the session ended or the system rebooted.`;
  } else if (analysis.detected.reconnaissance && analysis.detected.data_exfiltration) {
    whatHappened = `An attacker from ${sourceIp} (${country}) performed thorough system reconnaissance followed by data collection. They enumerated users (/etc/passwd), running processes, and system configuration — classic pre-exfiltration behaviour.`;
  } else if (analysis.detected.reconnaissance) {
    whatHappened = `An attacker from ${sourceIp} (${country}) performed system reconnaissance after gaining SSH access. They ran ${commandCount || commands.length} commands to map the environment — typical first-stage behaviour before deploying payloads.`;
  } else if (type.includes('login.success') || type.includes('successful_login')) {
    whatHappened = `An attacker from ${sourceIp} (${country}) successfully authenticated to the SSH honeypot. Login was achieved through credential guessing — they tried passwords until one worked. This represents a complete authentication bypass.`;
  } else if (type.includes('brute_force') || type.includes('login.failed')) {
    whatHappened = `An automated brute force attack originated from ${sourceIp} (${country}). The attacker ran a credential stuffing tool against the SSH service, trying common username/password combinations from a wordlist. Risk level: ${risk}/10.`;
  } else if ((commandCount || commands.length) === 0) {
    whatHappened = `A ${severity} severity security event was detected from ${sourceIp} (${country}). An SSH connection was observed, but no shell commands were captured in the session logs. The event remains concerning with a risk score of ${risk}/10.`;
  } else {
    whatHappened = `A ${severity} severity security event was detected from ${sourceIp} (${country}). The attacker established an SSH connection and performed ${commandCount || commands.length} actions against the honeypot system.`;
  }

  // ── Immediate actions ─────────────────────────────
  const immediateActions = [
    `Block ${sourceIp} at firewall level immediately: \`iptables -A INPUT -s ${sourceIp} -j DROP\``,
    `Add to permanent blocklist: \`echo "${sourceIp}" >> /etc/hosts.deny\``,
  ];

  if (analysis.detected.cryptominer) {
    immediateActions.push('Kill any running miner processes: `pkill -f xmrig && pkill -f minerd`');
    immediateActions.push('Check CPU usage for suspicious spikes: `top -bn1 | grep -v idle`');
    immediateActions.push('Scan for miner binaries: `find /tmp /var/tmp /dev/shm -type f -newer /etc/passwd`');
  }

  if (analysis.detected.persistence) {
    immediateActions.push('Audit cron jobs immediately: `crontab -l && cat /etc/cron* /var/spool/cron/*`');
    immediateActions.push('Check startup scripts: `systemctl list-units --type=service | grep -v systemd`');
    immediateActions.push('Review bash profiles: `cat ~/.bashrc ~/.profile /etc/profile.d/*`');
  }

  if (analysis.detected.reverse_shell) {
    immediateActions.push('Kill all outbound connections: `ss -tnp | grep ESTABLISHED`');
    immediateActions.push('Check for listening ports: `netstat -tlnp | grep -v ":22"` (unexpected ports = backdoor)');
  }

  if (analysis.downloadedFiles.length > 0) {
    immediateActions.push(`Check for downloaded files: \`ls -lah /tmp /var/tmp\` — look for: ${analysis.downloadedFiles.join(', ')}`);
    immediateActions.push('Scan downloaded files: `clamscan -r /tmp /var/tmp --infected`');
  }

  immediateActions.push(`Report incident: Document IP ${sourceIp}, timestamp, and all commands for your incident log`);

  // ── What to check ──────────────────────────────────
  const whatToCheck = [];

  if (analysis.detected.data_exfiltration) {
    whatToCheck.push('Check if /etc/shadow was successfully read — change all system passwords immediately');
    whatToCheck.push('Review auth.log for other login attempts: `grep "Failed password" /var/log/auth.log | tail -50`');
  }

  if (analysis.detected.lateral_movement) {
    whatToCheck.push('Check for lateral movement to other internal systems — review ARP table and recent SSH logins');
    whatToCheck.push('Audit /var/log/auth.log for successful logins from this IP to other accounts');
  }

  whatToCheck.push(`Check if ${sourceIp} has attacked other systems in your network using your IDS/SIEM logs`);
  whatToCheck.push('Verify no new user accounts were created: `grep "useradd\\|adduser" /var/log/auth.log`');
  whatToCheck.push('Check file integrity: `find / -newer /tmp -type f 2>/dev/null | grep -v proc`');

  if (analysis.threats.length > 0) {
    whatToCheck.push(`Known threat signatures detected: ${analysis.threats.map(t => t.threat).join(', ')}`);
  }

  // ── Prevention ────────────────────────────────────
  const prevention = [
    'Disable password authentication — SSH keys only: Set `PasswordAuthentication no` in /etc/ssh/sshd_config',
    'Deploy fail2ban: `apt install fail2ban` with maxretry=3 and bantime=86400',
  ];

  if (ipIntel.recommendations.length > 0) {
    prevention.push(...ipIntel.recommendations);
  }

  prevention.push('Enable 2FA for SSH using Google Authenticator or TOTP');
  
  if (analysis.detected.cryptominer || analysis.detected.botnet) {
    prevention.push('Implement outbound firewall rules to block unexpected connections to mining pools');
    prevention.push('Deploy network monitoring: alert on connections to ports 3333, 5555, 7777 (common mining ports)');
  }

  prevention.push('Regular audit: `last -a` to review recent logins and detect anomalies early');

  // ── MITRE ATT&CK mapping ───────────────────────────
  const mitre = analysis.techniques;

  // ── Threat summary ────────────────────────────────
  const riskScore = typeof risk === 'number' && risk > 0 ? Math.min(10, Math.round(risk)) : 0;
  const patternScore = Math.min(10,
    (analysis.detected.reverse_shell ? 4 : 0) +
    (analysis.detected.cryptominer ? 3 : 0) +
    (analysis.detected.persistence ? 3 : 0) +
    (analysis.detected.data_exfiltration ? 2 : 0) +
    (analysis.detected.privilege_escalation ? 2 : 0) +
    (analysis.detected.reconnaissance ? 1 : 0) +
    (skillAssessment.score > 5 ? 2 : 0)
  );
  const threatScore = Math.max(riskScore, patternScore);

  return {
    summary: {
      threatScore,
      skillLevel: skillAssessment.level,
      skillDescription: skillAssessment.description,
      attackerType: analysis.detected.cryptominer ? 'Cryptomining Botnet' :
                    analysis.detected.reverse_shell ? 'Advanced Persistent Threat' :
                    analysis.detected.reconnaissance ? 'Reconnaissance Actor' :
                    'Automated Credential Scanner',
      detectedPatterns: Object.entries(analysis.detected)
        .filter(([, v]) => v)
        .map(([k]) => k.replace('_', ' ').toUpperCase())
    },
    whatHappened,
    immediateActions,
    whatToCheck,
    prevention,
    mitre,
    knownThreats: analysis.threats,
    ipIntelligence: ipIntel
  };
}

// ── Format as readable text for the modal ────────────
export function formatIntelligenceAsText(intel) {
  const lines = [];

  lines.push(`## Threat Assessment`);
  lines.push(`Threat Score: ${intel.summary.threatScore}/10 | Attacker: ${intel.summary.attackerType} | Skill: ${intel.summary.skillLevel}`);
  if (intel.summary.detectedPatterns.length > 0) {
    lines.push(`Detected: ${intel.summary.detectedPatterns.join(', ')}`);
  }
  lines.push('');

  lines.push(`## What happened`);
  lines.push(intel.whatHappened);
  lines.push('');

  lines.push(`## Immediate actions`);
  intel.immediateActions.forEach((action, i) => {
    lines.push(`${i + 1}. ${action}`);
  });
  lines.push('');

  lines.push(`## What to check`);
  intel.whatToCheck.forEach(check => {
    lines.push(`- ${check}`);
  });
  lines.push('');

  lines.push(`## Prevention`);
  intel.prevention.forEach(prev => {
    lines.push(`- ${prev}`);
  });

  if (intel.mitre.length > 0) {
    lines.push('');
    lines.push(`## MITRE ATT&CK Techniques`);
    intel.mitre.forEach(t => lines.push(`- ${t}`));
  }

  if (intel.knownThreats.length > 0) {
    lines.push('');
    lines.push(`## Known Threat Signatures`);
    intel.knownThreats.forEach(t => {
      lines.push(`- ${t.threat}${t.cve ? ` (${t.cve})` : ''} — ${t.severity.toUpperCase()}`);
    });
  }

  return lines.join('\n');
}