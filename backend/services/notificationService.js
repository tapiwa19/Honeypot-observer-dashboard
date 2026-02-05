// ============================================
// NOTIFICATION SERVICE - Email, SMS & Phone Calls
// ============================================
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';

// ============================================
// CONFIGURATION
// ============================================
class NotificationService {
  constructor() {
    // Email configuration (using environment variables)
    this.emailTransporter = null;
    
    // Twilio configuration for SMS & Calls
    this.twilioClient = null;
    
    // Notification preferences (loaded from database)
    this.preferences = {
      email: {
        enabled: false,
        recipients: [],
        severityThresholds: ['critical', 'high']
      },
      sms: {
        enabled: false,
        recipients: [],
        severityThresholds: ['critical']
      },
      phone: {
        enabled: false,
        recipients: [],
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
  
  /**
   * Initialize email service (Nodemailer with Gmail/SMTP)
   */
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

  /**
   * Initialize Twilio for SMS & Phone Calls
   * Get free credits at: https://www.twilio.com/try-twilio
   */
  initializeTwilio(config) {
    try {
      if (!config.accountSid || !config.authToken) {
        console.log('⚠️ Twilio credentials not provided');
        return false;
      }

      this.twilioClient = twilio(config.accountSid, config.authToken);
      this.twilioPhoneNumber = config.phoneNumber;
      
      this.preferences.sms.enabled = true;
      this.preferences.sms.recipients = config.smsRecipients || [];
      
      this.preferences.phone.enabled = true;
      this.preferences.phone.recipients = config.callRecipients || [];
      
      console.log('✅ Twilio (SMS & Calls) initialized');
      return true;
    } catch (error) {
      console.error('❌ Twilio initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize Slack webhook
   */
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
  
  /**
   * Main method: Process and send alert through all enabled channels
   */
  async sendAlert(alert) {
    const { severity, title, description, sourceIp, country, timestamp } = alert;
    
    console.log(`📢 Processing alert: ${title} (${severity})`);
    
    const results = {
      email: { sent: false, error: null },
      sms: { sent: false, error: null },
      phone: { sent: false, error: null },
      slack: { sent: false, error: null }
    };

    // Check if severity meets threshold for each channel
    const promises = [];

    // Email
    if (this.shouldNotify('email', severity)) {
      promises.push(
        this.sendEmail(alert)
          .then(() => { results.email.sent = true; })
          .catch(err => { results.email.error = err.message; })
      );
    }

    // SMS
    if (this.shouldNotify('sms', severity)) {
      promises.push(
        this.sendSMS(alert)
          .then(() => { results.sms.sent = true; })
          .catch(err => { results.sms.error = err.message; })
      );
    }

    // Phone Call (only for CRITICAL)
    if (this.shouldNotify('phone', severity)) {
      promises.push(
        this.makePhoneCall(alert)
          .then(() => { results.phone.sent = true; })
          .catch(err => { results.phone.error = err.message; })
      );
    }

    // Slack
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

  /**
   * Check if notification should be sent based on severity threshold
   */
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
    
    // Build HTML email
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
          .value { color: #212529; }
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
              <div><span class="label">Severity:</span> <span class="value">${severity.toUpperCase()}</span></div>
              <div><span class="label">Alert Type:</span> <span class="value">${type || 'Unknown'}</span></div>
              <div><span class="label">Source IP:</span> <span class="value">${sourceIp}</span></div>
              <div><span class="label">Location:</span> <span class="value">${country || 'Unknown'}</span></div>
              <div><span class="label">Timestamp:</span> <span class="value">${timestamp}</span></div>
            </div>
            
            <p style="margin-top: 20px;">
              <a href="http://localhost:3001" class="btn">View in Dashboard</a>
            </p>
            
            ${severity === 'critical' ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <strong>⚠️ IMMEDIATE ACTION REQUIRED</strong><br>
                This is a critical security event that requires your immediate attention.
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated alert from your Honeypot Observer System</p>
            <p>Do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to all recipients
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
  // SMS NOTIFICATIONS (Twilio)
  // ============================================
  
  async sendSMS(alert) {
    if (!this.twilioClient) {
      throw new Error('Twilio not initialized');
    }

    const { severity, title, sourceIp, country } = alert;
    
    // Keep SMS short (160 chars recommended)
    const message = `🚨 ${severity.toUpperCase()} ALERT
${title}
IP: ${sourceIp} (${country})
Check dashboard immediately`;

    // Send to all SMS recipients
    const promises = this.preferences.sms.recipients.map(phoneNumber =>
      this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber
      })
    );

    await Promise.all(promises);
    console.log(`✅ SMS sent to ${this.preferences.sms.recipients.length} recipient(s)`);
  }

  // ============================================
  // PHONE CALL NOTIFICATIONS (Twilio)
  // ============================================
  
  async makePhoneCall(alert) {
    if (!this.twilioClient) {
      throw new Error('Twilio not initialized');
    }

    const { severity, title, sourceIp } = alert;
    
    // TwiML for automated voice message
    const twiml = `
      <Response>
        <Say voice="alice">
          Critical security alert from Honeypot Observer.
          ${title}.
          Attack originated from I P address ${sourceIp.split('.').join(', ')}.
          Please check your dashboard immediately.
          Repeating message.
          ${title}.
          Attack from I P ${sourceIp.split('.').join(', ')}.
          End of message.
        </Say>
      </Response>
    `;

    // Make calls to all recipients
    const promises = this.preferences.phone.recipients.map(phoneNumber =>
      this.twilioClient.calls.create({
        twiml: twiml,
        from: this.twilioPhoneNumber,
        to: phoneNumber
      })
    );

    await Promise.all(promises);
    console.log(`✅ Phone calls initiated to ${this.preferences.phone.recipients.length} recipient(s)`);
  }

  // ============================================
  // SLACK NOTIFICATIONS
  // ============================================
  
  async sendSlack(alert) {
    if (!this.preferences.slack.webhookUrl) {
      throw new Error('Slack webhook not configured');
    }

    const { severity, title, description, sourceIp, country, timestamp, type } = alert;
    
    // Slack message with blocks for rich formatting
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🚨 ${severity.toUpperCase()} Security Alert`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${title}*\n${description}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Severity:*\n${severity.toUpperCase()}`
            },
            {
              type: "mrkdwn",
              text: `*Type:*\n${type || 'Unknown'}`
            },
            {
              type: "mrkdwn",
              text: `*Source IP:*\n${sourceIp}`
            },
            {
              type: "mrkdwn",
              text: `*Location:*\n${country || 'Unknown'}`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `⏰ ${timestamp}`
            }
          ]
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Dashboard"
              },
              url: "http://localhost:3001",
              style: severity === 'critical' ? 'danger' : 'primary'
            }
          ]
        }
      ]
    };

    await axios.post(this.preferences.slack.webhookUrl, slackMessage);
    console.log('✅ Slack notification sent');
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  getSeverityColor(severity) {
    const colors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };
    return colors[severity] || '#6c757d';
  }

  /**
   * Update notification preferences
   */
  updatePreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
    console.log('✅ Notification preferences updated');
  }

  /**
   * Test notification system
   */
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
      case 'email':
        return await this.sendEmail(testAlert);
      case 'sms':
        return await this.sendSMS(testAlert);
      case 'phone':
        return await this.makePhoneCall(testAlert);
      case 'slack':
        return await this.sendSlack(testAlert);
      default:
        return await this.sendAlert(testAlert);
    }
  }
}

// Export singleton instance
export default new NotificationService();