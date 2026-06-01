// ============================================
// ATTACKER FINGERPRINTING SERVICE
// SSH Client Fingerprinting using HASSH
// ============================================
import crypto from 'crypto';

class FingerprintService {
  constructor() {
    // Store known fingerprints and their associated attacks
    this.fingerprintDB = new Map();
    
    // Known malicious tool signatures
    this.knownTools = {
      // Brute force tools
      'ab:cd:12:34': { tool: 'Hydra',        type: 'brute_force',  threat: 'HIGH' },
      'ef:gh:56:78': { tool: 'Medusa',       type: 'brute_force',  threat: 'HIGH' },
      'ij:kl:90:12': { tool: 'Ncrack',       type: 'brute_force',  threat: 'HIGH' },

      // Known botnets
      'mn:op:34:56': { tool: 'Mirai Botnet', type: 'botnet',       threat: 'CRITICAL' },
      'qr:st:78:90': { tool: 'Mozi Botnet',  type: 'botnet',       threat: 'CRITICAL' },

      // SSH clients
      'OpenSSH_8':   { tool: 'OpenSSH 8.x',  type: 'manual',       threat: 'MEDIUM' },
      'OpenSSH_9':   { tool: 'OpenSSH 9.x',  type: 'manual',       threat: 'MEDIUM' },
      'libssh':      { tool: 'libssh',        type: 'automated',    threat: 'HIGH' },
      'paramiko':    { tool: 'Paramiko',      type: 'python_script',threat: 'HIGH' },
      'AsyncSSH':    { tool: 'AsyncSSH',      type: 'python_script',threat: 'HIGH' },
      'Go':          { tool: 'Go SSH Client', type: 'automated',    threat: 'HIGH' },
      'JSCH':        { tool: 'Java SSH',      type: 'automated',    threat: 'HIGH' },
      'PuTTY':       { tool: 'PuTTY',         type: 'manual',       threat: 'LOW' },
      'WinSCP':      { tool: 'WinSCP',        type: 'manual',       threat: 'LOW' },
      'Cyberduck':   { tool: 'Cyberduck',     type: 'manual',       threat: 'LOW' },
    };

    // Cleanup old fingerprints every 24 hours
    setInterval(() => this.cleanup(), 24 * 60 * 60 * 1000);

    console.log('✅ [FingerprintService] Initialized');
  }

  // ============================================
  // HASSH GENERATION
  // ============================================

  generateHASSH(kexAlgs, encryptionAlgs, macAlgs, compressionAlgs) {
    try {
      // HASSH = MD5 of concatenated algorithms
      // This is the standard HASSH algorithm used by Salesforce/security researchers
      const hasshString = [
        kexAlgs        || '',
        encryptionAlgs || '',
        macAlgs        || '',
        compressionAlgs|| ''
      ].join(';');

      const hassh = crypto
        .createHash('md5')
        .update(hasshString)
        .digest('hex');

      return {
        hassh,
        hasshString,
        components: {
          kexAlgs,
          encryptionAlgs,
          macAlgs,
          compressionAlgs
        }
      };
    } catch (error) {
      console.error('❌ [Fingerprint] HASSH generation error:', error.message);
      return null;
    }
  }

  // ============================================
  // FINGERPRINT FROM COWRIE EVENT
  // ============================================

  fingerprintFromEvents(events) {
    try {
      // Find relevant cowrie events
      const kexEvent     = events.find(e => e.eventid === 'cowrie.client.kex');
      const versionEvent = events.find(e => e.eventid === 'cowrie.client.version');
      const sizeEvent    = events.find(e => e.eventid === 'cowrie.client.size');
      const varEvents    = events.filter(e => e.eventid === 'cowrie.client.var');

      // Extract SSH client version
      const sshVersion = versionEvent?.version || 
                         versionEvent?.message?.match(/SSH-\S+/)?.[0] || 
                         'Unknown';

      // Extract KEX algorithms from cowrie.client.kex event
      const kexAlgs         = kexEvent?.kexAlgs         || kexEvent?.hassh_algorithms?.kex || '';
      const encryptionAlgs  = kexEvent?.encCS            || kexEvent?.hassh_algorithms?.encryption || '';
      const macAlgs         = kexEvent?.macCS            || kexEvent?.hassh_algorithms?.mac || '';
      const compressionAlgs = kexEvent?.compCS           || kexEvent?.hassh_algorithms?.compression || '';

      // Generate HASSH
      const hasshData = this.generateHASSH(kexAlgs, encryptionAlgs, macAlgs, compressionAlgs);

      // Extract terminal size
      const terminalSize = sizeEvent 
        ? `${sizeEvent.width}x${sizeEvent.height}` 
        : '80x24';

      // Extract environment variables
      const envVars = {};
      varEvents.forEach(e => {
        if (e.name && e.value) {
          envVars[e.name] = e.value;
        }
      });

      // Identify the tool
      const toolInfo = this.identifyTool(sshVersion, hasshData?.hassh);

      // Build complete fingerprint
      const fingerprint = {
        sshVersion,
        hassh:          hasshData?.hassh || 'unknown',
        hasshString:    hasshData?.hasshString || '',
        terminalSize,
        envVars,
        toolInfo,
        isAutomated:    this.detectAutomation(events, sshVersion, envVars),
        skillLevel:     this.assessSkillLevel(events),
        algorithms: {
          kex:         kexAlgs,
          encryption:  encryptionAlgs,
          mac:         macAlgs,
          compression: compressionAlgs
        },
        generatedAt: new Date().toISOString()
      };

      return fingerprint;

    } catch (error) {
      console.error('❌ [Fingerprint] Error generating fingerprint:', error.message);
      return null;
    }
  }

  // ============================================
  // TOOL IDENTIFICATION
  // ============================================

  identifyTool(sshVersion, hassh) {
    // Check by SSH version string first
    for (const [key, info] of Object.entries(this.knownTools)) {
      if (sshVersion && sshVersion.includes(key)) {
        return {
          ...info,
          confidence: 'HIGH',
          matchedBy: 'version_string'
        };
      }
    }

    // Check by HASSH fingerprint
    if (hassh && this.knownTools[hassh]) {
      return {
        ...this.knownTools[hassh],
        confidence: 'HIGH',
        matchedBy: 'hassh'
      };
    }

    // Check database of previously seen fingerprints
    if (hassh && this.fingerprintDB.has(hassh)) {
      const known = this.fingerprintDB.get(hassh);
      return {
        tool: `Unknown (seen ${known.count}x)`,
        type: 'unknown',
        threat: known.count > 10 ? 'HIGH' : 'MEDIUM',
        confidence: 'MEDIUM',
        matchedBy: 'history'
      };
    }

    // Unknown tool
    return {
      tool: sshVersion || 'Unknown SSH Client',
      type: 'unknown',
      threat: 'MEDIUM',
      confidence: 'LOW',
      matchedBy: 'none'
    };
  }

  // ============================================
  // AUTOMATION DETECTION
  // ============================================

  detectAutomation(events, sshVersion, envVars) {
    const indicators = [];

    // Check for known automated tools in version string
    const automatedTools = ['paramiko', 'libssh', 'AsyncSSH', 'Go', 'JSCH', 'fabric'];
    for (const tool of automatedTools) {
      if (sshVersion?.toLowerCase().includes(tool.toLowerCase())) {
        indicators.push(`Known automation tool: ${tool}`);
      }
    }

    // No terminal size = likely automated
    const hasSizeEvent = events.some(e => e.eventid === 'cowrie.client.size');
    if (!hasSizeEvent) {
      indicators.push('No terminal size negotiation');
    }

    // No environment variables = likely automated
    if (Object.keys(envVars).length === 0) {
      indicators.push('No environment variables set');
    }

    // Very fast command execution = automated
    const commandEvents = events.filter(e => e.eventid === 'cowrie.command.input');
    if (commandEvents.length > 3) {
      const timestamps = commandEvents.map(e => new Date(e.timestamp || e['@timestamp']).getTime());
      const gaps = [];
      for (let i = 1; i < timestamps.length; i++) {
        gaps.push(timestamps[i] - timestamps[i-1]);
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGap < 500) { // Less than 500ms between commands
        indicators.push(`Very fast command execution (avg ${Math.round(avgGap)}ms)`);
      }
    }

    return {
      isAutomated: indicators.length >= 2,
      confidence: indicators.length >= 3 ? 'HIGH' : indicators.length >= 2 ? 'MEDIUM' : 'LOW',
      indicators
    };
  }

  // ============================================
  // SKILL LEVEL ASSESSMENT
  // ============================================

  assessSkillLevel(events) {
    const commands = events
      .filter(e => e.eventid === 'cowrie.command.input')
      .map(e => e.command_input || e.message || '');

    if (commands.length === 0) return 'Unknown';

    const advancedCommands = [
      'iptables', 'netstat', 'tcpdump', 'strace', 'ltrace',
      'gdb', 'objdump', 'readelf', 'nm ', 'ldd ',
      'systemctl', 'journalctl', 'crontab', 'at ',
      'python', 'perl', 'ruby', 'php', 'gcc', 'make',
      'docker', 'kubectl', 'ansible', 'terraform'
    ];

    const intermediateCommands = [
      'wget', 'curl', 'chmod', 'chown', 'sudo',
      'ps aux', 'netstat', 'ifconfig', 'ip a',
      'cat /etc', 'find /', 'grep -r', 'awk', 'sed'
    ];

    const basicCommands = [
      'ls', 'pwd', 'cd ', 'cat ', 'echo',
      'whoami', 'id', 'uname', 'hostname'
    ];

    let advancedCount = 0;
    let intermediateCount = 0;
    let basicCount = 0;

    commands.forEach(cmd => {
      if (advancedCommands.some(ac => cmd.includes(ac))) advancedCount++;
      else if (intermediateCommands.some(ic => cmd.includes(ic))) intermediateCount++;
      else if (basicCommands.some(bc => cmd.includes(bc))) basicCount++;
    });

    if (advancedCount >= 2) return 'Expert';
    if (advancedCount >= 1 || intermediateCount >= 3) return 'Advanced';
    if (intermediateCount >= 1) return 'Intermediate';
    if (basicCount >= 1) return 'Beginner';
    return 'Script Kiddie';
  }

  // ============================================
  // TRACK AND CORRELATE FINGERPRINTS
  // ============================================

  trackFingerprint(hassh, sessionData) {
    if (!hassh || hassh === 'unknown') return;

    if (!this.fingerprintDB.has(hassh)) {
      this.fingerprintDB.set(hassh, {
        hassh,
        firstSeen:  Date.now(),
        lastSeen:   Date.now(),
        count:      0,
        ips:        new Set(),
        sessions:   []
      });
    }

    const record = this.fingerprintDB.get(hassh);
    record.lastSeen = Date.now();
    record.count++;
    record.ips.add(sessionData.ip);

    // Keep last 50 sessions
    record.sessions.push({
      sessionId: sessionData.sessionId,
      ip:        sessionData.ip,
      timestamp: Date.now()
    });
    if (record.sessions.length > 50) {
      record.sessions = record.sessions.slice(-50);
    }

    // If same HASSH seen from multiple IPs = botnet
    if (record.ips.size > 3) {
      console.log(`🤖 [Fingerprint] Botnet detected! HASSH ${hassh} seen from ${record.ips.size} different IPs`);
      return {
        isBotnet: true,
        hassh,
        uniqueIPs: record.ips.size,
        totalSessions: record.count
      };
    }

    return { isBotnet: false };
  }

  // ============================================
  // GET FINGERPRINT SUMMARY FOR SESSION
  // ============================================

  getSummary(fingerprint) {
    if (!fingerprint) return 'No fingerprint data available';

    const lines = [
      `🔍 SSH Client: ${fingerprint.sshVersion}`,
      `🔑 HASSH: ${fingerprint.hassh}`,
      `🖥️  Terminal: ${fingerprint.terminalSize}`,
      `🛠️  Tool: ${fingerprint.toolInfo.tool} (${fingerprint.toolInfo.confidence} confidence)`,
      `🤖 Automated: ${fingerprint.isAutomated.isAutomated ? 'YES' : 'NO'}`,
      `🎯 Skill Level: ${fingerprint.skillLevel}`,
      `⚠️  Threat: ${fingerprint.toolInfo.threat}`
    ];

    if (fingerprint.isAutomated.isAutomated) {
      lines.push(`📊 Automation indicators: ${fingerprint.isAutomated.indicators.join(', ')}`);
    }

    return lines.join('\n');
  }

  // ============================================
  // STATS
  // ============================================

  getStats() {
    const botnets = Array.from(this.fingerprintDB.values())
      .filter(f => f.ips.size > 3);

    return {
      totalFingerprints: this.fingerprintDB.size,
      detectedBotnets:   botnets.length,
      topFingerprints:   Array.from(this.fingerprintDB.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(f => ({
          hassh:    f.hassh,
          count:    f.count,
          uniqueIPs: f.ips.size
        }))
    };
  }

  cleanup() {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [hassh, record] of this.fingerprintDB.entries()) {
      if ((now - record.lastSeen) > sevenDays) {
        this.fingerprintDB.delete(hassh);
        cleaned++;
      }
    }

    console.log(`🧹 [Fingerprint] Cleaned ${cleaned} old fingerprints`);
  }
}

export default new FingerprintService();