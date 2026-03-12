/**
 * Behavioral Analytics Utilities
 * Helper functions for processing patterns, profiles, and tactics
 */

export interface Pattern {
  id: string;
  name: string;
  confidence: number;
  occurrences: number;
  severity: string;
  description: string;
  indicators: string[];
  trend?: 'rising' | 'falling' | 'stable';
  timeSeriesData?: { time: string; count: number }[];
}

export interface AttackerProfile {
  id: string;
  skillLevel: string;
  countries: string[];
  threatScore: number;
  totalAttacks: number;
  successRate: number;
  tools: string[];
  firstSeen?: string;
  lastActivity?: string;
  tactics?: string[];
  targetedServices?: string[];
  avgSessionDuration?: number;
  uniqueCommands?: number;
}

/**
 * Process patterns to add real-time trend analysis from timeline data
 */
export function processPatterns(patterns: Pattern[], timelineData: any[]): Pattern[] {
  return patterns.map(pattern => {
    // Calculate trend from timeline data
    const recentData = timelineData.slice(-24); // Last 24 hours
    const firstHalf = recentData.slice(0, 12).reduce((sum, d) => sum + (d.attacks || 0), 0);
    const secondHalf = recentData.slice(12).reduce((sum, d) => sum + (d.attacks || 0), 0);

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (secondHalf > firstHalf * 1.2) trend = 'rising';
    else if (secondHalf < firstHalf * 0.8) trend = 'falling';

    // timeSeriesData should come from backend; using timeline aggregate as placeholder
    const timeSeriesData = recentData.map(d => ({
      time: d.time,
      count: d.attacks || 0
    }));

    return {
      ...pattern,
      trend,
      timeSeriesData
    };
  });
}

/**
 * Process attacker profiles with real session data
 */
export function processAttackerProfiles(
  profiles: AttackerProfile[],
  sessions: any[]
): AttackerProfile[] {
  // Group sessions by IP to create detailed profiles
  const ipSessionMap = new Map<string, any[]>();

  sessions.forEach(session => {
    const ip = session.ip;
    if (!ipSessionMap.has(ip)) {
      ipSessionMap.set(ip, []);
    }
    ipSessionMap.get(ip)?.push(session);
  });

  // Enhance profiles with real data
  return profiles.map((profile, index) => {
    // Get sessions for this profile (match by index for demo, in production match by IP)
    const ipSessions = Array.from(ipSessionMap.values())[index] || [];

    // Calculate tactics used based on session behavior
    const tactics = determineTactics(ipSessions);

    // Extract targeted services from session targets
    const targetedServices =
      ipSessions.length > 0
        ? Array.from(new Set(ipSessions.map(s => s.service || 'SSH').filter(Boolean)))
        : ['SSH'];

    // Calculate average session duration
    const avgSessionDuration =
      ipSessions.length > 0
        ? Math.floor(ipSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / ipSessions.length)
        : 0;

    // Count unique commands
    const uniqueCommands = ipSessions.reduce((sum, s) => sum + (s.commands || 0), 0);

    return {
      ...profile,
      tactics,
      targetedServices,
      avgSessionDuration,
      uniqueCommands
    };
  });
}

/**
 * Determine MITRE tactics based on session behavior
 */
export function determineTactics(sessions: any[]): string[] {
  const tactics: string[] = [];

  const totalCommands = sessions.reduce((sum, s) => sum + (s.commands || 0), 0);
  const highRisk = sessions.some(s => s.risk >= 7);

  // Initial Access - always present for honeypot
  tactics.push('Initial Access (T1078)');

  // Execution - if commands were run
  if (totalCommands > 0) {
    tactics.push('Execution (T1059)');
  }

  // Persistence - if high risk or many commands
  if (highRisk || totalCommands > 10) {
    tactics.push('Persistence (T1136)');
  }

  // Discovery - common in honeypots
  if (totalCommands > 5) {
    tactics.push('Discovery (T1082)');
  }

  // Command and Control - if session lasted long
  const longSession = sessions.some(s => s.duration > 300);
  if (longSession) {
    tactics.push('Command & Control (T1071)');
  }

  return tactics;
}
