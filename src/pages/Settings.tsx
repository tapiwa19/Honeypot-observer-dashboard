import { UsersManagement } from '../components/UsersManagement';
import { NotificationsTab } from '../components/NotificationsTab'; 
import { useState, } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Database, 
  Shield, 
  User,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Upload,
  Plus,
  X,
  RotateCcw,
  Server,
  Clock
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'cowrie' | 'alerts' | 'notifications' | 'integrations' | 'backup'>('general');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);
  
  // General Settings State
  const [honeypotIP, setHoneypotIP] = useState('192.168.56.101');
  const [honeypotPort, setHoneypotPort] = useState('22');
  const [elasticsearchURL, setElasticsearchURL] = useState('http://localhost:9200');
  const [kibanaURL, setKibanaURL] = useState('http://localhost:5601');
  
  // Cowrie Configuration State
  const [sshPort, setSshPort] = useState('2222');
  const [hostname, setHostname] = useState('svr04');
  const [filesystemTemplate, setFilesystemTemplate] = useState('default');
  const [enabledServices, setEnabledServices] = useState({
    ssh: true,
    telnet: false,
    ftp: false,
    http: false
  });
  const [welcomeBanner, setWelcomeBanner] = useState('Ubuntu 20.04.3 LTS\nWelcome to the server');
  const [maxSessions, setMaxSessions] = useState('20');
  const [sessionTimeout, setSessionTimeout] = useState('3600');
  
  // Alert Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [highAlerts, setHighAlerts] = useState(true);
  const [mediumAlerts, setMediumAlerts] = useState(false);
  const [lowAlerts, setLowAlerts] = useState(false);
  const [alertEmail, setAlertEmail] = useState('admin@honeypot.local');
  
  // Integration Settings State
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [smtpServer, setSmtpServer] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [customWebhooks, setCustomWebhooks] = useState([
    { id: 1, name: 'Security Team Webhook', url: 'https://hooks.example.com/security', enabled: true }
  ]);
  
  // Backup State
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [backupHistory] = useState([
    { id: 1, date: '2025-01-27 14:30', size: '245 MB', status: 'success' },
    { id: 2, date: '2025-01-26 14:30', size: '238 MB', status: 'success' },
    { id: 3, date: '2025-01-25 14:30', size: '232 MB', status: 'success' }
  ]);
  
  // Security Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [retentionDays, setRetentionDays] = useState('90');
  const [autoArchive, setAutoArchive] = useState(true);

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSaveSettings = (section: string) => {
    showToastMessage(`${section} settings saved successfully!`, 'success');
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all Cowrie settings to defaults?')) {
      setSshPort('2222');
      setHostname('svr04');
      setFilesystemTemplate('default');
      setEnabledServices({ ssh: true, telnet: false, ftp: false, http: false });
      setWelcomeBanner('Ubuntu 20.04.3 LTS\nWelcome to the server');
      setMaxSessions('20');
      setSessionTimeout('3600');
      showToastMessage('Settings reset to defaults', 'success');
    }
  };

  const handleTestIntegration = (service: string) => {
    showToastMessage(`Testing ${service} connection...`, 'success');
    setTimeout(() => {
      showToastMessage(`${service} connection successful!`, 'success');
    }, 1500);
  };

  const addWebhook = () => {
    const newWebhook = {
      id: customWebhooks.length + 1,
      name: 'New Webhook',
      url: '',
      enabled: false
    };
    setCustomWebhooks([...customWebhooks, newWebhook]);
  };

  const removeWebhook = (id: number) => {
    setCustomWebhooks(customWebhooks.filter(w => w.id !== id));
  };

  const handleCreateBackup = () => {
    showToastMessage('Creating backup...', 'success');
    setTimeout(() => {
      showToastMessage('Backup created successfully!', 'success');
    }, 2000);
  };

  const handleDownloadBackup = (id: number) => {
    showToastMessage(`Downloading backup #${id}...`, 'success');
  };

  const handleRestoreBackup = (id: number) => {
    if (confirm('Restore from this backup? Current data will be overwritten.')) {
      showToastMessage(`Restoring from backup #${id}...`, 'success');
      setTimeout(() => {
        showToastMessage('Backup restored successfully!', 'success');
      }, 2000);
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        showToastMessage(`Importing configuration from ${file.name}...`, 'success');
        setTimeout(() => {
          showToastMessage('Configuration imported successfully!', 'success');
        }, 1500);
      }
    };
    input.click();
  };

  const handleExportConfig = () => {
    const config = {
      general: { honeypotIP, honeypotPort, elasticsearchURL, kibanaURL },
      cowrie: { sshPort, hostname, filesystemTemplate, enabledServices, welcomeBanner, maxSessions, sessionTimeout },
      alerts: { alertEmail, emailNotifications, criticalAlerts, highAlerts, mediumAlerts, lowAlerts },
      integrations: { slackWebhook, slackEnabled, smtpServer, smtpPort, customWebhooks }
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `honeypot-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToastMessage('Configuration exported!', 'success');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      showToastMessage('Passwords do not match!', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToastMessage('Password must be at least 8 characters!', 'error');
      return;
    }
    showToastMessage('Password changed successfully!', 'success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <div className={`${
            toastType === 'error' 
              ? 'bg-red-500/20 border border-red-500 text-red-400' 
              : 'bg-green-500/20 border border-green-500 text-green-400'
          } px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3`}>
            <CheckCircle className="w-6 h-6" />
            <div>
              <div className="font-bold">{toastType === 'error' ? 'Error' : 'Success'}!</div>
              <div className="text-sm opacity-90">{toastMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Settings</h1>
          <p className="text-gray-400 mt-1">Configure your honeypot observer system</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportConfig}
            className="px-4 py-2 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6] rounded-lg hover:bg-[#8B5CF6]/30 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Config
          </button>
          <button 
            onClick={() => handleSaveSettings('All')}
            className="px-6 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white font-bold rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700">
        <div className="border-b border-gray-700 px-6 py-3 flex gap-2 overflow-x-auto">
         {(['general', 'users', 'cowrie', 'alerts', 'notifications', 'integrations', 'backup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30'
                  : 'text-gray-400 hover:bg-gray-700/30'
              }`}
            >
              {tab === 'general' && <SettingsIcon className="w-4 h-4 inline mr-2" />}
              {tab === 'users' && <User className="w-4 h-4 inline mr-2" />}
              {tab === 'cowrie' && <Server className="w-4 h-4 inline mr-2" />}
              {tab === 'alerts' && <Bell className="w-4 h-4 inline mr-2" />}
              {tab === 'notifications' && <Bell className="w-4 h-4 inline mr-2" />}
              {tab === 'integrations' && <Database className="w-4 h-4 inline mr-2" />}
              {tab === 'backup' && <Download className="w-4 h-4 inline mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Honeypot Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Honeypot IP Address</label>
                    <input
                      type="text"
                      value={honeypotIP}
                      onChange={(e) => setHoneypotIP(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">SSH Port</label>
                    <input
                      type="text"
                      value={honeypotPort}
                      onChange={(e) => setHoneypotPort(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-white mb-4">ELK Stack Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Elasticsearch URL</label>
                    <input
                      type="text"
                      value={elasticsearchURL}
                      onChange={(e) => setElasticsearchURL(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Kibana URL</label>
                    <input
                      type="text"
                      value={kibanaURL}
                      onChange={(e) => setKibanaURL(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-white mb-4">Data Retention</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Keep Data For (Days)</label>
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="180">180 Days</option>
                      <option value="365">1 Year</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoArchive}
                        onChange={(e) => setAutoArchive(e.target.checked)}
                        className="w-5 h-5 accent-[#00D9FF]"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-400">Auto-archive old data</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleSaveSettings('General')}
                  className="px-6 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
          {/* Users Management Tab */}
{activeTab === 'users' && (
  <UsersManagement />
)}
          {/* Cowrie Configuration Tab */}
          {activeTab === 'cowrie' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Cowrie Honeypot Configuration</h2>
                <button
                  onClick={handleResetDefaults}
                  className="px-4 py-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-700/70 transition flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">SSH Port</label>
                  <input
                    type="text"
                    value={sshPort}
                    onChange={(e) => setSshPort(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Hostname</label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Filesystem Template</label>
                  <select
                    value={filesystemTemplate}
                    onChange={(e) => setFilesystemTemplate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  >
                    <option value="default">Default (Ubuntu 20.04)</option>
                    <option value="debian">Debian 11</option>
                    <option value="centos">CentOS 7</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Max Concurrent Sessions</label>
                  <input
                    type="number"
                    value={maxSessions}
                    onChange={(e) => setMaxSessions(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Session Timeout (seconds)</label>
                  <input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Enabled Services</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(enabledServices).map(([service, enabled]) => (
                    <label key={service} className="flex items-center gap-2 p-3 bg-gray-900/60 rounded-lg cursor-pointer hover:bg-gray-700/30">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabledServices({...enabledServices, [service]: e.target.checked})}
                        className="w-4 h-4 accent-[#00D9FF]"
                      />
                      <span className="text-sm font-medium capitalize text-gray-400">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Welcome Banner</label>
                <textarea
                  value={welcomeBanner}
                  onChange={(e) => setWelcomeBanner(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF] font-mono text-sm"
                  placeholder="Enter custom welcome banner..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleSaveSettings('Cowrie')}
                  className="px-6 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80 transition"
                >
                  Save Cowrie Settings
                </button>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Email Notifications</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Alert Email Address</label>
                    <input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-700">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-5 h-5 accent-[#00D9FF]"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-400">Enable Email Notifications</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-bold text-white mb-4">Alert Severity Levels</h2>
                <div className="space-y-3">
                  {[
                    { key: 'critical', state: criticalAlerts, setState: setCriticalAlerts, color: 'red', label: 'Critical Alerts', desc: 'Immediate attention required' },
                    { key: 'high', state: highAlerts, setState: setHighAlerts, color: 'orange', label: 'High Alerts', desc: 'Prompt action needed' },
                    { key: 'medium', state: mediumAlerts, setState: setMediumAlerts, color: 'yellow', label: 'Medium Alerts', desc: 'Review when convenient' },
                    { key: 'low', state: lowAlerts, setState: setLowAlerts, color: 'green', label: 'Low Alerts', desc: 'Informational only' }
                  ].map(alert => (
                    <div key={alert.key} className={`flex items-center justify-between p-4 bg-${alert.color}-500/10 rounded-lg border border-${alert.color}-500/30`}>
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 text-${alert.color}-400`} />
                        <div>
                          <div className={`font-bold text-white`}>{alert.label}</div>
                          <div className={`text-sm text-${alert.color}-400`}>{alert.desc}</div>
                        </div>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.state}
                          onChange={(e) => alert.setState(e.target.checked)}
                          className="w-5 h-5 accent-[#00D9FF]"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleSaveSettings('Alert')}
                  className="px-6 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80 transition"
                >
                  Save Alert Settings
                </button>
              </div>
            </div>
          )}
          {/* Notifications Tab */}
           {activeTab === 'notifications' && (
            <NotificationsTab />
             )}


          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              {/* Slack Integration */}
              <div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                      S
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Slack Integration</h3>
                      <p className="text-sm text-gray-400">Send alerts to Slack channels</p>
                    </div>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackEnabled}
                      onChange={(e) => setSlackEnabled(e.target.checked)}
                      className="w-5 h-5 accent-[#00D9FF]"
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                  <button
                    onClick={() => handleTestIntegration('Slack')}
                    className="px-4 py-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition text-sm"
                  >
                    Test Connection
                  </button>
                </div>
              </div>

              {/* Email/SMTP Integration */}
              <div className="bg-gray-900/60 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                    @
                  </div>
                  <div>
                    <h3 className="font-bold text-white">SMTP Configuration</h3>
                    <p className="text-sm text-gray-400">Email notification settings</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                    placeholder="SMTP Server"
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="Port"
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                  <input
                    type="text"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="Username"
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="Password"
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  />
                </div>
                <button
                  onClick={() => handleTestIntegration('SMTP')}
                  className="mt-3 px-4 py-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition text-sm"
                >
                  Test SMTP Connection
                </button>
              </div>

              {/* Custom Webhooks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Custom Webhooks</h3>
                  <button
                    onClick={addWebhook}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Webhook
                  </button>
                </div>
                <div className="space-y-3">
                  {customWebhooks.map((webhook) => (
                    <div key={webhook.id} className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="text"
                          value={webhook.name}
                          onChange={(e) => {
                            const updated = customWebhooks.map(w => 
                              w.id === webhook.id ? {...w, name: e.target.value} : w
                            );
                            setCustomWebhooks(updated);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                          placeholder="Webhook Name"
                        />
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhook.enabled}
                            onChange={(e) => {
                              const updated = customWebhooks.map(w => 
                                w.id === webhook.id ? {...w, enabled: e.target.checked} : w
                              );
                              setCustomWebhooks(updated);
                            }}
                            className="w-5 h-5 accent-[#00D9FF]"
                          />
                        </label>
                        <button
                          onClick={() => removeWebhook(webhook.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={webhook.url}
                        onChange={(e) => {
                          const updated = customWebhooks.map(w => 
                            w.id === webhook.id ? {...w, url: e.target.value} : w
                          );
                          setCustomWebhooks(updated);
                        }}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                        placeholder="https://your-webhook-url.com/endpoint"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleSaveSettings('Integration')}
                  className="px-6 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80 transition"
                >
                  Save Integration Settings
                </button>
              </div>
            </div>
          )}

          {/* Backup & Restore Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Backup Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <Download className="w-8 h-8 mb-3 opacity-80" />
                  <h3 className="font-bold text-lg mb-2">Create Backup</h3>
                  <p className="text-sm opacity-90 mb-4">Backup all data and settings</p>
                  <button 
                    onClick={handleCreateBackup}
                    className="w-full px-4 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition text-sm"
                  >
                    Create Backup Now
                  </button>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <Upload className="w-8 h-8 mb-3 opacity-80" />
                  <h3 className="font-bold text-lg mb-2">Import Config</h3>
                  <p className="text-sm opacity-90 mb-4">Load configuration from file</p>
                  <button 
                    onClick={handleImportConfig}
                    className="w-full px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition text-sm"
                  >
                    Import Configuration
                  </button>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <Database className="w-8 h-8 mb-3 opacity-80" />
                  <h3 className="font-bold text-lg mb-2">Export Config</h3>
                  <p className="text-sm opacity-90 mb-4">Download current settings</p>
                  <button 
                    onClick={handleExportConfig}
                    className="w-full px-4 py-2 bg-white text-green-600 font-bold rounded-lg hover:bg-green-50 transition text-sm"
                  >
                    Export as JSON
                  </button>
                </div>
              </div>

              {/* Scheduled Backups */}
              <div className="bg-gray-800/90 rounded-lg border border-gray-700 p-6">
                <h3 className="font-bold text-white mb-4">Scheduled Backups</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={autoBackup}
                        onChange={(e) => setAutoBackup(e.target.checked)}
                        className="w-5 h-5 accent-[#00D9FF]"
                      />
                      <span className="text-sm font-medium text-gray-400">Enable Automatic Backups</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Backup Frequency</label>
                    <select
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value)}
                      disabled={!autoBackup}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF] disabled:opacity-50"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Backup History */}
              <div>
                <h3 className="font-bold text-white mb-4">Backup History</h3>
                <div className="bg-gray-800/90 rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-900/60 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {backupHistory.map((backup) => (
                        <tr key={backup.id} className="hover:bg-gray-700/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-white">{backup.date}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {backup.size}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              <CheckCircle className="w-3 h-3" />
                              {backup.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownloadBackup(backup.id)}
                                className="px-3 py-1 bg-[#00D9FF] text-white text-xs rounded-lg hover:bg-[#00D9FF]/80 transition flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </button>
                              <button
                                onClick={() => handleRestoreBackup(backup.id)}
                                className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Restore
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Backup Info */}
              <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white mb-1">Backup Information</h3>
                    <ul className="text-sm text-blue-400 space-y-1">
                      <li>• Backups include all attack data, sessions, configurations, and settings</li>
                      <li>• Automated backups run at midnight UTC</li>
                      <li>• Backups are stored locally and can be downloaded anytime</li>
                      <li>• Restore operation will overwrite current data</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Section - Always Visible */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Change Password */}
          <div>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF] pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <button
                onClick={handleChangePassword}
                className="w-full px-6 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80 transition"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Danger Zone
            </h3>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">Clear All Data</h4>
                  <p className="text-sm text-red-400 mb-3">
                    This will permanently delete all captured attack data, sessions, and logs. This action cannot be undone.
                  </p>
                  <button 
                    onClick={() => {
                      if (confirm('⚠️ Are you absolutely sure? Type "DELETE" to confirm.') && 
                          prompt('Type DELETE to confirm:') === 'DELETE') {
                        showToastMessage('All data cleared successfully!', 'success');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-sm"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}