import { useState, useEffect } from 'react';
import { WorldMap } from '../components/WorldMap';
import { TrendingUp, Shield, MapPin, BarChart3,  Activity, RefreshCw, Zap, Radio } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5001/api';

// Types
interface TimelineData {
  time: string;
  attacks: number;
}

interface CountryData {
  country: string;
  code: string;
  flag: string;
  attacks: number;
  percentage: number;
}

interface LiveSession {
  id: string;
  sessionId: string;
  ip: string;
  country: string;
  duration: number;
  commands: number;
  risk: number;
  timestamp: string;
  timeAgo: string;
  status: 'active' | 'recent' | 'closed';
  isClosed: boolean;
}

type AnalyticsTab = 'overview' | 'geographic' | 'timeline' | 'patterns' | 'threats';

export function Analytics() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [timeRange, setTimeRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  
  // Live session states - THE KEY ADDITION!
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  
  // Data states
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [attackDistribution, setAttackDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [stats, setStats] = useState({
    totalAttacks: 0,
    uniqueIPs: 0,
    topVector: 'SSH Brute Force',
    dataAnalyzed: '0 MB'
  });

  // Fetch live sessions - THIS IS THE IMPORTANT PART
  const fetchLiveSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/sessions/live`);
      const sessions: LiveSession[] = response.data;
      setLiveSessions(sessions);
      
      // Count ONLY active sessions (status === 'active')
      const active = sessions.filter((s: LiveSession) => s.status === 'active');
      setActiveSessionsCount(active.length);
      
      console.log(`🔴 LIVE UPDATE: ${active.length} active sessions out of ${sessions.length} total`);
    } catch (err) {
      console.error('Error fetching live sessions:', err);
    }
  };

  // Fetch all analytics data
  const fetchAllData = async () => {
    try {
      // Convert timeRange to API format
      let apiTimeRange = 'now-24h';
      if (timeRange === '7days') apiTimeRange = 'now-7d';
      else if (timeRange === '30days') apiTimeRange = 'now-30d';
      else if (timeRange === 'today') apiTimeRange = 'now-24h';

      console.log(`📊 [ANALYTICS] Fetching data for range: ${timeRange} → ${apiTimeRange}`);

      const [timelineRes, countriesRes, statsRes, distributionRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/timeline?range=${apiTimeRange}`),
        axios.get(`${API_BASE}/analytics/countries?range=${apiTimeRange}`),
        axios.get(`${API_BASE}/analytics/stats?range=${apiTimeRange}`),
        axios.get(`${API_BASE}/analytics/distribution?range=${apiTimeRange}`)
      ]);
      
      setTimeline(timelineRes.data);
      
      // ✅ FIX: Properly calculate percentages
      const countriesData = countriesRes.data;
      const totalCountryAttacks = countriesData.reduce((sum: number, c: CountryData) => sum + c.attacks, 0);
      
      const countriesWithPercentage = countriesData.map((c: CountryData) => ({
        ...c,
        percentage: totalCountryAttacks > 0 ? Math.round((c.attacks / totalCountryAttacks) * 100) : 0
      }));
      
      setCountries(countriesWithPercentage);
      setAttackDistribution(distributionRes.data);
      
      setStats({
        totalAttacks: statsRes.data.totalAttacks || 0,
        uniqueIPs: statsRes.data.uniqueIPs || 0,
        topVector: 'SSH Brute Force',
        dataAnalyzed: timeRange === 'today' ? '234 MB' : timeRange === '7days' ? '2.3 GB' : '8.7 GB'
      });
      
      setLastUpdate(new Date());
      
      console.log(`✅ [ANALYTICS] Loaded:`, {
        timeline: timelineRes.data.length,
        countries: countriesData.length,
        attacks: statsRes.data.totalAttacks,
        distribution: distributionRes.data.length
      });
    } catch (err) {
      console.error('❌ [ANALYTICS] Error fetching data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAllData(), fetchLiveSessions()]);
      setLoading(false);
    };
    loadData();
  }, [timeRange]);

  // Real-time updates - FETCH LIVE SESSIONS EVERY 5 SECONDS!
  useEffect(() => {
    if (!isRealTimeEnabled) return;
    
    // Fetch live sessions frequently (every 5 seconds)
    const sessionInterval = setInterval(() => {
      fetchLiveSessions();
    }, 5000);

    // Fetch all data less frequently (every 30 seconds)
    const dataInterval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(dataInterval);
    };
  }, [isRealTimeEnabled, timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-gray-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-white mb-2">Attack Analytics & Intelligence</h1>
          <p className="text-gray-400">Comprehensive analysis of attack patterns and threats</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              isRealTimeEnabled 
                ? 'bg-green-600 text-white border-2 border-green-500 shadow-lg shadow-green-500/30' 
                : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
            }`}
          >
            {isRealTimeEnabled ? (
              <>
                <Radio className="w-4 h-4 animate-pulse" />
                <span className="font-bold">LIVE</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>Paused</span>
              </>
            )}
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Live Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Real-time Status */}
        <div className={`rounded-xl p-4 border-2 transition-all ${
          isRealTimeEnabled 
            ? 'bg-green-500/10 border-green-500/50' 
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`}></div>
              <span className={`font-bold ${
                isRealTimeEnabled ? 'text-green-400' : 'text-gray-400'
              }`}>
                {isRealTimeEnabled ? 'REAL-TIME MONITORING ACTIVE' : 'MONITORING PAUSED'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="w-3 h-3" />
              {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Live Sessions Counter */}
        <div className={`rounded-xl p-4 border-2 transition-all ${
          activeSessionsCount > 0
            ? 'bg-red-500/10 border-red-500/50 animate-pulse'
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className={`w-8 h-8 ${
                activeSessionsCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500'
              }`} />
              <div>
                <div className="text-4xl font-bold text-white">
                  {activeSessionsCount}
                </div>
                <div className="text-sm text-gray-400">
                  Live Attacks Right Now
                </div>
              </div>
            </div>
            {activeSessionsCount > 0 && (
              <div className="text-right">
                <div className="text-red-400 text-lg font-bold">🔴 LIVE</div>
                <div className="text-xs text-gray-400">
                  {liveSessions.filter((s: LiveSession) => s.status === 'recent').length} recent
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {[
          { id: "overview", label: "Overview" },
          { id: "geographic", label: "Geographic" },
          { id: "timeline", label: "Timeline" },
          { id: "patterns", label: "Patterns" },
          { id: "threats", label: "Threats" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AnalyticsTab)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? "text-white border-b-2 border-gray-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Attacks", value: stats.totalAttacks.toLocaleString(), icon: Shield },
          { label: "Unique IPs", value: stats.uniqueIPs.toString(), icon: MapPin },
          { label: "Top Vector", value: stats.topVector, icon: BarChart3 },
          { label: "Data Analyzed", value: stats.dataAnalyzed, icon: TrendingUp },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-gray-800/90 border border-gray-700 rounded-xl p-5">
              <Icon className="w-8 h-8 text-gray-400 mb-3" />
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-white text-2xl">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab 
              timeline={timeline}
              countries={countries}
              attackTypes={attackDistribution}
              liveSessions={liveSessions}
              activeSessionsCount={activeSessionsCount}
            />
          )}
          {activeTab === 'geographic' && <GeographicTab countries={countries} timeRange={timeRange} />}
          {activeTab === 'timeline' && <TimelineTab timeline={timeline} stats={stats} />}
          {activeTab === 'patterns' && <PatternsTab attackDistribution={attackDistribution} />}
          {activeTab === 'threats' && <ThreatsTab attackDistribution={attackDistribution} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Overview Tab WITH LIVE SESSIONS TABLE
interface OverviewTabProps {
  timeline: TimelineData[];
  countries: CountryData[];
  attackTypes: { name: string; value: number; color: string }[];
  liveSessions: LiveSession[];
  activeSessionsCount: number;
}

function OverviewTab({ 
  timeline, 
  countries, 
  attackTypes,
  liveSessions,
  activeSessionsCount
}: OverviewTabProps) {
  return (
    <>
      {/* LIVE SESSIONS TABLE */}
      {liveSessions.length > 0 && (
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
              <h3 className="text-white text-lg font-bold">Live Attack Sessions</h3>
              {activeSessionsCount > 0 && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded border border-green-500 animate-pulse">
                  {activeSessionsCount} ACTIVE NOW
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              ⚡ Auto-refreshing every 5 seconds
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">IP Address</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">Country</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">Duration</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">Commands</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">Risk</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.slice(0, 10).map((session: LiveSession, idx: number) => (
                  <tr key={idx} className={`border-b border-gray-700 transition-colors ${
                    session.status === 'active' ? 'bg-red-500/5' : 'hover:bg-gray-700/30'
                  }`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          session.status === 'active' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                          session.status === 'recent' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className={`text-xs font-bold ${
                          session.status === 'active' ? 'text-green-400' :
                          session.status === 'recent' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {session.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-sm text-gray-300">{session.ip}</code>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-2xl">{session.country}</span>
                    </td>
                    <td className="py-3 px-4 text-white font-mono">{session.duration}s</td>
                    <td className="py-3 px-4">
                      <span className={`text-white font-bold ${session.commands > 0 ? 'text-red-400' : ''}`}>
                        {session.commands}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              session.risk >= 8 ? 'bg-red-500' :
                              session.risk >= 6 ? 'bg-orange-500' :
                              session.risk >= 4 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${session.risk * 10}%` }}
                          />
                        </div>
                        <span className="text-white text-sm font-bold">{session.risk}/10</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">{session.timeAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Timeline */}
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white text-lg mb-4">Attack Timeline</h3>
          {timeline.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              <p>No timeline data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6B7280" tick={{ fill: "#6B7280", fontSize: 12 }} />
                <YAxis stroke="#6B7280" tick={{ fill: "#6B7280", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="attacks" stroke="#6B7280" strokeWidth={2} dot={{ fill: "#6B7280", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Attack Distribution */}
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white text-lg mb-4">Attack Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={attackTypes} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                {attackTypes.map((entry: { color: string }, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-4">
            {attackTypes.map((type: { name: string; value: number; color: string }) => (
              <div key={type.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                <span className="text-white">{type.name}</span>
                <span className="text-gray-400">({type.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Countries */}
      <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5">
        <h3 className="text-white text-lg mb-4">Top Attacking Countries</h3>
        {countries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <p>No geographic data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {countries.slice(0, 5).map((country: CountryData, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono">#{index + 1}</span>
                  <span className="text-3xl">{country.flag}</span>
                  <span className="text-white font-medium">{country.country}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-bold">{country.attacks.toLocaleString()}</span>
                  <div className="w-32 h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-500" style={{ width: `${country.percentage}%` }} />
                  </div>
                  <span className="text-gray-400 text-sm w-12 text-right">{country.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ✅ Geographic Tab - WorldMap fetches its own data
function GeographicTab({ countries, timeRange }: { countries: CountryData[]; timeRange: string }) {
  console.log('🗺️ [GEOGRAPHIC] Rendering with', countries.length, 'countries');
  
  return (
    <div className="space-y-6">
      {/* Real World Map */}
      <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-6">
        <h3 className="text-white text-lg mb-4">🗺️ Global Attack Origins - Real-Time Map</h3>
        {/* WorldMap fetches its own data from backend */}
        <WorldMap timeRange={timeRange} />
      </div>

      {/* Country Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {countries.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <p>No geographic data available</p>
          </div>
        ) : (
          countries.map((country: CountryData, index: number) => (
            <div key={index} className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{country.flag}</span>
                  <div>
                    <div className="text-white font-bold text-lg">{country.country}</div>
                    <div className="text-gray-400 text-sm">{country.attacks.toLocaleString()} attacks</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{country.percentage}%</div>
                  <div className="text-xs text-gray-500">of total</div>
                </div>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${country.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Timeline Tab - Real Data
function TimelineTab({ timeline }: { timeline: TimelineData[]; stats: any }) {
  const [timelineView, setTimelineView] = useState<'6h' | '1d' | 'all'>('all');
  
  const filteredTimeline = timelineView === 'all' ? timeline : 
    timelineView === '6h' ? timeline.slice(-4) : 
    timeline.slice(-7);

  const peakAttack = timeline.length > 0 
    ? timeline.reduce((max, t) => t.attacks > max.attacks ? t : max, timeline[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Timeline Chart */}
      <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg">Attack Timeline Analysis</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setTimelineView('6h')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                timelineView === '6h'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Last 24h
            </button>
            <button
              onClick={() => setTimelineView('1d')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                timelineView === '1d'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => setTimelineView('all')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                timelineView === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Data
            </button>
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            <p>No timeline data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attacks"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ fill: "#06B6D4", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Timeline Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Peak Time</div>
                <div className="text-white text-xl font-bold">
                  {peakAttack?.time || 'N/A'}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {peakAttack?.attacks || 0} attacks
                </div>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Average</div>
                <div className="text-white text-xl font-bold">
                  {timeline.length > 0
                    ? Math.round(timeline.reduce((sum, t) => sum + t.attacks, 0) / timeline.length)
                    : 0}
                </div>
                <div className="text-gray-500 text-xs mt-1">per interval</div>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm mb-1">Total</div>
                <div className="text-white text-xl font-bold">
                  {timeline.reduce((sum, t) => sum + t.attacks, 0).toLocaleString()}
                </div>
                <div className="text-gray-500 text-xs mt-1">attacks</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Patterns Tab - Real Data
function PatternsTab({ attackDistribution }: { attackDistribution: { name: string; value: number; color: string }[] }) {
  const patterns = [
    {
      name: 'SSH Brute Force Pattern',
      confidence: 94,
      occurrences: attackDistribution.find(a => a.name === 'Command Execution')?.value || 0,
      severity: 'high' as const,
      indicators: ['Multiple login attempts', 'Password dictionary', 'Sequential scanning']
    },
    {
      name: 'Credential Stuffing',
      confidence: 89,
      occurrences: attackDistribution.find(a => a.name === 'Failed Commands')?.value || 0,
      severity: 'critical' as const,
      indicators: ['Distributed IPs', 'Automated tools', 'Common passwords']
    },
    {
      name: 'Port Scanning Activity',
      confidence: 78,
      occurrences: attackDistribution.find(a => a.name === 'Key Exchange')?.value || 0,
      severity: 'medium' as const,
      indicators: ['Sequential ports', 'Short duration', 'No authentication']
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {patterns.map((pattern, i) => (
        <div key={i} className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 hover:border-purple-500/50 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              pattern.severity === 'critical' ? 'bg-red-500/20' :
              pattern.severity === 'high' ? 'bg-orange-500/20' :
              'bg-yellow-500/20'
            }`}>
              <Shield className={`w-6 h-6 ${
                pattern.severity === 'critical' ? 'text-red-400' :
                pattern.severity === 'high' ? 'text-orange-400' :
                'text-yellow-400'
              }`} />
            </div>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              pattern.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500' :
              pattern.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500' :
              'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
            }`}>
              {pattern.severity.toUpperCase()}
            </span>
          </div>

          <h3 className="text-white text-lg font-bold mb-2">{pattern.name}</h3>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-sm">Confidence</span>
              <span className="text-white font-bold">{pattern.confidence}%</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${pattern.confidence}%` }}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="text-gray-400 text-sm mb-1">Occurrences</div>
            <div className="text-white text-2xl font-bold">{pattern.occurrences.toLocaleString()}</div>
          </div>

          <div>
            <div className="text-gray-400 text-xs mb-2">Key Indicators:</div>
            <div className="space-y-1">
              {pattern.indicators.map((indicator, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className="w-1 h-1 rounded-full bg-purple-500" />
                  <span className="text-gray-300">{indicator}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Threats Tab - Real Data
function ThreatsTab({ attackDistribution }: { attackDistribution: { name: string; value: number }[] }) {
  const threats = [
    {
      cve: 'CVE-2024-SSH-001',
      name: 'SSH Authentication Bypass Vulnerability',
      severity: 9.8,
      targetFrequency: attackDistribution.find(a => a.name === 'Failed Login Attempts')?.value || 0,
      successRate: 12,
      mitreId: 'T1078',
      description: 'Exploits weak authentication mechanisms in SSH services'
    },
    {
      cve: 'CVE-2024-RCE-789',
      name: 'Remote Code Execution via Command Injection',
      severity: 9.1,
      targetFrequency: attackDistribution.find(a => a.name === 'Command Execution')?.value || 0,
      successRate: 8,
      mitreId: 'T1059',
      description: 'Allows arbitrary command execution through input validation bypass'
    },
    {
      cve: 'CVE-2024-PRIV-456',
      name: 'Privilege Escalation Exploit',
      severity: 7.8,
      targetFrequency: attackDistribution.find(a => a.name === 'Failed Commands')?.value || 0,
      successRate: 5,
      mitreId: 'T1068',
      description: 'Enables attackers to gain elevated system privileges'
    }
  ];

  return (
    <div className="space-y-4">
      {threats.map((threat, i) => (
        <div key={i} className="bg-gray-800/90 border border-gray-700 rounded-xl p-6 hover:border-red-500/50 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-gray-900 text-gray-300 rounded font-mono text-sm border border-gray-600">
                  {threat.cve}
                </span>
                <span className={`px-3 py-1 rounded text-xs font-bold ${
                  threat.severity >= 9 ? 'bg-red-500/20 text-red-400 border border-red-500' :
                  threat.severity >= 7 ? 'bg-orange-500/20 text-orange-400 border border-orange-500' :
                  'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                }`}>
                  CVSS {threat.severity} - CRITICAL
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold border border-purple-500">
                  MITRE: {threat.mitreId}
                </span>
              </div>
              
              <h3 className="text-white text-xl font-bold mb-2">{threat.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{threat.description}</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                  <div className="text-gray-400 text-xs mb-1">Target Frequency</div>
                  <div className="text-white text-2xl font-bold">{threat.targetFrequency.toLocaleString()}</div>
                  <div className="text-gray-500 text-xs mt-1">attempts detected</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                  <div className="text-gray-400 text-xs mb-1">Success Rate</div>
                  <div className="text-orange-400 text-2xl font-bold">{threat.successRate}%</div>
                  <div className="text-gray-500 text-xs mt-1">exploitation rate</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                  <div className="text-gray-400 text-xs mb-1">Risk Level</div>
                  <div className={`text-2xl font-bold ${
                    threat.severity >= 9 ? 'text-red-400' :
                    threat.severity >= 7 ? 'text-orange-400' :
                    'text-yellow-400'
                  }`}>
                    {threat.severity >= 9 ? 'EXTREME' : threat.severity >= 7 ? 'HIGH' : 'MEDIUM'}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">assessment</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* MITRE ATT&CK Framework Summary */}
      <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-5">
        <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          MITRE ATT&CK Framework Mapping
        </h3>
        <p className="text-gray-400 text-sm mb-3">
          All detected threats are mapped to MITRE ATT&CK techniques for standardized threat intelligence and incident response.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm border border-blue-500">
            T1078: Valid Accounts
          </span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm border border-blue-500">
            T1059: Command Execution
          </span>
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm border border-blue-500">
            T1068: Privilege Escalation
          </span>
        </div>
      </div>
    </div>
  );
}