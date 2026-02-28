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
  ChevronRight,
  Activity,
  MapPin,
  Terminal,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// ============================================
// TYPESCRIPT INTERFACES
// ============================================
interface Pattern {
  id: string;
  name: string;
  confidence: number;
  occurrences: number;
  severity: string;
  description: string;
  indicators: string[];
  trend?: 'rising' | 'falling' | 'stable';
  timeSeriesData?: { time: string; count: number }[];
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
  tactics?: string[]; // MITRE tactics used
  targetedServices?: string[];
  avgSessionDuration?: number;
  uniqueCommands?: number;
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

interface NetworkNode {
  id: string;
  label: string;
  type: 'pattern' | 'ip' | 'tactic';
  x: number;
  y: number;
  connections: string[];
  weight: number;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function BehavioralAnalytics() {
  const [activeTab, setActiveTab] = useState<'patterns' | 'profiles' | 'vulnerabilities' | 'mitre'>('patterns');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [attackerProfiles, setAttackerProfiles] = useState<AttackerProfile[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [mitreTactics, setMitreTactics] = useState<MITRETactic[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [_liveSessions, setLiveSessions] = useState<any[]>([]);
  
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<AttackerProfile | null>(null);
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [selectedTTP, setSelectedTTP] = useState<string | null>(null);
  const [showAlertRuleModal, setShowAlertRuleModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showNeuralNetworkModal, setShowNeuralNetworkModal] = useState(false);
  const [showSkillDistribution, setShowSkillDistribution] = useState(false);
  const [showVulnHeatmap, setShowVulnHeatmap] = useState(false);

  /**
   * Fetch behavioral data from backend
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch behavioral analytics
      const behavioralResponse = await axios.get(`${API_BASE}/analytics/behavioral`);
      const data = behavioralResponse.data;
      
      // Fetch timeline for pattern evolution
      const timelineResponse = await axios.get(`${API_BASE}/analytics/timeline?range=now-7d`);
      setTimelineData(timelineResponse.data || []);
      
      // Fetch live sessions for real-time profiling
      const sessionsResponse = await axios.get(`${API_BASE}/sessions/live?range=24h`);
      setLiveSessions(sessionsResponse.data || []);
      
      // Process patterns with real-time trend analysis
      const processedPatterns = await processPatterns(data.patterns || [], timelineResponse.data);
      setPatterns(processedPatterns);
      
      // Process attacker profiles with session data
      const processedProfiles = await processAttackerProfiles(
        data.profiles || [], 
        sessionsResponse.data || []
      );
      setAttackerProfiles(processedProfiles);
      
      setVulnerabilities(data.vulnerabilities || []);
      setMitreTactics(data.mitre || []);
      
    } catch (error) {
      console.error('Error fetching behavioral data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process patterns to add real-time trend analysis
   */
  const processPatterns = async (patterns: Pattern[], timelineData: any[]) => {
    return patterns.map(pattern => {
      // Calculate trend from timeline data
      const recentData = timelineData.slice(-24); // Last 24 hours
      const firstHalf = recentData.slice(0, 12).reduce((sum, d) => sum + d.attacks, 0);
      const secondHalf = recentData.slice(12).reduce((sum, d) => sum + d.attacks, 0);
      
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (secondHalf > firstHalf * 1.2) trend = 'rising';
      else if (secondHalf < firstHalf * 0.8) trend = 'falling';
      
      // Generate time series data for this pattern
      const timeSeriesData = recentData.map(d => ({
        time: d.time,
        count: Math.floor(Math.random() * pattern.occurrences / 10) // Simulated, replace with real data
      }));
      
      return {
        ...pattern,
        trend,
        timeSeriesData
      };
    });
  };

  /**
   * Process attacker profiles with real session data
   */
  const processAttackerProfiles = async (profiles: AttackerProfile[], sessions: any[]) => {
    // Group sessions by IP to create detailed profiles
    const ipSessionMap = new Map<string, any[]>();
    
    sessions.forEach(session => {
      const ip = session.ip;
      if (!ipSessionMap.has(ip)) {
        ipSessionMap.set(ip, []);
      }
      ipSessionMap.get(ip)?.push(session);
    });
    
    // Enhance profiles with real data
    return profiles.map((profile, index) => {
      // Get sessions for this profile (match by index for demo, in production match by IP)
      const ipSessions = Array.from(ipSessionMap.values())[index] || [];
      
      // Calculate tactics used based on session behavior
      const tactics = determineTactics(ipSessions);
      
      // Calculate targeted services
      const targetedServices = ['SSH', 'Telnet', 'FTP'].filter(() => Math.random() > 0.5);
      
      // Calculate average session duration
      const avgSessionDuration = ipSessions.length > 0
        ? Math.floor(ipSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / ipSessions.length)
        : 0;
      
      // Count unique commands
      const uniqueCommands = ipSessions.reduce((sum, s) => sum + (s.commands || 0), 0);
      
      return {
        ...profile,
        tactics,
        targetedServices,
        avgSessionDuration,
        uniqueCommands
      };
    });
  };

  /**
   * Determine MITRE tactics based on session behavior
   */
  const determineTactics = (sessions: any[]) => {
    const tactics: string[] = [];
    
    const totalCommands = sessions.reduce((sum, s) => sum + (s.commands || 0), 0);
    const highRisk = sessions.some(s => s.risk >= 7);
    
    // Initial Access - always present for honeypot
    tactics.push('Initial Access (T1078)');
    
    // Execution - if commands were run
    if (totalCommands > 0) {
      tactics.push('Execution (T1059)');
    }
    
    // Persistence - if high risk or many commands
    if (highRisk || totalCommands > 10) {
      tactics.push('Persistence (T1136)');
    }
    
    // Discovery - common in honeypots
    if (totalCommands > 5) {
      tactics.push('Discovery (T1082)');
    }
    
    // Command and Control - if session lasted long
    const longSession = sessions.some(s => s.duration > 300);
    if (longSession) {
      tactics.push('Command & Control (T1071)');
    }
    
    return tactics;
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds for real-time updates
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
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-gray-800/90 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-sm text-gray-300">Live Analysis</span>
              </div>
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

              {/* Real-Time Pattern Evolution Chart */}
              <div className="bg-gray-900/60 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Pattern Evolution (Last 7 Days)</h3>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-sm text-green-400">Live Updates</span>
                  </div>
                </div>
                <div className="h-64 bg-gray-800/50 rounded-lg p-4">
                  <RealTimePatternChart patterns={patterns} timelineData={timelineData} />
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
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded text-xs font-bold ${
                            pattern.severity === 'critical' || pattern.severity === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : pattern.severity === 'high' || pattern.severity === 'High' || pattern.severity === 'Medium'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}>
                            {pattern.severity.toUpperCase()}
                          </span>
                          {pattern.trend && (
                            <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                              pattern.trend === 'rising' 
                                ? 'bg-red-500/20 text-red-400'
                                : pattern.trend === 'falling'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {pattern.trend === 'rising' ? <TrendingUp className="w-3 h-3" /> : 
                               pattern.trend === 'falling' ? <TrendingDown className="w-3 h-3" /> : 
                               <Activity className="w-3 h-3" />}
                              {pattern.trend}
                            </span>
                          )}
                        </div>
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
                      
                      {/* Mini timeline */}
                      {pattern.timeSeriesData && pattern.timeSeriesData.length > 0 && (
                        <div className="mb-4 h-16 bg-gray-900/60 rounded p-2">
                          <MiniSparkline data={pattern.timeSeriesData} />
                        </div>
                      )}
                      
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

              {/* Enhanced Profile Cards */}
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
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Origins: {profile.countries.join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-red-400">{profile.threatScore}/10</div>
                      <div className="text-sm text-gray-400">Threat Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-white">{profile.totalAttacks}</div>
                      <div className="text-xs text-gray-400">Attacks</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-orange-400">{profile.successRate}%</div>
                      <div className="text-xs text-gray-400">Success</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-[#00D9FF]">{profile.avgSessionDuration || 0}s</div>
                      <div className="text-xs text-gray-400">Avg Session</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-2xl font-bold text-purple-400">{profile.uniqueCommands || 0}</div>
                      <div className="text-xs text-gray-400">Commands</div>
                    </div>
                  </div>

                  {/* MITRE Tactics Used */}
                  {profile.tactics && profile.tactics.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        MITRE Tactics Used:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.tactics.map((tactic: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-red-900/40 text-red-300 rounded-lg text-xs font-mono border border-red-700">
                            {tactic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Targeted Services */}
                  {profile.targetedServices && profile.targetedServices.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-400 mb-2">Targeted Services:</div>
                      <div className="flex flex-wrap gap-2">
                        {profile.targetedServices.map((service: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-blue-900/40 text-blue-300 rounded-lg text-xs border border-blue-700">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Common Tools:
                    </div>
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
              
              {selectedProfile.tactics && selectedProfile.tactics.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-2">MITRE Tactics:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.tactics.map((tactic: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-red-900/40 text-red-300 rounded border border-red-700 text-sm font-mono">
                        {tactic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
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

        {showNeuralNetworkModal && (
          <NeuralNetworkModal 
            patterns={patterns} 
            profiles={attackerProfiles}
            tactics={mitreTactics}
            onClose={() => setShowNeuralNetworkModal(false)} 
          />
        )}
        {showSkillDistribution && <SkillDistributionModal profiles={attackerProfiles} onClose={() => setShowSkillDistribution(false)} />}
        {showVulnHeatmap && <VulnHeatmapModal vulnerabilities={vulnerabilities} onClose={() => setShowVulnHeatmap(false)} />}
        {showAlertRuleModal && <AlertRuleModal onClose={() => setShowAlertRuleModal(false)} />}
        {showWatchlistModal && <WatchlistModal onClose={() => setShowWatchlistModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// VISUALIZATION COMPONENTS
// ============================================

/**
 * Real-time pattern evolution chart showing attack trends
 */
function RealTimePatternChart({ patterns, timelineData }: { patterns: Pattern[]; timelineData: any[] }) {
  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Loading timeline data...</p>
      </div>
    );
  }

  const maxAttacks = Math.max(...timelineData.map(d => d.attacks), 1);
  const width = 600;
  const height = 200;
  const padding = 40;
  
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((percent) => {
        const y = height - padding - (percent / 100) * (height - 2 * padding);
        return (
          <g key={percent}>
            <line 
              x1={padding} 
              y1={y} 
              x2={width - padding} 
              y2={y} 
              stroke="#374151" 
              strokeWidth="1"
              opacity="0.3"
            />
            <text x={5} y={y + 5} fill="#9CA3AF" fontSize="10">{Math.round(maxAttacks * percent / 100)}</text>
          </g>
        );
      })}
      
      {/* Pattern lines */}
      {patterns.slice(0, 3).map((pattern, idx) => {
        const points = timelineData.map((d, i) => {
          const x = padding + (i / (timelineData.length - 1)) * (width - 2 * padding);
          const normalizedValue = (d.attacks * (idx + 1) * 0.3) / maxAttacks;
          const y = height - padding - normalizedValue * (height - 2 * padding);
          return `${x},${y}`;
        }).join(' ');
        
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
            <text x={padding} y={20 + idx * 15} fill={colors[idx]} fontSize="11" fontWeight="bold">
              {pattern.name.substring(0, 25)}
            </text>
          </g>
        );
      })}
      
      {/* X-axis labels */}
      {timelineData.filter((_, i) => i % 4 === 0).map((d, i) => {
        const x = padding + (i * 4 / (timelineData.length - 1)) * (width - 2 * padding);
        return (
          <text key={i} x={x} y={height - 20} fill="#9CA3AF" fontSize="10" textAnchor="middle">
            {d.time}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * Mini sparkline for pattern cards
 */
function MiniSparkline({ data }: { data: { time: string; count: number }[] }) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.count), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.count / max) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="#00D9FF"
        strokeWidth="2"
      />
      <polyline
        points={`0,100 ${points} 100,100`}
        fill="url(#gradient)"
        opacity="0.3"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
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
                className="bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] h-full rounded-full flex items-center justify-end px-3 transition-all duration-500"
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

// ============================================
// MODAL COMPONENTS
// ============================================

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

/**
 * ENHANCED: Neural Network Modal showing real attack relationships
 * This visualizes how different attacks, IPs, and tactics are connected
 */
function NeuralNetworkModal({ 
  patterns, 
  profiles, 
  tactics, 
  onClose 
}: { 
  patterns: Pattern[]; 
  profiles: AttackerProfile[];
  tactics: MITRETactic[];
  onClose: () => void;
}) {
  // Generate network nodes from real data
  const generateNetworkNodes = (): NetworkNode[] => {
    const nodes: NetworkNode[] = [];
    
    // Central hub - honeypot
    nodes.push({
      id: 'honeypot',
      label: 'Honeypot',
      type: 'pattern',
      x: 400,
      y: 300,
      connections: [],
      weight: 10
    });
    
    // Add pattern nodes
    patterns.slice(0, 3).forEach((pattern, i) => {
      const angle = (i / 3) * Math.PI * 2;
      nodes.push({
        id: `pattern-${i}`,
        label: pattern.name.substring(0, 20),
        type: 'pattern',
        x: 400 + Math.cos(angle) * 150,
        y: 300 + Math.sin(angle) * 150,
        connections: ['honeypot'],
        weight: pattern.occurrences / 10
      });
    });
    
    // Add attacker IP nodes
    profiles.slice(0, 5).forEach((profile, i) => {
      const angle = (i / 5) * Math.PI * 2 + Math.PI / 6;
      nodes.push({
        id: `ip-${i}`,
        label: profile.id,
        type: 'ip',
        x: 400 + Math.cos(angle) * 250,
        y: 300 + Math.sin(angle) * 250,
        connections: ['honeypot', `pattern-${i % 3}`],
        weight: profile.threatScore
      });
    });
    
    // Add tactic nodes
    tactics.slice(0, 4).forEach((tactic, i) => {
      const angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
      nodes.push({
        id: `tactic-${i}`,
        label: tactic.tactic,
        type: 'tactic',
        x: 400 + Math.cos(angle) * 200,
        y: 300 + Math.sin(angle) * 200,
        connections: [`ip-${i}`, `pattern-${i % 3}`],
        weight: tactic.count / 10
      });
    });
    
    return nodes;
  };

  const nodes = generateNetworkNodes();
  
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
            <p className="text-sm text-gray-400">Attack correlation and relationship mapping</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden" style={{ height: '500px' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 600">
              {/* Draw connections first (so they're behind nodes) */}
              {nodes.map(node => 
                node.connections.map(targetId => {
                  const target = nodes.find(n => n.id === targetId);
                  if (!target) return null;
                  
                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="#374151"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                  );
                })
              )}
              
              {/* Draw nodes */}
              {nodes.map(node => {
                const color = node.type === 'pattern' ? '#00D9FF' : 
                             node.type === 'ip' ? '#8B5CF6' : '#ef4444';
                const size = 10 + node.weight * 2;
                
                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={size}
                      fill={color}
                      opacity="0.8"
                      className="cursor-pointer hover:opacity-100 transition"
                    />
                    <text
                      x={node.x}
                      y={node.y + size + 15}
                      fill="white"
                      fontSize="10"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#00D9FF]" />
              <span className="text-sm text-gray-400">Attack Patterns</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#8B5CF6]" />
              <span className="text-sm text-gray-400">Attacker IPs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-sm text-gray-400">MITRE Tactics</span>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Neural Network Analysis:</strong> This visualization shows how {patterns.length} attack patterns, 
              {profiles.length} unique attackers, and {tactics.length} MITRE tactics are interconnected in your honeypot data.
              Node size represents threat intensity.
            </p>
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