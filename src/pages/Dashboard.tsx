import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Shield, Activity, AlertTriangle, Globe, TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import { LiveAttackFeed } from '../components/LiveAttackFeed';

// Add keyframe animations
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
if (!document.head.querySelector('style[data-dashboard-animations]')) {
  styleElement.setAttribute('data-dashboard-animations', 'true');
  document.head.appendChild(styleElement);
}

const API_BASE = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface DashboardStats {
  totalAttacks: number;
  activeSessions: number;
  threatLevel: string;
  countriesDetected: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalAttacks: 0,
    activeSessions: 0,
    threatLevel: 'LOW',
    countriesDetected: 0
  });

  const [loading, setLoading] = useState(true);
  
  // WebSocket state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  
  // ✅ NEW: Connection health monitoring
  const [connectionHealth, setConnectionHealth] = useState({
    latency: 0,
    lastHeartbeat: Date.now(),
    reconnectAttempts: 0
  });

  // ✅ NEW: Track unique countries for real-time counting
  const [uniqueCountries, setUniqueCountries] = useState<Set<string>>(new Set());

  // ✅ NEW: DDoS Warning state
  const [ddosAlert, setDDoSAlert] = useState<{
    active: boolean;
    suspiciousIPs: Array<{ ip: string; count: number }>;
    totalRequests: number;
  } | null>(null);

  // ✅ IMPROVED: WebSocket with comprehensive event listeners
  useEffect(() => {
    console.log('🔌 [Dashboard] Initializing WebSocket...');
    
    const socketConnection = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socketConnection.on('connect', () => {
      console.log('✅ [Dashboard] WebSocket connected');
      setLiveIndicator(true);
      setConnectionHealth(prev => ({ ...prev, reconnectAttempts: 0 }));
    });

    socketConnection.on('disconnect', () => {
      console.log('⚠️ [Dashboard] WebSocket disconnected');
      setLiveIndicator(false);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ [Dashboard] Connection error:', error);
      setConnectionHealth(prev => ({ 
        ...prev, 
        reconnectAttempts: prev.reconnectAttempts + 1 
      }));
    });

    // ✅ NEW SESSION - Increment counts
    socketConnection.on('new_session', (newSession: any) => {
      console.log('🔴 [Dashboard] New session:', newSession);
      
      setStats(prev => {
        const newTotal = prev.totalAttacks + 1;
        const newActive = prev.activeSessions + 1;
        
        // Calculate threat level based on risk
        let newThreatLevel = prev.threatLevel;
        if (newSession.risk >= 9) newThreatLevel = 'CRITICAL';
        else if (newSession.risk >= 7) newThreatLevel = 'HIGH';
        else if (newTotal > 200) newThreatLevel = 'HIGH';
        else if (newTotal > 50) newThreatLevel = 'MEDIUM';
        else newThreatLevel = 'LOW';

        return {
          ...prev,
          totalAttacks: newTotal,
          activeSessions: newActive,
          threatLevel: newThreatLevel
        };
      });

      // ✅ Track unique countries
      if (newSession.countryName) {
        setUniqueCountries(prev => new Set([...prev, newSession.countryName]));
      }
    });

    // ✅ NEW: SESSION UPDATED - Update counts if commands changed
    socketConnection.on('session_updated', (updatedSession: any) => {
      console.log('🔄 [Dashboard] Session updated:', updatedSession.sessionId);
      // Could update specific session data if needed
    });

    // ✅ NEW: SESSION CLOSED - Decrement active count
    socketConnection.on('session_closed', (data: { sessionId: string }) => {
      console.log('🔒 [Dashboard] Session closed:', data.sessionId);
      
      setStats(prev => ({
        ...prev,
        activeSessions: Math.max(0, prev.activeSessions - 1) // Never go below 0
      }));
    });

    // ✅ NEW: THREAT INTEL - Update countries count
    socketConnection.on('threat_intel_update', (intel: any) => {
      console.log('📊 [Dashboard] Threat intel update:', intel);
      
      // Extract unique countries from top attackers
      const countries = new Set<string>();
      intel.topAttackers?.forEach((attacker: any) => {
        if (attacker.country) countries.add(attacker.country);
      });
      
      setStats(prev => ({
        ...prev,
        countriesDetected: countries.size || prev.countriesDetected
      }));
    });

    // ✅ NEW: DDoS WARNING LISTENER
    socketConnection.on('ddos_warning', (warning: any) => {
      console.log('⚠️ [Dashboard] DDoS warning:', warning);
      
      if (!warning || !Array.isArray(warning.suspiciousIPs)) {
        console.error('Invalid DDoS warning data');
        return;
      }
      
      const sanitizedIPs = warning.suspiciousIPs
        .slice(0, 10)
        .map((item: any) => ({
          ip: String(item.ip || '').replace(/[<>'"]/g, '').slice(0, 45),
          count: Math.max(0, Math.min(100000, item.count || 0))
        }));
      
      setDDoSAlert({
        active: true,
        suspiciousIPs: sanitizedIPs,
        totalRequests: Math.max(0, warning.totalRequests || 0)
      });
      
      setTimeout(() => {
        setDDoSAlert(null);
      }, 120000);
    });

    // ✅ NEW: Connection health heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socketConnection.connected) {
        const pingStart = Date.now();
        socketConnection.emit('ping', () => {
          const latency = Date.now() - pingStart;
          setConnectionHealth(prev => ({
            ...prev,
            latency,
            lastHeartbeat: Date.now()
          }));
        });
      }
    }, 5000); // Every 5 seconds

    setSocket(socketConnection);

    return () => {
      console.log('🔌 [Dashboard] Disconnecting WebSocket...');
      clearInterval(heartbeatInterval);
      socketConnection.disconnect();
    };
  }, []);

  // Fetch dashboard stats ONCE on mount
  const fetchStats = async () => {
  try {
    const [statsResponse, sessionsResponse, attacksResponse] = await Promise.all([
      axios.get(`${API_BASE}/dashboard/stats`),
      axios.get(`${API_BASE}/sessions/live?range=1h`),
      axios.get(`${API_BASE}/analytics/countries?range=now-24h`)
    ]);
    
    const activeSessions = sessionsResponse.data.filter(
      (s: any) => s.status === 'active'
    ).length;

    const countriesDetected = attacksResponse.data.length;
    
    setStats({
      ...statsResponse.data,
      activeSessions,
      countriesDetected
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

  // ✅ IMPROVED: Initial load ONLY - No polling!
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };

    loadData();
    
    // ❌ REMOVED POLLING - WebSocket handles updates!
    // const interval = setInterval(fetchStats, 10000); // DELETED
    // return () => clearInterval(interval); // DELETED
  }, []);

  // ✅ NEW: Sync countries count from unique set
  useEffect(() => {
    if (uniqueCountries.size > 0) {
      setStats(prev => ({
        ...prev,
        countriesDetected: Math.max(prev.countriesDetected, uniqueCountries.size)
      }));
    }
  }, [uniqueCountries]);

  const getThreatLevelColor = (level: string) => {
    switch(level.toUpperCase()) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const statsCards: Array<{
    title: string;
    value: string;
    change: string;
    trend: "up" | "down" | "neutral";
    icon: typeof Shield;
    color: string;
    button: string;
    navigateTo: string;
    pulsing?: boolean;
  }> = [
    {
      title: "Total Attacks Today",
      value: stats.totalAttacks.toLocaleString(),
      change: "+23%",
      trend: "up",
      icon: Shield,
      color: "from-[#FF6B35] to-[#8B5CF6]",
      button: "View All Attacks",
      navigateTo: "analytics",
    },
   {
  title: "Active Sessions",
  value: stats.activeSessions.toString(),
  change: stats.activeSessions > 0 ? "Live" : "None Active",
  trend: "neutral",
  icon: Activity,
  color: "from-[#00D9FF] to-[#10B981]",
  button: "Monitor Live",
  navigateTo: "live-sessions",
  pulsing: stats.activeSessions > 0,
},
    {
      title: "Threat Level",
      value: stats.threatLevel,
      change: "Current",
      trend: stats.threatLevel === 'HIGH' || stats.threatLevel === 'CRITICAL' ? "up" : "neutral",
      icon: AlertTriangle,
      color: "from-[#FF6B35] to-[#00D9FF]",
      button: "View Threats",
      navigateTo: "alerts",
    },
    {
      title: "Countries Detected",
      value: stats.countriesDetected.toString(),
      change: "Last 24h",
      trend: "neutral",
      icon: Globe,
      color: "from-[#8B5CF6] to-[#00D9FF]",
      button: "See Geographic Data",
      navigateTo: "analytics",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">Real-time honeypot monitoring</p>
          </div>
          
          {/* ✅ IMPROVED: Connection Health Indicator */}
          <div className="flex items-center gap-3">
            {liveIndicator ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Wifi className="w-4 h-4 text-green-600" />
                <div className="flex flex-col">
                  <span className="text-green-700 font-medium text-sm">Live Monitoring Active</span>
                  {connectionHealth.latency > 0 && (
                    <span className="text-green-600 text-xs">
                      {connectionHealth.latency}ms latency
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <WifiOff className="w-4 h-4 text-red-600" />
                <div className="flex flex-col">
                  <span className="text-red-700 font-medium text-sm">Connection Lost</span>
                  {connectionHealth.reconnectAttempts > 0 && (
                    <span className="text-red-600 text-xs">
                      Reconnecting... (attempt {connectionHealth.reconnectAttempts})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ NEW: Connection Warning Banner */}
        {!liveIndicator && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">WebSocket Disconnected</p>
                <p className="text-yellow-700 text-sm">
                  Dashboard is showing last known data. Reconnecting automatically...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: DDoS Warning Banner */}
        {ddosAlert && (
          <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-xl p-6 shadow-lg animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-red-900 font-bold text-lg mb-2">
                  🚨 POSSIBLE DDoS ATTACK DETECTED!
                </h3>
                <p className="text-red-800 mb-3">
                  Detected {ddosAlert.suspiciousIPs.length} suspicious IP{ddosAlert.suspiciousIPs.length !== 1 ? 's' : ''} with 
                  excessive request rates ({ddosAlert.totalRequests.toLocaleString()} total requests in last minute).
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <p className="text-red-900 font-semibold text-sm mb-2">Top Suspicious IPs:</p>
                  <div className="space-y-2">
                    {ddosAlert.suspiciousIPs.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <code className="text-red-700 font-mono bg-red-50 px-2 py-1 rounded">
                          {item.ip}
                        </code>
                        <span className="text-red-900 font-bold">
                          {item.count.toLocaleString()} requests/min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setDDoSAlert(null)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => onNavigate('alerts')}
                    className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg text-sm hover:bg-red-50 transition-all"
                  >
                    View All Alerts
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className={`bg-white border rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer shadow-sm ${
                  card.pulsing ? "border-[#00D9FF] ring-2 ring-[#00D9FF]/20 animate-pulse" : "border-gray-200 hover:border-[#00D9FF]"
                } hover:shadow-lg`}
                style={{ 
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {card.trend === "up" ? (
                    <div className="flex items-center gap-1 text-[#10B981] text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>{card.change}</span>
                    </div>
                  ) : card.trend === "down" ? (
                    <div className="flex items-center gap-1 text-[#FF6B35] text-sm">
                      <TrendingDown className="w-4 h-4" />
                      <span>{card.change}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {card.pulsing && <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />}
                      <span className={`text-sm ${liveIndicator ? 'text-[#10B981]' : 'text-gray-400'}`}>
                        {card.change}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-600 text-sm mb-1">{card.title}</p>
                  <p className={`text-3xl ${card.title === 'Threat Level' ? getThreatLevelColor(card.value) : 'text-gray-900'}`}>
                    {card.value}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate(card.navigateTo)}
                  className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm transition-colors border border-blue-200"
                >
                  {card.button}
                </button>

                {/* Mini sparkline */}
                <svg className="w-full h-8 mt-3 opacity-30" viewBox="0 0 100 20">
                  <path
                    d="M0,10 L20,8 L40,12 L60,6 L80,9 L100,4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[#00D9FF]"
                  />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Live Attack Feed (2 columns wide) */}
          <div className="lg:col-span-2">
            <LiveAttackFeed onNavigate={onNavigate} socket={socket} />
          </div>

          {/* Right Column - Recent Alerts (1 column) */}
          <div className="lg:col-span-1">
            <RecentAlertsPanel onNavigate={onNavigate} socket={socket} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ IMPROVED: Real-time Alerts Component with proper WebSocket
function RecentAlertsPanel({ 
  onNavigate, 
  socket 
}: { 
  onNavigate: (page: string) => void;
  socket: Socket | null;
}) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveIndicator, setLiveIndicator] = useState(false);

  // WebSocket listeners
  useEffect(() => {
  if (!socket) return;

  // ✅ Check if already connected when component mounts
  if (socket.connected) {
    setLiveIndicator(true);
  }

  socket.on('connect', () => {
    setLiveIndicator(true);
  });

  socket.on('disconnect', () => {
    setLiveIndicator(false);
  });

    // Add new session to alerts
    socket.on('new_session', (newSession: any) => {
      console.log('🔔 [Alerts] New session:', newSession);
      
      const newAlert = {
        id: newSession.sessionId,
        time: 'just now',
        type: newSession.risk >= 8 ? 'Critical Attack' : 
              newSession.risk >= 6 ? 'High Risk Attack' : 'Attack Detected',
        priority: newSession.risk >= 8 ? 'critical' : 
                  newSession.risk >= 6 ? 'high' : 
                  newSession.risk >= 4 ? 'medium' : 'low',
        message: `New attack from ${newSession.ip}`,
        ip: newSession.ip,
        country: newSession.country,
        isNew: true // ✅ Mark as new
      };

      setAlerts(prev => [newAlert, ...prev.slice(0, 3)]);
      
      // Remove "new" flag after 10 seconds
      setTimeout(() => {
        setAlerts(prev => prev.map(a => 
          a.id === newAlert.id ? { ...a, isNew: false } : a
        ));
      }, 10000);
    });

    return () => {
      socket.off('new_session');
    };
  }, [socket]);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/attacks`);
      const recentAlerts = response.data
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 4).map((attack: any) => {
        const timeDiff = Date.now() - new Date(attack.timestamp).getTime();
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        let timeAgo;
        if (daysAgo > 0) timeAgo = `${daysAgo}d ago`;
        else if (hoursAgo > 0) timeAgo = `${hoursAgo}h ago`;
        else if (minutesAgo > 0) timeAgo = `${minutesAgo}m ago`;
        else timeAgo = 'just now';

        return {
          id: attack.id,
          time: timeAgo,
          type: attack.type || 'Unknown Attack',
          priority: attack.severity,
          message: attack.details || `Attack from ${attack.ip}`,
          ip: attack.ip,
          country: attack.flag,
          isNew: false
        };
      });
      setAlerts(recentAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ IMPROVED: Initial load only - no polling!
  useEffect(() => {
    fetchAlerts();
    // ❌ REMOVED POLLING - WebSocket handles new alerts
  }, []);

  const priorityColors: Record<string, string> = {
    critical: "from-[#FF6B35] to-[#8B5CF6]",
    high: "from-[#FF6B35] to-[#00D9FF]",
    medium: "from-[#00D9FF] to-[#8B5CF6]",
    low: "from-[#10B981] to-[#00D9FF]",
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-gray-900 text-lg mb-4">Latest Alerts</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 text-lg">Latest Alerts</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${liveIndicator ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className={`text-sm font-medium ${liveIndicator ? 'text-green-600' : 'text-gray-400'}`}>
            {liveIndicator ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No alerts yet</p>
            <p className="text-xs mt-2">Waiting for attacks...</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div
              key={alert.id}
              onClick={() => onNavigate('alerts')}
              className={`p-3 bg-gray-50 rounded-lg border transition-colors cursor-pointer ${
                alert.isNew 
                  ? 'border-red-500 ring-2 ring-red-500/20 animate-pulse' 
                  : 'border-gray-200 hover:border-[#00D9FF]'
              }`}
              style={{ 
                animation: alert.isNew 
                  ? 'fadeInUp 0.5s ease-out both' 
                  : `fadeInUp 0.5s ease-out ${index * 0.05}s both`
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`px-2 py-1 rounded text-xs bg-gradient-to-r ${priorityColors[alert.priority]} text-white shadow-sm flex-shrink-0`}>
                  {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-900 text-sm font-medium">{alert.type}</p>
                    <span className="text-lg">{alert.country}</span>
                    {alert.isNew && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs truncate mb-1">{alert.message}</p>
                  <p className="text-gray-400 text-xs">{alert.time}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => onNavigate('alerts')}
        className="w-full px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg text-sm hover:shadow-lg transition-all"
      >
        See All Alerts ({alerts.length})
      </button>
    </div>
  );
}