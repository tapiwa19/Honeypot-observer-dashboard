// ============================================
// ALERT RULES ROUTES - API Endpoints
// ============================================
import express from 'express';
import { authenticateToken, requireAdmin } from '../auth.js';
import alertRulesEngine from '../services/alertRulesEngine.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// ============================================
// RULE MANAGEMENT
// ============================================

// GET /api/alerts/rules
router.get('/rules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rules = alertRulesEngine.getAllRules();
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/alerts/rules
router.post('/rules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rule = alertRulesEngine.createRule(req.body);
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/rules/:id
router.put('/rules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rule = alertRulesEngine.updateRule(req.params.id, req.body);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/alerts/rules/:id — toggle enabled/disabled
router.patch('/rules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rule = alertRulesEngine.updateRule(req.params.id, req.body);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/alerts/rules/:id
router.delete('/rules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const success = alertRulesEngine.deleteRule(req.params.id);
    if (!success) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// TESTING & STATS
// ============================================

// POST /api/alerts/test-rule — test a rule against sample data
router.post('/test-rule', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { rule, testAlert } = req.body;
    const result = alertRulesEngine.evaluateRule(rule, testAlert);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/test-notification', async (req, res) => {
  try {
    // ── Direct ntfy call — bypasses notificationService ──
    const topic = process.env.NTFY_TOPIC;

    if (!topic) {
      return res.status(500).json({ 
        success: false, 
        message: 'NTFY_TOPIC not set in .env' 
      });
    }

    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: '🚨 Test Alert — Honeypot Observer is working!',
      headers: {
        'Title':    'Honeypot Observer Test',
        'Priority': 'urgent',
        'Tags':     'warning,honeypot'
      }
    });

    if (response.ok) {
      res.json({ 
        success: true, 
        message: `Test notification sent to topic: ${topic}` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: `Ntfy returned status: ${response.status}` 
      });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/alerts/simulate — simulate an attack alert through the rules engine
router.post('/simulate', async (req, res) => {
  try {
    const testAlert = req.body || {
      type:          'command_execution',
      severity:      'critical',
      title:         '🚨 CRITICAL Attack Detected!',
      description:   'Simulated attack with 15 commands — Risk: 9/10',
      sourceIp:      '10.0.0.99',
      country:       'Test Country',
      timestamp:     new Date().toISOString(),
      commandCount:  15,
      failedAttempts: 10
    };

    // Inject notification service before processing
    alertRulesEngine.setNotificationService(notificationService);

    const results = await alertRulesEngine.processAlert(testAlert);
    res.json({
      success: true,
      message: `Rules processed — Triggered: ${results.triggered.length}`,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/stats
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = alertRulesEngine.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;