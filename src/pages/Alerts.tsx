import { useState, useEffect } from 'react';
import { X, Shield, Settings, Download, Check, AlertTriangle, Eye, Archive, Lightbulb, Clock, TrendingUp, Activity, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:5001/api';
const WS_URL = 'http://localhost:5001';

// ============================================
// TYPESCRIPT INTERFACES
// ============================================
interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  sourceIp: string;
  country: string;
  flag: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'archived';
  type: string;
  sessionId?: string;
  attackTime: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  archivedAt?: Date;
  commands?: string[];
  evidenceData?: any;
  isNew?: boolean; // ✅ NEW: Flag for highlighting new real-time alerts
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerCount: number;
  condition: string;
}

interface AttackSolution {
  type: string;
  title: string;
  immediateSteps: string[];
  prevention: string[];
  toolsNeeded: string[];
  criticalityNote?: string;
}

// ============================================
// ATTACK SOLUTIONS DATABASE
// ============================================
const ATTACK_SOLUTIONS: Record<string, AttackSolution> = {
  'brute_force': {
    type: 'Brute Force Attack',
    title: 'SSH Brute Force Mitigation',
    immediateSteps: [
      'Block attacker IP immediately at firewall level (iptables -A INPUT -s [IP] -j DROP)',
      'Enable fail2ban with aggressive settings (maxretry = 3, bantime = 3600)',
      'Implement rate limiting on SSH port (limit login attempts to 3 per minute)',
      'Review /var/log/auth.log for other compromised accounts',
      'Force password reset for all accounts that were targeted'
    ],
    prevention: [
      'Disable password authentication, use SSH keys only',
      'Change SSH port from 22 to non-standard port (e.g., 2222)',
      'Implement port knocking or VPN-only SSH access',
      'Use strong password policy (16+ chars, complexity requirements)',
      'Enable two-factor authentication (Google Authenticator)',
      'Whitelist known IP addresses only'
    ],
    toolsNeeded: [
      'fail2ban - Automated IP banning',
      'iptables - Firewall configuration',
      'SSH key pairs - Passwordless authentication',
      'Google Authenticator - 2FA implementation'
    ]
  },
  
  'successful_login': {
    type: 'Successful Login (CRITICAL)',
    title: '🚨 SYSTEM COMPROMISE - IMMEDIATE ACTION REQUIRED',
    criticalityNote: 'An attacker has gained access to your system. This is a CRITICAL security incident.',
    immediateSteps: [
      '🔴 DISCONNECT system from network IMMEDIATELY (pull ethernet cable)',
      '🔴 Kill all SSH sessions: pkill -KILL -t pts/*',
      '🔴 Change ALL passwords on this system and related systems',
      '🔴 Lock the compromised account: passwd -l [username]',
      '🔴 Check for backdoors: ls -la /tmp /var/tmp ~/.ssh',
      '🔴 Review cron jobs: crontab -l and /etc/cron.*',
      '🔴 Check running processes: ps aux | grep -v root',
      '🔴 Look for persistence: systemctl list-units --type=service',
      '🔴 Capture memory dump for forensics if possible',
      '🔴 Report to incident response team and management'
    ],
    prevention: [
      'Rebuild system from clean backup or fresh install',
      'Implement network segmentation (honeypot on isolated VLAN)',
      'Deploy intrusion detection system (Snort, Suricata)',
      'Enable logging to external SIEM system',
      'Implement SSH certificate-based authentication only',
      'Use jump box/bastion host for all SSH access'
    ],
    toolsNeeded: [
      'tcpdump - Network traffic capture',
      'rkhunter - Rootkit scanner',
      'chkrootkit - Rootkit detector',
      'AIDE - File integrity monitoring',
      'Forensic toolkit - Memory analysis'
    ]
  },
  
  'command_execution': {
    type: 'Command Execution',
    title: 'Malicious Command Execution Detected',
    criticalityNote: 'Attacker is running commands on the system. High risk of malware installation.',
    immediateSteps: [
      'Review executed commands in session logs immediately',
      'Check for malware downloads: ls -lht /tmp /var/tmp',
      'Kill suspicious processes: ps aux | grep [suspicious]',
      'Block attacker IP at network perimeter',
      'Scan for malware: clamscan -r /',
      'Check network connections: netstat -tunap | grep ESTABLISHED',
      'Review system logs: tail -f /var/log/syslog'
    ],
    prevention: [
      'Implement application whitelisting',
      'Use SELinux or AppArmor mandatory access control',
      'Deploy endpoint detection and response (EDR)',
      'Restrict command execution in honeypot environment',
      'Implement network egress filtering',
      'Monitor for unusual outbound connections'
    ],
    toolsNeeded: [
      'ClamAV - Antivirus scanning',
      'rkhunter - Malware detection',
      'Wireshark - Network analysis',
      'Sysdig - System activity monitoring'
    ]
  },
  
  'connection': {
    type: 'Connection Attempt',
    title: 'Suspicious Connection Detected',
    immediateSteps: [
      'Log IP address and geolocation data',
      'Check IP reputation on AbuseIPDB and VirusTotal',
      'Monitor for repeated connection attempts',
      'Update threat intelligence feeds',
      'Consider adding to watchlist for 24 hours'
    ],
    prevention: [
      'Implement geoblocking for high-risk countries',
      'Use Cloudflare or similar DDoS protection',
      'Deploy honeypot on isolated network segment',
      'Enable connection rate limiting',
      'Use knock sequences for legitimate access'
    ],
    toolsNeeded: [
      'GeoIP database - Location tracking',
      'AbuseIPDB - IP reputation check',
      'Fail2ban - Automated blocking'
    ]
  },
  
  'default': {
    type: 'Unknown Attack',
    title: 'General Security Incident Response',
    immediateSteps: [
      'Document all attack indicators (IP, time, behavior)',
      'Capture network traffic for analysis',
      'Review system logs for anomalies',
      'Update security monitoring rules',
      'Report to security team'
    ],
    prevention: [
      'Keep all systems patched and updated',
      'Implement defense in depth strategy',
      'Regular security audits and penetration testing',
      'Employee security awareness training',
      'Incident response plan testing'
    ],
    toolsNeeded: [
      'SIEM system - Centralized logging',
      'IDS/IPS - Intrusion detection/prevention',
      'Threat intelligence platform'
    ]
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "from-red-600 to-orange-600";
    case "high":
      return "from-orange-500 to-yellow-500";
    case "medium":
      return "from-blue-500 to-cyan-500";
    default:
      return "from-green-500 to-emerald-500";
  }
};

const calculateSeverity = (attack: any): 'critical' | 'high' | 'medium' | 'low' => {
  if (attack.severity) {
    return attack.severity as 'critical' | 'high' | 'medium' | 'low';
  }
  
  const attackType = attack.type?.toLowerCase() || '';
  
  if (attackType.includes('login.success')) return 'critical';
  if (attackType.includes('command.input') || attackType.includes('command') || attackType.includes('execution')) return 'critical';
  if (attackType.includes('file_download')) return 'critical';
  if (attackType.includes('login.failed') || attackType.includes('brute')) return 'high';
  if (attackType.includes('connection') || attackType.includes('session.connect')) return 'medium';
  
  return 'low';
};

const determineAlertType = (attack: any): string => {
  const eventId = attack.type?.toLowerCase() || '';
  
  if (eventId.includes('login.success')) return 'successful_login';
  if (eventId.includes('command.input') || eventId.includes('command')) return 'command_execution';
  if (eventId.includes('login.failed')) return 'brute_force';
  if (eventId.includes('session.connect') || eventId.includes('connection')) return 'connection';
  
  return 'default';
};

const isAttackActive = (attackTimestamp: string): boolean => {
  const now = new Date();
  const attackTime = new Date(attackTimestamp);
  const minutesSinceAttack = (now.getTime() - attackTime.getTime()) / (1000 * 60);
  return minutesSinceAttack <= 5;
};

const formatTimeAgo = (timestamp: string) => {
  if (!timestamp) return 'Unknown';
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const getAlertTitle = (attack: any): string => {
  const eventId = attack.type?.toLowerCase() || '';
  
  if (eventId.includes('login.success')) {
    return '🚨 CRITICAL: Successful SSH Login';
  }
  if (eventId.includes('command.input')) {
    return '⚠️ Malicious Command Execution';
  }
  if (eventId.includes('login.failed')) {
    return 'Brute Force Attack Detected';
  }
  if (eventId.includes('file_download')) {
    return '🚨 CRITICAL: Malware Download Attempt';
  }
  if (eventId.includes('session.connect')) {
    return 'New SSH Connection Attempt';
  }
  
  return 'Security Event Detected';
};

const getAlertDescription = (attack: any): string => {
  const eventId = attack.type?.toLowerCase() || '';
  const ip = attack.ip || 'unknown';
  const country = attack.country || 'Unknown';
  
  if (eventId.includes('login.success')) {
    return `IMMEDIATE ACTION REQUIRED: Attacker successfully authenticated from ${ip} (${country}). System may be compromised.`;
  }
  if (eventId.includes('command.input')) {
    const command = attack.details || 'unknown command';
    return `Command executed: "${command}" from ${ip} (${country}) - Potential malware installation or data exfiltration.`;
  }
  if (eventId.includes('login.failed')) {
    return `Multiple failed login attempts from ${ip} (${country}) - Automated credential stuffing attack in progress.`;
  }
  if (eventId.includes('file_download')) {
    return `File download detected from ${ip} (${country}) - Likely malware or exploit toolkit.`;
  }
  
  return `Suspicious activity detected from ${ip} (${country})`;
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function Alerts() {
  // State Management
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'resolved' | 'archived' | 'critical'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showRuleConfig, setShowRuleConfig] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [currentSolution, setCurrentSolution] = useState<AttackSolution | null>(null);
  
  // ✅ NEW: WebSocket state
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastAlertSound, setLastAlertSound] = useState(0);
  
  const [stats, setStats] = useState({
    active: 0,
    resolved: 0,
    avgResponseTime: '0m',
    critical: 0
  });
  
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: 'rule-1',
      name: 'Multiple Failed Logins',
      description: 'Trigger when >5 failed logins from same IP',
      enabled: true,
      triggerCount: 12,
      condition: 'failed_logins > 5'
    },
    {
      id: 'rule-2',
      name: 'New Country Detected',
      description: 'Alert on connections from new countries',
      enabled: true,
      triggerCount: 8,
      condition: 'new_country == true'
    },
    {
      id: 'rule-3',
      name: 'Unusual Commands',
      description: 'Detect suspicious command patterns',
      enabled: false,
      triggerCount: 3,
      condition: 'command contains malware'
    }
  ]);

  // ✅ NEW: Play alert sound (throttled)
  const playAlertSound = () => {
    const now = Date.now();
    if (now - lastAlertSound < 3000) return;
    
    setLastAlertSound(now);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.log('Audio playback not supported');
    }
  };

  // ✅ NEW: Show browser notification
  const showBrowserNotification = (alert: Alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.description,
        icon: alert.severity === 'critical' ? '🚨' : '⚠️',
        badge: '🔔'
      });
    }
  };

  // ✅ NEW: Add real-time alert from WebSocket
  const addRealtimeAlert = (alertData: Partial<Alert>) => {
    const newAlert: Alert = {
      id: alertData.id || `realtime-${Date.now()}`,
      title: alertData.title || 'Real-time Alert',
      description: alertData.description || 'Security event detected',
      severity: alertData.severity || 'medium',
      sourceIp: alertData.sourceIp || 'unknown',
      country: alertData.country || 'Unknown',
      flag: alertData.flag || '🌍',
      timestamp: 'Just now',
      status: 'active',
      type: alertData.type || 'connection',
      attackTime: new Date(),
      isNew: true
    };

    setAlerts(prev => [newAlert, ...prev]);

    setStats(prev => ({
      ...prev,
      active: prev.active + 1,
      critical: newAlert.severity === 'critical' ? prev.critical + 1 : prev.critical
    }));

    if (newAlert.severity === 'critical') {
      playAlertSound();
      showBrowserNotification(newAlert);
    }

    setTimeout(() => {
      setAlerts(prev => prev.map(a => 
        a.id === newAlert.id ? { ...a, isNew: false } : a
      ));
    }, 3000);

    console.log('🔴 [REALTIME] New alert added:', newAlert);
  };

  // ✅ NEW: WebSocket connection
  useEffect(() => {
    console.log('🔌 [WEBSOCKET] Initializing...');
    
    const ws = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    ws.on('connect', () => {
      console.log('✅ [WEBSOCKET] Connected');
      setWsConnected(true);
    });

    ws.on('disconnect', () => {
      console.log('❌ [WEBSOCKET] Disconnected');
      setWsConnected(false);
    });

    ws.on('reconnect', (attemptNumber) => {
      console.log(`🔄 [WEBSOCKET] Reconnected after ${attemptNumber} attempts`);
      setWsConnected(true);
    });

    ws.on('new_session', (sessionData: any) => {
      console.log('🚨 [WEBSOCKET] New session:', sessionData);
      
      if (sessionData.risk >= 7) {
        const severity = sessionData.risk >= 9 ? 'critical' : 'high';
        
        addRealtimeAlert({
          id: `session-${sessionData.sessionId}`,
          severity,
          title: `${severity === 'critical' ? '🚨 CRITICAL' : '⚠️ HIGH RISK'} Attack Session`,
          description: `New SSH attack from ${sessionData.ip} (${sessionData.countryName || sessionData.country}) - Risk: ${sessionData.risk}/10`,
          sourceIp: sessionData.ip,
          country: sessionData.countryName || sessionData.country,
          flag: sessionData.country,
          type: 'command_execution',
          sessionId: sessionData.sessionId
        });
      }
    });

    ws.on('new_attack', (attackData: any) => {
      console.log('🔥 [WEBSOCKET] New attack:', attackData);
      
      const isCritical = attackData.type === 'cowrie.login.success' || 
                        attackData.type === 'cowrie.session.file_download' ||
                        attackData.type === 'cowrie.command.input';
      
      if (isCritical) {
        const severity = (attackData.type === 'cowrie.login.success' || 
                         attackData.type === 'cowrie.session.file_download') 
                         ? 'critical' : 'high';
        
        addRealtimeAlert({
          severity,
          title: getAlertTitle(attackData),
          description: getAlertDescription(attackData),
          sourceIp: attackData.ip,
          country: attackData.country,
          flag: attackData.flag,
          type: determineAlertType(attackData)
        });
      }
    });

    setSocket(ws);

    return () => {
      console.log('🔌 [WEBSOCKET] Cleaning up...');
      ws.disconnect();
    };
  }, []);

  // ✅ NEW: Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Browser notifications enabled');
        }
      });
    }
  }, []);

  const fetchAlerts = async () => {
    try {
      setError(null);
      
      const response = await axios.get(`${API_BASE}/dashboard/attacks`);
      
      const convertedAlerts: Alert[] = response.data.map((attack: any, index: number) => {
        const severity = calculateSeverity(attack);
        const alertType = determineAlertType(attack);
        const title = getAlertTitle(attack);
        const description = getAlertDescription(attack);
        
        const attackTimestamp = attack.timestamp || new Date().toISOString();
        const status = isAttackActive(attackTimestamp) ? 'active' : 'resolved';
        
        return {
          id: attack.id || `alert-${index}`,
          title,
          description,
          severity,
          sourceIp: attack.ip || 'unknown',
          country: attack.country || 'Unknown',
          flag: attack.flag || '🌍',
          timestamp: formatTimeAgo(attackTimestamp),
          status,
          type: alertType,
          sessionId: attack.session,
          attackTime: new Date(attackTimestamp),
          commands: []
        };
      });
      
      convertedAlerts.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (b.attackTime?.getTime() || 0) - (a.attackTime?.getTime() || 0);
      });
      
      setAlerts(convertedAlerts);
      
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const activeAlerts = convertedAlerts.filter(a => a.status === 'active');
      const resolvedToday = convertedAlerts.filter(a => {
        if (a.status !== 'resolved') return false;
        return a.attackTime.getTime() >= todayStart.getTime();
      });
      const criticalAlerts = convertedAlerts.filter(a => a.severity === 'critical');
      
      let totalResponseSeconds = 0;
      let resolvedCount = 0;
      
      convertedAlerts.forEach(alert => {
        if (alert.status === 'resolved' && alert.attackTime) {
          const responseTime = (now - alert.attackTime.getTime()) / 1000;
          totalResponseSeconds += responseTime;
          resolvedCount++;
        }
      });
      
      const avgResponseSeconds = resolvedCount > 0 ? totalResponseSeconds / resolvedCount : 0;
      const avgResponseMinutes = Math.floor(avgResponseSeconds / 60);
      
      setStats({
        active: activeAlerts.length,
        resolved: resolvedToday.length,
        avgResponseTime: `${avgResponseMinutes}m`,
        critical: criticalAlerts.length
      });
      
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      setError(error.message || 'Failed to fetch alerts');
    }
  };

  const fetchSessionCommands = async (sessionId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/sessions/${sessionId}/commands`);
      return response.data.commands || [];
    } catch (error) {
      console.error('Error fetching commands:', error);
      return [];
    }
  };

  const handleMarkResolved = async (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    
    const now = new Date();
    const updatedAlert = {
      ...alert,
      status: 'resolved' as const,
      resolvedAt: now,
      resolvedBy: 'admin'
    };
    
    setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
    
    const activeCount = alerts.filter(a => a.id !== alertId && a.status === 'active').length;
    const resolvedCount = alerts.filter(a => a.id === alertId || a.status === 'resolved').length;
    
    setStats(prev => ({
      ...prev,
      active: activeCount,
      resolved: resolvedCount
    }));
  };

  const handleArchive = async (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    
    const updatedAlert = {
      ...alert,
      status: 'archived' as const,
      archivedAt: new Date()
    };
    
    setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
  };

  const handleViewSolution = (alert: Alert) => {
    const solution = ATTACK_SOLUTIONS[alert.type] || ATTACK_SOLUTIONS['default'];
    setCurrentSolution(solution);
    setShowSolution(true);
  };

  const handleInvestigate = async (alert: Alert) => {
    if (alert.sessionId) {
      const commands = await fetchSessionCommands(alert.sessionId);
      alert.commands = commands.map((c: any) => c.input || c.command);
    }
    
    setSelectedAlert(alert);
  };

  const toggleRule = (ruleId: string) => {
    setAlertRules(alertRules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const toggleAlertSelection = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const bulkMarkAsResolved = () => {
    const now = new Date();
    setAlerts(alerts.map(a => 
      selectedAlerts.has(a.id) 
        ? { ...a, status: 'resolved' as const, resolvedAt: now, resolvedBy: 'admin' } 
        : a
    ));
    setSelectedAlerts(new Set());
    
    const active = alerts.filter(a => 
      selectedAlerts.has(a.id) ? false : a.status === 'active'
    ).length;
    const resolved = alerts.filter(a => 
      selectedAlerts.has(a.id) || a.status === 'resolved'
    ).length;
    setStats(prev => ({ ...prev, active, resolved }));
  };

  const bulkArchive = () => {
    const now = new Date();
    setAlerts(alerts.map(a => 
      selectedAlerts.has(a.id) 
        ? { ...a, status: 'archived' as const, archivedAt: now } 
        : a
    ));
    setSelectedAlerts(new Set());
  };

  const exportSelectedAlerts = () => {
    const selected = alerts.filter(a => selectedAlerts.has(a.id));
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRules = () => {
    const blob = new Blob([JSON.stringify(alertRules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-rules-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Effects
  useEffect(() => {
    fetchAlerts();
    // ✅ REMOVED polling - WebSocket handles real-time updates now!
  }, []);

  // Computed Values
  const filteredAlerts = (() => {
    if (activeFilter === 'all') return alerts;
    if (activeFilter === 'critical') return alerts.filter(a => a.severity === 'critical');
    return alerts.filter(a => a.status === activeFilter);
  })();

  const displayedAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 3);

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              Alert Management Center
              {/* ✅ NEW: WebSocket status indicator */}
              {wsConnected ? (
                <span className="flex items-center gap-2 text-sm font-normal text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30">
                  <Wifi className="w-4 h-4 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm font-normal text-red-400 bg-red-900/30 px-3 py-1 rounded-full border border-red-500/30">
                  <WifiOff className="w-4 h-4" />
                  Offline
                </span>
              )}
            </h1>
            <p className="text-gray-400">Monitor and respond to security alerts in real-time</p>
          </div>
          
          <button 
            onClick={() => setShowRuleConfig(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all shadow-md"
          >
            Create Alert Rule
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <div className="font-bold text-red-400">Error Loading Alerts</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
            <button 
              onClick={fetchAlerts} 
              className="ml-auto px-3 py-1 bg-red-800/60 text-red-300 rounded-lg hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedAlerts.size > 0 && (
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-[#00D9FF] rounded-xl p-4 flex items-center justify-between shadow-md mb-6">
            <span className="font-bold text-white flex items-center gap-2">
              <Check className="w-5 h-5 text-[#00D9FF]" />
              {selectedAlerts.size} alert{selectedAlerts.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button 
                onClick={bulkMarkAsResolved} 
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 shadow-md"
              >
                <Check className="w-4 h-4" />
                Mark Resolved
              </button>
              <button 
                onClick={bulkArchive} 
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center gap-2 shadow-md"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button 
                onClick={exportSelectedAlerts} 
                className="px-4 py-2 bg-[#00D9FF] text-white rounded-lg hover:bg-[#00D9FF]/80 transition flex items-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button 
                onClick={() => setSelectedAlerts(new Set())} 
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Alert Statistics Cards - CLICKABLE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { 
              label: "Active Alerts", 
              value: stats.active.toString(), 
              color: "from-[#FF6B35] to-[#8B5CF6]",
              filter: 'active' as const,
              description: "Attacks happening now (last 5 min)",
              icon: Activity
            },
            { 
              label: "Resolved Today", 
              value: stats.resolved.toString(), 
              color: "from-[#10B981] to-[#00D9FF]",
              filter: 'resolved' as const,
              description: "Attacks marked as resolved",
              icon: Check
            },
            { 
              label: "Avg Response Time", 
              value: stats.avgResponseTime, 
              color: "from-[#00D9FF] to-[#8B5CF6]",
              filter: 'all' as const,
              description: "Time to resolve alerts",
              icon: Clock
            },
            { 
              label: "Critical Alerts", 
              value: stats.critical.toString(), 
              color: "from-[#FF6B35] to-[#FFA500]",
              filter: 'critical' as const,
              description: "Successful logins & command execution",
              icon: AlertTriangle
            },
          ].map((stat, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveFilter(stat.filter);
                setShowAllAlerts(false);
              }}
              className={`bg-gray-800/90 border-2 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-[#00D9FF]/20 transition-all text-left ${
                activeFilter === stat.filter ? 'border-[#00D9FF]' : 'border-gray-700'
              }`}
              title={stat.description}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <stat.icon className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-white text-3xl font-bold">{stat.value}</p>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} opacity-20`} />
              </div>
              {activeFilter === stat.filter && (
                <p className="text-[#00D9FF] text-xs mt-2">Currently viewing ✓</p>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert Feed Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg font-bold">
                  Alert Feed ({filteredAlerts.length})
                  {activeFilter === 'critical' && (
                    <span className="ml-2 text-red-400 text-sm">
                      🚨 CRITICAL threats only
                    </span>
                  )}
                  {activeFilter === 'active' && (
                    <span className="ml-2 text-orange-400 text-sm">
                      ⚡ Live attacks (last 5 min)
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  {(['all', 'active', 'resolved', 'critical', 'archived'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        setShowAllAlerts(false);
                      }}
                      className={`px-3 py-1 rounded text-xs transition-all ${
                        activeFilter === filter
                          ? "bg-[#00D9FF] text-white shadow-md shadow-[#00D9FF]/30"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alert List */}
              <div className="space-y-3">
                {displayedAlerts.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg font-bold mb-2">No alerts to display</p>
                    <p className="text-sm">
                      {activeFilter === 'active' 
                        ? '✅ No active attacks - All systems operational!' 
                        : activeFilter === 'critical'
                        ? '✅ No critical threats detected'
                        : 'No alerts in this category'}
                    </p>
                  </div>
                ) : (
                  displayedAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={alert.isNew ? { x: -20, opacity: 0, scale: 0.95 } : false}
                      animate={alert.isNew ? { x: 0, opacity: 1, scale: 1 } : false}
                      transition={{ duration: 0.3 }}
                      className={`bg-gray-900/60 rounded-lg border p-4 hover:border-[#00D9FF] hover:shadow-lg hover:shadow-[#00D9FF]/20 transition-all ${
                        alert.severity === 'critical' 
                          ? 'border-red-500 shadow-lg shadow-red-500/20' 
                          : 'border-gray-700'
                      } ${alert.isNew ? 'ring-2 ring-[#00D9FF] ring-opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <input
                          type="checkbox"
                          checked={selectedAlerts.has(alert.id)}
                          onChange={() => toggleAlertSelection(alert.id)}
                          className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-[#00D9FF] focus:ring-[#00D9FF] focus:ring-offset-gray-900 cursor-pointer"
                        />
                        
                        <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getPriorityColor(alert.severity)} text-white shadow-md font-bold text-xs`}>
                          {alert.severity.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              {alert.title}
                              {/* ✅ NEW: Badge for new alerts */}
                              {alert.isNew && (
                                <span className="px-2 py-0.5 bg-[#00D9FF] text-white text-xs rounded-full animate-pulse">
                                  NEW
                                </span>
                              )}
                            </h3>
                            <span className="text-gray-500 text-xs">{alert.timestamp}</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{alert.description}</p>
                          <div className="flex items-center gap-4 text-xs flex-wrap">
                            <span className="text-gray-400">
                              Type: <span className="text-[#00D9FF]">{alert.type.replace('_', ' ')}</span>
                            </span>
                            <span className="text-gray-400">
                              IP: <span className="text-[#00D9FF] font-mono">{alert.sourceIp}</span>
                            </span>
                            <span className="text-gray-400">
                              Location: <span className="text-[#00D9FF]">{alert.flag} {alert.country}</span>
                            </span>
                            {alert.status === 'resolved' && (
                              <span className="px-2 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-700">
                                ✓ RESOLVED
                              </span>
                            )}
                            {alert.status === 'active' && (
                              <span className="px-2 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-700 animate-pulse">
                                ⚡ ACTIVE
                              </span>
                            )}
                            {alert.status === 'archived' && (
                              <span className="px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-400 border border-yellow-700">
                                📁 ARCHIVED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-700">
                        <button
                          onClick={() => handleViewSolution(alert)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded text-xs hover:shadow-lg hover:shadow-[#00D9FF]/30 transition-all"
                        >
                          <Lightbulb className="w-3 h-3" />
                          View Solution
                        </button>
                        <button 
                          onClick={() => handleInvestigate(alert)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF] rounded text-xs hover:bg-[#00D9FF]/30 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Investigate
                        </button>
                        {alert.status !== 'resolved' && (
                          <button 
                            onClick={() => handleMarkResolved(alert.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-900/40 text-green-400 border border-green-700 rounded text-xs hover:bg-green-900/60 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Mark Resolved
                          </button>
                        )}
                        {alert.status !== 'archived' && (
                          <button 
                            onClick={() => handleArchive(alert.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                          >
                            <Archive className="w-3 h-3" />
                            Archive
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {filteredAlerts.length > 3 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    {showAllAlerts ? 'Show Less' : `Show All ${filteredAlerts.length} Alerts`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Alert Configuration Sidebar */}
          <div className="space-y-6">
            {/* Alert Rules Panel */}
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-bold">Alert Rules</h3>
                <button
                  onClick={exportRules}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition flex items-center gap-1.5 text-xs"
                  title="Export all rules"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-gray-900/60 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">{rule.name}</span>
                      <label className="relative inline-block w-10 h-5">
                        <input 
                          type="checkbox" 
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          className="opacity-0 w-0 h-0 peer" 
                        />
                        <span className="absolute inset-0 bg-gray-600 rounded-full cursor-pointer transition-colors peer-checked:bg-[#00D9FF]" />
                        <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-md" />
                      </label>
                    </div>
                    <p className="text-gray-400 text-xs mb-1">{rule.description}</p>
                    <span className="text-gray-500 text-xs">Triggered {rule.triggerCount}x today</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Legend */}
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-5 shadow-sm">
              <h3 className="text-white text-lg mb-4 flex items-center gap-2 font-bold">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Severity Levels
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="px-2 py-1 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded text-xs font-bold whitespace-nowrap">
                    CRITICAL
                  </div>
                  <p className="text-gray-300 flex-1">
                    Successful logins, command execution - requires immediate action
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="px-2 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded text-xs font-bold whitespace-nowrap">
                    HIGH
                  </div>
                  <p className="text-gray-300 flex-1">
                    Brute force attempts, persistent attacks
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded text-xs font-bold whitespace-nowrap">
                    MEDIUM
                  </div>
                  <p className="text-gray-300 flex-1">
                    Suspicious connections, unusual patterns
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-xs font-bold whitespace-nowrap">
                    LOW
                  </div>
                  <p className="text-gray-300 flex-1">
                    Informational alerts, monitoring data
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-xl p-5 shadow-sm">
              <h3 className="text-white text-lg mb-4 flex items-center gap-2 font-bold">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Quick Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Alerts:</span>
                  <span className="text-white font-bold">{alerts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Resolution Rate:</span>
                  <span className="text-green-400 font-bold">
                    {alerts.length > 0 
                      ? Math.round((alerts.filter(a => a.status === 'resolved').length / alerts.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Avg Severity:</span>
                  <span className="text-orange-400 font-bold">
                    {alerts.length > 0
                      ? alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > alerts.length / 2
                        ? 'High'
                        : 'Medium'
                      : 'N/A'}
                  </span>
                </div>
                {/* ✅ NEW: WebSocket connection status */}
                <div className="flex justify-between items-center pt-2 border-t border-blue-700">
                  <span className="text-gray-300">Connection:</span>
                  <span className={`font-bold flex items-center gap-1 ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {wsConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showSolution && currentSolution && (
            <SolutionModal 
              solution={currentSolution}
              onClose={() => {
                setShowSolution(false);
                setCurrentSolution(null);
              }} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedAlert && (
            <InvestigationModal 
              alert={selectedAlert} 
              onClose={() => setSelectedAlert(null)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRuleConfig && (
            <RuleConfigModal onClose={() => setShowRuleConfig(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Modal components remain EXACTLY the same as your original...
// (Copy SolutionModal, InvestigationModal, and RuleConfigModal from document #4)

// ============================================
// MODAL COMPONENTS (from your original code)
// ============================================

function SolutionModal({ solution, onClose }: { solution: AttackSolution; onClose: () => void }) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${solution.title} - Security Response Guide</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #DC2626; border-bottom: 3px solid #DC2626; padding-bottom: 10px; }
            h2 { color: #2563EB; margin-top: 30px; }
            .critical-note { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
            .step { background: #F3F4F6; padding: 10px; margin: 10px 0; border-radius: 5px; }
            .step-number { background: #2563EB; color: white; padding: 5px 10px; border-radius: 50%; margin-right: 10px; }
            ul { list-style: none; padding: 0; }
            li { margin: 10px 0; }
            .tools { background: #DBEAFE; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${solution.title}</h1>
          <p><strong>Attack Type:</strong> ${solution.type}</p>
          
          ${solution.criticalityNote ? `
            <div class="critical-note">
              <strong>⚠️ CRITICAL WARNING:</strong><br>
              ${solution.criticalityNote}
            </div>
          ` : ''}
          
          <h2>Immediate Action Steps</h2>
          <ul>
            ${solution.immediateSteps.map((step, i) => `
              <li class="step">
                <span class="step-number">${i + 1}</span>
                ${step}
              </li>
            `).join('')}
          </ul>
          
          <h2>Prevention Strategy</h2>
          <ul>
            ${solution.prevention.map(item => `<li>• ${item}</li>`).join('')}
          </ul>
          
          <h2>Required Tools</h2>
          <div class="tools">
            ${solution.toolsNeeded.map(tool => `<div><strong>${tool.split(' - ')[0]}</strong> - ${tool.split(' - ')[1] || ''}</div>`).join('')}
          </div>
          
          <p style="margin-top: 40px; color: #6B7280; font-size: 12px;">
            Generated: ${new Date().toLocaleString()}<br>
            Honeypot Observer - Security Incident Response Guide
          </p>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-red-50 to-orange-50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-6 h-6 text-[#00D9FF]" />
              <h2 className="text-2xl font-bold text-gray-900">{solution.title}</h2>
            </div>
            <p className="text-gray-600">Attack Type: {solution.type}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {solution.criticalityNote && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-red-900 mb-1">⚠️ CRITICAL WARNING</h3>
                  <p className="text-red-800">{solution.criticalityNote}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Immediate Action Steps
            </h3>
            <div className="space-y-2">
              {solution.immediateSteps.map((step, index) => (
                <div key={index} className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 text-sm flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Prevention Strategy
            </h3>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <ul className="space-y-2">
                {solution.prevention.map((item, index) => (
                  <li key={index} className="flex gap-2 text-gray-700 text-sm">
                    <span className="text-green-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Required Tools
            </h3>
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
              <div className="space-y-2">
                {solution.toolsNeeded.map((tool, index) => {
                  const [name, description] = tool.split(' - ');
                  return (
                    <div key={index} className="flex gap-2">
                      <span className="font-bold text-purple-700">{name}</span>
                      {description && (
                        <>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-600">{description}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg transition-all font-bold"
          >
            Got It, Thanks!
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Print Guide
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InvestigationModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "evidence" | "notes">("overview");
  const [notes, setNotes] = useState('');
  const [sessionDetails, setSessionDetails] = useState<any>(null);

  useEffect(() => {
    if (alert.sessionId) {
      axios.get(`${API_BASE}/sessions/${alert.sessionId}/details`)
        .then(res => setSessionDetails(res.data))
        .catch(err => console.error('Error fetching session details:', err));
    }
  }, [alert.sessionId]);

  const exportAlertPackage = () => {
    const packageData = {
      alert,
      sessionDetails,
      notes,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-package-${alert.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Alert Evidence Report - ${alert.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 1000px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .command { background: #f0f0f0; padding: 10px; margin: 5px 0; border-left: 3px solid #00D9FF; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            .critical { color: #DC2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔍 Alert Evidence Report</h1>
            <p><strong>Alert ID:</strong> ${alert.id}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="section">
            <h2>Alert Details</h2>
            <table>
              <tr><th>Severity</th><td class="${alert.severity === 'critical' ? 'critical' : ''}">${alert.severity.toUpperCase()}</td></tr>
              <tr><th>Type</th><td>${alert.type}</td></tr>
              <tr><th>Source IP</th><td>${alert.sourceIp}</td></tr>
              <tr><th>Country</th><td>${alert.flag} ${alert.country}</td></tr>
              <tr><th>Status</th><td>${alert.status.toUpperCase()}</td></tr>
              <tr><th>Detected At</th><td>${alert.attackTime.toLocaleString()}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Description</h2>
            <p>${alert.description}</p>
          </div>
          
          ${alert.commands && alert.commands.length > 0 ? `
            <div class="section">
              <h2>Commands Executed</h2>
              ${alert.commands.map(cmd => `<div class="command">$ ${cmd}</div>`).join('')}
            </div>
          ` : ''}
          
          ${sessionDetails ? `
            <div class="section">
              <h2>Session Information</h2>
              <table>
                <tr><th>Session ID</th><td>${sessionDetails.sessionId}</td></tr>
                <tr><th>Commands</th><td>${sessionDetails.commands?.length || 0}</td></tr>
                <tr><th>Duration</th><td>${sessionDetails.behaviorProfile?.sessionDuration || 0}s</td></tr>
                <tr><th>Skill Level</th><td>${sessionDetails.behaviorProfile?.skillLevel || 'Unknown'}</td></tr>
              </table>
            </div>
          ` : ''}
          
          ${notes ? `
            <div class="section">
              <h2>Investigation Notes</h2>
              <p>${notes}</p>
            </div>
          ` : ''}
          
          <div class="section" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This report was generated by Honeypot Observer<br>
              Report ID: ${alert.id}<br>
              Timestamp: ${new Date().toISOString()}
            </p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-6 h-6 text-[#00D9FF]" />
              <h2 className="text-2xl font-bold text-gray-900">Investigation Dashboard</h2>
            </div>
            <p className="text-gray-600">{alert.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-2 px-6 border-b border-gray-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "timeline", label: "Timeline" },
            { id: "evidence", label: "Evidence" },
            { id: "notes", label: "Notes" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm transition-colors font-medium ${
                activeTab === tab.id
                  ? "text-[#00D9FF] border-b-2 border-[#00D9FF]"
                  : "text-gray-600 hover:text-[#00D9FF]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-240px)]">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${
                  alert.severity === 'critical' 
                    ? 'bg-red-50 border-red-200' 
                    : alert.severity === 'high'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-sm text-gray-600 mb-1">Priority</p>
                  <p className={`text-xl font-bold ${
                    alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Attack Type</p>
                  <p className="text-xl font-bold text-blue-600">{alert.type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Source IP</p>
                  <p className="text-xl font-bold text-purple-600 font-mono">{alert.sourceIp}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-xl font-bold text-green-600">{alert.status.toUpperCase()}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{alert.description}</p>
              </div>

              {sessionDetails && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-2">Session Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Commands: <span className="font-bold">{sessionDetails.commands?.length || 0}</span></div>
                    <div>Duration: <span className="font-bold">{sessionDetails.behaviorProfile?.sessionDuration || 0}s</span></div>
                    <div>Skill Level: <span className="font-bold">{sessionDetails.behaviorProfile?.skillLevel || 'Unknown'}</span></div>
                    <div>Automated: <span className="font-bold">{sessionDetails.behaviorProfile?.automationDetected ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-bold text-gray-900 mb-2">Risk Assessment</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Threat Level:</span>
                    <span className="font-bold text-orange-600">
                      {alert.severity === 'critical' ? 'CRITICAL' : alert.severity === 'high' ? 'HIGH' : 'MEDIUM'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Confidence:</span>
                    <span className="font-bold text-orange-600">95%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Impact:</span>
                    <span className="font-bold text-orange-600">
                      {alert.severity === 'critical' ? 'System Compromise' : 'Security Breach Attempt'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-3">
              {[
                { time: alert.attackTime.toLocaleTimeString(), event: "Attack initiated", severity: "critical" },
                { time: new Date(alert.attackTime.getTime() + 2000).toLocaleTimeString(), event: "Connection established", severity: "warning" },
                { time: new Date(alert.attackTime.getTime() + 5000).toLocaleTimeString(), event: "Authentication attempt", severity: "warning" },
                ...(alert.commands && alert.commands.length > 0 
                  ? [{ time: new Date(alert.attackTime.getTime() + 7000).toLocaleTimeString(), event: "Command execution detected", severity: "critical" }]
                  : []
                ),
                ...(alert.status === 'resolved' 
                  ? [{ time: alert.resolvedAt?.toLocaleTimeString() || 'N/A', event: "Alert resolved", severity: "success" }]
                  : [{ time: 'Ongoing', event: "Attack still active", severity: "critical" }]
                ),
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-500 font-mono whitespace-nowrap">{item.time}</div>
                  <div className="flex-1">
                    <p className="text-gray-900">{item.event}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                    item.severity === "critical" ? "bg-red-100 text-red-700" :
                    item.severity === "warning" ? "bg-orange-100 text-orange-700" :
                    item.severity === "success" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {item.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-4">
              {alert.commands && alert.commands.length > 0 ? (
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h3 className="text-white mb-2 font-bold">Command Log (Real Commands)</h3>
                  <div className="font-mono text-sm text-green-400 space-y-1">
                    {alert.commands.map((cmd, i) => (
                      <div key={i}>$ {cmd}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">No command execution detected for this session.</p>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-gray-900 mb-2">Network Indicators</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source IP:</span>
                    <span className="text-gray-900 font-mono">{alert.sourceIp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="text-gray-900">{alert.flag} {alert.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protocol:</span>
                    <span className="text-gray-900">SSH (Port 22)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session ID:</span>
                    <span className="text-gray-900 font-mono">{alert.sessionId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {sessionDetails && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-gray-900 mb-2">Client Fingerprint</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">SSH Client:</span>
                      <span className="text-gray-900">{sessionDetails.fingerprint?.sshClient || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Protocol:</span>
                      <span className="text-gray-900">{sessionDetails.fingerprint?.protocolVersion || 'SSH-2.0'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add investigation notes here...&#10;&#10;Example:&#10;- Verified IP belongs to known botnet&#10;- Commands indicate cryptocurrency mining attempt&#10;- Recommend blocking entire /24 subnet"
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={exportAlertPackage}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg hover:shadow-lg transition-all font-bold"
          >
            <Download className="w-4 h-4" />
            Export Package
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Print Evidence
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RuleConfigModal({ onClose }: { onClose: () => void }) {
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleCondition, setRuleCondition] = useState('');
  const [ruleType, setRuleType] = useState('brute_force');
  const [ruleSeverity, setRuleSeverity] = useState('medium');
  const [emailNotif, setEmailNotif] = useState(true);
  const [slackNotif, setSlackNotif] = useState(false);
  const [webhookNotif, setWebhookNotif] = useState(false);

  const handleCreateRule = () => {
    if (!ruleName || !ruleDescription) {
      alert('Please fill in all required fields (Name and Description)');
      return;
    }
    
    const newRule = {
      name: ruleName,
      description: ruleDescription,
      condition: ruleCondition,
      type: ruleType,
      severity: ruleSeverity,
      notifications: {
        email: emailNotif,
        slack: slackNotif,
        webhook: webhookNotif
      }
    };
    
    console.log('Creating rule:', newRule);
    alert('Rule created successfully! (In production, this would save to the backend)');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create Alert Rule</h2>
            <p className="text-sm text-gray-500 mt-1">Define conditions for automated alerts</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Rule Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setRuleType('brute_force')}
                className={`p-4 rounded-lg border-2 transition ${
                  ruleType === 'brute_force'
                    ? 'border-[#00D9FF] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🔓</div>
                <div className="font-bold text-sm">Brute Force</div>
                <div className="text-xs text-gray-500 mt-1">Multiple login attempts</div>
              </button>
              <button
                onClick={() => setRuleType('new_country')}
                className={`p-4 rounded-lg border-2 transition ${
                  ruleType === 'new_country'
                    ? 'border-[#00D9FF] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🌍</div>
                <div className="font-bold text-sm">New Country</div>
                <div className="text-xs text-gray-500 mt-1">Unusual location</div>
              </button>
              <button
                onClick={() => setRuleType('command')}
                className={`p-4 rounded-lg border-2 transition ${
                  ruleType === 'command'
                    ? 'border-[#00D9FF] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-bold text-sm">Malicious Cmd</div>
                <div className="text-xs text-gray-500 mt-1">Suspicious commands</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g., Multiple Failed SSH Logins"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Describe when this alert should trigger..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Condition (Advanced - Optional)
            </label>
            <input
              type="text"
              value={ruleCondition}
              onChange={(e) => setRuleCondition(e.target.value)}
              placeholder="e.g., failed_logins > 5 AND time_window = 5m"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: failed_logins &gt; 5, new_country == true, command contains 'wget'
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Alert Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'low', label: 'LOW', color: 'bg-green-100 text-green-700 border-green-500' },
                { value: 'medium', label: 'MEDIUM', color: 'bg-yellow-100 text-yellow-700 border-yellow-500' },
                { value: 'high', label: 'HIGH', color: 'bg-orange-100 text-orange-700 border-orange-500' },
                { value: 'critical', label: 'CRITICAL', color: 'bg-red-100 text-red-700 border-red-500' }
              ].map(sev => (
                <button
                  key={sev.value}
                  onClick={() => setRuleSeverity(sev.value)}
                  className={`px-4 py-3 rounded-lg font-bold transition border-2 ${
                    ruleSeverity === sev.value 
                      ? sev.color 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#00D9FF]" />
              Notification Settings
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-[#00D9FF] focus:ring-[#00D9FF]" 
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">Send email notification</span>
                  <p className="text-xs text-gray-500">Alert will be sent to your email</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-[#00D9FF] focus:ring-[#00D9FF]" 
                  checked={slackNotif}
                  onChange={(e) => setSlackNotif(e.target.checked)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">Send Slack notification</span>
                  <p className="text-xs text-gray-500">Post alert to Slack channel</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-[#00D9FF] focus:ring-[#00D9FF]" 
                  checked={webhookNotif}
                  onChange={(e) => setWebhookNotif(e.target.checked)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">Trigger webhook</span>
                  <p className="text-xs text-gray-500">Call external API endpoint</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2">Rule Preview</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="font-medium">Name:</span> {ruleName || 'Not set'}</div>
              <div><span className="font-medium">Type:</span> {ruleType.replace('_', ' ').toUpperCase()}</div>
              <div><span className="font-medium">Severity:</span> {ruleSeverity.toUpperCase()}</div>
              <div><span className="font-medium">Notifications:</span> {
                [emailNotif && 'Email', slackNotif && 'Slack', webhookNotif && 'Webhook']
                  .filter(Boolean)
                  .join(', ') || 'None selected'
              }</div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRule}
            className="px-6 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white font-bold rounded-lg hover:shadow-lg transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Create Rule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}