// ============================================
// NOTIFICATIONS TAB COMPONENT
// ============================================
import { useState, useEffect } from 'react';
import {
  Mail,
  Webhook,
  Check,
  X,
  TestTube,
  Save,
  Eye,
  EyeOff,
  Bell,
  Smartphone
} from 'lucide-react';
import axios from 'axios';

export function NotificationsTab() {
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'email' | 'ntfy' | 'slack'>('email');

  // Email Settings
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [emailRecipients, setEmailRecipients] = useState<string[]>(['']);
  const [emailSeverities, setEmailSeverities] = useState(['critical', 'high']);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Ntfy Settings
  const [ntfyEnabled, setNtfyEnabled] = useState(false);
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [ntfySeverities, setNtfySeverities] = useState(['critical']);

  // Slack Settings
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/notifications/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { preferences, services } = response.data;

      if (preferences.email) {
        setEmailEnabled(services.email);
        setEmailRecipients(preferences.email.recipients.length > 0 ? preferences.email.recipients : ['']);
        setEmailSeverities(preferences.email.severityThresholds);
      }

      if (preferences.ntfy) {
        setNtfyEnabled(services.ntfy);
        setNtfyTopic(preferences.ntfy.topic || '');
        setNtfySeverities(preferences.ntfy.severityThresholds || ['critical']);
      }

      if (preferences.slack) {
        setSlackEnabled(services.slack);
        setSlackWebhook(preferences.slack.webhookUrl);
      }
    } catch (error) {
      console.error('Error loading notification config:', error);
    }
  };

  const saveEmailConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/notifications/config/email`,
        {
          smtpHost, smtpPort, smtpUser, smtpPassword,
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveNtfyConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/notifications/config/ntfy`,
        { topic: ntfyTopic, severityThresholds: ntfySeverities },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('✅ Ntfy configuration saved successfully!');
        setNtfyEnabled(true);
      } else {
        alert('❌ Failed to save Ntfy configuration');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSlackConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/notifications/config/slack`,
        { webhookUrl: slackWebhook },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('✅ Slack configuration saved successfully!');
        setSlackEnabled(true);
      } else {
        alert('❌ Failed to save Slack configuration');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(`❌ Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async (channel: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/notifications/test/${channel}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`✅ Test ${channel} notification sent!`);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(`❌ Test failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addEmailRecipient = () => setEmailRecipients([...emailRecipients, '']);
  const removeEmailRecipient = (index: number) => setEmailRecipients(emailRecipients.filter((_, i) => i !== index));
  const updateEmailRecipient = (index: number, value: string) => {
    const updated = [...emailRecipients];
    updated[index] = value;
    setEmailRecipients(updated);
  };

  const toggleEmailSeverity = (severity: string) => {
    setEmailSeverities(prev =>
      prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
    );
  };

  const toggleNtfySeverity = (severity: string) => {
    setNtfySeverities(prev =>
      prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
    );
  };

  const severityOptions = [
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'low', label: 'Low', color: 'green' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notification Channels</h2>
        <p className="text-gray-400">Configure email, push notifications, and Slack alerts</p>
      </div>

      {/* Channel Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'email', label: 'Email', icon: Mail, enabled: emailEnabled, color: 'blue' },
          { id: 'ntfy', label: 'Ntfy Push', icon: Smartphone, enabled: ntfyEnabled, color: 'green' },
          { id: 'slack', label: 'Slack', icon: Webhook, enabled: slackEnabled, color: 'purple' }
        ].map(channel => (
          <button
            key={channel.id}
            onClick={() => setActiveSubTab(channel.id as 'email' | 'ntfy' | 'slack')}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Gmail, Outlook, or custom SMTP</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">SMTP Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">587 (TLS) or 465 (SSL)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password / App Password</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Recipients</label>
              {emailRecipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => updateEmailRecipient(index, e.target.value)}
                    placeholder="admin@example.com"
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  {emailRecipients.length > 1 && (
                    <button
                      onClick={() => removeEmailRecipient(index)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addEmailRecipient} className="text-sm text-blue-400 hover:text-blue-300">
                + Add another recipient
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Send emails for these severity levels:</label>
              <div className="grid grid-cols-4 gap-2">
                {severityOptions.map(severity => (
                  <button
                    key={severity.value}
                    onClick={() => toggleEmailSeverity(severity.value)}
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

      {/* Ntfy Configuration */}
      {activeSubTab === 'ntfy' && (
        <div className="bg-gray-800/90 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Ntfy Push Notifications</h3>
                <p className="text-sm text-gray-400">Instant phone & browser alerts — free, no account needed</p>
              </div>
            </div>
            <button
              onClick={() => testNotification('ntfy')}
              disabled={loading || !ntfyEnabled}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4" />
              Test Ntfy
            </button>
          </div>

          <div className="space-y-4">
            {/* How it works */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-white mb-2">How Ntfy works</h4>
                  <ol className="text-sm text-green-400 space-y-1 list-decimal list-inside">
                    <li>Choose any unique topic name below (e.g. <span className="font-mono">honeypot-observer-alerts</span>)</li>
                    <li>Install the free <span className="font-semibold">Ntfy</span> app on your phone (Android / iOS)</li>
                    <li>Subscribe to <span className="font-mono">ntfy.sh/your-topic-name</span> in the app</li>
                    <li>You'll receive instant push alerts whenever an attack is detected</li>
                  </ol>
                  <p className="text-xs text-gray-400 mt-2">
                    No account, no API key, completely free. Anyone subscribed to your topic receives the alerts.
                  </p>
                </div>
              </div>
            </div>

            {/* Topic input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Ntfy Topic Name</label>
              <input
                type="text"
                value={ntfyTopic}
                onChange={(e) => setNtfyTopic(e.target.value)}
                placeholder="honeypot-observer-alerts"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Subscribe to{' '}
                <span className="text-green-400 font-mono">
                  ntfy.sh/{ntfyTopic || 'your-topic-name'}
                </span>{' '}
                in the Ntfy app to receive alerts
              </p>
            </div>

            {/* Severity selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Send push alerts for these severity levels:</label>
              <div className="grid grid-cols-4 gap-2">
                {severityOptions.map(severity => (
                  <button
                    key={severity.value}
                    onClick={() => toggleNtfySeverity(severity.value)}
                    className={`px-4 py-3 rounded-lg font-bold transition border-2 ${
                      ntfySeverities.includes(severity.value)
                        ? `bg-${severity.color}-500/20 text-${severity.color}-400 border-${severity.color}-500`
                        : 'bg-gray-700/30 text-gray-500 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {ntfySeverities.includes(severity.value) && <Check className="w-4 h-4 inline mr-1" />}
                    {severity.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-yellow-400 mt-2">
                💡 Recommended: Critical only, to avoid notification fatigue
              </p>
            </div>

            <button
              onClick={saveNtfyConfig}
              disabled={loading || !ntfyTopic.trim()}
              className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Ntfy Configuration'}
            </button>
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
                <p className="text-sm text-gray-400">Post alerts to a Slack channel</p>
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
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="font-bold text-white mb-2">How to get a Slack Webhook URL:</h4>
              <ol className="text-sm text-purple-400 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://api.slack.com/messaging/webhooks" target="_blank" className="underline">api.slack.com/messaging/webhooks</a></li>
                <li>Create a new Incoming Webhook</li>
                <li>Choose your channel (e.g. #security-alerts)</li>
                <li>Copy the Webhook URL and paste below</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Slack Webhook URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX"
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