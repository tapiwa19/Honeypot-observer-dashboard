import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type VoiceStatus = 'idle' | 'listening' | 'matched' | 'unmatched' | 'unsupported';

export interface VoiceCommand {
  phrases: string[];   // All phrases that trigger this command (fuzzy matched)
  action: () => void;  // What to run when matched
  label: string;       // Human-readable label shown in status bar
}

export interface UseVoiceControllerOptions {
  commands: VoiceCommand[];
  lang?: string;       // BCP-47 e.g. 'en-US'
  speak?: boolean;     // Spoken audio confirmation after each command
  continuous?: boolean;// Keep mic open after each command (false = one-shot)
}

export interface VoiceControllerState {
  status: VoiceStatus;
  transcript: string;
  lastMatch: string | null;
  isListening: boolean;
  isSupported: boolean;
  toggle: () => void;
  stop: () => void;
  runCommand: (phrase: string) => void; // Manually trigger by phrase (for pill buttons)
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─────────────────────────────────────────────
// Fuzzy matcher
// Tries exact substring first, then keyword overlap (≥60% match)
// ─────────────────────────────────────────────
function fuzzyMatch(transcript: string, commands: VoiceCommand[]): VoiceCommand | null {
  const t = transcript.toLowerCase().trim();

  // 1. Exact substring match across all phrases
  for (const cmd of commands) {
    for (const phrase of cmd.phrases) {
      if (t.includes(phrase.toLowerCase())) return cmd;
    }
  }

  // 2. Keyword overlap fallback
  let bestCmd: VoiceCommand | null = null;
  let bestScore = 0;

  for (const cmd of commands) {
    for (const phrase of cmd.phrases) {
      const words = phrase.toLowerCase().split(/\s+/);
      const hits = words.filter(w => t.includes(w)).length;
      const score = hits / words.length;
      if (score >= 0.6 && score > bestScore) {
        bestScore = score;
        bestCmd = cmd;
      }
    }
  }

  return bestCmd;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useVoiceController({
  commands,
  lang = 'en-US',
  speak = true,
  continuous = false,
}: UseVoiceControllerOptions): VoiceControllerState {

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastMatch, setLastMatch] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const commandsRef = useRef<VoiceCommand[]>(commands);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── Spoken feedback ───────────────────────────────────────────────────────
  const sayText = useCallback((text: string) => {
    if (!speak || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }, [speak, lang]);

  // ── Handle a recognised transcript ───────────────────────────────────────
  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    const matched = fuzzyMatch(text, commandsRef.current);
    if (matched) {
      setStatus('matched');
      setLastMatch(matched.label);
      sayText(matched.label);
      matched.action();
    } else {
      setStatus('unmatched');
      setLastMatch(null);
    }
  }, [sayText]);

  // ── Start listening ───────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (!isSupported || isListening) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false; // one utterance at a time is most reliable

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
      setTranscript('');
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const results = Array.from(e.results);
      const interim = results.map(r => r[0].transcript).join('');
      setTranscript(interim);

      if (results[results.length - 1].isFinal) {
        handleTranscript(interim);
        if (!continuous) recognition.stop();
      }
    };

    recognition.onerror = () => {
      setStatus('idle');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status !== 'matched' && status !== 'unmatched') setStatus('idle');
      // If continuous mode, restart automatically
      if (continuous && recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, isListening, lang, continuous, handleTranscript, status]);

  // ── Stop listening ────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setStatus('idle');
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, stop, start]);

  // ── Manual trigger (pill buttons, keyboard shortcuts) ─────────────────────
  const runCommand = useCallback((phrase: string) => {
    setTranscript(phrase);
    const matched = fuzzyMatch(phrase, commandsRef.current);
    if (matched) {
      setStatus('matched');
      setLastMatch(matched.label);
      sayText(matched.label);
      matched.action();
    } else {
      setStatus('unmatched');
    }
    // Reset status after 2s
    setTimeout(() => setStatus('idle'), 2000);
  }, [sayText]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    status,
    transcript,
    lastMatch,
    isListening,
    isSupported: !!isSupported,
    toggle,
    stop,
    runCommand,
  };
}