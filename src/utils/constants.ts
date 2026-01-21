// API Configuration
import { AlertSolution } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

// Elasticsearch Configuration (for reference)
export const ES_CONFIG = {
  host: 'localhost',
  port: 9200,
  indices: {
    cowrie: 'cowrie-*',
    alerts: 'honeypot-alerts-*',
    sessions: 'honeypot-sessions-*'
  }
};

// Severity Colors
export const SEVERITY_COLORS = {
  low: 'text-green-700 bg-green-100',
  medium: 'text-yellow-700 bg-yellow-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100'
};

export const SEVERITY_BORDER_COLORS = {
  low: 'border-green-500',
  medium: 'border-yellow-500',
  high: 'border-orange-500',
  critical: 'border-red-500'
};

// Attack Types
export const ATTACK_TYPES = [
  'SSH Brute Force',
  'Malware Download',
  'Command Injection',
  'Reconnaissance',
  'Reverse Shell',
  'Privilege Escalation',
  'Botnet Activity',
  'Cryptomining',
  'Data Exfiltration',
  'DDoS Preparation'
];

// Country Flags Mapping
export const COUNTRY_FLAGS: Record<string, string> = {
  CN: '🇨🇳',
  RU: '🇷🇺',
  US: '🇺🇸',
  BR: '🇧🇷',
  IN: '🇮🇳',
  DE: '🇩🇪',
  GB: '🇬🇧',
  FR: '🇫🇷',
  KR: '🇰🇷',
  JP: '🇯🇵',
  VN: '🇻🇳',
  TR: '🇹🇷',
  ID: '🇮🇩',
  NL: '🇳🇱',
  UA: '🇺🇦',
};

// MITRE ATT&CK Tactics
export const MITRE_TACTICS = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact'
];

// Alert Solutions Database
export const ALERT_SOLUTIONS: Record<string, AlertSolution> = {
  'malware_download': {
    immediateActions: [
      'Block source IP address at firewall level immediately',
      'Update antivirus/EDR signatures to detect this malware variant',
      'Scan all internal systems for indicators of compromise',
      'Isolate any potentially infected systems from the network'
    ],
    preventionStrategy: [
      'Implement application whitelisting to prevent unauthorized executables',
      'Enable advanced threat protection on all endpoints',
      'Configure outbound firewall rules to block suspicious download domains',
      'Deploy sandboxing for all downloaded files before execution'
    ]
  },
  'brute_force': {
    immediateActions: [
      'Implement rate limiting: max 3 failed attempts per minute',
      'Enable account lockout after 5 failed login attempts',
      'Add source IP to blocklist for 24 hours',
      'Review all recent successful logins for anomalies'
    ],
    preventionStrategy: [
      'Enforce multi-factor authentication (MFA) for all accounts',
      'Implement CAPTCHA after 2 failed login attempts',
      'Use strong password policies (min 12 chars, complexity)',
      'Deploy fail2ban or similar intrusion prevention system',
      'Monitor for credential stuffing patterns'
    ]
  },
  'reverse_shell': {
    immediateActions: [
      'Terminate suspicious connections immediately',
      'Block destination IP/port at network perimeter',
      'Patch vulnerable services identified in the attack',
      'Review firewall rules for unauthorized outbound connections'
    ],
    preventionStrategy: [
      'Enable Web Application Firewall (WAF) with strict rules',
      'Implement egress filtering to block unexpected outbound traffic',
      'Keep all systems and applications fully patched',
      'Deploy runtime application self-protection (RASP)',
      'Regular penetration testing to identify vulnerabilities'
    ]
  }
};

// Date Range Presets
export const DATE_RANGES = [
  { label: 'Last Hour', value: '1h' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'Custom', value: 'custom' }
];

// Export Formats
export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: '📊' },
  { value: 'json', label: 'JSON', icon: '📄' },
  { value: 'excel', label: 'Excel (XLSX)', icon: '📗' },
  { value: 'pdf', label: 'PDF Report', icon: '📕' },
];

// Refresh Intervals
export const REFRESH_INTERVALS = {
  DASHBOARD: 5000,      // 5 seconds
  LIVE_SESSIONS: 2000,  // 2 seconds
  ALERTS: 10000,        // 10 seconds
  ANALYTICS: 30000      // 30 seconds
};