'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CascadeArc {
  source: string;
  target: string;
  weight: number;
  risk_pct: number;
  eta_minutes: number;
  src_lat: number;
  src_lng: number;
  tgt_lat: number;
  tgt_lng: number;
}

// Convert geographic coordinates to approximate pixel positions on the dashboard
// Bengaluru bounds: lat 12.83–13.15, lng 77.45–77.78
function geoToPixel(lat: number, lng: number, width: number, height: number) {
  const LAT_MIN = 12.83, LAT_MAX = 13.15;
  const LNG_MIN = 77.45, LNG_MAX = 77.78;
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * width;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height; // invert Y axis
  return { x, y };
}

export function CascadeArcOverlay() {
  const [arcs, setArcs] = useState<CascadeArc[]>([]);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch(`/api/v1/cascade-arcs`)
      .then(r => r.json())
      .then(setArcs)
      .catch(console.error);
  }, []);

  const { w, h } = dims;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      viewBox={`0 0 ${w} ${h}`}
      style={{ mixBlendMode: 'screen' }}
    >
      <defs>
        {/* Animated gradient for the arc stroke */}
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff2a2a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffb320" stopOpacity="0.3" />
        </linearGradient>
        {/* Glowing filter */}
        <filter id="arcGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {arcs.map((arc, i) => {
        const src = geoToPixel(arc.src_lat, arc.src_lng, w, h);
        const tgt = geoToPixel(arc.tgt_lat, arc.tgt_lng, w, h);

        // Bezier control point — arc upward
        const cpX = (src.x + tgt.x) / 2;
        const cpY = Math.min(src.y, tgt.y) - 80 - i * 10;

        const pathD = `M ${src.x},${src.y} Q ${cpX},${cpY} ${tgt.x},${tgt.y}`;
        const strokeColor = arc.risk_pct > 75 ? '#ff2a2a' : arc.risk_pct > 50 ? '#ffb320' : '#4A6CF7';

        return (
          <g key={`${arc.source}-${arc.target}`} filter="url(#arcGlow)">
            {/* Static dim path */}
            <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeOpacity={0.2} />

            {/* Animated moving dot along the arc */}
            <motion.circle
              r={4}
              fill={strokeColor}
              filter="url(#arcGlow)"
              initial={{ offsetDistance: '0%' }}
              animate={{ offsetDistance: '100%' }}
              transition={{
                duration: 2.5 + i * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.6,
              }}
              style={{
                offsetPath: `path("${pathD}")`,
                offsetRotate: '0deg',
              } as any}
            />

            {/* Source dot */}
            <circle cx={src.x} cy={src.y} r={5} fill={strokeColor} fillOpacity={0.8} />

            {/* Target pulsing ring */}
            <motion.circle
              cx={tgt.x} cy={tgt.y} r={8}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
              animate={{ r: [8, 18], opacity: [0.8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
            />
            <circle cx={tgt.x} cy={tgt.y} r={4} fill={strokeColor} fillOpacity={0.9} />

            {/* Risk label at target */}
            <foreignObject
              x={tgt.x + 10}
              y={tgt.y - 16}
              width={120}
              height={36}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.75)',
                  border: `1px solid ${strokeColor}`,
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  color: strokeColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  lineHeight: '1.4',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{arc.target}</div>
                <div style={{ opacity: 0.8 }}>{arc.risk_pct}% risk · {arc.eta_minutes}m</div>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
