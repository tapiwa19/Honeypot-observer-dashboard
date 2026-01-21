import { SessionCard } from '../components/sessions/SessionCard';

export function LiveSessions() {
  const sessions = [
    { id: 1, ip: '45.123.45.67', country: '🇨🇳', duration: 324, commands: 47, risk: 9 },
    { id: 2, ip: '192.168.1.100', country: '🇷🇺', duration: 156, commands: 23, risk: 8 },
    { id: 3, ip: '10.0.0.50', country: '🇺🇸', duration: 89, commands: 12, risk: 4 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Live Attack Sessions</h1>
        <p className="text-gray-400">Real-time monitoring of active intrusions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}