'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorType?: 'cyan' | 'amber' | 'crimson' | 'default';
}

export function MetricCard({ title, value, subtitle, trend, trendValue, colorType = 'default' }: MetricCardProps) {
  
  const getBorderColor = () => {
    switch(colorType) {
      case 'cyan': return 'border-b-[#4A6CF7]/50';
      case 'amber': return 'border-b-[#f59e0b]/50';
      case 'crimson': return 'border-b-[#ff2a2a]/50';
      default: return 'border-white/5';
    }
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-[#ff2a2a]';
    if (trend === 'down') return 'text-[#4A6CF7]';
    return 'text-[#E5E7EB]';
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`glass-panel p-4 rounded-xl border ${getBorderColor()} bg-[#161618]/60 hover:bg-[#161618]/80 transition-colors cursor-default`}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-[10px] font-bold tracking-widest text-[#E5E7EB] uppercase">{title}</h3>
        {trend && (
          <span className={`text-[10px] font-bold tracking-wider uppercase ${getTrendColor()} flex items-center gap-1`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
          </span>
        )}
      </div>
      
      <div className="mt-3">
        <span className="text-3xl font-mono tracking-tighter text-[#F5F5F7] font-semibold">{value}</span>
      </div>
      
      {subtitle && (
        <div className="mt-1 text-xs text-[#E5E7EB]">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
