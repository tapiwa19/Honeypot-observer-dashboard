import { useState, useEffect } from 'react';
import { Shield, Activity, AlertTriangle, Globe, ChevronRight } from 'lucide-react';
import { StatCard } from '../components/layout/StatCard';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalAttacks: 1248,
    activeSessions: 3,
    threatLevel: 'HIGH',
    countriesDetected: 23
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalAttacks: prev.totalAttacks + Math.floor(Math.random() * 3)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const recentAttacks = [
    { id: 1, ip: '45.123.45.67', country: '🇨🇳 China', type: 'SSH Brute Force', severity: 'high', time: '2 min ago' },
    { id: 2, ip: '192.168.1.100', country: '🇷🇺 Russia', type: 'Malware Download', severity: 'critical', time: '5 min ago' },
    { id: 3, ip: '10.0.0.50', country: '🇺🇸 USA', type: 'Reconnaissance', severity: 'low', time: '8 min ago' },
    { id: 4, ip: '172.16.0.25', country: '🇧🇷 Brazil', type: 'Command Injection', severity: 'medium', time: '12 min ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Attacks Today"
          value={stats.totalAttacks}
          icon={Shield}
          color="cyan"
          pulse={false}
          onClick={() => onNavigate('analytics')}
        />
        <StatCard
          label="Active Sessions"
          value={stats.activeSessions}
          icon={Activity}
          color="orange"
          pulse={true}
          onClick={() => onNavigate('live-sessions')}
        />
        <StatCard
          label="Threat Level"
          value={stats.threatLevel}
          icon={AlertTriangle}
          color="red"
          pulse={false}
          onClick={() => onNavigate('alerts')}
        />
        <StatCard
          label="Countries Detected"
          value={stats.countriesDetected}
          icon={Globe}
          color="purple"
          pulse={false}
          onClick={() => onNavigate('geomap')}
        />
      </div>

      {/* Recent Attacks */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Live Attack Feed</h2>
          <button
            onClick={() => onNavigate('analytics')}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentAttacks.map(attack => (
            <div key={attack.id} className="px-6 py-4 hover:bg-gray-50 transition cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{attack.country.split(' ')[0]}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-gray-800">{attack.ip}</code>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        attack.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        attack.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        attack.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {attack.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{attack.type}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{attack.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}