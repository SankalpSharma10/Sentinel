'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Waypoint {
  junction: string;
  lat: number;
  lng: number;
}

interface GreenWaveResult {
  truck_id: string;
  start: string;
  goal: string;
  path: string[];
  waypoints: Waypoint[];
  eta_minutes: number;
  junctions_cleared: number;
}

const TRUCKS = [
  { id: 'TT-01', label: 'TT-01 · Koramangala' },
  { id: 'TT-02', label: 'TT-02 · Indiranagar' },
  { id: 'TT-03', label: 'TT-03 · Yeshwanthpur' },
  { id: 'TT-04', label: 'TT-04 · Whitefield' },
  { id: 'TT-05', label: 'TT-05 · Jayanagar' },
];

// Known high-priority incidents (from pain points data)
const INCIDENTS = [
  { label: 'Silk Board Junc',     lat: 12.9170, lng: 77.6227 },
  { label: 'Mekhri Circle',       lat: 13.0189, lng: 77.5882 },
  { label: 'Marathahalli Junc',   lat: 12.9591, lng: 77.7006 },
  { label: 'Hebbal Flyover',      lat: 13.0354, lng: 77.5970 },
  { label: 'Yeshwanthpura',       lat: 13.0187, lng: 77.5592 },
];

export function GreenWavePanel() {
  const [selectedTruck, setSelectedTruck] = useState('TT-01');
  const [selectedIncident, setSelectedIncident] = useState(INCIDENTS[0]);
  const [result, setResult] = useState<GreenWaveResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/green-wave?truck_id=${selectedTruck}&incident_lat=${selectedIncident.lat}&incident_lng=${selectedIncident.lng}`;
      const res = await fetch(url);
      const data: GreenWaveResult = await res.json();
      setResult(data);

      // Dispatch event so the map can draw the green corridor
      window.dispatchEvent(new CustomEvent('greenWavePath', { detail: data }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#E5E7EB]">
          🟢 Green Wave Optimizer
        </h2>
        <span className="text-[10px] font-mono text-[#22c55e] tracking-widest bg-[#22c55e]/10 px-2 py-1 rounded uppercase">A* Path</span>
      </div>

      {/* Selectors */}
      <div className="flex flex-col gap-2 mb-3">
        <select
          value={selectedTruck}
          onChange={e => setSelectedTruck(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-[#E5E7EB] focus:outline-none focus:border-[#22c55e]/50 cursor-pointer"
        >
          {TRUCKS.map(t => (
            <option key={t.id} value={t.id} className="bg-[#0A0A0B]">{t.label}</option>
          ))}
        </select>
        <select
          value={selectedIncident.label}
          onChange={e => {
            const inc = INCIDENTS.find(i => i.label === e.target.value)!;
            setSelectedIncident(inc);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-[#E5E7EB] focus:outline-none focus:border-[#22c55e]/50 cursor-pointer"
        >
          {INCIDENTS.map(i => (
            <option key={i.label} value={i.label} className="bg-[#0A0A0B]">{i.label}</option>
          ))}
        </select>
      </div>

      {/* Optimize Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleOptimize}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/40 hover:bg-[#22c55e]/30 hover:border-[#22c55e] transition-all text-[#22c55e] text-xs font-bold tracking-widest uppercase font-mono cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Computing A* Path...' : '⚡ Optimize Green Wave'}
      </motion.button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg p-2.5">
                <div className="text-[9px] font-mono text-[#22c55e]/70 uppercase tracking-widest mb-0.5">ETA</div>
                <div className="text-xl font-mono font-bold text-[#22c55e]">{result.eta_minutes}m</div>
              </div>
              <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg p-2.5">
                <div className="text-[9px] font-mono text-[#22c55e]/70 uppercase tracking-widest mb-0.5">Cleared</div>
                <div className="text-xl font-mono font-bold text-[#22c55e]">{result.junctions_cleared} junc.</div>
              </div>
            </div>

            {/* Path Breadcrumb */}
            <div className="text-[9px] font-mono text-[#E5E7EB]/50 uppercase tracking-widest mb-2">Optimal Route</div>
            <div className="flex flex-wrap gap-1">
              {result.path.map((junction, i) => (
                <React.Fragment key={junction}>
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="text-[9px] font-mono bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] px-2 py-0.5 rounded"
                  >
                    {junction.replace(/([A-Z])/g, ' $1').trim()}
                  </motion.span>
                  {i < result.path.length - 1 && (
                    <span className="text-[#22c55e]/40 text-[9px] self-center">›</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
