import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AttackLocation {
  ip: string;
  country: string;
  flag: string;
  attacks: number;
  lat: number;
  lng: number;
}

// Country coordinates (capitals)
const countryCoords: Record<string, { lat: number; lng: number }> = {
  'Germany': { lat: 52.520008, lng: 13.404954 },
  'India': { lat: 28.644800, lng: 77.216721 },
  'Russia': { lat: 55.751244, lng: 37.618423 },
  'United Kingdom': { lat: 51.509865, lng: -0.118092 },
  'China': { lat: 39.904202, lng: 116.407394 },
  'United States': { lat: 38.889248, lng: -77.050636 },
  'Brazil': { lat: -15.793889, lng: -47.882778 },
  'France': { lat: 48.856613, lng: 2.352222 },
  'Netherlands': { lat: 52.370216, lng: 4.895168 },
  'Poland': { lat: 52.229676, lng: 21.012229 },
  'Ukraine': { lat: 50.450001, lng: 30.523333 },
  'Vietnam': { lat: 21.028511, lng: 105.804817 },
  'South Korea': { lat: 37.566536, lng: 126.977969 },
  'Japan': { lat: 35.689487, lng: 139.691711 },
  'Canada': { lat: 45.421532, lng: -75.697189 },
  'Australia': { lat: -35.282001, lng: 149.128998 },
};

// Map refresher component
function MapRefresher() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      console.log('🗺️ Map size invalidated');
    }, 100);
  }, [map]);
  return null;
}

// Custom attack marker icon
const createAttackIcon = (count: number) => {
  const size = Math.min(20 + (count / 10), 50);
  return L.divIcon({
    className: 'custom-attack-marker',
    html: `
      <div style="
        background: radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(220,38,38,0.6) 100%);
        border: 2px solid #DC2626;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
        box-shadow: 0 0 20px rgba(239,68,68,0.6);
        animation: pulse 2s infinite;
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export function WorldMap({ timeRange }: { timeRange: string }) {
  const [attackLocations, setAttackLocations] = useState<AttackLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        let apiTimeRange = 'now-24h';
        if (timeRange === '7days') apiTimeRange = 'now-7d';
        else if (timeRange === '30days') apiTimeRange = 'now-30d';

        console.log('🗺️ Fetching map data for:', apiTimeRange);
        const response = await axios.get(`${API_BASE}/analytics/countries?range=${apiTimeRange}`);
        
        console.log('🗺️ Raw Map Data:', response.data);
        
        const locations: AttackLocation[] = response.data.map((country: any) => ({
          ip: 'Multiple IPs',
          country: country.country,
          flag: country.flag,
          attacks: country.attacks,
          lat: countryCoords[country.country]?.lat || 0,
          lng: countryCoords[country.country]?.lng || 0,
        })).filter((loc: AttackLocation) => loc.lat !== 0);

        console.log('📍 Parsed Locations with coordinates:', locations);
        console.log(`✅ ${locations.length} countries mapped successfully`);
        
        setAttackLocations(locations);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching attack locations:', err);
        setLoading(false);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  return (
  <div className="relative w-full h-full min-h-[600px] rounded-xl overflow-hidden border-2 border-gray-700">
    {loading && (
      <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-[2000]">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p>Loading map data...</p>
        </div>
      </div>
    )}
    
    <div style={{ width: '100%', height: '600px' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapRefresher />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {attackLocations.map((location, idx) => (
          <Marker
            key={idx}
            position={[location.lat, location.lng]}
            icon={createAttackIcon(location.attacks)}
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-2">{location.flag}</div>
                <div className="font-bold text-gray-900">{location.country}</div>
                <div className="text-red-600 font-bold text-lg">{location.attacks} attacks</div>
                <div className="text-gray-600 text-sm mt-1">Source: Multiple IPs</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>

    {/* Legend */}
    <div className="absolute bottom-4 right-4 bg-gray-900/95 border border-gray-700 rounded-lg p-4 z-[1000]">
      <h4 className="text-white font-bold text-sm mb-2">Attack Intensity</h4>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-300">High (&gt;100)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-300">Medium (50-100)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-gray-300">Low (&lt;50)</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-cyan-400 font-bold text-lg">{attackLocations.length}</div>
        <div className="text-gray-400 text-xs">Countries Detected</div>
      </div>
    </div>


      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .leaflet-popup-content-wrapper {
          background: white !important;
          border-radius: 8px !important;
        }
        .leaflet-container {
          background: #1a1a1a !important;
        }
      `}</style>
    </div>
  );
}
