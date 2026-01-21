import { useState } from 'react';
import { Download, Filter, Calendar, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Analytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'geographic' | 'timeline' | 'patterns'>('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Mock data for charts
  const attackTimelineData = [
    { time: '00:00', attacks: 45 },
    { time: '04:00', attacks: 32 },
    { time: '08:00', attacks: 78 },
    { time: '12:00', attacks: 95 },
    { time: '16:00', attacks: 120 },
    { time: '20:00', attacks: 88 },
  ];

  const attackTypesData = [
    { type: 'SSH Brute Force', count: 342, percentage: 45 },
    { type: 'Malware Download', count: 189, percentage: 25 },
    { type: 'Reconnaissance', count: 128, percentage: 17 },
    { type: 'Command Injection', count: 98, percentage: 13 },
  ];

  const topCountries = [
    { country: 'China', code: 'CN', flag: '🇨🇳', attacks: 342, percentage: 35 },
    { country: 'Russia', code: 'RU', flag: '🇷🇺', attacks: 289, percentage: 30 },
    { country: 'USA', code: 'US', flag: '🇺🇸', attacks: 156, percentage: 16 },
    { country: 'Brazil', code: 'BR', flag: '🇧🇷', attacks: 98, percentage: 10 },
    { country: 'India', code: 'IN', flag: '🇮🇳', attacks: 87, percentage: 9 },
  ];

  const severityData = [
    { name: 'Critical', value: 78, color: '#EF4444' },
    { name: 'High', value: 156, color: '#F97316' },
    { name: 'Medium', value: 234, color: '#EAB308' },
    { name: 'Low', value: 120, color: '#10B981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Attack Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive analysis of attack patterns and trends</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-3 flex gap-2">
          {(['overview', 'geographic', 'timeline', 'patterns'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard label="Total Attacks" value="1,247" change="+12%" color="blue" />
                <MetricCard label="Unique IPs" value="342" change="+8%" color="purple" />
                <MetricCard label="Blocked Attacks" value="1,089" change="+15%" color="green" />
                <MetricCard label="Success Rate" value="12.7%" change="-3%" color="red" />
              </div>

              {/* Attack Timeline Chart */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Attack Timeline (Last 24h)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attackTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="attacks" stroke="#00D9FF" strokeWidth={3} dot={{ fill: '#00D9FF', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attack Types Bar Chart */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Top Attack Types</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attackTypesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" />
                      <YAxis dataKey="type" type="category" width={150} stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Severity Distribution Pie Chart */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Attack Severity Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'geographic' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-12 text-white text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h2 className="text-2xl font-bold mb-2">Interactive Map Coming Soon</h2>
                <p className="opacity-90">Geographic visualization with attack origins</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Top Countries</h3>
                <div className="space-y-3">
                  {topCountries.map((country, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{country.flag}</span>
                          <div>
                            <div className="font-bold text-gray-800">{country.country}</div>
                            <div className="text-sm text-gray-500">{country.attacks} attacks</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-primary-500">{country.percentage}%</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="text-center py-12">
              <TrendingUp className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Timeline View</h2>
              <p className="text-gray-500">Detailed attack timeline analysis</p>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="text-center py-12">
              <Filter className="w-24 h-24 mx-auto mb-4 text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pattern Detection</h2>
              <p className="text-gray-500">AI-powered attack pattern recognition</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  color: 'blue' | 'purple' | 'green' | 'red';
}

function MetricCard({ label, value, change, color }: MetricCardProps) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
  };

  const isPositive = change.startsWith('+');

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color].split(' ')[0]} mb-1`}>{value}</div>
      <div className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {change} from last period
      </div>
    </div>
  );
}