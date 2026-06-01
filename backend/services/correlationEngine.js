// ============================================
// CORRELATION ENGINE - SOC Alert Fatigue Reduction
// ============================================

class CorrelationEngine {
  constructor() {
    // Track IP activity history
    this.ipHistory = new Map();
    
    // Whitelist — these IPs never generate alerts
    this.whitelist = new Set([
      '192.168.56.1',   // Windows host
      '192.168.56.101', // Honeypot server
      '127.0.0.1',
      '::1'
    ]);

    // Alert scoring weights
    this.scoreWeights = {
      // Attack type scores
      attackType: {
        'Malware Download':     10,
        'Cryptomining':         10,
        'Data Exfiltration':    10,
        'Privilege Escalation':  8,
        'Lateral Movement':      8,
        'Command Injection':     6,
        'Reconnaissance':        4,
        'Brute Force':           2
      },
      // Bonus scores
      bonuses: {
        knownAttacker:     5,  // IP seen before
        repeatedAttacks:   3,  // Same IP multiple sessions
        offHours:          2,  // Attack outside business hours
        highCommandCount:  3,  // More than 10 commands
        loginSuccess:      5   // Actually got in
      }
    };

    // Business hours config (24h format)
    this.businessHours = {
      start: 8,   // 8 AM
      end: 18,    // 6 PM
      timezone: 'Africa/Harare' // ← change to your timezone
    };

    // Cleanup old history every hour
    setInterval(() => this.cleanupHistory(), 3600000);

    console.log('✅ [CorrelationEngine] Initialized');
  }

  // ============================================
  // MAIN METHOD — call this before firing alerts
  // ============================================

  evaluate(alert) {
    const { sourceIp, sessionId, commandCount, type } = alert;

    // ── 1. Whitelist check ────────────────────────
    if (this.isWhitelisted(sourceIp)) {
      console.log(`🔕 [Correlation] Whitelisted IP: ${sourceIp}`);
      return { 
        shouldAlert: false, 
        reason: 'whitelisted',
        score: 0 
      };
    }

    // ── 2. Get or create IP history ───────────────
    const history = this.getIPHistory(sourceIp);

    // ── 3. Calculate alert score ──────────────────
    const score = this.calculateScore(alert, history);

    // ── 4. Check correlation rules ────────────────
    const correlation = this.checkCorrelationRules(sourceIp, history);

    // ── 5. Check business hours ───────────────────
    const isOffHours = this.isOffBusinessHours();

    // ── 6. Determine if we should alert ──────────
    const shouldAlert = this.shouldFireAlert(score, history, isOffHours);

    // ── 7. Determine escalated severity ──────────
    const severity = this.determineSeverity(score, correlation, isOffHours);

    // ── 8. Update history ─────────────────────────
    this.updateHistory(sourceIp, sessionId, alert, score);

    const result = {
      shouldAlert,
      severity,
      score,
      correlation,
      isOffHours,
      reason: shouldAlert ? 'threshold_met' : 'below_threshold',
      suppressedReason: !shouldAlert ? this.getSuppressReason(score, history) : null
    };

    console.log(`📊 [Correlation] IP: ${sourceIp} | Score: ${score} | Alert: ${shouldAlert} | Severity: ${severity}`);

    return result;
  }

  // ============================================
  // WHITELIST
  // ============================================

  isWhitelisted(ip) {
    if (this.whitelist.has(ip)) return true;
    if (ip?.startsWith('::ffff:192.168.')) return true;
    if (ip?.startsWith('::ffff:127.')) return true;
    return false;
  }

  addToWhitelist(ip) {
    this.whitelist.add(ip);
    console.log(`✅ [Correlation] Added to whitelist: ${ip}`);
  }

  removeFromWhitelist(ip) {
    this.whitelist.delete(ip);
    console.log(`✅ [Correlation] Removed from whitelist: ${ip}`);
  }

  // ============================================
  // SCORE CALCULATION
  // ============================================

  calculateScore(alert, history) {
    let score = 0;
    const { type, commandCount, risk } = alert;

    // Base score from attack type
    score += this.scoreWeights.attackType[type] || 3;

    // Bonus: risk score contribution
    score += Math.floor(risk / 2);

    // Bonus: high command count
    if (commandCount > 10) score += this.scoreWeights.bonuses.highCommandCount;

    // Bonus: known attacker (seen before)
    if (history.totalSessions > 0) {
      score += this.scoreWeights.bonuses.knownAttacker;
    }

    // Bonus: repeated attacks (same IP, multiple sessions in 1 hour)
    if (history.sessionsLastHour >= 3) {
      score += this.scoreWeights.bonuses.repeatedAttacks;
      console.log(`⚠️ [Correlation] Repeated attacker: ${alert.sourceIp} — ${history.sessionsLastHour} sessions in last hour`);
    }

    // Bonus: off hours attack
    if (this.isOffBusinessHours()) {
      score += this.scoreWeights.bonuses.offHours;
    }

    // Bonus: successful login
    if (alert.type === 'Brute Force' && alert.hasLoginSuccess) {
      score += this.scoreWeights.bonuses.loginSuccess;
    }

    return Math.min(score, 20); // cap at 20
  }

  // ============================================
  // CORRELATION RULES
  // ============================================

  checkCorrelationRules(ip, history) {
    const rules = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Rule 1 — Same IP attacking multiple times in 1 hour
    if (history.sessionsLastHour >= 3) {
      rules.push({
        rule: 'REPEATED_ATTACKER',
        description: `Same IP attacked ${history.sessionsLastHour} times in last hour`,
        escalate: true
      });
    }

    // Rule 2 — Same IP seen across multiple days
    if (history.totalSessions >= 10) {
      rules.push({
        rule: 'PERSISTENT_ATTACKER',
        description: `IP has ${history.totalSessions} total sessions — persistent threat`,
        escalate: true
      });
    }

    // Rule 3 — Escalating attack intensity
    if (history.lastRisk && history.lastRisk < 5 && history.currentRisk >= 9) {
      rules.push({
        rule: 'ESCALATING_ATTACK',
        description: 'Attack intensity rapidly escalated from low to critical',
        escalate: true
      });
    }

    // Rule 4 — Multiple attack types from same IP
    if (history.attackTypes && history.attackTypes.size >= 3) {
      rules.push({
        rule: 'MULTI_VECTOR',
        description: `IP using ${history.attackTypes.size} different attack types`,
        escalate: true
      });
    }

    return {
      triggered: rules,
      shouldEscalate: rules.some(r => r.escalate),
      count: rules.length
    };
  }

  // ============================================
  // BUSINESS HOURS
  // ============================================

  isOffBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour < this.businessHours.start || hour >= this.businessHours.end;
  }

  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isOffHours = this.isOffBusinessHours();

    return {
      hour,
      isWeekend,
      isOffHours,
      label: isWeekend ? 'weekend' : isOffHours ? 'after-hours' : 'business-hours'
    };
  }

  // ============================================
  // SHOULD ALERT DECISION
  // ============================================

  shouldFireAlert(score, history, isOffHours) {
    // During business hours — higher threshold
    // After hours — lower threshold (more sensitive)
    const threshold = isOffHours ? 6 : 8;

    // Always alert for very high scores
    if (score >= 12) return true;

    // Check if we already alerted for this IP recently
    const now = Date.now();
    const fiveMinutes = 2 * 60 * 1000;
    if (history.lastAlertTime && (now - history.lastAlertTime) < fiveMinutes) {
      console.log(`🔕 [Correlation] Suppressing duplicate alert for ${history.ip} — alerted ${Math.floor((now - history.lastAlertTime) / 1000)}s ago`);
      return false;
    }

    return score >= threshold;
  }

  // ============================================
  // SEVERITY DETERMINATION
  // ============================================

  determineSeverity(score, correlation, isOffHours) {
    let severity = 'low';

    if (score >= 15) severity = 'critical';
    else if (score >= 10) severity = 'high';
    else if (score >= 6) severity = 'medium';
    else severity = 'low';

    // Escalate if correlation rules triggered
    if (correlation.shouldEscalate) {
      if (severity === 'medium') severity = 'high';
      else if (severity === 'high') severity = 'critical';
    }

    // Escalate if off hours
    if (isOffHours && severity === 'medium') severity = 'high';

    return severity;
  }

  // ============================================
  // IP HISTORY MANAGEMENT
  // ============================================

  getIPHistory(ip) {
    if (!this.ipHistory.has(ip)) {
      this.ipHistory.set(ip, {
        ip,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        lastAlertTime: null,
        totalSessions: 0,
        sessionsLastHour: 0,
        sessionTimestamps: [],
        attackTypes: new Set(),
        lastRisk: 0,
        currentRisk: 0,
        scores: []
      });
    }
    return this.ipHistory.get(ip);
  }

  updateHistory(ip, sessionId, alert, score) {
    const history = this.getIPHistory(ip);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    history.lastSeen = now;
    history.totalSessions++;
    history.sessionTimestamps.push(now);
    history.lastRisk = history.currentRisk;
    history.currentRisk = alert.risk || 0;
    history.scores.push(score);

    if (alert.type) history.attackTypes.add(alert.type);

    // Count sessions in last hour
    history.sessionsLastHour = history.sessionTimestamps.filter(
      t => (now - t) < oneHour
    ).length;

    // Track last alert time
    history.lastAlertTime = now;

    // Keep only last 100 timestamps
    if (history.sessionTimestamps.length > 100) {
      history.sessionTimestamps = history.sessionTimestamps.slice(-100);
    }
  }

  getSuppressReason(score, history) {
    const now = Date.now();
    const fiveMinutes = 2 * 60 * 1000;

    if (history.lastAlertTime && (now - history.lastAlertTime) < fiveMinutes) {
      return 'duplicate_suppressed';
    }
    return 'below_threshold';
  }

  // ============================================
  // CLEANUP
  // ============================================

  cleanupHistory() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [ip, history] of this.ipHistory.entries()) {
      if ((now - history.lastSeen) > twentyFourHours) {
        this.ipHistory.delete(ip);
        cleaned++;
      }
    }

    console.log(`🧹 [Correlation] Cleaned ${cleaned} old IP records — ${this.ipHistory.size} remaining`);
  }

  // ============================================
  // STATS
  // ============================================

  getStats() {
    return {
      trackedIPs: this.ipHistory.size,
      whitelistedIPs: this.whitelist.size,
      businessHours: this.businessHours,
      currentTimeContext: this.getTimeContext()
    };
  }
}

export default new CorrelationEngine();