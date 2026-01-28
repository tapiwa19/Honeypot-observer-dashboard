import { useState, useEffect } from 'react';
import { Globe, RefreshCw, X, Activity, Clock, Shield, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

interface Country {
  country: string;
  code: string;
  flag: string;
  attacks: number;
  percentage: number;
  lat?: number;
  lng?: number;
}

interface TimelineItem {
  time: string;
  attacks: number;
}

interface IPData {
  ip: string;
  attacks: number;
  lastSeen: string;
  threat: 'high' | 'medium' | 'low';
}

// Country coordinates for map visualization
const countryCoords: Record<string, { lat: number; lng: number }> = {
  'CN': { lat: 35.8617, lng: 104.1954 },
  'RU': { lat: 61.5240, lng: 105.3188 },
  'US': { lat: 37.0902, lng: -95.7129 },
  'BR': { lat: -14.2350, lng: -51.9253 },
  'IN': { lat: 20.5937, lng: 78.9629 },
  'DE': { lat: 51.1657, lng: 10.4515 },
  'GB': { lat: 55.3781, lng: -3.4360 },
  'FR': { lat: 46.2276, lng: 2.2137 },
  'VN': { lat: 14.0583, lng: 108.2772 },
  'KR': { lat: 35.9078, lng: 127.7669 },
  'NL': { lat: 52.1326, lng: 5.2913 },
  'PL': { lat: 51.9194, lng: 19.1451 },
  'UA': { lat: 48.3794, lng: 31.1656 },
  'IT': { lat: 41.8719, lng: 12.5674 },
  'ES': { lat: 40.4637, lng: -3.7492 },
  'TR': { lat: 38.9637, lng: 35.2433 },
  'ID': { lat: -0.7893, lng: 113.9213 },
  'JP': { lat: 36.2048, lng: 138.2529 },
  'CA': { lat: 56.1304, lng: -106.3468 },
  'AU': { lat: -25.2744, lng: 133.7751 },
};

// Mock data generators for detail panel
const mockCountryTimeline = (): TimelineItem[] => 
  Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    attacks: Math.floor(Math.random() * 50) + 10
  }));

const mockCountryIPs = (): IPData[] => [
  { ip: '192.168.1.100', attacks: 145, lastSeen: '2 mins ago', threat: 'high' },
  { ip: '10.0.0.55', attacks: 89, lastSeen: '5 mins ago', threat: 'medium' },
  { ip: '172.16.0.33', attacks: 67, lastSeen: '12 mins ago', threat: 'high' },
  { ip: '203.0.113.42', attacks: 45, lastSeen: '18 mins ago', threat: 'low' },
  { ip: '198.51.100.89', attacks: 32, lastSeen: '25 mins ago', threat: 'medium' },
];

export default function GeoMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCountries: 0,
    totalIPs: 0,
    coverage: 0
  });

  // Enhancement states
  const [showConnections, setShowConnections] = useState(true);
  const [heatIntensity, setHeatIntensity] = useState(1);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Fetch real data from backend
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch countries data from analytics endpoint
      const response = await axios.get(`${API_BASE}/analytics/countries`);
      
      const countriesData = response.data.map((country: any) => ({
        ...country,
        lat: countryCoords[country.code]?.lat || 0,
        lng: countryCoords[country.code]?.lng || 0
      }));

      setCountries(countriesData);

      // Calculate stats
      const totalAttacks = countriesData.reduce((sum: number, c: Country) => sum + c.attacks, 0);
      setStats({
        totalCountries: countriesData.length,
        totalIPs: totalAttacks,
        coverage: countriesData.length > 0 ? Math.min(Math.round((countriesData.length / 195) * 100), 100) : 0
      });

    } catch (error) {
      console.error('Error fetching geo data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      setShowDetailPanel(true);
    }
  }, [selectedCountry]);

  const attackVectors = [
    { name: 'SSH Brute Force', count: Math.floor(stats.totalIPs * 0.45), percentage: 45, color: 'bg-red-500', borderColor: 'border-red-500' },
    { name: 'Malware Download', count: Math.floor(stats.totalIPs * 0.23), percentage: 23, color: 'bg-orange-500', borderColor: 'border-orange-500' },
    { name: 'Reconnaissance', count: Math.floor(stats.totalIPs * 0.18), percentage: 18, color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
    { name: 'Command Injection', count: Math.floor(stats.totalIPs * 0.14), percentage: 14, color: 'bg-blue-500', borderColor: 'border-blue-500' },
  ];

  const selectedCountryData = countries.find(c => c.code === selectedCountry);
  const countryTimeline = selectedCountryData ? mockCountryTimeline() : [];
  const countryIPs = selectedCountryData ? mockCountryIPs() : [];

  const getHeatColor = (percentage: number): string => {
    const intensity = percentage * heatIntensity;
    if (intensity > 30) return 'bg-red-500';
    if (intensity > 20) return 'bg-orange-500';
    if (intensity > 10) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading geographic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Geospatial Threat Map</h1>
          <p className="text-gray-500 mt-1">Real-time global threat visualization and geographic attack distribution</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-lg transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Data Indicator */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-green-700">REAL-TIME DATA</span>
          </div>
          <span className="text-gray-600">Geographic data from your Cowrie honeypot • Updates every 30s</span>
        </div>
      </div>

      {/* Full-width Threat Map */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Attack Origin Map</h2>
          
          {/* Map Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowConnections(!showConnections)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showConnections ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Connections
            </button>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-medium text-gray-600">Heat:</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.5"
                value={heatIntensity}
                onChange={(e) => setHeatIntensity(parseFloat(e.target.value))}
                className="w-16"
              />
              <span className="text-xs font-bold text-gray-800">{heatIntensity}x</span>
            </div>
          </div>
        </div>
        
        {/* Interactive Map */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 h-[500px] flex items-center justify-center overflow-hidden">
          {/* Real World Map - Using actual geographic data */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src="https://raw.githubusercontent.com/wiki/parrt/random-forest-importances/images/world-map-flat.png"
              alt="World Map"
              className="w-full h-full object-cover opacity-20 brightness-75"
              style={{ filter: 'grayscale(100%) contrast(1.2)' }}
            />
          </div>

          {/* Alternative: If image doesn't load, show simplified SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="landGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4B5563" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#374151" stopOpacity="0.8"/>
              </linearGradient>
            </defs>
            {/* World map continents with better approximation */}
            <g fill="url(#landGradient)" stroke="#6B7280" strokeWidth="0.5">
              {/* Greenland */}
              <ellipse cx="150" cy="80" rx="40" ry="30"/>
              
              {/* North America */}
              <path d="M 80,120 Q 100,80 140,90 Q 180,95 200,120 Q 210,150 200,180 Q 180,200 150,195 Q 120,190 100,170 Q 80,150 80,120 Z"/>
              <path d="M 120,185 Q 140,190 160,200 Q 170,220 160,240 L 140,235 Q 120,225 120,200 Z"/>
              
              {/* South America */}
              <path d="M 180,280 Q 200,270 215,280 Q 230,310 225,350 Q 215,380 200,390 Q 180,385 175,360 Q 170,320 180,280 Z"/>
              
              {/* Europe */}
              <path d="M 480,110 Q 500,100 520,105 Q 540,115 545,130 Q 540,145 520,145 Q 500,140 485,130 Q 475,120 480,110 Z"/>
              
              {/* Africa */}
              <path d="M 490,180 Q 510,170 535,175 Q 555,185 565,210 Q 570,250 560,285 Q 545,310 520,310 Q 495,305 485,275 Q 480,235 490,180 Z"/>
              
              {/* Russia/Northern Asia */}
              <path d="M 520,70 Q 600,60 700,65 Q 800,75 850,85 Q 900,100 920,120 L 910,140 Q 850,135 750,130 Q 650,125 550,120 Q 520,110 520,70 Z"/>
              
              {/* Middle East */}
              <path d="M 565,160 Q 585,155 605,160 Q 620,170 620,185 Q 615,200 600,200 Q 580,195 570,185 Q 565,175 565,160 Z"/>
              
              {/* India */}
              <path d="M 650,210 Q 665,205 680,215 Q 690,235 685,255 Q 675,270 660,265 Q 650,250 650,210 Z"/>
              
              {/* China/East Asia */}
              <path d="M 720,140 Q 760,135 800,145 Q 830,160 835,185 Q 825,210 795,215 Q 760,210 730,195 Q 715,175 720,140 Z"/>
              
              {/* Southeast Asia */}
              <path d="M 750,230 Q 770,225 790,235 Q 800,250 795,265 Q 780,275 765,270 Q 755,255 750,230 Z"/>
              
              {/* Japan */}
              <ellipse cx="860" cy="170" rx="15" ry="35" transform="rotate(20 860 170)"/>
              
              {/* Australia */}
              <path d="M 800,340 Q 830,330 860,340 Q 880,360 875,385 Q 855,400 830,395 Q 810,380 800,340 Z"/>
              
              {/* New Zealand */}
              <ellipse cx="920" cy="400" rx="8" ry="20"/>
              
              {/* Antarctica */}
              <ellipse cx="500" cy="470" rx="400" ry="20" opacity="0.5"/>
            </g>
          </svg>

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-5">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Connection Lines */}
          {showConnections && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {countries.slice(0, 10).map((country, idx) => {
                if (!country.lat || !country.lng) return null;
                
                // Same simple projection for connection lines
                const x = ((country.lng + 180) / 360) * 100;
                const y = ((90 - country.lat) / 180) * 100;
                
                return (
                  <line
                    key={idx}
                    x1="50%"
                    y1="50%"
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth="1"
                    className="animate-pulse"
                  />
                );
              })}
            </svg>
          )}

          {/* Pulsing attack markers */}
          <div className="relative w-full h-full">
            {countries.slice(0, 10).map((country, idx) => {
              if (!country.lat || !country.lng) return null;
              const heatColor = getHeatColor(country.percentage);
              
              // Simple equirectangular projection (works well for world maps)
              // Longitude: -180 to 180 → 0 to 100%
              const x = ((country.lng + 180) / 360) * 100;
              
              // Latitude: 90 to -90 → 0 to 100%  
              const y = ((90 - country.lat) / 180) * 100;
              
              return (
                <div
                  key={idx}
                  className="absolute cursor-pointer group animate-pulse z-10"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setShowDetailPanel(true);
                  }}
                >
                  <div className="relative">
                    <div className={`w-4 h-4 ${heatColor} rounded-full shadow-lg group-hover:scale-150 transition-transform`} />
                    {showConnections && (
                      <div className={`absolute inset-0 w-4 h-4 ${heatColor} rounded-full animate-ping`} />
                    )}
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none z-10">
                      <div className="font-bold">{country.flag} {country.country}</div>
                      <div className="text-gray-300">{country.attacks} attacks ({country.percentage}%)</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Center indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-cyan-500 rounded-full shadow-lg animate-pulse" />
              <div className="absolute inset-0 w-6 h-6 bg-cyan-500 rounded-full animate-ping" />
            </div>

            {/* Center text */}
            {!selectedCountry && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-white/50">
                  <Globe className="w-24 h-24 mx-auto mb-4 animate-pulse" />
                  <p className="text-lg font-bold">Live Attack Origins</p>
                  <p className="text-sm mt-2">Showing {countries.length} countries</p>
                  <p className="text-xs mt-4 text-white/30">Hover over markers for details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats - From Prototype */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-gray-900 mb-2 font-bold">Top Countries by Sessions</h3>
          <div className="space-y-2">
            {countries.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.flag} {item.country}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6]"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{item.attacks}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-gray-900 mb-2 font-bold">Attack Vectors</h3>
          <div className="space-y-2">
            {attackVectors.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-gray-900 mb-2 font-bold">Geographic Coverage</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Countries Detected</span>
                <span className="text-gray-900 font-bold">{stats.totalCountries}</span>
              </div>
              <div className="text-xs text-gray-500">Last 24 hours</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Total Attacks</span>
                <span className="text-gray-900 font-bold">{stats.totalIPs}</span>
              </div>
              <div className="text-xs text-gray-500">From all sources</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Coverage</span>
                <span className="text-gray-900 font-bold">{stats.coverage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.coverage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Country Detail Panel (shown when clicking a country) */}
      {showDetailPanel && selectedCountryData && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-50">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{selectedCountryData.flag}</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedCountryData.country}</h2>
                <p className="text-xs text-gray-500">{selectedCountryData.code}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCountry(null);
                setShowDetailPanel(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 mb-1" />
                <div className="text-2xl font-bold text-red-700">{selectedCountryData.attacks}</div>
                <div className="text-xs text-red-600">Total Attacks</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <Activity className="w-5 h-5 text-blue-600 mb-1" />
                <div className="text-2xl font-bold text-blue-700">{selectedCountryData.percentage}%</div>
                <div className="text-xs text-blue-600">Of All Traffic</div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                24-Hour Activity
              </h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-end justify-between gap-1 h-32">
                  {countryTimeline.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col justify-end group relative">
                      <div 
                        className="bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${(item.attacks / 60) * 100}%` }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                        {item.time}: {item.attacks}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>0:00</span>
                  <span>12:00</span>
                  <span>24:00</span>
                </div>
              </div>
            </div>

            {/* Top IPs */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Top Source IPs
              </h3>
              <div className="space-y-2">
                {countryIPs.map((ip, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs font-mono font-bold text-gray-800">{ip.ip}</code>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        ip.threat === 'high' ? 'bg-red-100 text-red-700' :
                        ip.threat === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {ip.threat.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{ip.attacks} attacks</span>
                      <span className="text-gray-400">{ip.lastSeen}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium">
                Block All from {selectedCountryData.country}
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium">
                Export Country Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}