'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GhostVehicle {
  id: string;
  junction: string;
  lat: number;
  lng: number;
  veh_type: string;
  veh_label: string;
  hours_stranded: number;
  cascade_score: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE';
}

interface GhostFleetData {
  fleet: GhostVehicle[];
  total: number;
  critical_count: number;
  avg_cascade_score: number;
  alert_level: 'CRITICAL' | 'HIGH' | 'MODERATE';
}

interface Props {
  onSelectVehicle?: (lat: number, lng: number, id: string) => void;
}

const RISK_COLORS = {
  CRITICAL: { bg: '#ff2a2a', glow: 'rgba(255,42,42,0.4)', text: '#ff4444', border: 'rgba(255,42,42,0.3)' },
  HIGH:     { bg: '#ffb320', glow: 'rgba(255,179,32,0.3)', text: '#ffb320', border: 'rgba(255,179,32,0.3)' },
  MODERATE: { bg: '#f59e0b', glow: 'rgba(245,158,11,0.2)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
};

const VEH_ICONS: Record<string, string> = {
  heavy_vehicle: '🚛',
  truck: '🚚',
  bmtc_bus: '🚌',
  private_bus: '🚌',
  ksrtc_bus: '🚌',
  lcv: '🚐',
};

export function GhostFleetPanel({ onSelectVehicle }: Props) {
  const [data, setData] = useState<GhostFleetData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/morning-clearance');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error('Ghost Fleet fetch failed:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading || !data || data.total === 0) return null;

  const alertColors = RISK_COLORS[data.alert_level];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.5, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-16 right-4 z-30 w-72 pointer-events-auto"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
        style={{
          background: 'rgba(10,10,11,0.92)',
          border: `1px solid ${alertColors.border}`,
          borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
          padding: '10px 14px',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 0 20px ${alertColors.glow}`,
          transition: 'all 0.3s ease',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Pulsing alert dot */}
            <div className="relative flex-shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: alertColors.bg, boxShadow: `0 0 8px ${alertColors.bg}` }}
              />
              {data.alert_level === 'CRITICAL' && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: alertColors.bg, opacity: 0.5 }}
                />
              )}
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: alertColors.text }}>
                Ghost Fleet Warning
              </div>
              <div className="text-white text-xs font-bold mt-0.5">
                {data.critical_count} Critical · {data.total} Stranded
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: alertColors.bg, color: '#000' }}
            >
              {data.alert_level}
            </span>
            <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {/* Expandable vehicle list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              overflow: 'hidden',
              background: 'rgba(10,10,11,0.95)',
              border: `1px solid ${alertColors.border}`,
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Summary Stats */}
            <div className="px-3 pt-3 pb-2 grid grid-cols-2 gap-2">
              <div
                className="rounded-lg p-2 text-center"
                style={{ background: 'rgba(255,42,42,0.08)', border: '1px solid rgba(255,42,42,0.15)' }}
              >
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Avg Cascade</div>
                <div className="text-lg font-black" style={{ color: alertColors.text }}>
                  {data.avg_cascade_score}%
                </div>
              </div>
              <div
                className="rounded-lg p-2 text-center"
                style={{ background: 'rgba(255,179,32,0.08)', border: '1px solid rgba(255,179,32,0.15)' }}
              >
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Critical Units</div>
                <div className="text-lg font-black text-[#ffb320]">{data.critical_count}</div>
              </div>
            </div>

            <div className="px-2 pb-2 text-[9px] font-mono text-gray-600 uppercase tracking-wider px-3">
              ↓ Tap to fly map to vehicle
            </div>

            {/* Vehicle list */}
            <div className="overflow-y-auto max-h-60 px-2 pb-2 space-y-1.5">
              {data.fleet.map((vehicle) => {
                const colors = RISK_COLORS[vehicle.risk_level];
                return (
                  <motion.button
                    key={vehicle.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectVehicle?.(vehicle.lat, vehicle.lng, vehicle.id)}
                    className="w-full text-left"
                    style={{
                      background: `rgba(${vehicle.risk_level === 'CRITICAL' ? '255,42,42' : vehicle.risk_level === 'HIGH' ? '255,179,32' : '245,158,11'},0.05)`,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">
                          {VEH_ICONS[vehicle.veh_type] || '🚗'}
                        </span>
                        <div className="min-w-0">
                          <div className="text-white text-[11px] font-semibold truncate">
                            {vehicle.veh_label}
                          </div>
                          <div className="text-gray-500 text-[9px] font-mono truncate mt-0.5">
                            {vehicle.junction.length > 28 ? vehicle.junction.slice(0, 28) + '…' : vehicle.junction}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div
                          className="text-[10px] font-black"
                          style={{ color: colors.text }}
                        >
                          {vehicle.cascade_score}%
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">
                          {vehicle.hours_stranded}h stranded
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer warning */}
            <div
              className="mx-2 mb-2 rounded-lg px-3 py-2 text-[9px] font-mono leading-relaxed"
              style={{ background: 'rgba(255,42,42,0.06)', border: '1px solid rgba(255,42,42,0.1)', color: '#ff6666' }}
            >
              ⚠ These overnight breakdowns may cascade into morning gridlock.
              Dispatch heavy tow trucks before 08:00 to prevent peak-hour blockage.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
