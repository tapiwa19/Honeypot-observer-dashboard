// ============================================
// ALERT RULES ENGINE - Rule Processing & Evaluation
// ============================================

class AlertRulesEngine {
  constructor() {
    this.rules = [];
    this.alertQueues = {}; // {ruleId: {alerts: [], batchTimeout}}
    this.deduplicationCache = new Map(); // {key: timestamp}
    this.stats = {
      totalAlertsProcessed: 0,
      totalAlertsThrottled: 0,
      totalAlertsDeduplicated: 0,
      totalQuietHoursSuppressed: 0,
      lastUpdate: new Date()
    };
    
    // Load default rules
    this.initializeDefaultRules();
    
    // Start batch processors
    this.startBatchProcessors();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Load default alert rules
   */
  initializeDefaultRules() {
    const defaults = [
      {
        id: 'rule-brute-force',
        name: 'Brute Force Detection',
        enabled: true,
        trigger: {
          type: 'brute_force',
          threshold: 5,
          timeWindow: 300 // 5 minutes
        },
        severity: 'high',
        escalateSeverity: true,
        throttle: {
          type: 'batch_5min',
          quietHours: { start: '22:00', end: '08:00' }
        },
        routing: { email: true, slack: true, sms: false, phone: false },
        deduplication: { enabled: true, window: 600, groupBy: 'ip_eventtype' },
        description: 'Detects multiple failed login attempts from same IP'
      },
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
        throttle: {
          type: 'immediate'
        },
        routing: { email: true, slack: true, sms: true, phone: true },
        deduplication: { enabled: true, window: 3600, groupBy: 'ip' },
        description: 'Alerts immediately on credential harvest (no batching)'
      },
      {
        id: 'rule-command-execution',
        name: 'Command Execution Pattern',
        enabled: true,
        trigger: {
          type: 'command_execution',
          threshold: 3,
          timeWindow: 120 // 2 minutes
        },
        severity: 'medium',
        escalateSeverity: false,
        throttle: {
          type: 'batch_30min',
          quietHours: { start: '22:00', end: '08:00' }
        },
        routing: { email: true, slack: true, sms: false, phone: false },
        deduplication: { enabled: true, window: 1800, groupBy: 'ip' },
        description: 'Detects suspicious command execution patterns'
      },
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
        throttle: {
          type: 'batch_5min'
        },
        routing: { email: true, slack: true, sms: false, phone: false },
        deduplication: { enabled: true, window: 300, groupBy: 'ip' },
        description: 'Detects port scanning activity'
      }
    ];

    this.rules = defaults.map(rule => ({
      ...rule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Start batch processing timers for each rule
   */
  startBatchProcessors() {
    // Process batch_5min every 5 minutes
    setInterval(() => this.processBatchQueue('batch_5min'), 300000);
    
    // Process batch_30min every 30 minutes
    setInterval(() => this.processBatchQueue('batch_30min'), 1800000);
    
    // Process batch_1hr every hour
    setInterval(() => this.processBatchQueue('batch_1hr'), 3600000);
    
    // Process daily_digest at midnight
    setInterval(() => this.processBatchQueue('daily_digest'), 86400000);
    
    // Clean up deduplication cache every hour
    setInterval(() => this.cleanupDeduplicationCache(), 3600000);
  }

  // ============================================
  // RULE MANAGEMENT (CRUD)
  // ============================================

  /**
   * Get all rules
   */
  getAllRules() {
    return this.rules;
  }

  /**
   * Create a new rule
   */
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

  /**
   * Update an existing rule
   */
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

  /**
   * Delete a rule
   */
  deleteRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    const deleted = this.rules.splice(index, 1);
    console.log(`✅ Alert rule deleted: ${deleted[0].name}`);
    
    // Clean up queue for this rule
    if (this.alertQueues[ruleId]) {
      clearTimeout(this.alertQueues[ruleId].batchTimeout);
      delete this.alertQueues[ruleId];
    }

    return true;
  }

  // ============================================
  // ALERT PROCESSING
  // ============================================

  /**
   * Main entry point: Process an incoming alert against all rules
   */
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

      // Check deduplication
      if (rule.deduplication?.enabled) {
        const isDuplicate = this.checkDeduplication(rule, incomingAlert);
        if (isDuplicate) {
          results.deduplicated.push(rule.id);
          this.stats.totalAlertsDeduplicated++;
          continue;
        }
      }

      // Evaluate rule against alert
      const matches = this.evaluateRule(rule, incomingAlert);
      if (!matches) continue;

      // Check quiet hours
      const isQuietHours = this.isWithinQuietHours(rule);
      if (isQuietHours && rule.throttle.quietHours) {
        results.quietHoursSuppressed.push(rule.id);
        this.stats.totalQuietHoursSuppressed++;
        continue;
      }

      // Apply throttling
      if (rule.throttle.type === 'immediate') {
        results.triggered.push({ ruleId: rule.id, alert: incomingAlert, throttleType: 'immediate' });
      } else {
        // Queue for batch processing
        this.queueAlert(rule.id, incomingAlert);
        results.throttled.push(rule.id);
        this.stats.totalAlertsThrottled++;
      }
    }

    console.log(`📊 Alert processed - Triggered: ${results.triggered.length}, Throttled: ${results.throttled.length}, Dedup: ${results.deduplicated.length}`);
    return results;
  }

  /**
   * Evaluate if an alert matches a rule's trigger conditions
   */
  evaluateRule(rule, alert) {
    const { trigger } = rule;

    switch (trigger.type) {
      case 'brute_force':
        // Check if alert indicates brute force (5+ failed logins in timeWindow)
        return alert.type === 'brute_force' || 
               (alert.failedAttempts && alert.failedAttempts >= (trigger.threshold || 5));

      case 'credential_capture':
        return alert.type === 'credential_capture' || alert.hasCredentials === true;

      case 'command_execution':
        return alert.type === 'command_execution' || 
               (alert.commandCount && alert.commandCount >= (trigger.threshold || 3));

      case 'port_scan':
        return alert.type === 'port_scan' || 
               (alert.portsScanned && alert.portsScanned >= (trigger.threshold || 10));

      case 'custom':
        // Custom condition evaluation (simplistic)
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

  /**
   * Check if alert is a duplicate
   */
  checkDeduplication(rule, alert) {
    const { groupBy, window } = rule.deduplication || {};
    let dedupKey;

    switch (groupBy) {
      case 'ip':
        dedupKey = `ip-${alert.sourceIp}`;
        break;
      case 'ip_eventtype':
        dedupKey = `ip-type-${alert.sourceIp}-${alert.type}`;
        break;
      case 'all':
        dedupKey = `all-${alert.type}-${alert.severity}`;
        break;
      default:
        return false;
    }

    const lastTime = this.deduplicationCache.get(dedupKey);
    const now = Date.now();

    // If we have a recent entry within the window, it's a duplicate
    if (lastTime && (now - lastTime) < ((window || 3600) * 1000)) {
      return true;
    }

    // Update the cache
    this.deduplicationCache.set(dedupKey, now);
    return false;
  }

  /**
   * Clean up old deduplication entries
   */
  cleanupDeduplicationCache() {
    const now = Date.now();
    const maxAge = 24 * 3600 * 1000; // 24 hours

    for (const [key, timestamp] of this.deduplicationCache.entries()) {
      if (now - timestamp > maxAge) {
        this.deduplicationCache.delete(key);
      }
    }

    console.log(`🧹 Deduplication cache cleaned - ${this.deduplicationCache.size} entries remaining`);
  }

  // ============================================
  // QUIET HOURS
  // ============================================

  /**
   * Check if current time is within quiet hours
   */
  isWithinQuietHours(rule) {
    if (!rule.throttle.quietHours) return false;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const { start, end } = rule.throttle.quietHours;

    // Handle cases where end time is earlier than start time (wraps around midnight)
    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }

  // ============================================
  // BATCH PROCESSING & QUEUING
  // ============================================

  /**
   * Queue an alert for batch processing
   */
  queueAlert(ruleId, alert) {
    if (!this.alertQueues[ruleId]) {
      this.alertQueues[ruleId] = { alerts: [] };
    }

    this.alertQueues[ruleId].alerts.push({
      ...alert,
      queuedAt: Date.now()
    });
  }

  /**
   * Process batched alerts
   */
  processBatchQueue(throttleType) {
    const rulesToProcess = this.rules.filter(r => r.throttle.type === throttleType);

    for (const rule of rulesToProcess) {
      const queue = this.alertQueues[rule.id];
      if (!queue || queue.alerts.length === 0) continue;

      const alerts = queue.alerts;
      console.log(`📤 Flushing ${alerts.length} batched alerts for rule: ${rule.name}`);

      // Aggregate alert summary
      const summary = {
        rule: rule.name,
        totalAlerts: alerts.length,
        severity: rule.severity,
        sourceIPs: [...new Set(alerts.map(a => a.sourceIp))],
        timeRange: {
          start: new Date(Math.min(...alerts.map(a => a.timestamp || Date.now()))),
          end: new Date()
        },
        alerts: alerts.slice(0, 5) // Include first 5 alerts as examples
      };

      // Emit/send aggregated alert through notification service
      // This will be called from server.js with notificationService
      console.log(`✅ Batch notification ready:`, summary);

      // Clear queue
      queue.alerts = [];
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get alert statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalRulesActive: this.rules.filter(r => r.enabled).length,
      totalRulesDisabled: this.rules.filter(r => !r.enabled).length,
      queuedAlerts: Object.values(this.alertQueues).reduce((sum, q) => sum + q.alerts.length, 0),
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalAlertsProcessed: 0,
      totalAlertsThrottled: 0,
      totalAlertsDeduplicated: 0,
      totalQuietHoursSuppressed: 0,
      lastUpdate: new Date()
    };
  }
}

// Export singleton instance
export default new AlertRulesEngine();
