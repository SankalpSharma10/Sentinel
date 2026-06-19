'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Assignment {
  truck_id: string;
  truck_location: string;
  incident_junction: string;
  cost_score: number;
}

const statusColors: Record<string, string> = {
  'TT-01': '#4A6CF7',
  'TT-02': '#22c55e',
  'TT-03': '#ffb320',
  'TT-04': '#00f0ff',
  'TT-05': '#ff2a2a',
};

export function DispatchStatus() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch(`/api/v1/events/active?live=true&t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          setAssignments(data.dispatch_assignments ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    // Refresh immediately when simulation is toggled
    const handleSimChange = () => { setLoading(true); fetchData(); };
    window.addEventListener('simulationChange', handleSimChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('simulationChange', handleSimChange);
    };
  }, []);

  return (
    <div className="glass-panel p-5 rounded-2xl pointer-events-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#E5E7EB]">Dispatch Status</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-[10px] font-mono text-[#22c55e] tracking-widest uppercase">Hungarian Algo</span>
        </div>
      </div>

      {loading ? (
        <div className="text-[11px] font-mono text-[#E5E7EB]/40 animate-pulse uppercase tracking-widest">
          Computing assignments...
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-[11px] font-mono text-[#E5E7EB]/40 uppercase tracking-widest">
          No active dispatches
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((a, i) => {
            const color = statusColors[a.truck_id] ?? '#E5E7EB';
            return (
              <motion.div
                key={a.truck_id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                {/* Truck indicator */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold" style={{ color }}>
                      {a.truck_id}
                    </span>
                    <span className="text-[9px] font-mono text-[#E5E7EB]/40 uppercase tracking-widest">
                      Δ {a.cost_score.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#E5E7EB]/60 font-mono truncate">
                    {a.truck_location} → <span className="text-[#E5E7EB]">{a.incident_junction}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
