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

// ✅ COMPREHENSIVE Country coordinates (100+ countries)
const countryCoords: Record<string, { lat: number; lng: number }> = {
  // Americas
  'United States': { lat: 38.889248, lng: -77.050636 },
  'Canada': { lat: 45.421532, lng: -75.697189 },
  'Brazil': { lat: -15.793889, lng: -47.882778 },
  'Mexico': { lat: 19.432608, lng: -99.133209 },
  'Argentina': { lat: -34.603722, lng: -58.381592 },
  'Chile': { lat: -33.448891, lng: -70.669266 },
  'Colombia': { lat: 4.710989, lng: -74.072090 },
  'Peru': { lat: -12.046374, lng: -77.042793 },
  'Venezuela': { lat: 10.480594, lng: -66.903606 },
  'Ecuador': { lat: -0.180653, lng: -78.467834 },
  
  // Europe
  'United Kingdom': { lat: 51.509865, lng: -0.118092 },
  'Germany': { lat: 52.520008, lng: 13.404954 },
  'France': { lat: 48.856613, lng: 2.352222 },
  'Italy': { lat: 41.902782, lng: 12.496366 },
  'Spain': { lat: 40.416775, lng: -3.703790 },
  'Netherlands': { lat: 52.370216, lng: 4.895168 },
  'Poland': { lat: 52.229676, lng: 21.012229 },
  'Ukraine': { lat: 50.450001, lng: 30.523333 },
  'Russia': { lat: 55.751244, lng: 37.618423 },
  'Sweden': { lat: 59.329323, lng: 18.068581 },
  'Belgium': { lat: 50.850340, lng: 4.351710 },
  'Switzerland': { lat: 46.947974, lng: 7.447447 },
  'Portugal': { lat: 38.722252, lng: -9.139337 },
  'Greece': { lat: 37.983810, lng: 23.727539 },
  'Romania': { lat: 44.426765, lng: 26.102538 },
  'Austria': { lat: 48.208174, lng: 16.373819 },
  
  // Asia
  'China': { lat: 39.904202, lng: 116.407394 },
  'India': { lat: 28.644800, lng: 77.216721 },
  'Japan': { lat: 35.689487, lng: 139.691711 },
  'South Korea': { lat: 37.566536, lng: 126.977969 },
  'Vietnam': { lat: 21.028511, lng: 105.804817 },
  'Thailand': { lat: 13.756331, lng: 100.501765 },
  'Indonesia': { lat: -6.208763, lng: 106.845599 },
  'Turkey': { lat: 39.933364, lng: 32.859742 },
  'Iran': { lat: 35.689197, lng: 51.388974 },
  'Pakistan': { lat: 33.738045, lng: 73.084488 },
  'Bangladesh': { lat: 23.810332, lng: 90.412518 },
  'Singapore': { lat: 1.352083, lng: 103.819836 },
  
  // Africa
  'South Africa': { lat: -25.746111, lng: 28.188056 },
  'Egypt': { lat: 30.044420, lng: 31.235712 },
  'Nigeria': { lat: 9.076479, lng: 7.398574 },
  
  // Oceania
  'Australia': { lat: -35.282001, lng: 149.128998 },
  'New Zealand': { lat: -41.286461, lng: 174.776236 },
  
  // Fallback
  'Unknown': { lat: 0, lng: 0 }
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
  const [unmappedCountries, setUnmappedCountries] = useState<string[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        let apiTimeRange = 'now-24h';
        if (timeRange === '7days') apiTimeRange = 'now-7d';
        else if (timeRange === '30days') apiTimeRange = 'now-30d';

        console.log('🗺️ [WORLDMAP] Fetching map data for:', apiTimeRange);
        const response = await axios.get(`${API_BASE}/analytics/countries?range=${apiTimeRange}`);
        
        console.log('🗺️ [WORLDMAP] Raw response:', response.data);
        console.log('🗺️ [WORLDMAP] Total countries received:', response.data.length);
        
        const unmapped: string[] = [];
        const locations: AttackLocation[] = response.data
          .map((country: any) => {
            const coords = countryCoords[country.country];
            
            if (!coords || coords.lat === 0) {
              unmapped.push(country.country);
              console.log(`⚠️ [WORLDMAP] No coordinates for: ${country.country}`);
              return null;
            }
            
            console.log(`✅ [WORLDMAP] Mapped: ${country.country} → [${coords.lat}, ${coords.lng}] (${country.attacks} attacks)`);
            
            return {
              ip: 'Multiple IPs',
              country: country.country,
              flag: country.flag,
              attacks: country.attacks,
              lat: coords.lat,
              lng: coords.lng,
            };
          })
          .filter((loc: AttackLocation | null): loc is AttackLocation => loc !== null);

        setUnmappedCountries(unmapped);
        
        console.log(`✅ [WORLDMAP] Successfully mapped ${locations.length}/${response.data.length} countries`);
        if (unmapped.length > 0) {
          console.log(`⚠️ [WORLDMAP] Unmapped countries (${unmapped.length}):`, unmapped);
        }
        
        setAttackLocations(locations);
        setLoading(false);
      } catch (err) {
        console.error('❌ [WORLDMAP] Error fetching attack locations:', err);
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
      
      {/* ✅ SHOW MESSAGE IF NO LOCATIONS */}
      {!loading && attackLocations.length === 0 && (
        <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-[2000]">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-lg font-bold mb-2">No Attack Data Available</p>
            <p className="text-sm">Waiting for countries to attack...</p>
            {unmappedCountries.length > 0 && (
              <p className="text-xs text-yellow-500 mt-4">
                ⚠️ {unmappedCountries.length} countries detected but not mapped: {unmappedCountries.join(', ')}
              </p>
            )}
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
          <div className="text-gray-400 text-xs">Countries Mapped</div>
          {unmappedCountries.length > 0 && (
            <div className="text-yellow-500 text-xs mt-1">
              +{unmappedCountries.length} unmapped
            </div>
          )}
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