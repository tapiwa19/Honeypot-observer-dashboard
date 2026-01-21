import { useState } from 'react';
import { MapPin, Globe, TrendingUp } from 'lucide-react';

export function GeoMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const countries = [
    { name: 'China', code: 'CN', flag: '🇨🇳', attacks: 342, percentage: 27, lat: 35.8617, lng: 104.1954 },
    { name: 'Russia', code: 'RU', flag: '🇷🇺', attacks: 289, percentage: 23, lat: 61.5240, lng: 105.3188 },
    { name: 'United States', code: 'US', flag: '🇺🇸', attacks: 156, percentage: 12, lat: 37.0902, lng: -95.7129 },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷', attacks: 98, percentage: 8, lat: -14.2350, lng: -51.9253 },
    { name: 'India', code: 'IN', flag: '🇮🇳', attacks: 87, percentage: 7, lat: 20.5937, lng: 78.9629 },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', attacks: 76, percentage: 6, lat: 51.1657, lng: 10.4515 },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', attacks: 65, percentage: 5, lat: 55.3781, lng: -3.4360 },
    { name: 'France', code: 'FR', flag: '🇫🇷', attacks: 54, percentage: 4, lat: 46.2276, lng: 2.2137 },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳', attacks: 43, percentage: 3, lat: 14.0583, lng: 108.2772 },
    { name: 'South Korea', code: 'KR', flag: '🇰🇷', attacks: 38, percentage: 3, lat: 35.9078, lng: 127.7669 },
  ];

  const attackVectors = [
    { name: 'SSH Brute Force', count: 456, percentage: 45, color: 'bg-red-500' },
    { name: 'Malware Download', count: 234, percentage: 23, color: 'bg-orange-500' },
    { name: 'Reconnaissance', count: 178, percentage: 18, color: 'bg-yellow-500' },
    { name: 'Command Injection', count: 142, percentage: 14, color: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Geographic Threat Map</h1>
          <p className="text-gray-500 mt-1">Global attack distribution and origin tracking</p>
        </div>
        <div className="flex gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Globe className="w-12 h-12 opacity-80" />
            <div className="text-4xl font-bold">127</div>
          </div>
          <div className="text-blue-100 text-sm">Countries Detected</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <MapPin className="w-12 h-12 opacity-80" />
            <div className="text-4xl font-bold">1,247</div>
          </div>
          <div className="text-purple-100 text-sm">Unique IP Addresses</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-12 h-12 opacity-80" />
            <div className="text-4xl font-bold">87%</div>
          </div>
          <div className="text-green-100 text-sm">Geographic Coverage</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Visualization */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Attack Origin Map</h2>
          </div>
          
          {/* Interactive Map Placeholder */}
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 h-[500px] flex items-center justify-center overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Pulsing attack markers */}
            <div className="relative w-full h-full">
              {countries.slice(0, 5).map((country, idx) => (
                <div
                  key={idx}
                  className="absolute animate-pulse cursor-pointer group"
                  style={{
                    left: `${((country.lng + 180) / 360) * 100}%`,
                    top: `${((90 - country.lat) / 180) * 100}%`,
                  }}
                  onClick={() => setSelectedCountry(country.code)}
                >
                  <div className="relative">
                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50 group-hover:scale-150 transition-transform" />
                    <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none z-10">
                      <div className="font-bold">{country.flag} {country.name}</div>
                      <div className="text-gray-300">{country.attacks} attacks</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <Globe className="w-24 h-24 mx-auto mb-4 animate-pulse" />
                  <p className="text-lg font-bold">Interactive World Map</p>
                  <p className="text-sm mt-2">Showing real-time attack origins</p>
                  <p className="text-xs mt-4 text-white/30">Click markers for details</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Countries List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Top Attack Origins</h2>
          </div>
          
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {countries.map((country, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedCountry(country.code)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCountry === country.code
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div>
                      <div className="font-bold text-gray-800">{country.name}</div>
                      <div className="text-sm text-gray-500">{country.attacks} attacks</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-primary-500">{country.percentage}%</div>
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

      {/* Attack Vectors */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Attack Vectors by Geography</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {attackVectors.map((vector, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${vector.color}`} />
                <div className="font-bold text-gray-800 text-sm">{vector.name}</div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{vector.count}</div>
              <div className="text-sm text-gray-500">{vector.percentage}% of total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}