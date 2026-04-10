// ============================================
// NOTIFICATION ROUTES - API Endpoints
// ============================================
import express from 'express';
import notificationService from '../services/notificationService.js';
import { authenticateToken, requireAdmin } from '../auth.js';

const router = express.Router();

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

router.get('/config', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    preferences: notificationService.preferences,
    services: {
      email: !!notificationService.emailTransporter,
      ntfy: !!notificationService.preferences.ntfy.topic,
      slack: !!notificationService.preferences.slack.webhookUrl
    }
  });
});

router.post('/config/email', authenticateToken, requireAdmin, (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPassword, recipients, severityThresholds } = req.body;

  try {
    const success = notificationService.initializeEmail({
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser,
      smtpPassword,
      recipients
    });

    if (success && severityThresholds) {
      notificationService.preferences.email.severityThresholds = severityThresholds;
    }

    res.json({
      success,
      message: success ? 'Email configured successfully' : 'Email configuration failed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/config/ntfy', authenticateToken, requireAdmin, (req, res) => {
  const { topic, severityThresholds } = req.body;

  try {
    if (!topic) {
      return res.status(400).json({ success: false, message: 'Ntfy topic is required' });
    }

    const success = notificationService.initializeNtfy(topic);

    if (success && severityThresholds) {
      notificationService.preferences.ntfy.severityThresholds = severityThresholds;
    }

    res.json({
      success,
      message: success ? 'Ntfy configured successfully' : 'Ntfy configuration failed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/config/slack', authenticateToken, requireAdmin, (req, res) => {
  const { webhookUrl } = req.body;

  try {
    const success = notificationService.initializeSlack(webhookUrl);
    res.json({
      success,
      message: success ? 'Slack configured successfully' : 'Slack configuration failed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/preferences', authenticateToken, requireAdmin, (req, res) => {
  try {
    notificationService.updatePreferences(req.body);
    res.json({ success: true, preferences: notificationService.preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// TESTING ENDPOINTS
// ============================================

router.post('/test/:channel', authenticateToken, requireAdmin, async (req, res) => {
  const { channel } = req.params;

  try {
    await notificationService.testNotifications(channel);
    res.json({
      success: true,
      message: `Test ${channel} notification sent successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to send test notification: ${error.message}`
    });
  }
});

// ============================================
// ALERT SENDING ENDPOINT
// ============================================

router.post('/send', authenticateToken, async (req, res) => {
  const alert = req.body;

  try {
    const results = await notificationService.sendAlert(alert);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;