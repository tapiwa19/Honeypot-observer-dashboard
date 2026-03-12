// ============================================
// ALERT RULES ROUTES - API Endpoints
// ============================================
import express from 'express';
import { authenticateToken, requireAdmin } from '../auth.js';
import alertRulesEngine from '../services/alertRulesEngine.js';

const router = express.Router();

/**
 * GET /api/alerts/rules
 * Retrieve all alert rules
 */
router.get('/rules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rules = alertRulesEngine.getAllRules();
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/alerts/rules
 * Create a new alert rule
 */
router.post('/rules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rule = alertRulesEngine.createRule(req.body);
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/alerts/rules/:id
 * Update an existing alert rule
 */
router.put('/rules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rule = alertRulesEngine.updateRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/alerts/rules/:id
 * Toggle rule enabled/disabled or partial update
 */
router.patch('/rules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rule = alertRulesEngine.updateRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/alerts/rules/:id
 * Delete an alert rule
 */
router.delete('/rules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const success = alertRulesEngine.deleteRule(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/alerts/test-rule
 * Test a rule against sample alert data
 */
router.post('/test-rule', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { rule, testAlert } = req.body;
    const result = alertRulesEngine.evaluateRule(rule, testAlert);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics and metrics
 */
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = alertRulesEngine.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
