// Attack Types
export interface Attack {
  id: string;
  timestamp: string;
  sourceIp: string;
  sourcePort: number;
  country: string;
  countryCode: string;
  attackType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  protocol: string;
  status: 'active' | 'ended';
  duration?: number;
  commandCount?: number;
}

// Session Types
export interface Session {
  id: string;
  sessionId: string;
  sourceIp: string;
  country: string;
  countryCode: string;
  startTime: string;
  endTime?: string;
  duration: number;
  commands: Command[];
  protocol: string;
  username?: string;
  password?: string;
  riskScore: number;
  status: 'active' | 'ended';
  fingerprint?: SessionFingerprint;
}

export interface Command {
  timestamp: string;
  command: string;
  output?: string;
  success: boolean;
}

export interface SessionFingerprint {
  sshClient?: string;
  sshVersion?: string;
  userAgent?: string;
  skillLevel?: 'script_kiddie' | 'intermediate' | 'advanced' | 'expert';
  behaviorProfile?: string;
}

// Alert Types
export interface Alert {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sourceIp: string;
  relatedSessionId?: string;
  status: 'active' | 'resolved' | 'archived';
  solution?: AlertSolution;
}

export interface AlertSolution {
  immediateActions: string[];
  preventionStrategy: string[];
}

// Statistics Types
export interface DashboardStats {
  totalAttacks: number;
  activeSessions: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  countriesDetected: number;
  topCountries: CountryStats[];
  attackTrend: TrendData[];
}

export interface CountryStats {
  country: string;
  countryCode: string;
  flag: string;
  attackCount: number;
  percentage: number;
}

export interface TrendData {
  timestamp: string;
  count: number;
}

// Geographic Types
export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  city?: string;
  latitude: number;
  longitude: number;
  attackCount: number;
}

// Behavioral Analytics Types
export interface AttackPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  occurrences: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  mitreAttack?: string[];
}

export interface AttackerProfile {
  id: string;
  anonymousId: string;
  ipAddresses: string[];
  countries: string[];
  skillLevel: 'script_kiddie' | 'intermediate' | 'advanced' | 'expert';
  threatScore: number;
  totalAttacks: number;
  successRate: number;
  commonTools: string[];
  targetedVulnerabilities: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface Vulnerability {
  cveId: string;
  name: string;
  severity: number;
  targetFrequency: number;
  successRate: number;
  affectedSystems: string[];
  firstTargeted: string;
  lastTargeted: string;
}

// Export Data Types
export interface ExportConfig {
  dataType: 'attacks' | 'sessions' | 'credentials' | 'alerts' | 'patterns';
  format: 'csv' | 'json' | 'xml' | 'excel' | 'parquet';
  dateRange: {
    from: string;
    to: string;
  };
  filters?: Record<string, string | number | boolean | string[]>;
  fields?: string[];
  includeHeaders?: boolean;
  compress?: boolean;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'attack' | 'session' | 'alert' | 'stats';
  data: Attack | Session | Alert | DashboardStats;
  timestamp: string;
}