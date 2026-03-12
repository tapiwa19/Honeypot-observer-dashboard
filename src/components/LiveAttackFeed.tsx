import { useState, useEffect, useRef } from "react";
import { Play, Terminal, X, Pause } from "lucide-react";
import { Socket } from 'socket.io-client';
import axios from 'axios';

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
  commands: string[];
  commandCount: number;
  firstSeen: string;
  lastSeen: string;
}

// ✅ Always returns a safe AttackEntry — no undefined fields ever
function safeEntry(entry: Partial<AttackEntry>): AttackEntry {
  return {
    id: entry.id || Math.random().toString(36),
    session: entry.session || null,
    ip: entry.ip || 'unknown',
    country: entry.country || 'Unknown',
    flag: entry.flag || '',
    timestamp: entry.timestamp || new Date().toISOString(),
    protocol: entry.protocol || 'SSH',
    status: entry.status || 'Ended',
    type: entry.type || 'Attack Detected',
    severity: entry.severity || 'medium',
    details: entry.details || '',
    commands: Array.isArray(entry.commands) ? entry.commands : [],
    commandCount: typeof entry.commandCount === 'number' ? entry.commandCount : 0,
    firstSeen: entry.firstSeen || entry.timestamp || new Date().toISOString(),
    lastSeen: entry.lastSeen || entry.timestamp || new Date().toISOString(),
  };
}

const getRiskColor = (severity?: string) => {
  switch ((severity || '').toLowerCase()) {
    case "low":      return "#52B788";
    case "medium":   return "#FFA500";
    case "high":     return "#FF4D4D";
    case "critical": return "#FF0000";
    default:         return "#38B6FF";
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

  useEffect(() => {
    if (!socket) return;

    if (socket.connected) setLiveIndicator(true);

    socket.on('connect', () => setLiveIndicator(true));
    socket.on('disconnect', () => setLiveIndicator(false));

    socket.on('new_session', (newSession: any) => {
      setAttacks(prev => {
        const existingIndex = prev.findIndex(a => a.session === newSession.sessionId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = safeEntry({
            ...updated[existingIndex],
            commandCount: newSession.commands || 0,
            lastSeen: newSession.timestamp,
            status: 'Active'
          });
          return updated;
        } else {
          return [safeEntry({
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
            details: `Attack from ${newSession.ip}`,
            commands: [],
            commandCount: newSession.commands || 0,
            firstSeen: newSession.timestamp,
            lastSeen: newSession.timestamp
          }), ...prev.slice(0, 19)];
        }
      });
    });

    socket.on('session_updated', (updatedSession: any) => {
      setAttacks(prev => prev.map(a => 
        a.session === updatedSession.sessionId
          ? safeEntry({ ...a, commandCount: updatedSession.commands || 0, lastSeen: updatedSession.timestamp, status: 'Active' })
          : a
      ));
    });

    socket.on('session_closed', (data: { sessionId: string }) => {
      setAttacks(prev => prev.map(a => 
        a.session === data.sessionId ? safeEntry({ ...a, status: 'Ended' }) : a
      ));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_session');
      socket.off('session_updated');
      socket.off('session_closed');
    };
  }, [socket]);

  const fetchAttacks = async () => {
    try {
      const response = await axios.get(`/dashboard/attacks`);
      const now = Date.now();
      const sessionMap = new Map<string, AttackEntry>();

      (response.data || []).forEach((attack: any) => {
        const sessionId = attack.session || attack.ip || 'unknown';

        if (sessionMap.has(sessionId)) {
          const existing = sessionMap.get(sessionId)!;
          if (!Array.isArray(existing.commands)) existing.commands = [];
          if (attack.input) existing.commands.push(String(attack.input));
          existing.commandCount = existing.commands.length;
          existing.lastSeen = attack.timestamp || existing.lastSeen;
          if (attack.severity === 'critical') existing.severity = 'critical';
          else if (attack.severity === 'high' && existing.severity !== 'critical') existing.severity = 'high';
          const lastSeenTime = new Date(existing.lastSeen).getTime();
          existing.status = (now - lastSeenTime) / (1000 * 60) < 5 ? "Active" : "Ended";
        } else {
          const attackTime = new Date(attack.timestamp).getTime();
          const minutesAgo = (now - attackTime) / (1000 * 60);
          const cmds = attack.input ? [String(attack.input)] : [];
          sessionMap.set(sessionId, safeEntry({
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
            commands: cmds,
            commandCount: cmds.length,
            firstSeen: attack.timestamp,
            lastSeen: attack.timestamp
          }));
        }
      });

      const groupedAttacks = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
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
          attacks.map((attack, index) => {
            const cmds = Array.isArray(attack.commands) ? attack.commands : [];
            const riskColor = getRiskColor(attack.severity);
            return (
              <div
                key={attack.id || index}
                className="bg-[#334155] rounded-lg p-4 border-l-4 hover:bg-[#3f4f64] transition-all"
                style={{
                  borderLeftColor: riskColor,
                  animation: `fadeInLeft 0.5s ease-out ${index * 0.05}s both`
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-[#38B6FF] text-sm font-bold">{attack.ip}</span>
                      <span className="text-xl">{attack.flag}</span>
                      <span className="text-gray-400 text-xs">{attack.protocol}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: `${riskColor}20`,
                          color: riskColor,
                          borderColor: riskColor
                        }}
                      >
                        {attack.type}
                      </span>
                      {cmds.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500">
                          {cmds.length} cmd{cmds.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Commands Block */}
                    <div className="font-mono text-sm mb-2 bg-black/30 rounded p-2 border border-gray-700">
                      {cmds.length > 0 ? (
                        <div className="space-y-1 max-h-[80px] overflow-y-auto">
                          {cmds.map((cmd, i) => (
                            <div key={i} className="text-green-400">
                              <span className="text-gray-500 text-xs">[{i + 1}]</span> $ {cmd}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">{attack.details || 'Session activity'}</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{new Date(attack.firstSeen).toLocaleTimeString()}</span>
                      {attack.status === "Active" ? (
                        <span className="flex items-center gap-1 text-[#10B981] font-semibold">
                          <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="text-gray-500">Ended</span>
                      )}
                      <span className="text-gray-500">
                        Duration: {Math.floor((new Date(attack.lastSeen).getTime() - new Date(attack.firstSeen).getTime()) / 1000)}s
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setReplayingAttack(attack)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm border border-cyan-500 whitespace-nowrap"
                    disabled={!attack.session}
                    title={attack.session ? "Replay all commands from this session" : "No session data available"}
                  >
                    <Play className="w-4 h-4" />
                    Replay
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
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

      {replayingAttack && (
        <ReplayModal attack={replayingAttack} onClose={() => setReplayingAttack(null)} />
      )}
    </div>
  );
}

// Each line in the terminal has a type for coloring + content
interface TerminalLine {
  type: 'system' | 'login' | 'command' | 'failed' | 'separator' | 'meta';
  content: string;
  timestamp?: string;
}

function ReplayModal({ attack, onClose }: { attack: AttackEntry; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);  // which line is currently shown
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCommands = async () => {
      if (!attack.session) {
        setLines([
          { type: 'system', content: '$ ssh root@honeypot -p 2222' },
          { type: 'meta',   content: `Connecting from ${attack.ip} (${attack.country})...` },
          { type: 'meta',   content: 'No session ID — cannot load command history.' },
        ]);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`/sessions/${attack.session}/commands`);
        // Filter to ONLY real command events
        const allEvents: any[] = response.data.commands || [];
        const cmdEvents = allEvents.filter((e: any) =>
          e.eventid === 'cowrie.command.input' ||
          e.eventid === 'cowrie.command.failed' ||
          e.eventid === 'cowrie.login.success' ||
          e.eventid === 'cowrie.login.failed' ||
          e.type === 'cowrie.command.input' ||
          e.type === 'cowrie.command.failed' ||
          // fallback: if no eventid, use input field presence
          (e.input !== undefined && e.input !== null)
        );

        const built: TerminalLine[] = [
          { type: 'system',    content: '$ ssh root@honeypot -p 2222' },
          { type: 'meta',      content: `Attacker IP  : ${attack.ip}` },
          { type: 'meta',      content: `Country      : ${attack.country}` },
          { type: 'meta',      content: `Session ID   : ${attack.session}` },
          { type: 'meta',      content: `Started      : ${new Date(attack.firstSeen).toLocaleString()}` },
          { type: 'meta',      content: `Duration     : ${Math.floor((new Date(attack.lastSeen).getTime() - new Date(attack.firstSeen).getTime()) / 1000)}s` },
          { type: 'separator', content: '─'.repeat(52) },
        ];

        if (cmdEvents.length === 0) {
          built.push({ type: 'meta', content: 'Attacker connected but ran no commands.' });
        } else {
          cmdEvents.forEach((e: any) => {
            const cmd = e.input ?? e.command ?? '';
            const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
            const isFailed = e.eventid === 'cowrie.command.failed' || e.type === 'cowrie.command.failed';
            const isLogin  = e.eventid === 'cowrie.login.success'  || e.type === 'cowrie.login.success';
            const isLoginFail = e.eventid === 'cowrie.login.failed' || e.type === 'cowrie.login.failed';

            if (isLogin) {
              built.push({ type: 'login', content: `[${time}] ✓ Login succeeded`, timestamp: time });
            } else if (isLoginFail) {
              built.push({ type: 'failed', content: `[${time}] ✗ Login failed`, timestamp: time });
            } else if (isFailed) {
              built.push({ type: 'failed',  content: `[${time}] $ ${cmd}  ← command not found`, timestamp: time });
            } else if (cmd) {
              built.push({ type: 'command', content: `[${time}] $ ${cmd}`, timestamp: time });
            }
          });
        }

        built.push({ type: 'separator', content: '─'.repeat(52) });
        built.push({ type: 'system',   content: 'Connection closed.' });

        setLines(built);
      } catch (err) {
        console.error('Error fetching session commands:', err);
        setLines([
          { type: 'system', content: '$ ssh root@honeypot -p 2222' },
          { type: 'failed', content: 'Error: Could not load session data from backend.' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, [attack]);

  // Auto-advance one line at a time
  useEffect(() => {
    if (!isPlaying || stepIndex >= lines.length - 1 || loading) return;
    const delay = lines[stepIndex]?.type === 'command' ? 1200 / speed : 300 / speed;
    const timer = setTimeout(() => setStepIndex(prev => prev + 1), delay);
    return () => clearTimeout(timer);
  }, [stepIndex, isPlaying, speed, lines.length, loading]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stepIndex]);

  const finished = stepIndex >= lines.length - 1;
  // Count only real command lines for the progress label
  const totalCmds = lines.filter(l => l.type === 'command' || l.type === 'failed').length;
  const shownCmds = lines.slice(0, stepIndex + 1).filter(l => l.type === 'command' || l.type === 'failed').length;

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':   return 'text-green-400';
      case 'failed':    return 'text-red-400';
      case 'login':     return 'text-yellow-300';
      case 'system':    return 'text-cyan-400';
      case 'separator': return 'text-gray-600';
      case 'meta':      return 'text-gray-400';
      default:          return 'text-gray-300';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-gray-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#00D9FF]" />
            <div>
              <h3 className="text-white font-bold text-base">Session Replay</h3>
              <p className="text-gray-400 text-xs font-mono mt-0.5">
                {attack.ip} • {attack.country}
                {attack.session && <span className="text-[#00D9FF]"> • {attack.session}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-5 bg-black overflow-y-auto font-mono text-sm min-h-[380px] max-h-[460px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent mr-3"></div>
              <span className="text-gray-400">Loading session data...</span>
            </div>
          ) : (
            <>
              {lines.slice(0, stepIndex + 1).map((line, i) => (
                <div key={i} className={`mb-1.5 leading-relaxed ${lineColor(line.type)}`}>
                  {line.content}
                </div>
              ))}
              {!finished && (
                <span className="text-green-400 animate-pulse text-base">▊</span>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={loading || finished}
              className="p-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00B8D9] transition-colors disabled:opacity-40"
            >
              {isPlaying && !finished ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={loading}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
            {/* ✅ Fixed counter — shows real commands only, never overshoots */}
            <span className="text-gray-400 text-sm">
              {totalCmds > 0
                ? `${shownCmds} / ${totalCmds} commands`
                : finished ? 'Complete' : 'Replaying...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {finished && (
              <span className="text-green-500 text-xs font-semibold">✓ Replay complete</span>
            )}
            <button
              onClick={() => { setStepIndex(0); setIsPlaying(true); }}
              disabled={loading}
              className="px-4 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-40"
            >
              Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}