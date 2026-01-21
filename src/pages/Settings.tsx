import { useState } from 'react';
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
  EyeOff
} from 'lucide-react';

export function Settings() {
  // State for different settings sections
  const [activeTab, setActiveTab] = useState<'general' | 'alerts' | 'integrations' | 'security'>('general');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // General Settings State
  const [honeypotIP, setHoneypotIP] = useState('192.168.1.100');
  const [honeypotPort, setHoneypotPort] = useState('22');
  const [elasticsearchURL, setElasticsearchURL] = useState('http://localhost:9200');
  const [kibanaURL, setKibanaURL] = useState('http://localhost:5601');
  
  // Alert Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [highAlerts, setHighAlerts] = useState(true);
  const [mediumAlerts, setMediumAlerts] = useState(false);
  const [lowAlerts, setLowAlerts] = useState(false);
  const [alertEmail, setAlertEmail] = useState('admin@honeypot.local');
  
  // Data Retention Settings
  const [retentionDays, setRetentionDays] = useState('90');
  const [autoArchive, setAutoArchive] = useState(true);
  
  // Security Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Integration Status
  const [integrationStatus] = useState({
    cowrie: { status: 'connected', lastSync: '2 minutes ago' },
    elasticsearch: { status: 'connected', lastSync: '1 minute ago' },
    kibana: { status: 'connected', lastSync: '3 minutes ago' },
    logstash: { status: 'connected', lastSync: '1 minute ago' }
  });

  // Save Settings Handler
  const handleSaveSettings = (section: string) => {
    // In real app, this would save to backend
    setToastMessage(`${section} settings saved successfully!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    console.log('Saving settings:', { section });
  };

  // Test Connection Handler
  const handleTestConnection = (service: string) => {
    setToastMessage(`Testing connection to ${service}...`);
    setShowToast(true);
    setTimeout(() => {
      setToastMessage(`${service} connection successful!`);
      setTimeout(() => setShowToast(false), 3000);
    }, 1500);
  };

  // Change Password Handler
  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      setToastMessage('Passwords do not match!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    
    setToastMessage('Password changed successfully!');
    setShowToast(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <div>
              <div className="font-bold">Success!</div>
              <div className="text-sm opacity-90">{toastMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure your honeypot observer system</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleSaveSettings('All')}
            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-3 flex gap-2">
          {(['general', 'alerts', 'integrations', 'security'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'general' && <SettingsIcon className="w-4 h-4 inline mr-2" />}
              {tab === 'alerts' && <Bell className="w-4 h-4 inline mr-2" />}
              {tab === 'integrations' && <Database className="w-4 h-4 inline mr-2" />}
              {tab === 'security' && <Shield className="w-4 h-4 inline mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Honeypot Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Honeypot IP Address
                    </label>
                    <input
                      type="text"
                      value={honeypotIP}
                      onChange={(e) => setHoneypotIP(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SSH Port
                    </label>
                    <input
                      type="text"
                      value={honeypotPort}
                      onChange={(e) => setHoneypotPort(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">ELK Stack Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Elasticsearch URL
                    </label>
                    <input
                      type="text"
                      value={elasticsearchURL}
                      onChange={(e) => setElasticsearchURL(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kibana URL
                    </label>
                    <input
                      type="text"
                      value={kibanaURL}
                      onChange={(e) => setKibanaURL(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Data Retention</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keep Data For (Days)
                    </label>
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                        className="w-5 h-5 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Auto-archive old data
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleSaveSettings('General')}
                  className="px-6 py-2 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Alert Settings Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Email Notifications</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Email Address
                    </label>
                    <input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-5 h-5 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Enable Email Notifications
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Alert Severity Levels</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-bold text-red-800">Critical Alerts</div>
                        <div className="text-sm text-red-600">Immediate attention required</div>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={criticalAlerts}
                        onChange={(e) => setCriticalAlerts(e.target.checked)}
                        className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-bold text-orange-800">High Alerts</div>
                        <div className="text-sm text-orange-600">Prompt action needed</div>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={highAlerts}
                        onChange={(e) => setHighAlerts(e.target.checked)}
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-bold text-yellow-800">Medium Alerts</div>
                        <div className="text-sm text-yellow-600">Review when convenient</div>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mediumAlerts}
                        onChange={(e) => setMediumAlerts(e.target.checked)}
                        className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-bold text-green-800">Low Alerts</div>
                        <div className="text-sm text-green-600">Informational only</div>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lowAlerts}
                        onChange={(e) => setLowAlerts(e.target.checked)}
                        className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleSaveSettings('Alert')}
                  className="px-6 py-2 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition"
                >
                  Save Alert Settings
                </button>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Integration Status</h2>
                <div className="space-y-4">
                  {Object.entries(integrationStatus).map(([service, status]) => (
                    <div key={service} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            status.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`} />
                          <div>
                            <div className="font-bold text-gray-800 capitalize">{service}</div>
                            <div className="text-sm text-gray-500">
                              Last sync: {status.lastSync}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTestConnection(service)}
                            className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition text-sm flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Test
                          </button>
                          <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                            status.status === 'connected' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {status.status === 'connected' ? '✓ Connected' : '✗ Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1">Integration Health</h3>
                    <p className="text-sm text-blue-800">
                      All integrations are running smoothly. Data is flowing from Cowrie → Logstash → Elasticsearch → Kibana.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                      />
                      <button
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    className="px-6 py-2 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Danger Zone</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-red-800 mb-1">Clear All Data</h3>
                      <p className="text-sm text-red-700 mb-3">
                        This will permanently delete all captured attack data, sessions, and logs. This action cannot be undone.
                      </p>
                      <button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-sm">
                        Clear All Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <Download className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-bold text-lg mb-2">Export Configuration</h3>
          <p className="text-sm opacity-90 mb-4">Download your current settings as JSON</p>
          <button className="px-4 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition text-sm">
            Download Config
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <RefreshCw className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-bold text-lg mb-2">Restart Services</h3>
          <p className="text-sm opacity-90 mb-4">Restart all honeypot integrations</p>
          <button className="px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition text-sm">
            Restart All
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <User className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-bold text-lg mb-2">System Info</h3>
          <p className="text-sm opacity-90 mb-4">View system logs and diagnostics</p>
          <button className="px-4 py-2 bg-white text-green-600 font-bold rounded-lg hover:bg-green-50 transition text-sm">
            View Logs
          </button>
        </div>
      </div>
    </div>
  );
}