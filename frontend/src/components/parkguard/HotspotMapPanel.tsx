'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { ParkGuardData, JunctionHotspot } from '@/app/parkguard/page';

interface Props { data: ParkGuardData; }

// We load Leaflet purely client-side via CDN - no package needed
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

const VIOLATION_TYPE_COLORS: Record<string, string> = {
  'WRONG PARKING': '#FF3B30',
  'NO PARKING': '#FF9F0A',
  'PARKING IN A MAIN ROAD': '#AF52DE',
  'DEFECTIVE NUMBER PLATE': '#4A6CF7',
  'PARKING ON FOOTPATH': '#FF6B35',
};

function JunctionCard({ junction, onClick, selected }: { junction: JunctionHotspot; onClick: () => void; selected: boolean }) {
  const riskColor = junction.congestionRiskScore > 60 ? '#FF3B30'
    : junction.congestionRiskScore > 40 ? '#FF9F0A'
    : '#4A6CF7';

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'rgba(74,108,247,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'rgba(74,108,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: 8,
      }}
      onMouseEnter={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#F5F5F7', lineHeight: 1.3, maxWidth: 200 }}>
          {junction.junctionName.replace(/BTP\d+ - /, '')}
        </div>
        <div style={{
          fontSize: 10,
          fontWeight: 800,
          color: riskColor,
          background: riskColor + '18',
          padding: '2px 6px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          marginLeft: 8
        }}>
          RISK {junction.congestionRiskScore.toFixed(0)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9E9EA7' }}>
        <span>📋 {junction.total.toLocaleString()}</span>
        <span style={{ color: junction.rejectionRate > 20 ? '#FF9F0A' : '#9E9EA7' }}>
          ❌ {junction.rejectionRate}%
        </span>
        <span>🚗 {junction.uniqueVehicles.toLocaleString()}</span>
      </div>
      {(junction.inEventDataset || junction.hasRoadClosure) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          {junction.inEventDataset && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(175,82,222,0.15)', color: '#AF52DE', fontWeight: 600 }}>
              📡 In Events DB
            </span>
          )}
          {junction.hasRoadClosure && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,59,48,0.12)', color: '#FF3B30', fontWeight: 600 }}>
              🚧 Road Closure
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function HotspotMapPanel({ data }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [selectedJunction, setSelectedJunction] = useState<JunctionHotspot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'events' | 'closure' | 'highRisk'>('all');
  const [mapLayer, setMapLayer] = useState<'violations' | 'devices'>('violations');

  const filteredJunctions = useMemo(() => {
    let junctions = data.junctionHotspots;
    if (filterMode === 'events') junctions = junctions.filter(j => j.inEventDataset);
    if (filterMode === 'closure') junctions = junctions.filter(j => j.hasRoadClosure);
    if (filterMode === 'highRisk') junctions = junctions.filter(j => j.congestionRiskScore > 50);
    if (searchTerm) junctions = junctions.filter(j => j.junctionName.toLowerCase().includes(searchTerm.toLowerCase()) || j.policeStation.toLowerCase().includes(searchTerm.toLowerCase()));
    return [...junctions].sort((a, b) => b.congestionRiskScore - a.congestionRiskScore);
  }, [data.junctionHotspots, filterMode, searchTerm]);

  // Load Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) { setLeafletLoaded(true); return; }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;
    const L = window.L;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);
  }, [leafletLoaded]);

  // Update markers when data or filter changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !window.L) return;
    const L = window.L;
    markersRef.current.clearLayers();

    const toRender = mapLayer === 'violations' ? filteredJunctions : data.deviceMapData.slice(0, 100);

    if (mapLayer === 'violations') {
      (filteredJunctions as JunctionHotspot[]).forEach(junction => {
        const riskColor = junction.congestionRiskScore > 60 ? '#FF3B30'
          : junction.congestionRiskScore > 40 ? '#FF9F0A'
          : '#4A6CF7';

        const radius = Math.max(8, Math.min(30, junction.total / 400));
        const circle = L.circleMarker([junction.lat, junction.lon], {
          radius,
          fillColor: riskColor,
          color: riskColor,
          weight: 2,
          opacity: 0.9,
          fillOpacity: junction === selectedJunction ? 0.9 : 0.5,
        });

        const btp = junction.junctionName.split(' - ')[0];
        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif;font-size:13px;min-width:220px">
            <div style="font-weight:700;color:#F5F5F7;margin-bottom:8px">${junction.junctionName}</div>
            <div style="color:#9E9EA7;margin-bottom:4px">📍 ${junction.policeStation}</div>
            <div style="color:#F5F5F7;margin-bottom:2px">📋 ${junction.total.toLocaleString()} challans</div>
            <div style="color:#FF9F0A;margin-bottom:2px">❌ ${junction.rejectionRate}% rejection</div>
            <div style="color:#9E9EA7;margin-bottom:8px">🚗 ${junction.uniqueVehicles} unique vehicles</div>
            <div style="color:${riskColor};font-weight:700;font-size:14px">Risk Score: ${junction.congestionRiskScore.toFixed(0)}/100</div>
            ${junction.hasRoadClosure ? '<div style="color:#FF3B30;margin-top:4px;font-size:11px">🚧 Has road closure events</div>' : ''}
            ${junction.inEventDataset ? '<div style="color:#AF52DE;margin-top:2px;font-size:11px">📡 In ASTraM event database</div>' : ''}
          </div>
        `, { className: 'pg-popup' });

        circle.on('click', () => setSelectedJunction(junction));
        markersRef.current?.addLayer(circle);
      });
    } else {
      data.deviceMapData.forEach(device => {
        const color = device.status === 'critical' ? '#FF3B30' : device.status === 'warning' ? '#FF9F0A' : '#34C759';
        const radius = Math.max(6, Math.min(20, device.total / 30));
        const circle = L.circleMarker([device.lat, device.lon], {
          radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.55,
        });
        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif;font-size:13px;min-width:200px">
            <div style="font-weight:700;color:#F5F5F7;margin-bottom:6px">${device.deviceId}</div>
            <div style="color:#9E9EA7;margin-bottom:4px">📍 ${device.policeStation}</div>
            <div style="color:${color};font-weight:700;margin-bottom:2px">❌ ${device.rejectionRate}% rejection</div>
            <div style="color:#9E9EA7">📋 ${device.total.toLocaleString()} challans</div>
          </div>
        `);
        markersRef.current?.addLayer(circle);
      });
    }

    // Popup style injection
    if (!document.getElementById('pg-popup-style')) {
      const style = document.createElement('style');
      style.id = 'pg-popup-style';
      style.textContent = `
        .pg-popup .leaflet-popup-content-wrapper { background: #0F1117 !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 14px !important; color: #F5F5F7 !important; box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; }
        .pg-popup .leaflet-popup-tip { background: #0F1117 !important; }
        .leaflet-popup-close-button { color: #9E9EA7 !important; }
      `;
      document.head.appendChild(style);
    }
  }, [leafletLoaded, filteredJunctions, data.deviceMapData, mapLayer, selectedJunction]);

  // Fly to selected junction
  useEffect(() => {
    if (selectedJunction && mapRef.current) {
      mapRef.current.flyTo([selectedJunction.lat, selectedJunction.lon], 15, { duration: 1.2 });
    }
  }, [selectedJunction]);

  const crossRefCount = data.junctionHotspots.filter(j => j.inEventDataset).length;
  const closureCount = data.junctionHotspots.filter(j => j.hasRoadClosure).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Named Junctions', value: data.junctionHotspots.length, color: '#4A6CF7', icon: '📍' },
          { label: 'Cross-ref w/ Events', value: crossRefCount, color: '#AF52DE', icon: '📡' },
          { label: 'Road Closure Zones', value: closureCount, color: '#FF3B30', icon: '🚧' },
          { label: 'High Risk (Score>50)', value: data.junctionHotspots.filter(j => j.congestionRiskScore > 50).length, color: '#FF9F0A', icon: '⚠️' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#0F1117',
            border: `1px solid ${stat.color}30`,
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 24 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#5A5A6A', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAP + SIDEBAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, height: 600 }}>
        {/* Map */}
        <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
          {/* Map controls overlay */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setMapLayer('violations')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${mapLayer === 'violations' ? '#4A6CF7' : 'rgba(255,255,255,0.12)'}`,
                background: mapLayer === 'violations' ? 'rgba(74,108,247,0.9)' : 'rgba(8,9,12,0.85)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                fontFamily: 'Inter, sans-serif'
              }}
            >📍 Junction Hotspots</button>
            <button
              onClick={() => setMapLayer('devices')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${mapLayer === 'devices' ? '#FF3B30' : 'rgba(255,255,255,0.12)'}`,
                background: mapLayer === 'devices' ? 'rgba(255,59,48,0.9)' : 'rgba(8,9,12,0.85)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                fontFamily: 'Inter, sans-serif'
              }}
            >📡 Device Status</button>
          </div>
          {/* Legend overlay */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 1000,
            background: 'rgba(8,9,12,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
          }}>
            {mapLayer === 'violations' ? (
              <>
                <div style={{ color: '#9E9EA7', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10 }}>Congestion Risk</div>
                {[['#FF3B30', 'High (>60)'], ['#FF9F0A', 'Medium (40-60)'], ['#4A6CF7', 'Low (<40)']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    <span style={{ color: '#9E9EA7' }}>{l}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ color: '#9E9EA7', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10 }}>Device Status</div>
                {[['#FF3B30', 'Critical'], ['#FF9F0A', 'Warning'], ['#34C759', 'Good']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    <span style={{ color: '#9E9EA7' }}>{l}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          {!leafletLoaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08090C', zIndex: 999 }}>
              <div style={{ textAlign: 'center', color: '#9E9EA7' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Loading Map…</div>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Sidebar - Junction List */}
        <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 12 }}>
            Junction Intelligence
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {([
              { id: 'all' as const, label: 'All' },
              { id: 'events' as const, label: '📡 Events' },
              { id: 'closure' as const, label: '🚧 Closure' },
              { id: 'highRisk' as const, label: '⚠️ High Risk' },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `1px solid ${filterMode === f.id ? '#4A6CF7' : 'rgba(255,255,255,0.08)'}`,
                  background: filterMode === f.id ? 'rgba(74,108,247,0.15)' : 'transparent',
                  color: filterMode === f.id ? '#4A6CF7' : '#9E9EA7',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >{f.label}</button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search junction or station…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '7px 12px',
              color: '#F5F5F7',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              marginBottom: 12,
              width: '100%',
            }}
          />

          <div style={{ fontSize: 11, color: '#5A5A6A', marginBottom: 8 }}>{filteredJunctions.length} junctions</div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {filteredJunctions.slice(0, 40).map(junction => (
              <JunctionCard
                key={junction.junctionName}
                junction={junction}
                onClick={() => setSelectedJunction(junction)}
                selected={selectedJunction?.junctionName === junction.junctionName}
              />
            ))}
          </div>

          {/* Selected junction detail */}
          {selectedJunction && (
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(74,108,247,0.06)',
              borderRadius: 12,
              padding: 14,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4A6CF7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Selected
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F7', marginBottom: 6 }}>
                {selectedJunction.junctionName.replace(/BTP\d+ - /, '')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ color: '#5A5A6A' }}>Total Challans</div>
                  <div style={{ color: '#F5F5F7', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{selectedJunction.total.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: '#5A5A6A' }}>Rejection Rate</div>
                  <div style={{ color: '#FF9F0A', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{selectedJunction.rejectionRate}%</div>
                </div>
                <div>
                  <div style={{ color: '#5A5A6A' }}>Peak Hour</div>
                  <div style={{ color: '#F5F5F7', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{String(selectedJunction.peakHour).padStart(2, '0')}:00</div>
                </div>
                <div>
                  <div style={{ color: '#5A5A6A' }}>Risk Score</div>
                  <div style={{ color: selectedJunction.congestionRiskScore > 60 ? '#FF3B30' : '#FF9F0A', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedJunction.congestionRiskScore.toFixed(0)}/100
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Violation Types Breakdown */}
      <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 16 }}>Violation Type Breakdown</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {data.violationTypes.map((vt, idx) => {
            const colors = ['#FF3B30', '#FF9F0A', '#4A6CF7', '#34C759', '#AF52DE', '#FF6B35', '#FFD60A', '#5AC8FA', '#FF375F', '#64D2FF'];
            const color = colors[idx % colors.length];
            const pct = Math.round(vt.count / data.summaryKPIs.totalChallans * 100);
            return (
              <div key={vt.type} style={{
                background: `${color}0D`,
                border: `1px solid ${color}25`,
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9E9EA7', marginBottom: 8, lineHeight: 1.3 }}>
                  {vt.type.replace(/[\[\]"]/g, '')}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {vt.count.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: '#5A5A6A' }}>{pct}%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
