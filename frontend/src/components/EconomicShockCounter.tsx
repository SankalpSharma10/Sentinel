'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

function AnimatedNumber({ value, prefix = '', suffix = '', className = '' }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const motionVal = useMotionValue(value);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState(value);

  useEffect(() => { motionVal.set(value); }, [value]);
  useEffect(() => spring.on('change', (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <span className={className}>
      {prefix}{display.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

export function EconomicShockCounter() {
  const [data, setData] = useState<any>(null);
  const [ticker, setTicker] = useState(0); // cumulative rupees lost since component mounted
  const rpsRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  const fetchEconomicData = () => {
    fetch(`/api/v1/economic-impact?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        rpsRef.current = d.rupees_lost_per_second;
        startTimeRef.current = Date.now();
        setTicker(d.total_lost_today);
      })
      .catch(() => {
        rpsRef.current = 105;
        setTicker(2268000);
      });
  };

  // Fetch base data on mount and on simulation change
  useEffect(() => {
    fetchEconomicData();
    window.addEventListener('simulationChange', fetchEconomicData);
    return () => window.removeEventListener('simulationChange', fetchEconomicData);
  }, []);

  // Local high-frequency ticker — updates every 100ms for smooth animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(prev => prev + rpsRef.current * 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const rps = data?.rupees_lost_per_second ?? 105;
  const saved = data?.total_saved_by_sentinel ?? 21420000;
  const vehiclesImpacted = data?.vehicles_impacted_per_minute ?? 1800;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-panel p-5 rounded-2xl pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#E5E7EB]">Economic Shock</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff2a2a] animate-pulse shadow-[0_0_8px_#ff2a2a]" />
          <span className="text-[10px] font-mono text-[#ff2a2a] tracking-widest uppercase">Live</span>
        </div>
      </div>

      {/* Big Ticking Counter */}
      <div className="mb-4 p-3 rounded-xl bg-[#ff2a2a]/5 border border-[#ff2a2a]/20">
        <div className="text-[10px] font-mono text-[#ff2a2a] tracking-widest uppercase mb-1">₹ Lost Today (Cumulative)</div>
        <div className="text-2xl font-mono font-black text-[#ff2a2a] tracking-tight tabular-nums">
          ₹<AnimatedNumber value={Math.round(ticker)} className="" />
        </div>
        <div className="text-[10px] text-[#ff2a2a]/60 font-mono mt-1">
          +₹{rps.toFixed(0)}/sec · {vehiclesImpacted.toLocaleString('en-IN')} vehicles/min impacted
        </div>
      </div>

      {/* Sentinel Savings */}
      <div className="p-3 rounded-xl bg-[#4A6CF7]/5 border border-[#4A6CF7]/20">
        <div className="text-[10px] font-mono text-[#4A6CF7] tracking-widest uppercase mb-1">Sentinel AI Saved</div>
        <div className="text-xl font-mono font-black text-[#4A6CF7] tracking-tight">
          ₹<AnimatedNumber value={saved} className="" />
        </div>
        <div className="text-[10px] text-[#4A6CF7]/60 font-mono mt-1">via early dispatch today</div>
      </div>
    </motion.div>
  );
}
