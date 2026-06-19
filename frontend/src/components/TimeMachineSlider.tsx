'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function TimeMachineSlider() {
  const [delta, setDelta] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async (val: number) => {
    setDelta(val);
    setLoading(true);
    
    try {
      const res = await fetch(`/api/v1/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: 'hackathon-demo-1', delta_minutes: val })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative overflow-hidden flex flex-col sm:flex-row items-center gap-8">
      
      <div className="flex-1 w-full">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xs font-bold text-[#F5F5F7] tracking-widest uppercase">Counterfactual Time Machine</h2>
          <span className="text-[10px] text-[#4A6CF7] tracking-widest font-mono uppercase bg-[#4A6CF7]/10 px-2 py-1 rounded">What-if Engine</span>
        </div>

        <div className="relative pt-4 pb-2">
          <input 
            type="range" 
            min="-30" 
            max="0" 
            value={delta} 
            onChange={(e) => handleSimulate(parseInt(e.target.value))}
            className="w-full h-1 bg-[#E5E7EB]/30 rounded-lg appearance-none cursor-pointer accent-[#4A6CF7]"
          />
          <div className="flex justify-between text-[10px] text-[#E5E7EB] mt-3 font-mono uppercase tracking-widest">
            <span>-30M (Early Dispatch)</span>
            <motion.span 
              key={delta}
              initial={{ scale: 1.5, color: '#F5F5F7' }}
              animate={{ scale: 1, color: '#4A6CF7' }}
              className="font-bold"
            >
              {delta}M
            </motion.span>
            <span>0M (Actual)</span>
          </div>
        </div>
      </div>

      <div className="w-[300px] shrink-0 border-l border-white/10 pl-8">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[#E5E7EB] font-mono text-xs uppercase tracking-widest animate-pulse">Running Queue Model...</div>
        ) : result ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-[#E5E7EB] uppercase tracking-widest mb-1">Delay Saved</div>
              <div className="text-2xl font-mono font-bold text-[#f59e0b]">{result.saved_delay_minutes}m</div>
            </div>
            <div>
              <div className="text-[10px] text-[#4A6CF7] uppercase tracking-widest mb-1">Economic Value</div>
              <div className="text-2xl font-mono font-bold text-[#F5F5F7]">₹{result.economic_value_saved_inr.toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[#E5E7EB] font-mono text-[10px] uppercase tracking-widest">Awaiting Simulation</div>
        )}
      </div>

    </div>
  );
}
