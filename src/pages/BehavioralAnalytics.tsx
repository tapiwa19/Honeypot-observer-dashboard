import { useState } from 'react';
import { Brain, User, Shield, Target } from 'lucide-react';

export function BehavioralAnalytics() {
  // ... rest of your code stays the same
  const [activeTab, setActiveTab] = useState<'patterns' | 'profiles' | 'vulnerabilities' | 'mitre'>('patterns');

  const patterns = [
    { id: 1, name: 'Automated Scanning Pattern', confidence: 94, occurrences: 234, severity: 'high', indicators: ['Sequential port scanning', 'Short connection duration', 'No authentication attempts'] },
    { id: 2, name: 'Credential Stuffing Attack', confidence: 89, occurrences: 156, severity: 'critical', indicators: ['Multiple username attempts', 'Common password list', 'Distributed IPs'] },
    { id: 3, name: 'Malware Distribution Campaign', confidence: 78, occurrences: 87, severity: 'critical', indicators: ['Payload downloads', 'Execution attempts', 'C2 communication'] },
  ];

  const attackerProfiles = [
    { id: 'ATK-001', skillLevel: 'advanced', threatScore: 8.5, totalAttacks: 342, successRate: 23, tools: ['Metasploit', 'Nmap', 'Custom Scripts'], countries: ['🇨🇳 China', '🇷🇺 Russia'] },
    { id: 'ATK-002', skillLevel: 'intermediate', threatScore: 6.2, totalAttacks: 156, successRate: 12, tools: ['Hydra', 'Medusa'], countries: ['🇧🇷 Brazil'] },
    { id: 'ATK-003', skillLevel: 'script_kiddie', threatScore: 3.1, totalAttacks: 89, successRate: 2, tools: ['AutoSploit', 'Public exploits'], countries: ['🇺🇸 USA'] },
  ];

  const vulnerabilities = [
    { cve: 'CVE-2024-1234', name: 'OpenSSH Authentication Bypass', severity: 9.8, targetFrequency: 456, successRate: 34 },
    { cve: 'CVE-2024-5678', name: 'Remote Code Execution', severity: 8.9, targetFrequency: 234, successRate: 28 },
    { cve: 'CVE-2024-9012', name: 'Privilege Escalation', severity: 7.5, targetFrequency: 178, successRate: 19 },
  ];

  const mitreTactics = [
    { tactic: 'Initial Access', techniques: ['T1078: Valid Accounts', 'T1190: Exploit Public-Facing Application'], count: 342 },
    { tactic: 'Execution', techniques: ['T1059: Command and Scripting Interpreter', 'T1203: Exploitation for Client Execution'], count: 234 },
    { tactic: 'Persistence', techniques: ['T1136: Create Account', 'T1053: Scheduled Task/Job'], count: 156 },
    { tactic: 'Privilege Escalation', techniques: ['T1068: Exploitation for Privilege Escalation'], count: 98 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Behavioral Analytics & Intelligence</h1>
          <p className="text-gray-500 mt-1">AI-powered attacker profiling and pattern detection</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-3 flex gap-2">
          {(['patterns', 'profiles', 'vulnerabilities', 'mitre'] as const).map(tab => (
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

        <div className="p-6">
          {/* Attack Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-800">Detected Attack Patterns</h2>
              </div>

              {patterns.map(pattern => (
                <div key={pattern.id} className="bg-gray-50 rounded-xl p-6 border-l-4 border-primary-500">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{pattern.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          pattern.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          pattern.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {pattern.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">{pattern.occurrences} occurrences</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary-500">{pattern.confidence}%</div>
                      <div className="text-sm text-gray-500">Confidence</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Pattern Indicators:</div>
                    <div className="flex flex-wrap gap-2">
                      {pattern.indicators.map((indicator, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white rounded-lg text-sm text-gray-700 border border-gray-200">
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition text-sm">
                      View Details
                    </button>
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition text-sm">
                      Create Alert Rule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attacker Profiles Tab */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-6 h-6 text-purple-500" />
                <h2 className="text-xl font-bold text-gray-800">Attacker Profiles</h2>
              </div>

              {attackerProfiles.map(profile => (
                <div key={profile.id} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-bold text-gray-800">{profile.id}</code>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          profile.skillLevel === 'advanced' ? 'bg-red-100 text-red-700' :
                          profile.skillLevel === 'intermediate' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {profile.skillLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Origins: {profile.countries.join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-red-500">{profile.threatScore}/10</div>
                      <div className="text-sm text-gray-500">Threat Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-800">{profile.totalAttacks}</div>
                      <div className="text-xs text-gray-500">Total Attacks</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-500">{profile.successRate}%</div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-500">{profile.tools.length}</div>
                      <div className="text-xs text-gray-500">Tools Used</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Common Tools:</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.tools.map((tool, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm font-mono">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition text-sm">
                      View Full Profile
                    </button>
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition text-sm">
                      Add to Watchlist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vulnerabilities Tab */}
          {activeTab === 'vulnerabilities' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-red-500" />
                <h2 className="text-xl font-bold text-gray-800">Targeted Vulnerabilities</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">CVE ID</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Vulnerability</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">CVSS Score</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Target Frequency</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Success Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vulnerabilities.map((vuln, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="text-sm font-bold text-blue-600">{vuln.cve}</code>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">{vuln.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            vuln.severity >= 9 ? 'bg-red-100 text-red-700' :
                            vuln.severity >= 7 ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {vuln.severity} CRITICAL
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-800">{vuln.targetFrequency}</td>
                        <td className="px-4 py-3 text-sm font-bold text-orange-600">{vuln.successRate}%</td>
                        <td className="px-4 py-3">
                          <button className="text-sm text-primary-500 hover:text-primary-700 font-medium">
                            View Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MITRE ATT&CK Tab */}
          {activeTab === 'mitre' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-800">MITRE ATT&CK Framework Mapping</h2>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                <p className="text-sm text-blue-900">
                  <strong>MITRE ATT&CK</strong> is a globally-accessible knowledge base of adversary tactics and techniques based on real-world observations.
                </p>
              </div>

              {mitreTactics.map((tactic, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{tactic.tactic}</h3>
                      <div className="text-sm text-gray-600">{tactic.count} detections</div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <div className="text-2xl font-bold text-blue-600">{tactic.count}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Detected Techniques:</div>
                    <div className="space-y-2">
                      {tactic.techniques.map((technique, tidx) => (
                        <div key={tidx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                          <code className="text-sm font-mono text-gray-800">{technique}</code>
                          <button className="text-xs text-primary-500 hover:text-primary-700 font-medium">
                            Learn More →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}