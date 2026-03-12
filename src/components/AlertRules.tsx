import { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Edit2,
  Save,
  AlertTriangle,
  Trash2,
  PlayCircle
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const api = {
  get: (url: string) => fetch(`${API_BASE_URL}${url}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.json()),
  post: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}` 
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  put: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}` 
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  patch: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}` 
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  delete: (url: string) => fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.json())
};

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'brute_force' | 'command_execution' | 'credential_capture' | 'port_scan' | 'custom';
    threshold?: number;
    timeWindow?: number; // seconds
    customCondition?: string;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  escalateSeverity?: boolean; // escalate when threshold exceeded
  throttle: {
    type: 'immediate' | 'batch_5min' | 'batch_30min' | 'batch_1hr' | 'daily_digest';
    quietHours?: { start: string; end: string }; // "HH:MM" format
  };
  routing: {
    email: boolean;
    slack: boolean;
    sms: boolean;
    phone: boolean;
  };
  deduplication?: {
    enabled: boolean;
    window: number; // seconds
    groupBy: 'ip' | 'ip_eventtype' | 'all';
  };
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export function AlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AlertRule>({
    id: '',
    name: '',
    enabled: true,
    trigger: { type: 'brute_force', threshold: 5, timeWindow: 300 },
    severity: 'high',
    throttle: { type: 'batch_5min' },
    routing: { email: true, slack: true, sms: false, phone: false },
    deduplication: { enabled: true, window: 3600, groupBy: 'ip_eventtype' },
    description: ''
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/alerts/rules');
      setRules(response.rules || []);
    } catch (error) {
      console.error('Error loading alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setFormData({
      id: Date.now().toString(),
      name: '',
      enabled: true,
      trigger: { type: 'brute_force', threshold: 5, timeWindow: 300 },
      severity: 'high',
      throttle: { type: 'batch_5min' },
      routing: { email: true, slack: true, sms: false, phone: false },
      deduplication: { enabled: true, window: 3600, groupBy: 'ip_eventtype' },
      description: ''
    });
    setEditing(null);
    setShowForm(true);
  };

  const handleEditRule = (rule: AlertRule) => {
    setFormData(rule);
    setEditing(rule.id);
    setShowForm(true);
  };

  const handleSaveRule = async () => {
    setLoading(true);
    try {
      const endpoint = editing ? `/alerts/rules/${editing}` : `/alerts/rules`;
      const method = editing ? 'PUT' : 'POST';

      const response = await api[method as keyof typeof api](endpoint, formData) as any;

      if (response.success) {
        await loadRules();
        setShowForm(false);
        setEditing(null);
        alert('✅ Rule saved successfully!');
      }
    } catch (error: any) {
      alert(`❌ Error saving rule: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this alert rule?')) return;

    setLoading(true);
    try {
      const response = await api.delete(`/alerts/rules/${ruleId}`) as any;

      if (response.success) {
        await loadRules();
        alert('✅ Rule deleted!');
      }
    } catch (error: any) {
      alert(`❌ Error deleting rule: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    setLoading(true);
    try {
      const response = await api.patch(`/alerts/rules/${ruleId}`, { enabled: !enabled }) as any;

      if (response.success) {
        await loadRules();
      }
    } catch (error: any) {
      console.error('Error toggling rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerTypeLabels: Record<string, string> = {
    brute_force: 'Brute Force (Failed Logins)',
    command_execution: 'Command Execution',
    credential_capture: 'Credential Capture',
    port_scan: 'Port Scan',
    custom: 'Custom Condition'
  };

  const throttleLabels: Record<string, string> = {
    immediate: 'Immediate',
    batch_5min: 'Batch Every 5 Minutes',
    batch_30min: 'Batch Every 30 Minutes',
    batch_1hr: 'Batch Every 1 Hour',
    daily_digest: 'Daily Digest'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Alert Rules Engine</h2>
          <p className="text-gray-400">Create rules to prevent alert fatigue and intelligent routing</p>
        </div>
        <button
          onClick={handleAddRule}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">
                {editing ? 'Edit Rule' : 'Create New Rule'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rule Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Block SSH Brute Force"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this rule detect?"
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trigger Type *</label>
                <select
                  value={formData.trigger.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, type: e.target.value as any }
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                >
                  {Object.entries(triggerTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold & Time Window */}
              {formData.trigger.type !== 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Threshold (occurrences)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.trigger.threshold || 5}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger: { ...formData.trigger, threshold: parseInt(e.target.value) }
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time Window (seconds)
                    </label>
                    <input
                      type="number"
                      min="60"
                      step="60"
                      value={formData.trigger.timeWindow || 300}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger: { ...formData.trigger, timeWindow: parseInt(e.target.value) }
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                </div>
              )}

              {/* Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Severity *</label>
                  <select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value as any })
                    }
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.escalateSeverity || false}
                      onChange={(e) =>
                        setFormData({ ...formData, escalateSeverity: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#00D9FF]"
                    />
                    <span className="text-sm">Escalate when threshold exceeded</span>
                  </label>
                </div>
              </div>

              {/* Throttling */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notification Throttle *</label>
                <select
                  value={formData.throttle.type}
                  onChange={(e) =>
                    setFormData({ ...formData, throttle: { ...formData.throttle, type: e.target.value as any } })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
                >
                  {Object.entries(throttleLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quiet Hours */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <div className="text-sm font-medium text-gray-300 mb-3">Quiet Hours (Optional)</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Start Time (HH:MM)</label>
                    <input
                      type="time"
                      value={formData.throttle.quietHours?.start || '22:00'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          throttle: {
                            ...formData.throttle,
                            quietHours: {
                              start: e.target.value,
                              end: formData.throttle.quietHours?.end || '08:00'
                            }
                          }
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">End Time (HH:MM)</label>
                    <input
                      type="time"
                      value={formData.throttle.quietHours?.end || '08:00'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          throttle: {
                            ...formData.throttle,
                            quietHours: {
                              start: formData.throttle.quietHours?.start || '22:00',
                              end: e.target.value
                            }
                          }
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  During quiet hours, escalate Critical only, batch others
                </p>
              </div>

              {/* Routing */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <div className="text-sm font-medium text-gray-300 mb-3">Notification Routing</div>
                <div className="space-y-2">
                  {['email', 'slack', 'sms', 'phone'].map((channel) => (
                    <label key={channel} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.routing[channel as keyof typeof formData.routing] || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            routing: {
                              ...formData.routing,
                              [channel]: e.target.checked
                            }
                          })
                        }
                        className="w-4 h-4 accent-[#00D9FF]"
                      />
                      <span className="text-sm capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Deduplication */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={formData.deduplication?.enabled || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deduplication: {
                          ...formData.deduplication,
                          enabled: e.target.checked
                        } as any
                      })
                    }
                    className="w-4 h-4 accent-[#00D9FF]"
                  />
                  <span className="text-sm font-medium">Enable Deduplication</span>
                </label>

                {formData.deduplication?.enabled && (
                  <div className="space-y-3 ml-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Dedup Window (seconds)</label>
                      <input
                        type="number"
                        min="60"
                        step="60"
                        value={formData.deduplication?.window || 3600}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            deduplication: {
                              ...formData.deduplication,
                              window: parseInt(e.target.value)
                            } as any
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-[#00D9FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Group By</label>
                      <select
                        value={formData.deduplication?.groupBy || 'ip'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            deduplication: {
                              ...formData.deduplication,
                              groupBy: e.target.value as any
                            } as any
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-[#00D9FF]"
                      >
                        <option value="ip">Source IP Only</option>
                        <option value="ip_eventtype">IP + Event Type</option>
                        <option value="all">All Events</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={loading || !formData.name}
                className="flex items-center gap-2 px-4 py-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {loading && rules.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Loading alert rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No alert rules created yet. Create one to get started!
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-lg border transition ${
                rule.enabled
                  ? 'border-[#00D9FF]/30 bg-[#00D9FF]/5'
                  : 'border-gray-700 bg-gray-900/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-white">{rule.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300'
                          : rule.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-300'
                          : rule.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      {rule.severity}
                    </span>
                    {!rule.enabled && <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">Disabled</span>}
                  </div>
                  {rule.description && (
                    <p className="text-sm text-gray-400 mb-2">{rule.description}</p>
                  )}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      <span className="text-gray-400">Trigger:</span> {triggerTypeLabels[rule.trigger.type]}
                      {rule.trigger.threshold && ` (${rule.trigger.threshold}x in ${rule.trigger.timeWindow}s)`}
                    </div>
                    <div>
                      <span className="text-gray-400">Throttle:</span> {throttleLabels[rule.throttle.type]}
                    </div>
                    <div>
                      <span className="text-gray-400">Routes to:</span>{' '}
                      {Object.entries(rule.routing)
                        .filter(([, enabled]) => enabled)
                        .map(([channel]) => channel)
                        .join(', ') || 'None'}
                    </div>
                    {rule.deduplication?.enabled && (
                      <div>
                        <span className="text-gray-400">Dedup:</span> {rule.deduplication.groupBy} ({rule.deduplication.window}s window)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                    className={`p-2 rounded-lg transition ${
                      rule.enabled
                        ? 'bg-[#00D9FF]/20 text-[#00D9FF] hover:bg-[#00D9FF]/30'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    <PlayCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Default Rules Indicator */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Recommended Default Rules:</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>Brute Force: &gt;5 failed logins in 5 min → High severity, batch 10 min</li>
              <li>Credential Capture: Any harvest → Critical, immediate all channels</li>
              <li>Command Execution: &gt;3 commands → Medium, batch 30 min</li>
              <li>Port Scan: &gt;10 ports in 1 min → High, batch 5 min</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
