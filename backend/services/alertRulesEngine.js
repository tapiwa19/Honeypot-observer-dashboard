// ============================================
// ALERT RULES ENGINE - Rule Processing & Evaluation
// ============================================

class AlertRulesEngine {
  constructor() {
    this.rules = [];
    this.alertQueues = {};
    this.deduplicationCache = new Map();
    this.notificationService = null; // ← injected from server.js
    this.stats = {
      totalAlertsProcessed: 0,
      totalAlertsTriggered: 0,
      totalAlertsThrottled: 0,
      totalAlertsDeduplicated: 0,
      totalQuietHoursSuppressed: 0,
      lastUpdate: new Date()
    };

    this.initializeDefaultRules();
    this.startBatchProcessors();
  }

  // ============================================
  // INJECT NOTIFICATION SERVICE FROM SERVER.JS
  // ============================================

  setNotificationService(service) {
    this.notificationService = service;
    console.log('✅ [AlertRulesEngine] Notification service injected');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  initializeDefaultRules() {
    const defaults = [
      // ── IMMEDIATE: High Risk Session ─────────────────
      {
        id: 'rule-high-risk-session',
        name: 'High Risk Session Detection',
        enabled: true,
        trigger: {
          type: 'brute_force',
          threshold: 5,
          timeWindow: 300
        },
        severity: 'critical',
        escalateSeverity: true,
        throttle: { type: 'immediate' },
        routing: { email: true, slack: true, sms: true, ntfy: true },
        deduplication: { enabled: true, window: 300, groupBy: 'session' },
        description: 'Immediately alerts on any high risk session (risk >= 7)'
      },
      // ── IMMEDIATE: Command Execution ─────────────────
      {
        id: 'rule-command-execution',
        name: 'Command Execution Detection',
        enabled: true,
        trigger: {
          type: 'command_execution',
          threshold: 3,
          timeWindow: 120
        },
        severity: 'high',
        escalateSeverity: false,
        throttle: { type: 'immediate' },
        routing: { email: true, slack: true, sms: true, ntfy: true },
        deduplication: { enabled: true, window: 300, groupBy: 'session' },
        description: 'Alerts immediately on suspicious command execution'
      },
      // ── IMMEDIATE: Credential Capture ────────────────
      {
        id: 'rule-credential-capture',
        name: 'Credential Capture Detection',
        enabled: true,
        trigger: {
          type: 'credential_capture',
          threshold: 1,
          timeWindow: 60
        },
        severity: 'critical',
        escalateSeverity: false,
        throttle: { type: 'immediate' },
        routing: { email: true, slack: true, sms: true, ntfy: true },
        deduplication: { enabled: true, window: 3600, groupBy: 'session' },
        description: 'Alerts immediately on credential harvest'
      },
      // ── BATCH: Port Scan (less urgent) ───────────────
      {
        id: 'rule-port-scan',
        name: 'Port Scan Detection',
        enabled: true,
        trigger: {
          type: 'port_scan',
          threshold: 10,
          timeWindow: 60
        },
        severity: 'medium',
        escalateSeverity: true,
        throttle: { type: 'batch_5min' },
        routing: { email: true, slack: true, sms: false, ntfy: false },
        deduplication: { enabled: true, window: 300, groupBy: 'session' },
        description: 'Detects port scanning activity - batched every 5 minutes'
      }
    ];

    this.rules = defaults.map(rule => ({
      ...rule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    console.log(`✅ [AlertRulesEngine] ${this.rules.length} default rules loaded`);
  }

  startBatchProcessors() {
    setInterval(() => this.processBatchQueue('batch_5min'),  300000);
    setInterval(() => this.processBatchQueue('batch_30min'), 1800000);
    setInterval(() => this.processBatchQueue('batch_1hr'),   3600000);
    setInterval(() => this.processBatchQueue('daily_digest'),86400000);
    setInterval(() => this.cleanupDeduplicationCache(),      3600000);
  }

  // ============================================
  // RULE MANAGEMENT (CRUD)
  // ============================================

  getAllRules() {
    return this.rules;
  }

  createRule(ruleData) {
    if (!ruleData.name || !ruleData.trigger || !ruleData.severity) {
      throw new Error('Missing required fields: name, trigger, severity');
    }
    const newRule = {
      id: `rule-${Date.now()}`,
      ...ruleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.rules.push(newRule);
    console.log(`✅ Alert rule created: ${newRule.name}`);
    return newRule;
  }

  updateRule(ruleId, updates) {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return null;
    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    console.log(`✅ Alert rule updated: ${this.rules[ruleIndex].name}`);
    return this.rules[ruleIndex];
  }

  deleteRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    const deleted = this.rules.splice(index, 1);
    console.log(`✅ Alert rule deleted: ${deleted[0].name}`);
    if (this.alertQueues[ruleId]) {
      clearTimeout(this.alertQueues[ruleId].batchTimeout);
      delete this.alertQueues[ruleId];
    }
    return true;
  }

  // ============================================
  // ALERT PROCESSING
  // ============================================

  async processAlert(incomingAlert) {
    this.stats.totalAlertsProcessed++;
    const results = {
      triggered: [],
      throttled: [],
      deduplicated: [],
      quietHoursSuppressed: []
    };

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // ── Deduplication check ───────────────────────────
      if (rule.deduplication?.enabled) {
        const isDuplicate = this.checkDeduplication(rule, incomingAlert);
        if (isDuplicate) {
          results.deduplicated.push(rule.id);
          this.stats.totalAlertsDeduplicated++;
          console.log(`🔁 [Dedup] Skipping duplicate for rule: ${rule.name}`);
          continue;
        }
      }

      // ── Rule evaluation ───────────────────────────────
      const matches = this.evaluateRule(rule, incomingAlert);
      if (!matches) continue;

      console.log(`✅ [Match] Rule matched: ${rule.name}`);

      // ── Quiet hours check ─────────────────────────────
      const isQuietHours = this.isWithinQuietHours(rule);
      if (isQuietHours && rule.throttle?.quietHours) {
        results.quietHoursSuppressed.push(rule.id);
        this.stats.totalQuietHoursSuppressed++;
        console.log(`🌙 [Quiet] Suppressed during quiet hours: ${rule.name}`);
        continue;
      }

      // ── Throttle: immediate fires now ─────────────────
      if (rule.throttle.type === 'immediate') {
        const alertPayload = {
          ruleId: rule.id,
          ruleName: rule.name,
          alert: {
            ...incomingAlert,
            severity: rule.severity,
            title: incomingAlert.title || `🚨 ${rule.name}`,
            description: incomingAlert.description || rule.description
          },
          throttleType: 'immediate'
        };

        results.triggered.push(alertPayload);
        this.stats.totalAlertsTriggered++;

        // ── Send notification directly if service available ──
        if (this.notificationService) {
          try {
            await this.notificationService.sendAlert({
              severity:    alertPayload.alert.severity,
              title:       alertPayload.alert.title,
              description: alertPayload.alert.description,
              sourceIp:    incomingAlert.sourceIp  || 'unknown',
              country:     incomingAlert.country   || 'unknown',
              timestamp:   incomingAlert.timestamp || new Date().toISOString(),
              type:        incomingAlert.type      || 'unknown'
            });
            console.log(`📱 [Notification] Sent for rule: ${rule.name} — IP: ${incomingAlert.sourceIp}`);
          } catch (err) {
            console.error(`❌ [Notification] Failed for rule ${rule.name}:`, err.message);
          }
        }

      } else {
        // ── Throttle: queue for batch ─────────────────────
        this.queueAlert(rule.id, incomingAlert);
        results.throttled.push(rule.id);
        this.stats.totalAlertsThrottled++;
      }
    }

    console.log(`📊 [ProcessAlert] Triggered: ${results.triggered.length} | Throttled: ${results.throttled.length} | Dedup: ${results.deduplicated.length}`);
    return results;
  }

  // ============================================
  // RULE EVALUATION
  // ============================================

  evaluateRule(rule, alert) {
    const { trigger } = rule;

    switch (trigger.type) {
      case 'brute_force':
        return (
          alert.type === 'brute_force' ||
          (alert.failedAttempts && alert.failedAttempts >= (trigger.threshold || 5)) ||
          (alert.commandCount   && alert.commandCount   >= 5)
        );

      case 'credential_capture':
        return alert.type === 'credential_capture' || alert.hasCredentials === true;

      case 'command_execution':
        return (
          alert.type === 'command_execution' ||
          alert.type === 'brute_force'       ||   // high risk sessions also match
          (alert.commandCount && alert.commandCount >= (trigger.threshold || 3))
        );

      case 'port_scan':
        return (
          alert.type === 'port_scan' ||
          (alert.portsScanned && alert.portsScanned >= (trigger.threshold || 10))
        );

      case 'custom':
        try {
          return eval(trigger.customCondition);
        } catch (error) {
          console.error('Error evaluating custom condition:', error);
          return false;
        }

      default:
        return false;
    }
  }

  // ============================================
  // DEDUPLICATION
  // ============================================

  checkDeduplication(rule, alert) {
    const { groupBy, window } = rule.deduplication || {};
    let dedupKey;

    switch (groupBy) {
      case 'session':
        dedupKey = `${rule.id}-session-${alert.sessionId}`;
        break;
        case 'ip':
        dedupKey = `${rule.id}-ip-${alert.sourceIp}`;
        break;
      case 'ip_eventtype':
        dedupKey = `${rule.id}-ip-type-${alert.sourceIp}-${alert.type}`;
        break;
      case 'all':
        dedupKey = `${rule.id}-all-${alert.type}-${alert.severity}`;
        break;
      default:
        return false;
    }

    const lastTime = this.deduplicationCache.get(dedupKey);
    const now = Date.now();

    if (lastTime && (now - lastTime) < ((window || 3600) * 1000)) {
      return true;
    }

    this.deduplicationCache.set(dedupKey, now);
    return false;
  }

  cleanupDeduplicationCache() {
    const now = Date.now();
    const maxAge = 24 * 3600 * 1000;
    for (const [key, timestamp] of this.deduplicationCache.entries()) {
      if (now - timestamp > maxAge) {
        this.deduplicationCache.delete(key);
      }
    }
    console.log(`🧹 Deduplication cache cleaned — ${this.deduplicationCache.size} entries remaining`);
  }

  // ============================================
  // QUIET HOURS
  // ============================================

  isWithinQuietHours(rule) {
    if (!rule.throttle?.quietHours) return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const { start, end } = rule.throttle.quietHours;
    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }

  // ============================================
  // BATCH PROCESSING
  // ============================================

  queueAlert(ruleId, alert) {
    if (!this.alertQueues[ruleId]) {
      this.alertQueues[ruleId] = { alerts: [] };
    }
    this.alertQueues[ruleId].alerts.push({
      ...alert,
      queuedAt: Date.now()
    });
  }

  async processBatchQueue(throttleType) {
    const rulesToProcess = this.rules.filter(r => r.throttle.type === throttleType);

    for (const rule of rulesToProcess) {
      const queue = this.alertQueues[rule.id];
      if (!queue || queue.alerts.length === 0) continue;

      const alerts = queue.alerts;
      const uniqueIPs = [...new Set(alerts.map(a => a.sourceIp))];

      console.log(`📤 [Batch] Flushing ${alerts.length} alerts for rule: ${rule.name}`);

      // ── Actually send the batch notification ─────────
      if (this.notificationService) {
        try {
          await this.notificationService.sendAlert({
            severity:    rule.severity,
            title:       `📊 Batch Alert: ${rule.name}`,
            description: `${alerts.length} events from ${uniqueIPs.length} IP(s): ${uniqueIPs.slice(0,3).join(', ')}`,
            sourceIp:    uniqueIPs[0] || 'multiple',
            country:     alerts[0]?.country || 'unknown',
            timestamp:   new Date().toISOString(),
            type:        rule.trigger.type
          });
          console.log(`✅ [Batch] Notification sent for rule: ${rule.name}`);
        } catch (err) {
          console.error(`❌ [Batch] Notification failed:`, err.message);
        }
      } else {
        console.log(`⚠️  [Batch] No notification service — batch ready but not sent`);
      }

      queue.alerts = [];
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  getStats() {
    return {
      ...this.stats,
      totalRulesActive:   this.rules.filter(r => r.enabled).length,
      totalRulesDisabled: this.rules.filter(r => !r.enabled).length,
      queuedAlerts: Object.values(this.alertQueues).reduce((sum, q) => sum + q.alerts.length, 0),
      lastUpdate: new Date().toISOString()
    };
  }

  resetStats() {
    this.stats = {
      totalAlertsProcessed:      0,
      totalAlertsTriggered:      0,
      totalAlertsThrottled:      0,
      totalAlertsDeduplicated:   0,
      totalQuietHoursSuppressed: 0,
      lastUpdate: new Date()
    };
  }
}

export default new AlertRulesEngine();