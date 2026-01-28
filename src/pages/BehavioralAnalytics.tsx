import { useState, useEffect } from 'react';
import { 
  Brain, 
  User, 
  Shield, 
  Target, 
  RefreshCw, 
  X, 
  AlertTriangle, 
  Eye, 
  Network, 
  Download, 
  PieChart,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5001/api';

interface Pattern {
  id: string;
  name: string;
  confidence: number;
  occurrences: number;
  severity: string;
  description: string;
  indicators: string[];
}

interface AttackerProfile {
  id: string;
  skillLevel: string;
  countries: string[];
  threatScore: number;
  totalAttacks: number;
  successRate: number;
  tools: string[];
  firstSeen?: string;
  lastActivity?: string;
}

interface Vulnerability {
  cve: string;
  name: string;
  severity: number;
  targetFrequency: number;
  successRate: number;
  description?: string;
}

interface MITRETactic {
  tactic: string;
  count: number;
  techniques: string[];
}

export default function BehavioralAnalytics() {
  const [activeTab, setActiveTab] = useState<'patterns' | 'profiles' | 'vulnerabilities' | 'mitre'>('patterns');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [attackerProfiles, setAttackerProfiles] = useState<AttackerProfile[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [mitreTactics, setMitreTactics] = useState<MITRETactic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<AttackerProfile | null>(null);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [selectedTTP, setSelectedTTP] = useState<string | null>(null);
  const [showAlertRuleModal, setShowAlertRuleModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showNeuralNetworkModal, setShowNeuralNetworkModal] = useState(false);
  const [showSkillDistribution, setShowSkillDistribution] = useState(false);
  const [showVulnHeatmap, setShowVulnHeatmap] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/analytics/behavioral`);
      const data = await response.json();
      
      setPatterns(data.patterns || []);
      setAttackerProfiles(data.profiles || []);
      setVulnerabilities(data.vulnerabilities || []);
      setMitreTactics(data.mitre || []);
    } catch (error) {
      console.error('Error fetching behavioral data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-[#00D9FF] mx-auto mb-4" />
          <p className="text-gray-400">Loading behavioral analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Behavioral Intelligence & Analytics</h1>
            <p className="text-gray-400">AI-powered attacker profiling and pattern detection</p>
          </div>
          <button 
            onClick={fetchData} 
            className="px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 mb-6">
        <div className="border-b border-gray-700 px-6 py-3 flex gap-2 overflow-x-auto">
          {[
            { id: 'patterns', label: 'Attack Patterns', icon: Brain },
            { id: 'profiles', label: 'Attacker Profiles', icon: User },
            { id: 'vulnerabilities', label: 'Vulnerability Targeting', icon: Shield },
            { id: 'mitre', label: 'TTPs (MITRE ATT&CK)', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30'
                    : 'text-gray-400 hover:bg-gray-700/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Attack Patterns Tab */}
          {activeTab === 'patterns' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-[#00D9FF]" />
                  <h2 className="text-xl font-bold text-white">Detected Attack Patterns</h2>
                </div>
                <button
                  onClick={() => setShowNeuralNetworkModal(true)}
                  className="px-4 py-2 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6] rounded-lg hover:bg-[#8B5CF6]/30 transition flex items-center gap-2"
                >
                  <Network className="w-4 h-4" />
                  Neural Network View
                </button>
              </div>

              {/* Pattern Evolution Chart */}
              <div className="bg-gray-900/60 rounded-xl p-6 border border-gray-700">
                <h3 className="font-bold text-white mb-4">Pattern Evolution (Last 7 Days)</h3>
                <div className="h-48 bg-gray-800/50 rounded-lg p-4">
                  <PatternEvolutionChart patterns={patterns} />
                </div>
              </div>

              {/* Pattern Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {patterns.map((pattern, index) => {
                  const Icon = index === 0 ? Target : index === 1 ? Shield : Brain;
                  return (
                    <div
                      key={pattern.id}
                      className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 hover:border-[#00D9FF] hover:shadow-lg hover:shadow-[#00D9FF]/20 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <Icon className="w-10 h-10 text-[#00D9FF]" />
                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                          pattern.severity === 'critical' || pattern.severity === 'Critical'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : pattern.severity === 'high' || pattern.severity === 'High' || pattern.severity === 'Medium'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {pattern.severity.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-white font-bold mb-2">{pattern.name}</h3>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Confidence</span>
                          <span className="text-[#00D9FF] font-bold">{pattern.confidence}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Occurrences</span>
                          <span className="text-white font-bold">{pattern.occurrences}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedPattern(pattern)}
                          className="flex-1 px-3 py-2 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded-lg text-sm hover:bg-[#00D9FF]/30 transition-colors font-medium"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => setShowAlertRuleModal(true)}
                          className="px-3 py-2 bg-gray-700/50 text-gray-400 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                        >
                          Alert
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Attacker Profiles Tab */}
          {activeTab === 'profiles' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-6 h-6 text-[#8B5CF6]" />
                  <h2 className="text-xl font-bold text-white">Attacker Profiles</h2>
                </div>
                <button
                  onClick={() => setShowSkillDistribution(true)}
                  className="px-4 py-2 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6] rounded-lg hover:bg-[#8B5CF6]/30 transition flex items-center gap-2"
                >
                  <PieChart className="w-4 h-4" />
                  Skill Distribution
                </button>
              </div>

              {/* Skill Level Distribution */}
              <div className="bg-gray-900/60 rounded-xl p-6 border border-gray-700">
                <h3 className="font-bold text-white mb-4">Skill Level Distribution</h3>
                <SkillLevelChart profiles={attackerProfiles} />
              </div>

              {/* Profile Cards */}
              {attackerProfiles.map(profile => (
                <div key={profile.id} className="bg-gray-800/90 rounded-xl p-6 border border-gray-700 hover:border-[#8B5CF6] transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-bold text-white">{profile.id}</code>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          profile.skillLevel === 'advanced' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          profile.skillLevel === 'intermediate' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {profile.skillLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Origins: {profile.countries.join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-red-400">{profile.threatScore}/10</div>
                      <div className="text-sm text-gray-400">Threat Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-white">{profile.totalAttacks}</div>
                      <div className="text-xs text-gray-400">Total Attacks</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-orange-400">{profile.successRate}%</div>
                      <div className="text-xs text-gray-400">Success Rate</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-[#00D9FF]">{profile.tools.length}</div>
                      <div className="text-xs text-gray-400">Tools Used</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-400 mb-2">Common Tools:</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.tools.map((tool: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-gray-900/80 text-[#00D9FF] rounded-lg text-sm font-mono border border-gray-700">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedProfile(profile)}
                      className="flex-1 px-4 py-2 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6] font-bold rounded-lg hover:bg-[#8B5CF6]/30 transition text-sm"
                    >
                      View Full Profile
                    </button>
                    <button 
                      onClick={() => setShowWatchlistModal(true)}
                      className="px-4 py-2 bg-gray-700/50 text-gray-400 font-bold rounded-lg hover:bg-gray-700 transition text-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Watchlist
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Vulnerabilities Tab */}
          {activeTab === 'vulnerabilities' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-400" />
                  <h2 className="text-xl font-bold text-white">Targeted Vulnerabilities</h2>
                </div>
                <button
                  onClick={() => setShowVulnHeatmap(true)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Heatmap View
                </button>
              </div>

              {/* Vulnerability Heatmap */}
              <div className="bg-gray-900/60 rounded-xl p-6 border border-gray-700">
                <h3 className="font-bold text-white mb-4">Vulnerability Targeting Heatmap</h3>
                <VulnerabilityHeatmap vulnerabilities={vulnerabilities} />
              </div>

              {/* Vulnerability Table */}
              <div className="bg-gray-800/90 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900/60 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">CVE ID</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Vulnerability</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">CVSS Score</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Target Frequency</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Success Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {vulnerabilities.map((vuln, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <a 
                            href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-[#00D9FF] hover:text-[#00D9FF]/80"
                          >
                            {vuln.cve}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-white">{vuln.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            vuln.severity >= 9 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            vuln.severity >= 7 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {vuln.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-white">{vuln.targetFrequency}</td>
                        <td className="px-4 py-3 text-sm font-bold text-orange-400">{vuln.successRate}%</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => setSelectedVuln(vuln)}
                            className="text-sm text-[#00D9FF] hover:text-[#00D9FF]/80 font-medium flex items-center gap-1"
                          >
                            View Details <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* MITRE ATT&CK Tab */}
          {activeTab === 'mitre' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-[#00D9FF]" />
                <h2 className="text-xl font-bold text-white">MITRE ATT&CK Framework Mapping</h2>
              </div>

              <div className="bg-[#00D9FF]/10 border-l-4 border-[#00D9FF] p-4 rounded">
                <p className="text-sm text-gray-300">
                  <strong className="text-[#00D9FF]">MITRE ATT&CK</strong> is a globally-accessible knowledge base of adversary tactics and techniques based on real-world observations.
                </p>
              </div>

              {/* TTP Timeline */}
              <div className="bg-gray-900/60 rounded-xl p-6 border border-gray-700">
                <h3 className="font-bold text-white mb-4">TTP Timeline (Last 24 Hours)</h3>
                <TTPTimeline tactics={mitreTactics} />
              </div>

              {/* MITRE Heatmap */}
              <div className="bg-gray-900/60 rounded-xl p-6 border border-gray-700">
                <h3 className="font-bold text-white mb-4">MITRE ATT&CK Heatmap</h3>
                <MITREHeatmap tactics={mitreTactics} />
              </div>

              {/* Tactic Cards */}
              {mitreTactics.map((tactic, idx) => (
                <div key={idx} className="bg-gray-800/90 rounded-xl p-6 border border-gray-700 hover:border-[#00D9FF] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{tactic.tactic}</h3>
                      <div className="text-sm text-gray-400">{tactic.count} detections</div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-[#00D9FF]/20 border-2 border-[#00D9FF] flex items-center justify-center">
                      <div className="text-2xl font-bold text-[#00D9FF]">{tactic.count}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-2">Detected Techniques:</div>
                    <div className="space-y-2">
                      {tactic.techniques.map((technique: string, tidx: number) => (
                        <button
                          key={tidx}
                          onClick={() => setSelectedTTP(technique)}
                          className="w-full flex items-center justify-between bg-gray-900/60 rounded-lg p-3 border border-gray-700 hover:border-[#00D9FF] transition-all"
                        >
                          <code className="text-sm font-mono text-white">{technique}</code>
                          <ChevronRight className="w-4 h-4 text-[#00D9FF]" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedPattern && (
          <DetailModal title={selectedPattern.name} onClose={() => setSelectedPattern(null)}>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-bold mb-2">Description</h3>
                <p className="text-gray-400">{selectedPattern.description}</p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Key Indicators</h3>
                <div className="space-y-2">
                  {selectedPattern.indicators.map((indicator, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-900/60 rounded border border-gray-700">
                      <div className="w-2 h-2 bg-[#00D9FF] rounded-full" />
                      <span className="text-gray-300 text-sm">{indicator}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
                  <span className="text-gray-400 text-sm">Confidence Score</span>
                  <div className="text-2xl text-[#00D9FF] mt-1 font-bold">{selectedPattern.confidence}%</div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
                  <span className="text-gray-400 text-sm">Total Occurrences</span>
                  <div className="text-2xl text-white mt-1 font-bold">{selectedPattern.occurrences}</div>
                </div>
              </div>
            </div>
          </DetailModal>
        )}

        {selectedProfile && (
          <DetailModal title={`Attacker Profile: ${selectedProfile.id}`} onClose={() => setSelectedProfile(null)}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Skill Level</div>
                  <div className="text-xl font-bold text-[#8B5CF6] capitalize">{selectedProfile.skillLevel}</div>
                </div>
                <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Threat Score</div>
                  <div className="text-xl font-bold text-red-400">{selectedProfile.threatScore}/10</div>
                </div>
                <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Success Rate</div>
                  <div className="text-xl font-bold text-[#00D9FF]">{selectedProfile.successRate}%</div>
                </div>
              </div>
              
              {selectedProfile.firstSeen && (
                <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-700">
                  <h3 className="text-white font-bold mb-3">Activity Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">First Seen:</span>
                      <span className="text-white">{selectedProfile.firstSeen}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Activity:</span>
                      <span className="text-white">{selectedProfile.lastActivity}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-white font-bold mb-2">Origin Countries:</h3>
                <div className="text-gray-400">{selectedProfile.countries.join(', ')}</div>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Tools Used:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.tools.map((tool: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-gray-900/80 text-[#00D9FF] rounded border border-gray-700 text-sm font-mono">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </DetailModal>
        )}

        {selectedVuln && (
          <DetailModal title={selectedVuln.cve} onClose={() => setSelectedVuln(null)}>
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h3 className="text-red-400 font-bold mb-2">Vulnerability Details</h3>
                <p className="text-gray-300 text-sm">
                  {selectedVuln.description || "This critical vulnerability allows remote attackers to execute arbitrary code on affected systems. Active exploitation detected in the wild."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
                  <span className="text-gray-400 text-sm">CVSS Score</span>
                  <div className="text-2xl text-red-400 mt-1 font-bold">{selectedVuln.severity}</div>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700">
                  <span className="text-gray-400 text-sm">Attack Attempts</span>
                  <div className="text-2xl text-white mt-1 font-bold">{selectedVuln.targetFrequency}</div>
                </div>
              </div>
              <div className="p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg">
                <div className="text-sm font-bold text-[#00D9FF] mb-2">Mitigation Recommendations</div>
                <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                  <li>Update affected systems immediately</li>
                  <li>Apply security patches from vendor</li>
                  <li>Monitor for exploitation attempts</li>
                  <li>Implement network segmentation</li>
                </ul>
              </div>
              <a 
                href={`https://nvd.nist.gov/vuln/detail/${selectedVuln.cve}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full px-4 py-3 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/30 transition-colors text-center font-bold"
              >
                View on NVD →
              </a>
            </div>
          </DetailModal>
        )}

        {selectedTTP && (
          <DetailModal title={`MITRE ATT&CK: ${selectedTTP}`} onClose={() => setSelectedTTP(null)}>
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-700">
                <h3 className="text-white font-bold mb-2">Technique Overview</h3>
                <p className="text-gray-400 text-sm">
                  Adversaries may use various techniques to achieve their objectives. This technique has been observed in recent attack campaigns.
                </p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Related Sub-techniques</h3>
                <div className="space-y-2">
                  {["Default Accounts", "Domain Accounts", "Local Accounts"].map((sub, i) => (
                    <div key={i} className="p-2 bg-gray-900/60 rounded border border-gray-700">
                      <span className="text-gray-300 text-sm">{selectedTTP}.00{i + 1}: {sub}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a 
                href={`https://attack.mitre.org/techniques/${selectedTTP.split(':')[0].trim()}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-3 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/30 transition-colors text-center font-bold"
              >
                Learn More on MITRE →
              </a>
            </div>
          </DetailModal>
        )}

        {showNeuralNetworkModal && <NeuralNetworkModal patterns={patterns} onClose={() => setShowNeuralNetworkModal(false)} />}
        {showSkillDistribution && <SkillDistributionModal profiles={attackerProfiles} onClose={() => setShowSkillDistribution(false)} />}
        {showVulnHeatmap && <VulnHeatmapModal vulnerabilities={vulnerabilities} onClose={() => setShowVulnHeatmap(false)} />}
        {showAlertRuleModal && <AlertRuleModal onClose={() => setShowAlertRuleModal(false)} />}
        {showWatchlistModal && <WatchlistModal onClose={() => setShowWatchlistModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// Component Functions
function PatternEvolutionChart({ patterns }: { patterns: Pattern[] }) {
  return (
    <div className="h-full flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 600 150">
        {patterns.slice(0, 3).map((pattern, idx) => {
          const points = [20, 40, 35, 50, 60, 55, 70].map((y, i) => 
            `${80 + i * 80},${150 - y - (idx * 10)}`
          ).join(' ');
          const colors = ['#00D9FF', '#8B5CF6', '#ec4899'];
          return (
            <g key={idx}>
              <polyline
                points={points}
                fill="none"
                stroke={colors[idx]}
                strokeWidth="2"
                opacity="0.8"
              />
              <text x="10" y={30 + idx * 20} fill={colors[idx]} fontSize="12" fontWeight="bold">
                {pattern.name.substring(0, 20)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SkillLevelChart({ profiles }: { profiles: AttackerProfile[] }) {
  const skillCounts = profiles.reduce((acc, p) => {
    acc[p.skillLevel] = (acc[p.skillLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = profiles.length || 1;
  const colors: Record<string, string> = { 
    advanced: '#ef4444', 
    intermediate: '#f97316', 
    script_kiddie: '#eab308',
    expert: '#dc2626',
    'Script Kiddie': '#eab308',
    'Intermediate': '#f97316',
    'Advanced': '#ef4444',
    'Expert': '#dc2626'
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(skillCounts).map(([skill, count]) => {
        const percentage = Math.round((Number(count) / total) * 100);
        return (
          <div key={skill} className="bg-gray-900/60 rounded-lg p-4 text-center border border-gray-700">
            <div className="text-3xl font-bold mb-2" style={{ color: colors[skill] || '#00D9FF' }}>
              {percentage}%
            </div>
            <div className="text-sm text-gray-400 capitalize">{skill.replace('_', ' ')}</div>
            <div className="text-xs text-gray-500 mt-1">{String(count)} attackers</div>
          </div>
        );
      })}
    </div>
  );
}

function VulnerabilityHeatmap({ vulnerabilities }: { vulnerabilities: Vulnerability[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {vulnerabilities.map((vuln, idx) => {
        const size = Math.min(Math.max(vuln.targetFrequency / 10, 60), 120);
        return (
          <div
            key={idx}
            className="rounded-lg flex items-center justify-center text-white text-xs font-bold p-2 hover:scale-105 transition cursor-pointer border border-gray-700"
            style={{ 
              height: `${size}px`,
              backgroundColor: vuln.severity >= 9 ? '#dc2626' : vuln.severity >= 7 ? '#ea580c' : '#f59e0b',
              opacity: 0.9
            }}
            title={`${vuln.cve}: ${vuln.name}`}
          >
            <div className="text-center">
              <div>{vuln.cve.split('-')[2]}</div>
              <div className="text-xs opacity-75">{vuln.targetFrequency}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TTPTimeline({ tactics }: { tactics: MITRETactic[] }) {
  const maxCount = Math.max(...tactics.map(t => t.count), 1);
  return (
    <div className="space-y-3">
      {tactics.map((tactic, idx) => {
        const width = (tactic.count / maxCount) * 100;
        return (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-40 text-sm font-medium text-gray-400">{tactic.tactic}</div>
            <div className="flex-1 bg-gray-900 rounded-full h-8 overflow-hidden border border-gray-700">
              <div 
                className="bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] h-full rounded-full flex items-center justify-end px-3"
                style={{ width: `${width}%` }}
              >
                <span className="text-sm font-bold text-white">{tactic.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MITREHeatmap({ tactics }: { tactics: MITRETactic[] }) {
  const maxCount = Math.max(...tactics.map(t => t.count), 1);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tactics.map((tactic, idx) => {
        const intensity = (tactic.count / maxCount);
        return (
          <div
            key={idx}
            className="rounded-lg p-4 cursor-pointer hover:scale-105 transition"
            style={{
              backgroundColor: `rgba(0, 217, 255, ${intensity * 0.3})`,
              border: `2px solid rgba(0, 217, 255, ${Math.min(intensity * 2, 1)})`
            }}
            title={`${tactic.tactic}: ${tactic.count} detections`}
          >
            <div className="text-sm font-bold text-white mb-1">{tactic.tactic}</div>
            <div className="text-2xl font-bold text-[#00D9FF]">{tactic.count}</div>
          </div>
        );
      })}
    </div>
  );
}

// Modal Components
function DetailModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl text-white font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg transition-all font-bold"
          >
            Close
          </button>
          <button className="px-4 py-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2 font-bold">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NeuralNetworkModal({ patterns, onClose }: { patterns: Pattern[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Neural Network Visualization</h2>
            <p className="text-sm text-gray-400">Pattern relationship mapping</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <div className="bg-gray-800/50 rounded-xl p-8 h-96 flex items-center justify-center border border-gray-700">
            <div className="text-center text-gray-400">
              <Network className="w-16 h-16 mx-auto mb-4 text-[#00D9FF]" />
              <p className="text-white font-bold mb-2">Neural Network Analysis</p>
              <p className="text-sm">{patterns.length} patterns detected and analyzed</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-gray-400 font-bold rounded-lg hover:bg-gray-700">
            Close
          </button>
          <button className="px-6 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Model
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkillDistributionModal({ profiles, onClose }: { profiles: AttackerProfile[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Skill Level Distribution</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <SkillLevelChart profiles={profiles} />
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-[#8B5CF6] text-white font-bold rounded-lg hover:bg-[#8B5CF6]/80">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function VulnHeatmapModal({ vulnerabilities, onClose }: { vulnerabilities: Vulnerability[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Vulnerability Heatmap</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <VulnerabilityHeatmap vulnerabilities={vulnerabilities} />
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-gray-400 font-bold rounded-lg hover:bg-gray-700">
            Close
          </button>
          <button className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AlertRuleModal({ onClose }: { onClose: () => void }) {
  const [ruleName, setRuleName] = useState('');
  const [threshold, setThreshold] = useState('10');

  const handleCreate = () => {
    alert(`Alert rule "${ruleName}" created with threshold ${threshold}`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Create Alert Rule</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Rule Name</label>
            <input 
              type="text" 
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
              placeholder="e.g., High Brute Force Alert"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Threshold (attacks/hour)</label>
            <input 
              type="number" 
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF]"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-gray-400 font-bold rounded-lg hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={handleCreate} className="px-4 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80">
            Create Rule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WatchlistModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add to Watchlist</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <Eye className="w-16 h-16 mx-auto mb-4 text-[#00D9FF]" />
            <p className="text-gray-400">This attacker will be added to your watchlist for continuous monitoring.</p>
          </div>
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-400">
                <strong>Note:</strong> You'll receive real-time alerts when this attacker profile shows new activity.
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-gray-400 font-bold rounded-lg hover:bg-gray-700">
            Cancel
          </button>
          <button 
            onClick={() => { alert('Added to watchlist!'); onClose(); }}
            className="px-4 py-2 bg-[#00D9FF] text-white font-bold rounded-lg hover:bg-[#00D9FF]/80"
          >
            Add to Watchlist
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}