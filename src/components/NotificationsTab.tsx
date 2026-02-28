// ============================================
// NOTIFICATIONS TAB COMPONENT
// Add this to your Settings.tsx
// ============================================
import { useState, useEffect } from 'react';
import { 
  Mail, 
  MessageSquare,  
  Webhook,
  Check,
  X,
  AlertTriangle,
  TestTube,
  Save,
  Eye,
  EyeOff,
  PhoneCall,
  Bell
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

export function NotificationsTab() {
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'email' | 'sms' | 'phone' | 'slack'>('email');
  
  // Email Settings
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [emailRecipients, setEmailRecipients] = useState<string[]>(['']);
  const [emailSeverities, setEmailSeverities] = useState(['critical', 'high']);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  
  // SMS Settings
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
  const [smsRecipients, setSmsRecipients] = useState<string[]>(['']);
  const [smsSeverities, setSmsSeverities] = useState(['critical']);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  
  // Phone Call Settings
  const [phoneEnabled, setPhoneEnabled] = useState(false);
  const [phoneRecipients, setPhoneRecipients] = useState<string[]>(['']);
  const [phoneSeverities, setPhoneSeverities] = useState(['critical']);
  
  // Slack Settings
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');

  // Load existing configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/notifications/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { preferences, services } = response.data;
      
      // Set email config
      if (preferences.email) {
        setEmailEnabled(services.email);
        setEmailRecipients(preferences.email.recipients.length > 0 ? preferences.email.recipients : ['']);
        setEmailSeverities(preferences.email.severityThresholds);
      }
      
      // Set SMS config
      if (preferences.sms) {
        setSmsEnabled(services.sms);
        setSmsRecipients(preferences.sms.recipients.length > 0 ? preferences.sms.recipients : ['']);
        setSmsSeverities(preferences.sms.severityThresholds);
      }
      
      // Set phone config
      if (preferences.phone) {
        setPhoneEnabled(services.phone);
        setPhoneRecipients(preferences.phone.recipients.length > 0 ? preferences.phone.recipients : ['']);
        setPhoneSeverities(preferences.phone.severityThresholds);
      }
      
      // Set Slack config
      if (preferences.slack) {
        setSlackEnabled(services.slack);
        setSlackWebhook(preferences.slack.webhookUrl);
      }
    } catch (error) {
      console.error('Error loading notification config:', error);
    }
  };

  // Save email configuration
  const saveEmailConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/notifications/config/email`,
        {
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword,
          recipients: emailRecipients.filter(r => r.trim()),
          severityThresholds: emailSeverities
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('✅ Email configuration saved successfully!');
        setEmailEnabled(true);
      } else {
        alert('❌ Failed to save email configuration');
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save Twilio configuration
  const saveTwilioConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/notifications/config/twilio`,
        {
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          phoneNumber: twilioPhoneNumber,
          smsRecipients: smsRecipients.filter(r => r.trim()),
          callRecipients: phoneRecipients.filter(r => r.trim()),
          smsSeverityThresholds: smsSeverities,
          phoneSeverityThresholds: phoneSeverities
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('✅ Twilio configuration saved successfully!');
        setSmsEnabled(true);
        setPhoneEnabled(true);
      } else {
        alert('❌ Failed to save Twilio configuration');
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save Slack configuration
  const saveSlackConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/notifications/config/slack`,
        { webhookUrl: slackWebhook },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('✅ Slack configuration saved successfully!');
        setSlackEnabled(true);
      } else {
        alert('❌ Failed to save Slack configuration');
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test notification
  const testNotification = async (channel: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/notifications/test/${channel}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert(`✅ Test ${channel} notification sent! Check your ${channel}.`);
      }
    } catch (error: any) {
      alert(`❌ Test failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for managing recipient lists
  const addRecipient = (type: 'email' | 'sms' | 'phone') => {
    if (type === 'email') setEmailRecipients([...emailRecipients, '']);
    if (type === 'sms') setSmsRecipients([...smsRecipients, '']);
    if (type === 'phone') setPhoneRecipients([...phoneRecipients, '']);
  };

  const removeRecipient = (type: 'email' | 'sms' | 'phone', index: number) => {
    if (type === 'email') setEmailRecipients(emailRecipients.filter((_, i) => i !== index));
    if (type === 'sms') setSmsRecipients(smsRecipients.filter((_, i) => i !== index));
    if (type === 'phone') setPhoneRecipients(phoneRecipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (type: 'email' | 'sms' | 'phone', index: number, value: string) => {
    if (type === 'email') {
      const updated = [...emailRecipients];
      updated[index] = value;
      setEmailRecipients(updated);
    }
    if (type === 'sms') {
      const updated = [...smsRecipients];
      updated[index] = value;
      setSmsRecipients(updated);
    }
    if (type === 'phone') {
      const updated = [...phoneRecipients];
      updated[index] = value;
      setPhoneRecipients(updated);
    }
  };

  // Severity toggle helper
  const toggleSeverity = (type: 'email' | 'sms' | 'phone', severity: string) => {
    if (type === 'email') {
      setEmailSeverities(prev => 
        prev.includes(severity) 
          ? prev.filter(s => s !== severity)
          : [...prev, severity]
      );
    }
    if (type === 'sms') {
      setSmsSeverities(prev => 
        prev.includes(severity) 
          ? prev.filter(s => s !== severity)
          : [...prev, severity]
      );
    }
    if (type === 'phone') {
      setPhoneSeverities(prev => 
        prev.includes(severity) 
          ? prev.filter(s => s !== severity)
          : [...prev, severity]
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notification Channels</h2>
        <p className="text-gray-400">Configure email, SMS, phone calls, and Slack alerts</p>
      </div>

      {/* Channel Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { id: 'email', label: 'Email', icon: Mail, enabled: emailEnabled, color: 'blue' },
          { id: 'sms', label: 'SMS', icon: MessageSquare, enabled: smsEnabled, color: 'green' },
          { id: 'phone', label: 'Phone', icon: PhoneCall, enabled: phoneEnabled, color: 'orange' },
          { id: 'slack', label: 'Slack', icon: Webhook, enabled: slackEnabled, color: 'purple' }
        ].map(channel => (
          <button
            key={channel.id}
            onClick={() => setActiveSubTab(channel.id as any)}
            className={`p-4 rounded-lg border-2 transition ${
              activeSubTab === channel.id
                ? `border-${channel.color}-500 bg-${channel.color}-500/10`
                : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <channel.icon className={`w-6 h-6 text-${channel.color}-400`} />
              {channel.enabled && (
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="text-left">
              <div className="font-bold text-white">{channel.label}</div>
              <div className={`text-xs ${channel.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                {channel.enabled ? 'Active' : 'Not configured'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Email Configuration */}
      {activeSubTab === 'email' && (
        <div className="bg-gray-800/90 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Email Notifications</h3>
                <p className="text-sm text-gray-400">Configure SMTP settings for email alerts</p>
              </div>
            </div>
            <button
              onClick={() => testNotification('email')}
              disabled={loading || !emailEnabled}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              Test Email
            </button>
          </div>

          <div className="space-y-4">
            {/* SMTP Server Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Gmail, Outlook, or custom SMTP server</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  SMTP Port
                </label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Usually 587 (TLS) or 465 (SSL)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showEmailPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" className="text-blue-400 hover:underline">
                    Create Gmail App Password
                  </a>
                </p>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Recipients
              </label>
              {emailRecipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => updateRecipient('email', index, e.target.value)}
                    placeholder="admin@example.com"
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  {emailRecipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient('email', index)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addRecipient('email')}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                + Add another recipient
              </button>
            </div>

            {/* Severity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Send emails for these severity levels:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'critical', label: 'Critical', color: 'red' },
                  { value: 'high', label: 'High', color: 'orange' },
                  { value: 'medium', label: 'Medium', color: 'yellow' },
                  { value: 'low', label: 'Low', color: 'green' }
                ].map(severity => (
                  <button
                    key={severity.value}
                    onClick={() => toggleSeverity('email', severity.value)}
                    className={`px-4 py-3 rounded-lg font-bold transition border-2 ${
                      emailSeverities.includes(severity.value)
                        ? `bg-${severity.color}-500/20 text-${severity.color}-400 border-${severity.color}-500`
                        : 'bg-gray-700/30 text-gray-500 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {emailSeverities.includes(severity.value) && <Check className="w-4 h-4 inline mr-1" />}
                    {severity.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveEmailConfig}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Email Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* SMS Configuration */}
      {activeSubTab === 'sms' && (
        <div className="bg-gray-800/90 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-white">SMS Notifications</h3>
                <p className="text-sm text-gray-400">Configure Twilio for SMS alerts</p>
              </div>
            </div>
            <button
              onClick={() => testNotification('sms')}
              disabled={loading || !smsEnabled}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              Test SMS
            </button>
          </div>

          <div className="space-y-4">
            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Get Free Twilio Account</h4>
                  <p className="text-sm text-blue-400 mb-2">
                    Sign up at <a href="https://www.twilio.com/try-twilio" target="_blank" className="underline">twilio.com/try-twilio</a> for free credits
                  </p>
                  <p className="text-xs text-gray-400">
                    You'll get a free phone number and $15 credit to send SMS and make calls
                  </p>
                </div>
              </div>
            </div>

            {/* Twilio Credentials */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Twilio Account SID
                </label>
                <input
                  type="text"
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Twilio Auth Token
                </label>
                <div className="relative">
                  <input
                    type={showTwilioToken ? 'text' : 'password'}
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 font-mono text-sm pr-10"
                  />
                  <button
                    onClick={() => setShowTwilioToken(!showTwilioToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showTwilioToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Twilio Phone Number
                </label>
                <input
                  type="text"
                  value={twilioPhoneNumber}
                  onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code, e.g., +1 for US</p>
              </div>
            </div>

            {/* SMS Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                SMS Recipients
              </label>
              {smsRecipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="tel"
                    value={recipient}
                    onChange={(e) => updateRecipient('sms', index, e.target.value)}
                    placeholder="+1234567890"
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                  {smsRecipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient('sms', index)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addRecipient('sms')}
                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                + Add another number
              </button>
            </div>

            {/* Severity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Send SMS for these severity levels:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'critical', label: 'Critical', color: 'red' },
                  { value: 'high', label: 'High', color: 'orange' },
                  { value: 'medium', label: 'Medium', color: 'yellow' },
                  { value: 'low', label: 'Low', color: 'green' }
                ].map(severity => (
                  <button
                    key={severity.value}
                    onClick={() => toggleSeverity('sms', severity.value)}
                    className={`px-4 py-3 rounded-lg font-bold transition border-2 ${
                      smsSeverities.includes(severity.value)
                        ? `bg-${severity.color}-500/20 text-${severity.color}-400 border-${severity.color}-500`
                        : 'bg-gray-700/30 text-gray-500 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {smsSeverities.includes(severity.value) && <Check className="w-4 h-4 inline mr-1" />}
                    {severity.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-yellow-400 mt-2">
                💡 Recommended: Only enable Critical/High to avoid SMS costs
              </p>
            </div>

            <button
              onClick={saveTwilioConfig}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Twilio Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Phone Call Configuration */}
      {activeSubTab === 'phone' && (
        <div className="bg-gray-800/90 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-6 h-6 text-orange-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Phone Call Alerts</h3>
                <p className="text-sm text-gray-400">Automated voice calls for critical alerts</p>
              </div>
            </div>
            <button
              onClick={() => testNotification('phone')}
              disabled={loading || !phoneEnabled}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              Test Call
            </button>
          </div>

          <div className="space-y-4">
            {/* Warning */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Phone calls use same Twilio account as SMS</h4>
                  <p className="text-sm text-orange-400">
                    Configure your Twilio credentials in the SMS tab first, then set up phone call recipients here
                  </p>
                </div>
              </div>
            </div>

            {!smsEnabled && (
              <div className="text-center py-8">
                <PhoneCall className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">Configure Twilio in SMS tab first</p>
                <button
                  onClick={() => setActiveSubTab('sms')}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  Go to SMS Configuration
                </button>
              </div>
            )}

            {smsEnabled && (
              <>
                {/* Phone Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Call Recipients
                  </label>
                  {phoneRecipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="tel"
                        value={recipient}
                        onChange={(e) => updateRecipient('phone', index, e.target.value)}
                        placeholder="+1234567890"
                        className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      />
                      {phoneRecipients.length > 1 && (
                        <button
                          onClick={() => removeRecipient('phone', index)}
                          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addRecipient('phone')}
                    className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    + Add another number
                  </button>
                </div>

                {/* Severity Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Make calls for these severity levels:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'critical', label: 'Critical', color: 'red' },
                      { value: 'high', label: 'High', color: 'orange' },
                      { value: 'medium', label: 'Medium', color: 'yellow' },
                      { value: 'low', label: 'Low', color: 'green' }
                    ].map(severity => (
                      <button
                        key={severity.value}
                        onClick={() => toggleSeverity('phone', severity.value)}
                        className={`px-4 py-3 rounded-lg font-bold transition border-2 ${
                          phoneSeverities.includes(severity.value)
                            ? `bg-${severity.color}-500/20 text-${severity.color}-400 border-${severity.color}-500`
                            : 'bg-gray-700/30 text-gray-500 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {phoneSeverities.includes(severity.value) && <Check className="w-4 h-4 inline mr-1" />}
                        {severity.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-red-400 mt-2">
                    ⚠️ CRITICAL ONLY recommended - Phone calls are expensive!
                  </p>
                </div>

                <button
                  onClick={saveTwilioConfig}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Saving...' : 'Save Phone Configuration'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Slack Configuration */}
      {activeSubTab === 'slack' && (
        <div className="bg-gray-800/90 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Webhook className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Slack Integration</h3>
                <p className="text-sm text-gray-400">Post alerts to Slack channels</p>
              </div>
            </div>
            <button
              onClick={() => testNotification('slack')}
              disabled={loading || !slackEnabled}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              Test Slack
            </button>
          </div>

          <div className="space-y-4">
            {/* Setup Instructions */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="font-bold text-white mb-2">How to get Slack Webhook URL:</h4>
              <ol className="text-sm text-purple-400 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://api.slack.com/messaging/webhooks" target="_blank" className="underline">api.slack.com/messaging/webhooks</a></li>
                <li>Create a new Incoming Webhook</li>
                <li>Choose your channel (e.g., #security-alerts)</li>
                <li>Copy the Webhook URL and paste below</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Slack Webhook URL
              </label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 font-mono text-sm"
              />
            </div>

            <button
              onClick={saveSlackConfig}
              disabled={loading}
              className="w-full px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Slack Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
