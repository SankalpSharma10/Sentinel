'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PenaltyZone {
  lat: number;
  lng: number;
  total_violations: number;
  parking_violations: number;
  severity: 'SEVERE' | 'MODERATE' | 'LOW';
  color: string;
  radius_meters: number;
  impact_description: string;
}

interface PenaltyZonesData {
  zones: PenaltyZone[];
  total_zones: number;
  severe_count: number;
  moderate_count: number;
}

interface Props {
  mapInstance: any;
  isVisible: boolean;
}

const SEVERITY_STYLE = {
  SEVERE:   { color: '#ff2a2a', glow: 'rgba(255,42,42,0.35)',   r: 22, opacity: 0.9 },
  MODERATE: { color: '#ffb320', glow: 'rgba(255,179,32,0.25)', r: 15, opacity: 0.85 },
  LOW:      { color: '#f59e0b', glow: 'rgba(245,158,11,0.2)',  r: 10, opacity: 0.75 },
};

export function PenaltyZoneOverlay({ mapInstance, isVisible }: Props) {
  const [data, setData]     = useState<PenaltyZonesData | null>(null);
  const [dots, setDots]     = useState<Array<{ zone: PenaltyZone; x: number; y: number }>>([]);
  const [hovered, setHovered] = useState<number | null>(null);

  // Fetch zone data once
  useEffect(() => {
    fetch('/api/v1/penalty-zones')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setData(json); })
      .catch(console.error);
  }, []);

  // Project geo-coords → screen pixels
  const project = useCallback(() => {
    if (!mapInstance || !data?.zones.length) return;
    try {
      setDots(
        data.zones.map(zone => {
          const pt = mapInstance.project([zone.lng, zone.lat]);
          return { zone, x: pt.x, y: pt.y };
        })
      );
    } catch (_) {}
  }, [mapInstance, data]);

  // Re-project on every map move/zoom
  useEffect(() => {
    if (!mapInstance || !data) return;
    project();
    const evts = ['move', 'zoom', 'rotate', 'pitch', 'moveend', 'zoomend'];
    evts.forEach(e => { try { mapInstance.on(e, project); } catch (_) {} });
    return () => { evts.forEach(e => { try { mapInstance.off(e, project); } catch (_) {} }); };
  }, [mapInstance, data, project]);

  if (!isVisible || dots.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        <filter id="pz-glow-severe" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="pz-glow-moderate" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Draw all circles first so they are underneath labels and tooltips */}
      {dots.map(({ zone, x, y }, i) => {
        const s = SEVERITY_STYLE[zone.severity];
        const isHov = hovered === i;
        const r = isHov ? s.r + 4 : s.r;

        return (
          <g
            key={`circle-${i}`}
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Outer pulse ring */}
            <circle cx={x} cy={y} r={r + 8} fill={s.color} opacity={0.08} />

            {/* Main filled circle */}
            <circle
              cx={x} cy={y} r={r}
              fill={s.color}
              opacity={isHov ? 0.35 : 0.2}
              stroke={s.color}
              strokeWidth={isHov ? 2 : 1.5}
              strokeOpacity={isHov ? 0.9 : 0.6}
              filter={`url(#pz-glow-${zone.severity === 'SEVERE' ? 'severe' : 'moderate'})`}
            />

            {/* Animated ring for SEVERE */}
            {zone.severity === 'SEVERE' && (
              <circle cx={x} cy={y} r={r} fill="none" stroke={s.color} strokeWidth="1" strokeOpacity="0.5">
                <animate attributeName="r" values={`${r};${r + 8};${r}`} dur="2.5s" repeatCount="indefinite"/>
                <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite"/>
              </circle>
            )}
          </g>
        );
      })}

      {/* Draw all labels over the circles */}
      {dots.map(({ zone, x, y }, i) => {
        const s = SEVERITY_STYLE[zone.severity];
        const r = s.r;
        const countStr = zone.total_violations >= 1000
          ? `${(zone.total_violations / 1000).toFixed(1)}k`
          : zone.total_violations.toString();

        const labelW = zone.severity === 'SEVERE' ? 56 : 50;
        const labelH = 18;

        return (
          <g
            key={`label-${i}`}
            transform={`translate(${x + r + 4}, ${y - labelH / 2})`}
            style={{ pointerEvents: 'none' }}
          >
            <rect
              x={0} y={0}
              width={labelW} height={labelH}
              rx={4}
              fill="rgba(10,10,11,0.88)"
              stroke={s.color}
              strokeWidth={1}
              strokeOpacity={0.8}
            />
            <text x={6} y={13} fill={s.color} fontSize={9} fontFamily="monospace" fontWeight="900">P</text>
            <line x1={15} y1={3} x2={15} y2={15} stroke={s.color} strokeWidth={0.5} strokeOpacity={0.4}/>
            <text x={19} y={12} fill="#ffffff" fontSize={9} fontFamily="monospace" fontWeight="700">{countStr}</text>
          </g>
        );
      })}

      {/* Draw hovered tooltip last so it sits on top of absolutely everything */}
      {hovered !== null && dots[hovered] && (() => {
        const { zone, x, y } = dots[hovered];
        const s = SEVERITY_STYLE[zone.severity];
        const r = s.r + 4;
        return (
          <g transform={`translate(${x - 90}, ${y - r - 52})`} style={{ pointerEvents: 'none' }}>
            <rect x={0} y={0} width={180} height={44} rx={6}
              fill="rgba(10,10,11,0.95)" stroke={s.color} strokeWidth={1} />
            <text x={8} y={14} fill={s.color} fontSize={9} fontFamily="monospace" fontWeight="900">
              {zone.severity} CHOKEPOINT
            </text>
            <text x={8} y={26} fill="#d1d5db" fontSize={9} fontFamily="monospace">
              {zone.total_violations.toLocaleString()} parking violations
            </text>
            <text x={8} y={38} fill="#6b7280" fontSize={8} fontFamily="monospace">
              Emergency vehicles may lose 5-15 min
            </text>
          </g>
        );
      })()}
    </svg>
  );
}



// ── Toggle Button Component ──
interface ToggleProps {
  isActive: boolean;
  onToggle: () => void;
  zonesData: PenaltyZonesData | null;
}

export function PenaltyZoneToggle({ isActive, onToggle, zonesData }: ToggleProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      title="Toggle Static Chokepoint overlay"
      style={{
        background: isActive ? 'rgba(255,179,32,0.15)' : 'rgba(10,10,11,0.8)',
        border: `1px solid ${isActive ? 'rgba(255,179,32,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px',
        padding: '6px 10px',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: '12px' }}>🅿</span>
      <span style={{
        fontSize: '9px',
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: isActive ? '#ffb320' : '#9ca3af',
      }}>
        {isActive ? 'Zones ON' : 'Penalty Zones'}
      </span>
      {zonesData && zonesData.severe_count > 0 && (
        <span style={{
          fontSize: '9px',
          fontWeight: 900,
          background: '#ff2a2a',
          color: '#fff',
          borderRadius: '4px',
          padding: '1px 5px',
        }}>
          {zonesData.severe_count}
        </span>
      )}
    </motion.button>
  );
}
