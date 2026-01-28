import { useState, useEffect } from 'react';
import { Play, Pause, Shield, MapPin, Clock, X, Download, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface Session {
  id: number | string;
  sessionId: string;
  ip: string;
  country: string;
  duration: number;
  commands: number;
  risk: number;
  timestamp: string;
  timeAgo?: string;
  status?: 'active' | 'recent' | 'closed';
  isClosed?: boolean;
}

const API_BASE = 'http://localhost:5001/api';

export function LiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk');
  const [selectedSessions, setSelectedSessions] = useState<Set<string | number>>(new Set());
  const [viewDetailsSession, setViewDetailsSession] = useState<string | null>(null);
  const [sessionCommands, setSessionCommands] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('1h');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching sessions from:', `${API_BASE}/sessions/live`);
      const response = await axios.get(`${API_BASE}/sessions/live`);
      console.log('✅ Received sessions:', response.data);
      console.log('📊 Number of sessions:', response.data.length);
      
      // Filter based on selected time range
      let filteredByTime = response.data;
      const now = Date.now();
      
      if (timeRange === '1h') {
        const oneHourAgo = now - 3600000;
        filteredByTime = response.data.filter((session: Session) => {
          const sessionTime = new Date(session.timestamp).getTime();
          return sessionTime >= oneHourAgo;
        });
      } else if (timeRange === '24h') {
        const oneDayAgo = now - 86400000;
        filteredByTime = response.data.filter((session: Session) => {
          const sessionTime = new Date(session.timestamp).getTime();
          return sessionTime >= oneDayAgo;
        });
      } else if (timeRange === '7d') {
        const sevenDaysAgo = now - 604800000;
        filteredByTime = response.data.filter((session: Session) => {
          const sessionTime = new Date(session.timestamp).getTime();
          return sessionTime >= sevenDaysAgo;
        });
      }
      // 'all' shows everything
      
      console.log(`⏰ Sessions in ${timeRange} range:`, filteredByTime.length);
      setSessions(filteredByTime);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionCommands = async (sessionId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/sessions/${sessionId}/commands`);
      // Backend returns { session_id, commands: [{input, timestamp}], total }
      // Transform to match our expected format
      const transformedCommands = response.data.commands.map((cmd: any, index: number) => ({
        id: index + 1,
        command: cmd.input,
        timestamp: cmd.timestamp,
        output: '' // Backend doesn't provide output in this endpoint
      }));
      setSessionCommands(transformedCommands);
    } catch (err) {
      console.error('Error fetching commands:', err);
      setSessionCommands([]);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...sessions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.ip.includes(searchTerm) || 
        s.sessionId.includes(searchTerm) ||
        s.country.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Severity filter
    if (severityFilter === 'critical') {
      filtered = filtered.filter(s => s.risk >= 8);
    } else if (severityFilter === 'high') {
      filtered = filtered.filter(s => s.risk >= 6 && s.risk < 8);
    } else if (severityFilter === 'medium') {
      filtered = filtered.filter(s => s.risk >= 4 && s.risk < 6);
    }

    // Sort
    if (sortBy === 'risk') {
      filtered.sort((a, b) => b.risk - a.risk);
    } else if (sortBy === 'duration') {
      filtered.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === 'commands') {
      filtered.sort((a, b) => b.commands - a.commands);
    }

    setFilteredSessions(filtered);
  }, [sessions, severityFilter, sortBy, searchTerm]);

  const handleSelectSession = (id: string | number) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleBulkExport = () => {
    const selectedData = filteredSessions.filter(s => selectedSessions.has(s.id));
    const csv = convertToCSV(selectedData);
    downloadCSV(csv, `sessions_export_${new Date().toISOString()}.csv`);
  };

  const convertToCSV = (data: any[]) => {
    const headers = ['IP', 'Country', 'Duration', 'Commands', 'Risk', 'Timestamp'];
    const rows = data.map(s => [s.ip, s.country, s.duration, s.commands, s.risk, s.timestamp]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchSessions();

    if (autoRefresh) {
      const interval = setInterval(fetchSessions, 300000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);

  const handleViewDetails = async (sessionId: string) => {
    setViewDetailsSession(sessionId);
    await fetchSessionCommands(sessionId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#00D9FF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading live sessions...</p>
        </motion.div>
      </div>
    );
  }

  // Calculate stats
  const totalSessions = sessions.length;
  const uniqueIPs = new Set(sessions.map(s => s.ip)).size;
  const totalCommands = sessions.reduce((sum, s) => sum + s.commands, 0);
  const avgRisk = sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.risk, 0) / sessions.length).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-white mb-2">Live Attack Sessions</h1>
            <p className="text-gray-400">Real-time monitoring of active SSH intrusions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                autoRefresh 
                  ? 'bg-green-500/20 text-green-400 border border-green-500' 
                  : 'bg-gray-700 text-gray-300 border border-gray-600'
              }`}
            >
              {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Sessions", value: totalSessions.toString(), icon: Shield, color: "#00D9FF" },
            { label: "Unique IPs", value: uniqueIPs.toString(), icon: MapPin, color: "#8B5CF6" },
            { label: "Total Commands", value: totalCommands.toString(), icon: Circle, color: "#FF6B35" },
            { label: "Avg Risk Score", value: avgRisk, icon: Clock, color: "#FFA500" },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all"
                style={{ '--hover-color': stat.color } as any}
              >
                <Icon className="w-8 h-8 mb-3" style={{ color: stat.color }} />
                <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                <p className="text-white text-2xl font-bold">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-3 mb-6 p-4 bg-gray-800/90 border border-gray-700 rounded-xl shadow-sm">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | 'all')}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D9FF]"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>

          <select 
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D9FF]"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical (8-10)</option>
            <option value="high">High (6-7)</option>
            <option value="medium">Medium (4-5)</option>
          </select>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#00D9FF]"
          >
            <option value="risk">Sort by Risk</option>
            <option value="duration">Sort by Duration</option>
            <option value="commands">Sort by Commands</option>
          </select>

          <input
            type="text"
            placeholder="Search IP, session ID, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00D9FF]"
          />

          {selectedSessions.size > 0 && (
            <button
              onClick={handleBulkExport}
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500 rounded-lg text-sm hover:bg-green-500/30 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export ({selectedSessions.size})
            </button>
          )}

          {(severityFilter !== 'all' || searchTerm || selectedSessions.size > 0) && (
            <button
              onClick={() => {
                setSeverityFilter('all');
                setSearchTerm('');
                setSelectedSessions(new Set());
              }}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Live indicator */}
        <div className="mb-6 bg-gray-800/90 border border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">LIVE MONITORING</span>
              <span className="text-gray-400">|</span>
              <span className="text-[#00D9FF]">{filteredSessions.length} active session{filteredSessions.length !== 1 ? 's' : ''}</span>
              {selectedSessions.size > 0 && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-yellow-400">{selectedSessions.size} selected</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/90 border border-gray-700 rounded-xl p-12 text-center shadow-sm"
          >
            <div className="text-6xl mb-4">🕐</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {searchTerm || severityFilter !== 'all' ? 'No Matching Sessions' : 'No Active Sessions'}
            </h2>
            <p className="text-gray-400">
              {searchTerm || severityFilter !== 'all' 
                ? 'Try adjusting your filters or search term' 
                : 'Waiting for incoming SSH connections...'}
            </p>
            
            {sessions.length > 0 && (searchTerm || severityFilter !== 'all') && (
              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setSearchTerm('');
                }}
                className="mt-4 px-6 py-2 bg-[#00D9FF] text-white rounded-lg font-medium hover:bg-[#00D9FF]/80 transition-all"
              >
                Clear Filters
              </button>
            )}

            {totalSessions > 0 && !searchTerm && severityFilter === 'all' && (
              <div className="mt-8 p-4 bg-gray-900/50 rounded-lg inline-block">
                <h3 className="text-white font-bold mb-2">Today's Statistics</h3>
                <div className="text-gray-400 text-sm space-y-1">
                  <div>Total Sessions: <span className="text-[#00D9FF] font-bold">{totalSessions}</span></div>
                  <div>Total Commands: <span className="text-[#00D9FF] font-bold">{totalCommands}</span></div>
                  <div>Average Risk: <span className="text-[#00D9FF] font-bold">{avgRisk}/10</span></div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Select All */}
            <div className="mb-4 flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 cursor-pointer accent-[#00D9FF]"
              />
              <span className="text-sm text-gray-400">
                Select All ({filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''})
              </span>
            </div>

            <motion.div 
              layout
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredSessions.map(session => (
                  <SessionCard 
                    key={session.id} 
                    session={session}
                    expanded={expandedSession === session.id}
                    selected={selectedSessions.has(session.id)}
                    onToggle={() => setExpandedSession(
                      expandedSession === session.id ? null : session.id
                    )}
                    onSelect={() => handleSelectSession(session.id)}
                    onViewDetails={() => handleViewDetails(session.sessionId)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}

        {/* Session Details Drawer */}
        <AnimatePresence>
          {viewDetailsSession && (
            <SessionDetailsDrawer
              sessionId={viewDetailsSession}
              commands={sessionCommands}
              onClose={() => setViewDetailsSession(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Session Card Component
interface SessionCardProps {
  session: Session;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onViewDetails: () => void;
}

function SessionCard({ session, expanded, selected, onToggle, onSelect, onViewDetails }: SessionCardProps) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const downloadSessionLog = () => {
    const log = `Session Log - ${session.ip}\n` +
      `Started: ${new Date(session.timestamp).toLocaleString()}\n` +
      `Duration: ${formatDuration(session.duration)}\n` +
      `Commands: ${session.commands}\n` +
      `Risk: ${session.risk}/10\n`;
    
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${session.sessionId}_log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 8) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' };
    if (risk >= 6) return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' };
    return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' };
  };

  const riskColors = getRiskColor(session.risk);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-gray-800/90 border rounded-xl overflow-hidden hover:shadow-lg transition-all ${
        selected 
          ? 'border-[#00D9FF] shadow-lg shadow-[#00D9FF]/20' 
          : 'border-gray-700 hover:border-[#00D9FF]/50'
      }`}
    >
      <div className="p-5">
        {/* Header with checkbox */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="mt-1 w-4 h-4 cursor-pointer accent-[#00D9FF]"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              <code className="text-xl font-mono font-bold text-white block mb-2">{session.ip}</code>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{session.country}</span>
                {session.status === 'active' ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded border border-green-500/40 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    ACTIVE
                  </span>
                ) : session.status === 'recent' ? (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded border border-yellow-500/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    RECENT
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded border border-gray-500/40 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    CLOSED
                  </span>
                )}
                {session.timeAgo && (
                  <span className="text-gray-500 text-xs">({session.timeAgo})</span>
                )}
              </div>
            </div>
          </div>
          <div className={`text-2xl font-bold ${riskColors.text}`}>
            {session.risk}/10
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-xs">Duration</span>
            </div>
            <div className="text-white font-mono font-medium">{formatDuration(session.duration)}</div>
          </div>
          <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-xs">Commands</span>
            </div>
            <div className="text-white font-mono font-medium">{session.commands}</div>
          </div>
        </div>

        {/* Session ID */}
        <div className="mb-4 bg-gray-900/60 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 text-xs mb-1">Session ID</div>
          <code className="text-[#00D9FF] text-xs font-mono break-all">{session.sessionId}</code>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onToggle}
            className="w-full px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all flex items-center justify-center gap-2"
          >
            {expanded ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {expanded ? 'Hide Details' : 'View Details'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={downloadSessionLog}
              className="px-3 py-2 bg-gray-700 text-white text-xs font-medium rounded-lg hover:bg-gray-600 transition-all flex items-center justify-center gap-1"
              title="Download Session Log"
            >
              <Download className="w-3 h-3" />
              Log
            </button>
            <button
              onClick={onViewDetails}
              className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-1"
              title="View Session Recording"
            >
              <Circle className="w-3 h-3 fill-current" />
              Rec
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-black/40 border-t border-gray-700 overflow-hidden"
          >
            <div className="p-4 font-mono text-sm">
              <div className="text-green-400 mb-2 flex items-center gap-2">
                <span>$</span>
                <span>Session Details:</span>
              </div>
              <div className="text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  <span>IP:</span>
                  <span className="text-[#00D9FF]">{session.ip}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Started:</span>
                  <span className="text-[#00D9FF]">{new Date(session.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  <span>Commands Executed:</span>
                  <span className="text-[#00D9FF]">{session.commands}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3" />
                  <span>Risk Score:</span>
                  <span className={`font-bold ${riskColors.text}`}>{session.risk}/10</span>
                </div>
              </div>
              {session.commands > 0 ? (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs">
                  ⚠️ Attacker executed {session.commands} command{session.commands !== 1 ? 's' : ''}
                </div>
              ) : (
                <div className="mt-3 text-gray-500 text-xs">
                  No commands executed yet...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Session Details Drawer Component
function SessionDetailsDrawer({ sessionId, commands, onClose }: { sessionId: string; commands: any[]; onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const filteredCommands = commands.filter(cmd => 
    cmd.command.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyCommand = (command: string, index: number) => {
    navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full border-2 border-[#00D9FF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Session Command History</h2>
            <code className="text-[#00D9FF] text-sm">{sessionId}</code>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-gray-700">
          <input
            type="text"
            placeholder="🔍 Search commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-[#00D9FF] placeholder:text-gray-500"
          />
        </div>

        {/* Commands List */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>{searchTerm ? 'No matching commands found' : 'No commands executed yet'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredCommands.map((cmd, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-gray-800/90 rounded-lg p-4 border border-gray-700 hover:border-[#00D9FF]/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[#00D9FF]/20 text-[#00D9FF] text-xs rounded border border-[#00D9FF]/30">
                          #{cmd.id}
                        </span>
                        <span className="text-gray-500 text-xs">{new Date(cmd.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <button
                        onClick={() => copyCommand(cmd.command, index)}
                        className="px-3 py-1 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] text-xs rounded hover:bg-[#00D9FF]/30 transition-all flex items-center gap-1"
                      >
                        {copiedIndex === index ? (
                          <>✓ Copied</>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-green-400 font-mono text-sm block bg-black p-3 rounded border border-gray-800">
                      $ {cmd.command}
                    </code>
                    {cmd.output && (
                      <div className="mt-2 text-gray-400 text-sm font-mono bg-black p-3 rounded border border-gray-800">
                        {cmd.output}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center">
          <div className="text-gray-400 text-sm">
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''} found
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}