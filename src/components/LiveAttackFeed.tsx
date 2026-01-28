import { useState, useEffect } from "react";
import { Play, Terminal, X, Pause } from "lucide-react";
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

interface AttackEntry {
  id: string;
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

const getRiskLabel = (type: string) => {
  return type;
};

export function LiveAttackFeed({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [attacks, setAttacks] = useState<AttackEntry[]>([]);
  const [replayingAttack, setReplayingAttack] = useState<AttackEntry | null>(null);

  // Fetch attacks from API
  const fetchAttacks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/attacks`);
      const attacksData = response.data.slice(0, 20).map((attack: any) => ({
        ...attack,
        protocol: "SSH",
        status: Math.random() > 0.5 ? "Active" : "Ended",
        command: attack.details || attack.input || "No command recorded"
      }));
      setAttacks(attacksData);
    } catch (error) {
      console.error('Error fetching attacks:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchAttacks();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchAttacks();
    }, 10000);

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
            <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
            <span className="text-gray-300 text-xs">Live</span>
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
                      {getRiskLabel(attack.type)}
                    </span>
                  </div>

                  <div className="font-mono text-gray-300 text-sm mb-2 truncate">
                    {attack.command || attack.details}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{new Date(attack.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={
                        attack.status === "Active"
                          ? "text-[#10B981]"
                          : "text-gray-400"
                      }
                    >
                      {attack.status}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setReplayingAttack(attack)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm border border-cyan-500 whitespace-nowrap"
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
          onClick={() => {/* Export functionality */}}
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

function ReplayModal({ attack, onClose }: { attack: AttackEntry; onClose: () => void }) {
  const [commandIndex, setCommandIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [commands, setCommands] = useState<string[]>([]);

  useEffect(() => {
    // Fetch session commands from API
    const fetchCommands = async () => {
      try {
        const response = await axios.get(`${API_BASE}/sessions/${attack.id}/commands`);
        const sessionCommands = response.data.commands || [];
        
        if (sessionCommands.length > 0) {
          const formattedCommands = [
            `$ ssh attacker@honeypot`,
            `Connected to ${attack.ip}`,
            `Last login: ${new Date(attack.timestamp).toLocaleString()}`,
            ...sessionCommands.map((cmd: any) => cmd.input),
            "$ exit",
            "Connection closed."
          ];
          setCommands(formattedCommands);
        } else {
          // Fallback commands if no session data
          setCommands([
            `$ ssh attacker@honeypot`,
            `Connected to ${attack.ip}`,
            attack.command || attack.details,
            "$ exit",
            "Connection closed."
          ]);
        }
      } catch (error) {
        console.error('Error fetching commands:', error);
        // Fallback commands
        setCommands([
          `$ ssh attacker@honeypot`,
          `Connected to ${attack.ip}`,
          attack.command || attack.details,
          "$ exit",
          "Connection closed."
        ]);
      }
    };

    fetchCommands();
  }, [attack]);

  useEffect(() => {
    if (!isPlaying || commandIndex >= commands.length) return;

    const timer = setTimeout(() => {
      setCommandIndex((prev) => Math.min(prev + 1, commands.length));
    }, 1000 / speed);

    return () => clearTimeout(timer);
  }, [commandIndex, isPlaying, speed, commands.length]);

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
              <h3 className="text-white font-bold">Attack Replay</h3>
              <p className="text-gray-400 text-sm font-mono">{attack.ip} • {attack.country}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-black min-h-[400px] overflow-y-auto font-mono text-sm">
          {commands.slice(0, commandIndex + 1).map((cmd, index) => (
            <div
              key={index}
              className={`mb-2 ${
                cmd.startsWith("$")
                  ? "text-green-400"
                  : cmd.includes("Password") || cmd.includes("login")
                  ? "text-yellow-400"
                  : cmd.includes("malicious") || cmd.includes("wget") || cmd.includes("curl")
                  ? "text-red-400"
                  : "text-gray-300"
              }`}
            >
              {cmd}
            </div>
          ))}
          {commandIndex < commands.length && (
            <span
              className="text-green-400 animate-pulse"
            >
              ▊
            </span>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00B8D9] transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
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
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}