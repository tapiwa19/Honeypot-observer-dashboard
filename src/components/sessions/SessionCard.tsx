
import { Play, Pause, Shield, MapPin, Clock, X, Download, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionCardProps {
  session: {
    id: number | string;
    sessionId: string;
    ip: string;
    country: string;
    countryName?: string;
    duration: number;
    commands: number;
    risk: number;
    timestamp: string;
    timeAgo?: string;
    status?: 'active' | 'recent' | 'closed';
    isClosed?: boolean;
    isNew?: boolean; // ✅ NEW: Mark new real-time sessions
  };
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onViewDetails: () => void;
}

export function SessionCard({ 
  session, 
  expanded, 
  selected, 
  onToggle, 
  onSelect, 
  onViewDetails 
}: SessionCardProps) {
  
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
      `Risk: ${session.risk}/10\n` +
      `Status: ${session.status?.toUpperCase() || 'UNKNOWN'}\n`;
    
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${session.sessionId}_log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 8) return { 
      bg: 'bg-red-500/20', 
      text: 'text-red-400', 
      border: 'border-red-500',
      glow: 'shadow-red-500/20'
    };
    if (risk >= 6) return { 
      bg: 'bg-orange-500/20', 
      text: 'text-orange-400', 
      border: 'border-orange-500',
      glow: 'shadow-orange-500/20'
    };
    return { 
      bg: 'bg-yellow-500/20', 
      text: 'text-yellow-400', 
      border: 'border-yellow-500',
      glow: 'shadow-yellow-500/20'
    };
  };

  const riskColors = getRiskColor(session.risk);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-gray-800/90 border-2 rounded-xl overflow-hidden transition-all ${
        selected 
          ? 'border-[#00D9FF] shadow-lg shadow-[#00D9FF]/30' 
          : session.isNew
          ? 'border-red-500 shadow-lg shadow-red-500/40 animate-pulse'
          : 'border-cyan-500/30 hover:border-cyan-500/60'
      }`}
    >
      <div className="p-6">
        
        {/* ✅ NEW ATTACK BADGE */}
        {session.isNew && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">🚨 NEW ATTACK!</span>
          </motion.div>
        )}

        {/* Header with checkbox and IP */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {/* ✅ Selection Checkbox */}
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="mt-1 w-4 h-4 cursor-pointer accent-[#00D9FF]"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex-1">
              <code className="text-xl font-mono font-bold text-white block mb-2">
                {session.ip}
              </code>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Country Flag */}
                <span className="text-3xl">{session.country}</span>
                
                {/* ✅ Status Badge */}
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
                
                {/* Time Ago */}
                {session.timeAgo && (
                  <span className="text-gray-500 text-xs">({session.timeAgo})</span>
                )}
              </div>
            </div>
          </div>
          
          {/* ✅ Risk Score */}
          <div className={`text-2xl font-bold ${riskColors.text}`}>
            {session.risk}/10
          </div>
        </div>

        {/* ✅ Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-xs">Duration</span>
            </div>
            <div className="text-white font-mono font-medium">
              {formatDuration(session.duration)}
            </div>
          </div>
          
          <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-xs">Commands</span>
            </div>
            <div className="text-white font-mono font-medium">
              {session.commands}
            </div>
          </div>
        </div>

        {/* ✅ Session ID */}
        <div className="mb-4 bg-gray-900/60 rounded-lg p-3 border border-gray-700">
          <div className="text-gray-400 text-xs mb-1">Session ID</div>
          <code className="text-[#00D9FF] text-xs font-mono break-all">
            {session.sessionId}
          </code>
        </div>

        {/* ✅ Action Buttons */}
        <div className="space-y-2">
          {/* Main Action Button */}
          <button
            onClick={onToggle}
            className="w-full px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all flex items-center justify-center gap-2"
          >
            {expanded ? (
              <>
                <Pause className="w-4 h-4" />
                Hide Details
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                View Details
              </>
            )}
          </button>

          {/* Secondary Actions */}
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
              title="View Session Commands"
            >
              <Circle className="w-3 h-3 fill-current" />
              Commands
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Expanded Details Section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-black/40 border-t border-cyan-500/30 overflow-hidden"
          >
            <div className="p-4 font-mono text-sm">
              {/* Terminal Header */}
              <div className="text-green-400 mb-2 flex items-center gap-2">
                <span>$</span>
                <span>Session Details:</span>
              </div>
              
              {/* Session Information */}
              <div className="text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  <span>IP:</span>
                  <span className="text-[#00D9FF]">{session.ip}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Started:</span>
                  <span className="text-[#00D9FF]">
                    {new Date(session.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  <span>Commands Executed:</span>
                  <span className="text-[#00D9FF]">{session.commands}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3" />
                  <span>Risk Score:</span>
                  <span className={`font-bold ${riskColors.text}`}>
                    {session.risk}/10
                  </span>
                </div>
              </div>
              
              {/* ✅ Warning Box */}
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