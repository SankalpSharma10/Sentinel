'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IncidentMap } from '@/components/IncidentMap';
import { TriagePanel } from '@/components/TriagePanel';

interface Incident {
  id: string; junction: string; lat: number; lng: number;
  type: string; risk_level: string; risk_score: number;
  tow_likely: boolean; duration_bucket: string;
}

export default function Dashboard() {
  const [selected, setSelected] = useState<Incident | null>(null);

  // Ghost Replay State
  const [ghostTwins, setGhostTwins] = useState<any[]>([]);
  const [isGhostActive, setIsGhostActive] = useState(false);
  const [ghostEarlyFilter, setGhostEarlyFilter] = useState(false);

  const handleSelectIncident = (inc: Incident | null) => {
    setSelected(inc);
    if (!inc) {
      setIsGhostActive(false);
      setGhostTwins([]);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0A0B] text-[#F5F5F7] font-sans">

      {/* ── FULL BLEED MAP ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <IncidentMap
          onSelectIncident={handleSelectIncident}
          selectedId={selected?.id ?? null}
          ghostTwins={ghostTwins}
          isGhostActive={isGhostActive}
          ghostEarlyFilter={ghostEarlyFilter}
        />
      </div>

      {/* ── TOP BAR ────────────────────────────────────── */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.85) 0%, transparent 100%)' }}
      >
        {/* Branding */}
        <div className="flex items-center gap-6 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4A6CF7] shadow-[0_0_12px_#4A6CF7] animate-pulse" />
            <div>
              <div className="text-sm font-black tracking-[0.2em] uppercase text-[#F5F5F7]">First15</div>
              <div className="text-[9px] font-mono text-gray-400 tracking-widest uppercase">Incident Triage Copilot · BTP</div>
            </div>
          </div>
          <a href="/parkguard" className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono tracking-widest uppercase text-gray-300 hover:text-white transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
            <span className="text-[#ff3b30]">🛡️</span> ParkGuard
          </a>
        </div>

        {/* Right: hint */}
        <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
          Click any incident to begin triage
        </div>
      </motion.div>

      {/* ── TRIAGE PANEL (slides in from right) ────────── */}
      <TriagePanel
        incidentId={selected?.id ?? null}
        incidentMeta={selected}
        onClose={() => handleSelectIncident(null)}
        onStartGhostReplay={(twins) => {
          setGhostTwins(twins);
          setIsGhostActive(true);
        }}
        onStopGhostReplay={() => setIsGhostActive(false)}
        isGhostActive={isGhostActive}
        ghostEarlyFilter={ghostEarlyFilter}
        onToggleGhostFilter={setGhostEarlyFilter}
      />

      {/* ── EMPTY STATE HINT (visible when nothing selected) ─ */}
      <AnimatePresence>
        {!selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-3 text-xs font-mono text-gray-400 tracking-widest">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#ff2a2a] shadow-[0_0_8px_#ff2a2a]" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#ffb320] shadow-[0_0_8px_#ffb320]" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
                <span>Low</span>
              </div>
              <span className="text-gray-600">·</span>
              <span>Click a marker to triage</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
