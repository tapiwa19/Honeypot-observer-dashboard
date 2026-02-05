import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Shield, Activity, AlertTriangle, Globe, TrendingUp, TrendingDown } from 'lucide-react';
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
  
  // ✅ NEW: WebSocket state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);

  // ✅ NEW: Initialize WebSocket
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
    });

    socketConnection.on('disconnect', () => {
      console.log('⚠️ [Dashboard] WebSocket disconnected');
      setLiveIndicator(false);
    });

    // ✅ Listen for new sessions (updates active sessions count)
    socketConnection.on('new_session', (newSession: any) => {
      console.log('🔴 [Dashboard] New session detected:', newSession);
      
      // Update active sessions count
      setStats(prev => ({
        ...prev,
        activeSessions: prev.activeSessions + 1,
        totalAttacks: prev.totalAttacks + 1,
        // Update threat level based on new session risk
        threatLevel: newSession.risk >= 8 ? 'CRITICAL' : 
                     newSession.risk >= 6 ? 'HIGH' : 
                     prev.totalAttacks > 200 ? 'HIGH' :
                     prev.totalAttacks > 50 ? 'MEDIUM' : 'LOW'
      }));

      // Fetch fresh stats from backend
      fetchStats();
    });

    setSocket(socketConnection);

    return () => {
      console.log('🔌 [Dashboard] Disconnecting WebSocket...');
      socketConnection.disconnect();
    };
  }, []);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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
      change: liveIndicator ? "Live" : "Offline",
      trend: "neutral",
      icon: Activity,
      color: "from-[#00D9FF] to-[#10B981]",
      button: "Monitor Live",
      navigateTo: "live-sessions",
      pulsing: liveIndicator && stats.activeSessions > 0, // ✅ Only pulse if live AND has active sessions
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
          
          {/* ✅ Live Status Indicator */}
          {liveIndicator && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 font-medium text-sm">Live Monitoring Active</span>
            </div>
          )}
        </div>

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

// Real-time Alerts Component
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

  // ✅ Listen for new sessions via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      setLiveIndicator(true);
    });

    socket.on('disconnect', () => {
      setLiveIndicator(false);
    });

    // ✅ Add new session to alerts
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
        country: newSession.country
      };

      setAlerts(prev => [newAlert, ...prev.slice(0, 3)]);
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
          country: attack.flag
        };
      });
      setAlerts(recentAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
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
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#00D9FF] transition-colors cursor-pointer"
              style={{ 
                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
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