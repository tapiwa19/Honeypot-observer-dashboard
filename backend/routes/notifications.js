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

/**
 * GET /api/notifications/config
 * Get current notification configuration
 */
router.get('/config', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    preferences: notificationService.preferences,
    services: {
      email: !!notificationService.emailTransporter,
      sms: !!notificationService.twilioClient,
      phone: !!notificationService.twilioClient,
      slack: !!notificationService.preferences.slack.webhookUrl
    }
  });
});

/**
 * POST /api/notifications/config/email
 * Configure email notifications
 */
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

/**
 * POST /api/notifications/config/twilio
 * Configure Twilio (SMS & Phone)
 */
router.post('/config/twilio', authenticateToken, requireAdmin, (req, res) => {
  const { 
    accountSid, 
    authToken, 
    phoneNumber, 
    smsRecipients, 
    callRecipients,
    smsSeverityThresholds,
    phoneSeverityThresholds
  } = req.body;

  try {
    const success = notificationService.initializeTwilio({
      accountSid,
      authToken,
      phoneNumber,
      smsRecipients,
      callRecipients
    });

    if (success) {
      if (smsSeverityThresholds) {
        notificationService.preferences.sms.severityThresholds = smsSeverityThresholds;
      }
      if (phoneSeverityThresholds) {
        notificationService.preferences.phone.severityThresholds = phoneSeverityThresholds;
      }
    }

    res.json({ 
      success, 
      message: success ? 'Twilio configured successfully' : 'Twilio configuration failed' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/config/slack
 * Configure Slack webhook
 */
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

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences
 */
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

/**
 * POST /api/notifications/test/:channel
 * Send test notification
 */
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

/**
 * POST /api/notifications/send
 * Send notification for an alert (called internally by alert system)
 */
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