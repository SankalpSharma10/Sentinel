'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PainPoint {
  junction_name: string;
  incident_count: number;
  avg_delay: number;
  total_delay_minutes: number;
  lat?: number;
  lng?: number;
}

export function PainPointList() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add cache buster to ensure we get the updated API schema with lat/lng
    fetch(`/api/v1/pain-points?t=${new Date().getTime()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setPainPoints(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch duckdb pain points:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4 text-[#E5E7EB] animate-pulse text-xs tracking-widest font-mono uppercase">Loading Aggregations...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {painPoints.map((point, idx) => (
        <motion.div 
          key={idx} 
          whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
          className="p-3 rounded-lg flex items-center justify-between cursor-default transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className={`font-mono text-sm ${idx === 0 ? 'text-[#ff2a2a]' : 'text-[#E5E7EB]'}`}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <div>
              <div className="text-sm font-bold text-[#F5F5F7] group-hover:text-white transition-colors">{point.junction_name}</div>
              <div className="text-xs text-[#E5E7EB] font-mono mt-0.5">{point.incident_count} Events</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-[#4A6CF7]">{Math.round(point.total_delay_minutes / 60)}H</div>
            <div className="text-[10px] text-[#E5E7EB] uppercase tracking-widest mt-0.5">Delay</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
