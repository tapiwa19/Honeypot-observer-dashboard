import { useState, useEffect } from 'react';
import { Shield, Activity, AlertTriangle, Globe, Bell, User, LogOut, Settings as SettingsIcon, TrendingUp, TrendingDown } from 'lucide-react';
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

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface DashboardStats {
  totalAttacks: number;
  activeSessions: number;
  threatLevel: string;
  countriesDetected: number;
}

interface RecentAlert {
  id: string;
  time: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalAttacks: 0,
    activeSessions: 0,
    threatLevel: 'LOW',
    countriesDetected: 0
  });

  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const recentAlerts: RecentAlert[] = [
    { id: '1', time: '2m ago', type: 'Brute Force Attack', priority: 'critical', message: 'Multiple login attempts detected' },
    { id: '2', time: '15m ago', type: 'Suspicious Command', priority: 'high', message: 'Malicious command executed' },
    { id: '3', time: '1h ago', type: 'New Country', priority: 'medium', message: 'First attack from new location' },
    { id: '4', time: '2h ago', type: 'Port Scanning', priority: 'high', message: 'Port scanning activity detected' },
    { id: '5', time: '3h ago', type: 'Unusual Pattern', priority: 'low', message: 'Unusual command pattern' }
  ];

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
      change: "Live",
      trend: "neutral",
      icon: Activity,
      color: "from-[#00D9FF] to-[#10B981]",
      button: "Monitor Live",
      navigateTo: "live-sessions",
      pulsing: true,
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
      navigateTo: "geomap",
    },
  ];

  const priorityColors: Record<string, string> = {
    critical: "from-[#FF6B35] to-[#8B5CF6]",
    high: "from-[#FF6B35] to-[#00D9FF]",
    medium: "from-[#00D9FF] to-[#8B5CF6]",
    low: "from-[#10B981] to-[#00D9FF]",
  };

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
      {/* Top Bar - Only Bell and Admin */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">Live</span>
            </div>

            {/* Notification Bell */}
            <button 
              onClick={() => onNavigate('alerts')}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {recentAlerts.length}
              </span>
            </button>

            {/* Admin Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-medium text-gray-900">Admin</div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">Admin User</div>
                    <div className="text-xs text-gray-500">admin@honeypot.local</div>
                  </div>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 transition flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition flex items-center gap-2 text-gray-700"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </button>
                  <hr className="my-2" />
                  <button className="w-full px-4 py-2 text-left hover:bg-red-50 transition flex items-center gap-2 text-red-600">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Real-time monitoring and threat intelligence</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className={`bg-white border rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer shadow-sm ${
                  card.pulsing ? "border-[#00D9FF] ring-2 ring-[#00D9FF]/20" : "border-gray-200 hover:border-[#00D9FF]"
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
                      <span className="text-[#00D9FF] text-sm">{card.change}</span>
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
          {/* Left Column - Live Attack Feed */}
          <div className="lg:col-span-2">
            <LiveAttackFeed onNavigate={onNavigate} />
          </div>

          {/* Right Column - Recent Alerts */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 text-lg">Latest Alerts</h3>
                <button className="text-gray-600 text-sm hover:text-[#00D9FF]">
                  Filter
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {recentAlerts.map((alert, index) => (
                  <div
                    key={alert.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#00D9FF] transition-colors cursor-pointer"
                    style={{ 
                      animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`px-2 py-1 rounded text-xs bg-gradient-to-r ${priorityColors[alert.priority]} text-white shadow-sm`}>
                        {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm mb-1">{alert.message}</p>
                        <p className="text-gray-500 text-xs">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigate('alerts')}
                className="w-full px-4 py-2 bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white rounded-lg text-sm hover:shadow-lg transition-all"
              >
                See All Alerts ({recentAlerts.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}