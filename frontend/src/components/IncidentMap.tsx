'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Incident {
  id: string; junction: string; lat: number; lng: number;
  type: string; risk_level: 'Low' | 'Medium' | 'High';
  risk_score: number; tow_likely: boolean; duration_bucket: string;
}

const RISK_COLORS: Record<string, string> = {
  High: '#ff2a2a', Medium: '#ffb320', Low: '#22c55e',
};

interface Props {
  onSelectIncident: (incident: Incident) => void;
  selectedId: string | null;
  ghostTwins?: any[];
  isGhostActive?: boolean;
  ghostEarlyFilter?: boolean;
  onMapReady?: (mapInstance: any) => void;
  penaltyZonesVisible?: boolean;
}

export function IncidentMap({ onSelectIncident, selectedId, ghostTwins = [], isGhostActive = false, ghostEarlyFilter = false, onMapReady, penaltyZonesVisible = false }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error,     setError]     = useState<string | null>(null);
  const [dots, setDots] = useState<Array<{ inc: Incident; x: number; y: number }>>([]);

  function createMap() {
    // @ts-ignore
    const M = window.mappls || window.Mappls;
    if (!M?.Map || !mapRef.current) { setError('Map SDK unavailable.'); return; }
    try {
      mapInstance.current = new M.Map(mapRef.current, {
        center: [77.5946, 12.9716], // [lng, lat] — Mapbox GL JS array format (tiles confirmed working)
        zoom: 11,
      });
      setMapLoaded(true);
      if (onMapReady) onMapReady(mapInstance.current);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => {
    if (mapLoaded) return;

    const existing = document.getElementById('mappls-script') as HTMLScriptElement | null;
    if (existing) {
      // Script already in DOM — SDK might already be ready
      // @ts-ignore
      const M = window.mappls || window.Mappls;
      if (M?.Map) {
        createMap();
      } else {
        // Still loading — wait for it
        existing.addEventListener('load', createMap, { once: true });
      }
      return;
    }

    // First load — inject script
    const script = document.createElement('script');
    script.id    = 'mappls-script';
    script.src   = 'https://apis.mappls.com/advancedmaps/api/61f5d47dc37d256e409040f5926b1dad/map_sdk?layer=vector&v=3.0';
    script.async = true;
    script.onload  = createMap;
    script.onerror = () => setError('Failed to load map SDK.');
    document.head.appendChild(script);
  }, [mapLoaded]);

  // Fetch incidents after map is ready
  useEffect(() => {
    if (!mapLoaded) return;
    fetch(`/api/v1/incidents?t=${Date.now()}`)
      .then(r => r.json())
      .then(setIncidents)
      .catch(console.error);
  }, [mapLoaded]);

  const project = useCallback(() => {
    const map = mapInstance.current;
    if (!map) return;
    
    // Project incidents
    if (incidents.length) {
      try {
        setDots(incidents.map(inc => {
          const pt = map.project([inc.lng, inc.lat]);
          return { inc, x: pt.x, y: pt.y };
        }));
      } catch (_) {}
    }
  }, [incidents]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapInstance.current;
    project();
    const evts = ['move','zoom','rotate','pitch','moveend','zoomend'];
    evts.forEach(e => { try { map.on(e, project); } catch (_) {} });
    return () => { evts.forEach(e => { try { map.off(e, project); } catch (_) {} }); };
  }, [mapLoaded, project]);

  // Fly to selected
  useEffect(() => {
    const map = mapInstance.current;
    if (!selectedId || !map) return;
    const inc = incidents.find(i => i.id === selectedId);
    if (!inc) return;
    try { map.flyTo({ center: [inc.lng, inc.lat], zoom: 14, speed: 1.2 }); }
    catch { try { map.setCenter([inc.lng, inc.lat]); } catch (_) {} }
  }, [selectedId, incidents]);

  // ── Ghost Replay Logic ──
  const [ghostTime, setGhostTime] = useState(0);
  
  useEffect(() => {
    if (!isGhostActive) {
      setGhostTime(0);
      return;
    }
    const interval = setInterval(() => {
      setGhostTime(prev => {
        if (prev >= 150) { // cap at 150 min
          clearInterval(interval);
          return 150;
        }
        return prev + 1;
      });
    }, 130); // 150 minutes in ~20 seconds
    return () => clearInterval(interval);
  }, [isGhostActive]);

  // Filter twins based on early intervention toggle
  const visibleGhosts = ghostTwins.filter(t => !ghostEarlyFilter || t.early_intervention);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        id="map-container"
        className="w-full h-full absolute inset-0 bg-transparent"
        style={{ width: '100%', height: '100%' }}
      ></div>

      {/* SVG overlay — rendering dots AND ghost ripples */}
      {mapLoaded && dots.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none z-10"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <filter id="gH" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="gM" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* GHOST RIPPLES */}
          {isGhostActive && selectedId && (
            <g>
              {(() => {
                const centerDot = dots.find(d => d.inc.id === selectedId);
                if (!centerDot) return null;
                return visibleGhosts.map((t, idx) => {
                  const isActive = ghostTime <= t.duration_minutes;
                  const currentRadius = isActive ? Math.min(ghostTime * 1.5, t.duration_minutes * 1.5) : t.duration_minutes * 1.5;
                  const color = t.duration_minutes > 90 ? '#ff2a2a' : (t.duration_minutes <= 45 ? '#22c55e' : '#ffb320');
                  
                  return (
                    <g key={`ghost-${idx}`} style={{ transition: 'all 0.15s linear' }}>
                      <circle
                        cx={centerDot.x} cy={centerDot.y}
                        r={currentRadius + 10}
                        fill="none"
                        stroke={color}
                        strokeWidth={isActive ? 2 : 1}
                        strokeDasharray={isActive ? "none" : "6,4"}
                        opacity={isActive ? 0.6 : 0.2}
                      />
                      <circle
                        cx={centerDot.x} cy={centerDot.y}
                        r={currentRadius + 10}
                        fill={color}
                        opacity={isActive ? 0.08 : 0.03}
                      />
                      {/* Label attaches to the edge of the ripple */}
                      {isActive && (
                        <g transform={`translate(${centerDot.x + currentRadius + 12}, ${centerDot.y - 10 + idx * 25})`}>
                          <rect x="0" y="0" width="135" height="20" rx="4" fill="rgba(10,10,11,0.8)" stroke={color} strokeWidth="0.5" />
                          <text x="8" y="13" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            {t.date_str} ({Math.min(ghostTime, t.duration_minutes)}m)
                          </text>
                        </g>
                      )}
                    </g>
                  );
                });
              })()}
            </g>
          )}

          {/* STANDARD INCIDENT DOTS */}
          {dots.map(({ inc, x, y }) => {
            const color = RISK_COLORS[inc.risk_level] ?? '#4A6CF7';
            const r     = inc.risk_level === 'High' ? 9 : inc.risk_level === 'Medium' ? 7 : 5;
            const sel   = inc.id === selectedId;
            return (
              <g key={inc.id} onClick={() => onSelectIncident(inc)}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <title>{inc.junction} · {inc.risk_level} · {inc.type}</title>
                <circle cx={x} cy={y} r={r + 6} fill={color} opacity={0.1} />
                {inc.risk_level === 'High' && (
                  <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth="1.5" opacity="0.7">
                    <animate attributeName="r" values={`${r};${r+9};${r}`} dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
                  </circle>
                )}
                <circle cx={x} cy={y} r={sel ? r + 3 : r}
                  fill={color} stroke="rgba(255,255,255,0.8)"
                  strokeWidth={sel ? 2.5 : 1.5}
                  filter={`url(#g${inc.risk_level === 'High' ? 'H' : 'M'})`} />
              </g>
            );
          })}
        </svg>
      )}

      {/* CLOCK OVERLAY */}
      {isGhostActive && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
          <div className="text-[10px] font-mono text-[#4A6CF7] uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full backdrop-blur-md mb-2 border border-[#4A6CF7]/30 shadow-[0_0_15px_rgba(74,108,247,0.3)]">
            Ghost Replay Mode
          </div>
          <div className="text-4xl font-black font-mono text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
            T+ {ghostTime.toString().padStart(3, '0')} <span className="text-xl text-gray-400">min</span>
          </div>
        </div>
      )}

      {!mapLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B] z-10">
          <div className="w-10 h-10 rounded-full border-t-2 border-[#4A6CF7] animate-spin mb-4" />
          <p className="text-[#4A6CF7] text-xs tracking-widest uppercase font-mono animate-pulse">
            First15 · Loading Bengaluru Incidents…
          </p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B] z-10 px-8 text-center">
          <p className="text-[#ff2a2a] font-bold tracking-widest mb-2 text-sm uppercase">Map Error</p>
          <p className="text-gray-400 text-xs font-mono">{error}</p>
        </div>
      )}
    </div>
  );
}
