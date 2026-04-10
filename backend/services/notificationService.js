// ============================================
// NOTIFICATION SERVICE - Email, Ntfy & Slack
// ============================================
import nodemailer from 'nodemailer';
import axios from 'axios';

class NotificationService {
  constructor() {
    this.emailTransporter = null;

    this.preferences = {
      email: {
        enabled: false,
        recipients: [],
        severityThresholds: ['critical', 'high']
      },
      ntfy: {
        enabled: false,
        topic: '',
        severityThresholds: ['critical']
      },
      slack: {
        enabled: false,
        webhookUrl: ''
      }
    };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  initializeEmail(config) {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: config.smtpHost || 'smtp.gmail.com',
        port: config.smtpPort || 587,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      });

      this.preferences.email.enabled = true;
      this.preferences.email.recipients = config.recipients || [];

      console.log('✅ Email notifications initialized');
      return true;
    } catch (error) {
      console.error('❌ Email initialization failed:', error);
      return false;
    }
  }

  initializeNtfy(topic) {
    if (topic) {
      this.preferences.ntfy.enabled = true;
      this.preferences.ntfy.topic = topic;
      console.log('✅ Ntfy notifications initialized');
      return true;
    }
    return false;
  }

  initializeSlack(webhookUrl) {
    if (webhookUrl) {
      this.preferences.slack.enabled = true;
      this.preferences.slack.webhookUrl = webhookUrl;
      console.log('✅ Slack notifications initialized');
      return true;
    }
    return false;
  }

  // ============================================
  // ALERT PROCESSING
  // ============================================

  async sendAlert(alert) {
    const { severity, title } = alert;

    console.log(`📢 Processing alert: ${title} (${severity})`);

    const results = {
      email: { sent: false, error: null },
      ntfy: { sent: false, error: null },
      slack: { sent: false, error: null }
    };

    const promises = [];

    if (this.shouldNotify('email', severity)) {
      promises.push(
        this.sendEmail(alert)
          .then(() => { results.email.sent = true; })
          .catch(err => { results.email.error = err.message; })
      );
    }

    if (this.shouldNotify('ntfy', severity)) {
      promises.push(
        this.sendNtfy(alert)
          .then(() => { results.ntfy.sent = true; })
          .catch(err => { results.ntfy.error = err.message; })
      );
    }

    if (this.preferences.slack.enabled) {
      promises.push(
        this.sendSlack(alert)
          .then(() => { results.slack.sent = true; })
          .catch(err => { results.slack.error = err.message; })
      );
    }

    await Promise.allSettled(promises);

    console.log('📊 Notification results:', results);
    return results;
  }

  shouldNotify(channel, severity) {
    const prefs = this.preferences[channel];
    if (!prefs || !prefs.enabled) return false;

    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const alertLevel = severityLevels.indexOf(severity);

    return prefs.severityThresholds.some(threshold => {
      const thresholdLevel = severityLevels.indexOf(threshold);
      return alertLevel >= thresholdLevel;
    });
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================

  async sendEmail(alert) {
    if (!this.emailTransporter) {
      throw new Error('Email service not initialized');
    }

    const { severity, title, description, sourceIp, country, timestamp, type } = alert;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { background: white; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: ${this.getSeverityColor(severity)}; color: white; padding: 20px; }
          .content { padding: 20px; }
          .alert-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .alert-info div { padding: 8px 0; border-bottom: 1px solid #dee2e6; }
          .alert-info div:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #495057; }
          .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
          .btn { display: inline-block; padding: 12px 24px; background: ${this.getSeverityColor(severity)}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚨 ${severity.toUpperCase()} Security Alert</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${title}</p>
          </div>
          <div class="content">
            <p><strong>Alert Description:</strong></p>
            <p>${description}</p>
            <div class="alert-info">
              <div><span class="label">Severity:</span> ${severity.toUpperCase()}</div>
              <div><span class="label">Type:</span> ${type || 'Unknown'}</div>
              <div><span class="label">Source IP:</span> ${sourceIp}</div>
              <div><span class="label">Location:</span> ${country || 'Unknown'}</div>
              <div><span class="label">Timestamp:</span> ${timestamp}</div>
            </div>
            <a href="http://localhost:3001" class="btn">View Dashboard</a>
          </div>
          <div class="footer">
            <p>Automated alert from Honeypot Observer — do not reply</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const promises = this.preferences.email.recipients.map(recipient =>
      this.emailTransporter.sendMail({
        from: `"Honeypot Observer" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject: `🚨 ${severity.toUpperCase()} Alert: ${title}`,
        html: htmlContent
      })
    );

    await Promise.all(promises);
    console.log(`✅ Email sent to ${this.preferences.email.recipients.length} recipient(s)`);
  }

  // ============================================
  // NTFY PUSH NOTIFICATIONS
  // ============================================

  async sendNtfy(alert) {
    const { severity, title, sourceIp, country, timestamp, type } = alert;

    if (!this.preferences.ntfy.topic) {
      throw new Error('Ntfy topic not configured');
    }

    const priorityMap = {
      critical: 'urgent',
      high: 'high',
      medium: 'default',
      low: 'low'
    };

    const tagMap = {
      critical: 'rotating_light,skull',
      high: 'warning',
      medium: 'bell',
      low: 'information_source'
    };

    const body = [
      `Severity: ${severity.toUpperCase()}`,
      `Type: ${type || 'Unknown'}`,
      `IP: ${sourceIp}`,
      `Location: ${country || 'Unknown'}`,
      `Time: ${timestamp}`
    ].join('\n');

    await fetch(`https://ntfy.sh/${this.preferences.ntfy.topic}`, {
      method: 'POST',
      body: body,
      headers: {
        'Title': title,
        'Priority': priorityMap[severity] || 'default',
        'Tags': tagMap[severity] || 'bell'
      }
    });

    console.log(`✅ Ntfy notification sent to topic: ${this.preferences.ntfy.topic}`);
  }

  // ============================================
  // SLACK NOTIFICATIONS
  // ============================================

  async sendSlack(alert) {
    if (!this.preferences.slack.webhookUrl) {
      throw new Error('Slack webhook not configured');
    }

    const { severity, title, description, sourceIp, country, timestamp, type } = alert;

    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `🚨 ${severity.toUpperCase()} Security Alert`, emoji: true }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${title}*\n${description}` }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Severity:*\n${severity.toUpperCase()}` },
            { type: "mrkdwn", text: `*Type:*\n${type || 'Unknown'}` },
            { type: "mrkdwn", text: `*Source IP:*\n${sourceIp}` },
            { type: "mrkdwn", text: `*Location:*\n${country || 'Unknown'}` }
          ]
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `⏰ ${timestamp}` }]
        }
      ]
    };

    await axios.post(this.preferences.slack.webhookUrl, slackMessage);
    console.log('✅ Slack notification sent');
  }

  // ============================================
  // HELPERS
  // ============================================

  getSeverityColor(severity) {
    const colors = { critical: '#dc3545', high: '#fd7e14', medium: '#ffc107', low: '#28a745' };
    return colors[severity] || '#6c757d';
  }

  updatePreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
  }

  async testNotifications(channel) {
    const testAlert = {
      severity: 'medium',
      title: 'Test Notification',
      description: 'This is a test notification from your Honeypot Observer system.',
      sourceIp: '192.168.1.100',
      country: 'Test Location',
      timestamp: new Date().toISOString(),
      type: 'test'
    };

    switch (channel) {
      case 'email': return await this.sendEmail(testAlert);
      case 'ntfy': return await this.sendNtfy(testAlert);
      case 'slack': return await this.sendSlack(testAlert);
      default: return await this.sendAlert(testAlert);
    }
  }
}

export default new NotificationService();