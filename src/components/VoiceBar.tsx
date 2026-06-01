// src/components/VoiceBar.tsx
// A self-contained mic button + status bar.
// Drop it anywhere in your layout — it only needs the hook's return value.

import { Mic, MicOff, Wifi } from 'lucide-react';
import type { VoiceControllerState } from '../hooks/useVoiceController';

interface VoiceBarProps {
  voice: VoiceControllerState;
  // Optional: pill shortcuts shown below the mic button
  shortcuts?: { label: string; phrase: string }[];
}

export function VoiceBar({ voice, shortcuts }: VoiceBarProps) {
  const { status, transcript, lastMatch, isListening, isSupported, toggle, runCommand } = voice;

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-500">
        <MicOff className="w-3 h-3" />
        Voice not supported — use Chrome or Edge
      </div>
    );
  }

  const statusText = () => {
    if (status === 'listening') return transcript || 'Listening…';
    if (status === 'matched')   return `✓ ${lastMatch}`;
    if (status === 'unmatched') return `Not recognised: "${transcript}"`;
    return 'Click mic or say a command';
  };

  const statusColor = () => {
    if (status === 'listening') return 'text-blue-400';
    if (status === 'matched')   return 'text-green-400';
    if (status === 'unmatched') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Mic row */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={isListening ? 'Stop listening' : 'Start voice command'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            isListening
              ? 'bg-red-900/40 border-red-500 text-red-400'
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-[#00D9FF] hover:text-[#00D9FF]'
          }`}
        >
          {isListening ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <Mic className="w-4 h-4" />
              Listening…
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Voice
            </>
          )}
        </button>

        {/* Status text */}
        <span className={`text-xs ${statusColor()} truncate max-w-xs`}>
          {statusText()}
        </span>

        {/* Live indicator from WebSocket (cosmetic) */}
        <Wifi className="w-3 h-3 text-gray-600 ml-auto" />
      </div>

      {/* Pill shortcuts */}
      {shortcuts && shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shortcuts.map(s => (
            <button
              key={s.phrase}
              onClick={() => runCommand(s.phrase)}
              className="px-3 py-1 text-xs rounded-full border border-gray-700 bg-gray-800 text-gray-400 hover:border-[#00D9FF] hover:text-[#00D9FF] transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}