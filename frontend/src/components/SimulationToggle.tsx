'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SimulationToggle() {
  const [active, setActive] = useState(false);

  const handleToggle = () => {
    const next = !active;
    setActive(next);

    if (next) {
      // Broadcast simulation START — all components listen and refresh
      window.dispatchEvent(new CustomEvent('simulationChange', { detail: { active: true } }));
    } else {
      // Broadcast simulation STOP
      window.dispatchEvent(new CustomEvent('simulationChange', { detail: { active: false } }));
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="relative flex items-center gap-3 px-5 py-2.5 rounded-full cursor-pointer overflow-hidden"
        style={{
          background: active
            ? 'linear-gradient(135deg, rgba(255,42,42,0.2), rgba(255,179,32,0.1))'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${active ? 'rgba(255,42,42,0.6)' : 'rgba(255,255,255,0.12)'}`,
          backdropFilter: 'blur(16px)',
          boxShadow: active ? '0 0 30px rgba(255,42,42,0.25), inset 0 0 20px rgba(255,42,42,0.05)' : 'none',
        }}
      >
        {/* Animated background pulse when active */}
        <AnimatePresence>
          {active && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ background: 'radial-gradient(circle, #ff2a2a, transparent)' }}
            />
          )}
        </AnimatePresence>

        {/* Status dot */}
        <div className="relative">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: active ? '#ff2a2a' : '#E5E7EB',
              boxShadow: active ? '0 0 10px #ff2a2a' : 'none',
            }}
          />
          {active && (
            <motion.div
              className="absolute inset-0 rounded-full bg-[#ff2a2a]"
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Label */}
        <span
          className="text-[11px] font-mono font-bold tracking-widest uppercase relative z-10"
          style={{ color: active ? '#ff2a2a' : '#9CA3AF' }}
        >
          {active ? 'Simulation Live' : 'Start Simulation'}
        </span>

        {/* Right icon */}
        <span className="text-[11px] relative z-10" style={{ color: active ? '#ffb320' : '#4B5563' }}>
          {active ? '⏹' : '▶'}
        </span>
      </motion.button>

      {/* Pulse label below */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[9px] font-mono text-[#ff2a2a]/70 tracking-widest uppercase animate-pulse"
          >
            Chaos Engine Active · Refreshing every 4s
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
