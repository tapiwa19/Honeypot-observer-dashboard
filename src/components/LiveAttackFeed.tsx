import { useState, useEffect } from "react";
import { Play, Terminal, X, Pause } from "lucide-react";
import { Socket } from 'socket.io-client';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

interface AttackEntry {
  id: string;
  session: string | null;
  ip: string;
  country: string;
  countryCode?: string;
  flag?: string;
  timestamp: string;
  protocol: string;
  status: "Active" | "Ended";
  type: string;
  severity: string;
  details: string;
  command?: string;
  commandCount?: number; // ✅ Track number of commands
  firstSeen?: string;
  lastSeen?: string;
}

const getRiskColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case "low":
      return "#52B788";
    case "medium":
      return "#FFA500";
    case "high":
      return "#FF4D4D";
    case "critical":
      return "#FF0000";
    default:
      return "#38B6FF";
  }
};

export function LiveAttackFeed({ 
  onNavigate,
  socket 
}: { 
  onNavigate?: (page: string) => void;
  socket?: Socket | null;
}) {
  const [attacks, setAttacks] = useState<AttackEntry[]>([]);
  const [replayingAttack, setReplayingAttack] = useState<AttackEntry | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);

  // ✅ Listen for new sessions via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('✅ [LiveFeed] WebSocket connected');
      setLiveIndicator(true);
    });

    socket.on('disconnect', () => {
      console.log('⚠️ [LiveFeed] WebSocket disconnected');
      setLiveIndicator(false);
    });

    // ✅ Add new session to feed
    socket.on('new_session', (newSession: any) => {
      console.log('🔴 [LiveFeed] New session detected:', newSession);
      
      const newAttack: AttackEntry = {
        id: newSession.sessionId,
        session: newSession.sessionId,
        ip: newSession.ip,
        country: newSession.countryName || 'Unknown',
        flag: newSession.country,
        timestamp: newSession.timestamp,
        protocol: 'SSH',
        status: 'Active',
        type: newSession.risk >= 8 ? 'Critical Attack' : 
              newSession.risk >= 6 ? 'High Risk' : 'Attack Detected',
        severity: newSession.risk >= 8 ? 'critical' : 
                  newSession.risk >= 6 ? 'high' : 
                  newSession.risk >= 4 ? 'medium' : 'low',
        details: `New attack from ${newSession.ip}`,
        command: `Session started - ${newSession.commands} commands`,
        commandCount: newSession.commands,
        firstSeen: newSession.timestamp,
        lastSeen: newSession.timestamp
      };

      // Add to top of feed
      setAttacks(prev => [newAttack, ...prev.slice(0, 19)]);
    });

    return () => {
      socket.off('new_session');
    };
  }, [socket]);

  // ✅ Fetch and GROUP attacks by session
  const fetchAttacks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/attacks`);
      const now = Date.now();

      // ✅ Group by session ID
      const sessionMap = new Map<string, AttackEntry>();

      response.data.forEach((attack: any) => {
        const sessionId = attack.session || attack.ip; // Fallback to IP if no session
        
        if (sessionMap.has(sessionId)) {
          // Update existing session
          const existing = sessionMap.get(sessionId)!;
          existing.commandCount = (existing.commandCount || 0) + 1;
          existing.lastSeen = attack.timestamp;
          
          // Update status based on time
          const lastSeenTime = new Date(existing.lastSeen!).getTime();
          const minutesAgo = (now - lastSeenTime) / (1000 * 60);
          existing.status = minutesAgo < 5 ? "Active" : "Ended";
        } else {
          // Create new session entry
          const attackTime = new Date(attack.timestamp).getTime();
          const minutesAgo = (now - attackTime) / (1000 * 60);

          sessionMap.set(sessionId, {
            id: attack.id,
            session: attack.session,
            ip: attack.ip,
            country: attack.country || 'Unknown',
            flag: attack.flag,
            timestamp: attack.timestamp,
            protocol: "SSH",
            status: minutesAgo < 5 ? "Active" : "Ended",
            type: attack.type || 'Attack Detected',
            severity: attack.severity || 'medium',
            details: attack.details || `Attack from ${attack.ip}`,
            command: attack.input || attack.details || "Session activity",
            commandCount: 1,
            firstSeen: attack.timestamp,
            lastSeen: attack.timestamp
          });
        }
      });

      // Convert to array and sort by most recent
      const groupedAttacks = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.lastSeen!).getTime() - new Date(a.lastSeen!).getTime())
        .slice(0, 20);

      setAttacks(groupedAttacks);
    } catch (error) {
      console.error('Error fetching attacks:', error);
    }
  };

  useEffect(() => {
    fetchAttacks();
    const interval = setInterval(fetchAttacks, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#475569] rounded-xl h-[500px] flex flex-col shadow-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-white" />
          <h2 className="text-white text-lg font-bold">Live Attack Feed</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${liveIndicator ? 'bg-[#10B981] animate-pulse' : 'bg-gray-500'}`} />
            <span className={`text-xs ${liveIndicator ? 'text-gray-300' : 'text-gray-500'}`}>
              {liveIndicator ? 'Live' : 'Offline'}
            </span>
          </div>
          <span className="text-gray-400 text-sm">Auto-refresh</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {attacks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-300 font-medium">No recent attacks detected</p>
            <p className="text-sm mt-2">Waiting for honeypot activity...</p>
          </div>
        ) : (
          attacks.map((attack, index) => (
            <div
              key={attack.id}
              className="bg-[#334155] rounded-lg p-4 border-l-4 hover:bg-[#3f4f64] transition-all"
              style={{
                borderLeftColor: getRiskColor(attack.severity),
                animation: `fadeInLeft 0.5s ease-out ${index * 0.05}s both`
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-[#38B6FF] text-sm font-bold">
                      {attack.ip}
                    </span>
                    <span className="text-xl">{attack.flag || attack.countryCode}</span>
                    <span className="text-gray-400 text-xs">
                      {attack.protocol}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${getRiskColor(attack.severity)}20`,
                        color: getRiskColor(attack.severity),
                        borderColor: getRiskColor(attack.severity)
                      }}
                    >
                      {attack.type}
                    </span>
                    {/* ✅ Show command count */}
                    {attack.commandCount && attack.commandCount > 1 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500">
                        {attack.commandCount} commands
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-gray-300 text-sm mb-2 truncate">
                    {attack.command || attack.details}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{new Date(attack.timestamp).toLocaleTimeString()}</span>
                    {attack.status === "Active" ? (
                      <span className="flex items-center gap-1 text-[#10B981] font-semibold">
                        <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="text-gray-500">Ended</span>
                    )}
                    {/* ✅ Show session duration */}
                    {attack.firstSeen && attack.lastSeen && (
                      <span className="text-gray-500">
                        Duration: {Math.floor((new Date(attack.lastSeen).getTime() - new Date(attack.firstSeen).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setReplayingAttack(attack)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm border border-cyan-500 whitespace-nowrap"
                  disabled={!attack.session} // ✅ Disable if no session
                  title={attack.session ? "Replay all commands from this session" : "No session data available"}
                >
                  <Play className="w-4 h-4" />
                  Replay
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-500 flex items-center gap-3">
        {onNavigate && (
          <button
            onClick={() => onNavigate("analytics")}
            className="flex-1 px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm transition-all font-medium"
          >
            View Full History
          </button>
        )}
        <button
          onClick={() => {
            const csv = attacks.map(a => 
              `${a.ip},${a.country},${a.timestamp},${a.commandCount || 0},${a.severity}`
            ).join('\n');
            const blob = new Blob([`IP,Country,Timestamp,Commands,Severity\n${csv}`], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attack_feed_${new Date().toISOString()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm border border-cyan-500 font-medium"
        >
          Export Feed
        </button>
      </div>

      {/* Replay Modal */}
      {replayingAttack && (
        <ReplayModal attack={replayingAttack} onClose={() => setReplayingAttack(null)} />
      )}
    </div>
  );
}

// ✅ Updated Replay Modal - Shows ALL commands from session
function ReplayModal({ attack, onClose }: { attack: AttackEntry; onClose: () => void }) {
  const [commandIndex, setCommandIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [commands, setCommands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommands = async () => {
      if (!attack.session) {
        setCommands([
          `$ ssh attacker@honeypot`,
          `Connected to ${attack.ip}`,
          attack.command || attack.details || 'No commands recorded',
          "$ exit",
          "Connection closed."
        ]);
        setLoading(false);
        return;
      }

      try {
        console.log(`🎬 [Replay] Fetching commands for session: ${attack.session}`);
        
        // ✅ Try to get ALL commands - backend should return all, but we'll verify
        const response = await axios.get(`${API_BASE}/sessions/${attack.session}/commands`);
        const sessionCommands = response.data.commands || [];
        
        console.log(`✅ [Replay] Received ${sessionCommands.length} commands from backend`);
        console.log(`📊 [Replay] Expected ~${attack.commandCount || 'unknown'} commands`);
        
        // ✅ Warning if we got fewer commands than expected
        if (attack.commandCount && sessionCommands.length < attack.commandCount) {
          console.warn(`⚠️ [Replay] Expected ${attack.commandCount} commands but only got ${sessionCommands.length}`);
          console.warn(`⚠️ [Replay] Backend may be limiting results. Check Elasticsearch 'size' parameter.`);
        }
        
        if (sessionCommands.length > 0) {
          const formattedCommands = [
            `$ ssh attacker@honeypot`,
            `Connected to ${attack.ip} (${attack.country})`,
            `Last login: ${new Date(attack.timestamp).toLocaleString()}`,
            `Session ID: ${attack.session}`,
            attack.commandCount && sessionCommands.length < attack.commandCount 
              ? `⚠️ Showing ${sessionCommands.length} of ${attack.commandCount} commands (backend limit)`
              : `Total commands: ${sessionCommands.length}`,
            ``,
            ...sessionCommands.map((cmd: any, index: number) => {
              const cmdText = cmd.input || cmd.command || 'unknown command';
              return `[${index + 1}/${sessionCommands.length}] $ ${cmdText}`;
            }),
            ``,
            "$ exit",
            "Connection closed."
          ];
          
          console.log(`📜 [Replay] Displaying ${formattedCommands.length} lines`);
          setCommands(formattedCommands);
        } else {
          setCommands([
            `$ ssh attacker@honeypot`,
            `Connected to ${attack.ip}`,
            attack.command || attack.details || 'Session established',
            "$ exit",
            "Connection closed."
          ]);
        }
      } catch (error) {
        console.error('Error fetching commands:', error);
        setCommands([
          `$ ssh attacker@honeypot`,
          `Connected to ${attack.ip}`,
          `Error loading session commands`,
          attack.command || attack.details || 'Session data unavailable',
          "$ exit"
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, [attack]);

  useEffect(() => {
    if (!isPlaying || commandIndex >= commands.length || loading) return;

    const timer = setTimeout(() => {
      setCommandIndex((prev) => Math.min(prev + 1, commands.length));
    }, 1000 / speed);

    return () => clearTimeout(timer);
  }, [commandIndex, isPlaying, speed, commands.length, loading]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#00D9FF]" />
            <div>
              <h3 className="text-white font-bold">Session Replay</h3>
              <p className="text-gray-400 text-sm font-mono">
                {attack.ip} • {attack.country}
                {attack.session && <span className="text-[#00D9FF]"> • {attack.session}</span>}
                {attack.commandCount && <span className="text-yellow-400"> • {attack.commandCount} commands</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-black min-h-[400px] max-h-[500px] overflow-y-auto font-mono text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {commands.slice(0, commandIndex + 1).map((cmd, index) => (
                <div
                  key={index}
                  className={`mb-2 ${
                    cmd.startsWith("$")
                      ? "text-green-400"
                      : cmd.includes("Password") || cmd.includes("login") || cmd.includes("Session")
                      ? "text-yellow-400"
                      : cmd.includes("malicious") || cmd.includes("wget") || cmd.includes("curl") || cmd.includes("rm") || cmd.includes("chmod")
                      ? "text-red-400"
                      : cmd.includes("Error") || cmd.includes("closed")
                      ? "text-gray-500"
                      : "text-gray-300"
                  }`}
                >
                  {cmd}
                </div>
              ))}
              {commandIndex < commands.length && (
                <span className="text-green-400 animate-pulse">▊</span>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00B8D9] transition-colors"
              disabled={loading}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
              disabled={loading}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
            <span className="text-gray-400 text-sm">
              {commandIndex + 1} / {commands.length}
            </span>
          </div>
          <button
            onClick={() => {
              setCommandIndex(0);
              setIsPlaying(true);
            }}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            disabled={loading}
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}