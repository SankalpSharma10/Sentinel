'use client';

import React, { useEffect, useRef, useState } from 'react';
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

export function PenaltyZoneOverlay({ mapInstance, isVisible }: Props) {
  const [data, setData] = useState<PenaltyZonesData | null>(null);
  const circlesRef = useRef<any[]>([]);
  const labelsRef = useRef<any[]>([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch('/api/v1/penalty-zones');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error('Penalty zones fetch failed:', e);
      }
    };
    fetchZones();
  }, []);

  // Draw/clear circles on map whenever visibility or data changes
  useEffect(() => {
    const M = (window as any).mappls || (window as any).Mappls;
    if (!mapInstance || !M) return;

    // Clear existing circles
    circlesRef.current.forEach(circle => {
      try {
        if (circle && typeof circle.setMap === 'function') circle.setMap(null);
        else if (circle && typeof circle.remove === 'function') circle.remove();
      } catch (_) {}
    });
    circlesRef.current = [];

    labelsRef.current.forEach(label => {
      try {
        if (label && typeof label.setMap === 'function') label.setMap(null);
        else if (label && typeof label.remove === 'function') label.remove();
      } catch (_) {}
    });
    labelsRef.current = [];

    if (!isVisible || !data?.zones.length) return;

    data.zones.forEach((zone) => {
      const color = zone.severity === 'SEVERE' ? '#ff2a2a' : zone.severity === 'MODERATE' ? '#ffb320' : '#f59e0b';
      const opacity = zone.severity === 'SEVERE' ? 0.18 : zone.severity === 'MODERATE' ? 0.12 : 0.08;

      try {
        // Draw a pulsing SVG circle marker instead of a real geographic circle
        // Since Mappls might not support circle overlay, we use large custom HTML markers
        const sizePx = zone.severity === 'SEVERE' ? 80 : zone.severity === 'MODERATE' ? 55 : 35;
        const marker = new M.Marker({
          map: mapInstance,
          position: { lat: zone.lat, lng: zone.lng },
          html: `
            <div style="
              position:relative;
              width:${sizePx}px;
              height:${sizePx}px;
              transform:translate(-50%,-50%);
              pointer-events:none;
            ">
              <div style="
                position:absolute;
                inset:0;
                border-radius:50%;
                background:${color};
                opacity:${opacity};
                animation: penaltyPulse 3s ease-in-out infinite;
              "></div>
              <div style="
                position:absolute;
                inset:8px;
                border-radius:50%;
                border:1.5px solid ${color};
                opacity:0.5;
              "></div>
              <div style="
                position:absolute;
                inset:0;
                border-radius:50%;
                border:1px solid ${color};
                opacity:0.25;
                animation: penaltyRing 3s ease-in-out infinite;
              "></div>
              <div style="
                position:absolute;
                top:50%; left:50%;
                transform:translate(-50%,-50%);
                font-size:${zone.severity === 'SEVERE' ? 14 : 10}px;
                font-family:monospace;
                font-weight:900;
                color:${color};
                text-shadow:0 0 8px ${color};
                white-space:nowrap;
                pointer-events:none;
              ">${zone.severity === 'SEVERE' ? 'P' : 'p'}</div>
            </div>
          `,
          zIndex: 5,
        });
        circlesRef.current.push(marker);
      } catch (e) {
        console.error('Penalty zone marker error:', e);
      }
    });

    // Inject keyframe animation into document once
    if (!document.getElementById('penalty-zone-styles')) {
      const style = document.createElement('style');
      style.id = 'penalty-zone-styles';
      style.textContent = `
        @keyframes penaltyPulse {
          0%, 100% { transform: scale(1); opacity: 0.18; }
          50% { transform: scale(1.15); opacity: 0.28; }
        }
        @keyframes penaltyRing {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.3); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, [mapInstance, isVisible, data]);

  return null; // This component is purely a map-effect component
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
        background: isActive
          ? 'rgba(255,179,32,0.15)'
          : 'rgba(10,10,11,0.8)',
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
          color: '#000',
          borderRadius: '4px',
          padding: '1px 4px',
        }}>
          {zonesData.severe_count}
        </span>
      )}
    </motion.button>
  );
}
