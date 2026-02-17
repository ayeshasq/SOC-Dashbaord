'use client';

import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface AttackData {
  country: string;
  count: number;
  lat: number;
  lng: number;
  flag: string;
  ips: string[];
}

interface AttackMapProps {
  alerts: any[];
  darkMode: boolean;
}

export default function AttackMap({ alerts, darkMode }: AttackMapProps) {
  const [attackData, setAttackData] = useState<AttackData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ show: boolean; content: string; x: number; y: number }>({
    show: false,
    content: '',
    x: 0,
    y: 0
  });

  // Geographic database
  const geoDatabase: Record<string, { lat: number; lng: number; flag: string }> = {
    'Russia': { lat: 55.7558, lng: 37.6173, flag: '🇷🇺' },
    'China': { lat: 39.9042, lng: 116.4074, flag: '🇨🇳' },
    'USA': { lat: 40.7128, lng: -74.0060, flag: '🇺🇸' },
    'Netherlands': { lat: 52.3676, lng: 4.9041, flag: '🇳🇱' },
    'UK': { lat: 51.5074, lng: -0.1278, flag: '🇬🇧' },
    'Japan': { lat: 35.6762, lng: 139.6503, flag: '🇯🇵' },
    'Germany': { lat: 52.5200, lng: 13.4050, flag: '🇩🇪' },
    'France': { lat: 48.8566, lng: 2.3522, flag: '🇫🇷' },
    'Ukraine': { lat: 50.4501, lng: 30.5234, flag: '🇺🇦' },
    'Poland': { lat: 52.2297, lng: 21.0122, flag: '🇵🇱' },
    'India': { lat: 19.0760, lng: 72.8777, flag: '🇮🇳' },
    'Romania': { lat: 44.4268, lng: 26.1025, flag: '🇷🇴' },
    'Sweden': { lat: 59.3293, lng: 18.0686, flag: '🇸🇪' },
    'Turkey': { lat: 41.0082, lng: 28.9784, flag: '🇹🇷' },
    'Spain': { lat: 40.4168, lng: -3.7038, flag: '🇪🇸' },
    'Italy': { lat: 41.9028, lng: 12.4964, flag: '🇮🇹' }
  };

  // IP to country mapping
  const ipToCountry: Record<string, string> = {
    '203.0.113.45': 'Russia',
    '198.51.100.23': 'China',
    '192.0.2.100': 'USA',
    '185.220.101.5': 'Netherlands',
    '91.189.88.152': 'UK',
    '123.45.67.89': 'Japan',
    '45.67.89.123': 'Germany',
    '167.248.133.45': 'France',
    '194.58.56.177': 'Ukraine',
    '89.248.165.92': 'Poland',
    '103.216.221.19': 'India',
    '217.182.143.207': 'Romania',
    '46.166.139.111': 'Sweden',
    '178.73.215.171': 'Turkey',
    '195.123.237.184': 'Spain',
    '62.210.37.82': 'Italy'
  };

  useEffect(() => {
    // Aggregate attacks by country
    const countryMap: Record<string, { count: number; ips: Set<string> }> = {};
    
    alerts.forEach(alert => {
      const country = ipToCountry[alert.source_ip] || 'Unknown';
      if (country !== 'Unknown') {
        if (!countryMap[country]) {
          countryMap[country] = { count: 0, ips: new Set() };
        }
        countryMap[country].count++;
        countryMap[country].ips.add(alert.source_ip);
      }
    });

    const data: AttackData[] = Object.entries(countryMap).map(([country, info]) => ({
      country,
      count: info.count,
      lat: geoDatabase[country]?.lat || 0,
      lng: geoDatabase[country]?.lng || 0,
      flag: geoDatabase[country]?.flag || '🌐',
      ips: Array.from(info.ips)
    })).sort((a, b) => b.count - a.count);

    setAttackData(data);
  }, [alerts]);

  const getMarkerSize = (count: number) => {
    const max = Math.max(...attackData.map(d => d.count), 1);
    return 6 + (count / max) * 10; // Larger base size
  };

  const getMarkerColor = (count: number) => {
    const max = Math.max(...attackData.map(d => d.count), 1);
    const ratio = count / max;
    
    if (ratio > 0.7) return '#dc2626'; // red - high threat
    if (ratio > 0.4) return '#f97316'; // orange - medium-high
    if (ratio > 0.2) return '#eab308'; // yellow - medium
    return '#22c55e'; // green - low
  };

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`rounded-lg shadow-lg p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          🌍 Live Attack Origins
        </h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
          Geographic distribution of security threats in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className={`lg:col-span-2 rounded-lg shadow-lg p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="relative">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 147
              }}
              style={{
                width: '100%',
                height: 'auto'
              }}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={darkMode ? '#334155' : '#E5E7EB'}
                      stroke={darkMode ? '#475569' : '#D1D5DB'}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: darkMode ? '#475569' : '#D1D5DB' },
                        pressed: { outline: 'none' }
                      }}
                    />
                  ))
                }
              </Geographies>

              {attackData.map((attack) => (
                <Marker
                  key={attack.country}
                  coordinates={[attack.lng, attack.lat]}
                  onMouseEnter={(e) => {
                    setTooltip({
                      show: true,
                      content: `${attack.flag} ${attack.country}: ${attack.count} attacks`,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={() => setTooltip({ ...tooltip, show: false })}
                  onClick={() => setSelectedCountry(attack.country)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={getMarkerSize(attack.count)}
                    fill={getMarkerColor(attack.count)}
                    stroke="#fff"
                    strokeWidth={2}
                    fillOpacity={0.8}
                  />
                </Marker>
              ))}
            </ComposableMap>

            {/* Tooltip */}
            {tooltip.show && (
              <div
                className="fixed z-50 bg-black text-white px-3 py-2 rounded text-sm pointer-events-none"
                style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
              >
                {tooltip.content}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>High (&gt;40)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Medium (20-40)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Low (10-20)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Minimal (&lt;10)</span>
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className={`rounded-lg shadow-lg p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-4">Top Attack Sources</h3>
          <div className="space-y-3">
            {attackData.slice(0, 10).map((attack, idx) => (
              <div
                key={attack.country}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedCountry === attack.country
                    ? darkMode ? 'bg-blue-900 border-blue-500' : 'bg-blue-50 border-blue-300'
                    : darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
                } border ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}
                onClick={() => setSelectedCountry(selectedCountry === attack.country ? null : attack.country)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-yellow-600' : 'bg-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span className="text-2xl">{attack.flag}</span>
                        <span>{attack.country}</span>
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {attack.ips.length} unique IP{attack.ips.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{attack.count}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>attacks</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedCountry && (
            <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
              <p className="text-sm font-medium mb-2">Filtered to: {selectedCountry}</p>
              <button
                onClick={() => setSelectedCountry(null)}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
