'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -100]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="bg-[#0A0A0B] min-h-screen text-[#F5F5F7] font-sans selection:bg-[#4A6CF7] selection:text-white overflow-x-hidden">
      
      {/* 1. Signature Element: The Liquid Glass Hero Orb */}
      <motion.div 
        className="fixed top-1/4 left-1/2 w-[800px] h-[800px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(74,108,247,0.4) 0%, rgba(127,156,245,0.1) 50%, rgba(10,10,11,0) 70%)',
          x: mousePosition.x * -0.05,
          y: mousePosition.y * -0.05,
          filter: 'blur(80px)'
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <motion.div 
        className="fixed top-1/3 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(255,42,42,0.15) 0%, rgba(10,10,11,0) 70%)',
          x: mousePosition.x * 0.03,
          y: mousePosition.y * 0.03,
          filter: 'blur(100px)'
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center backdrop-blur-md bg-[#0A0A0B]/50 border-b border-white/5">
        <div className="text-xl font-bold tracking-widest flex items-center gap-3">
          <div className="w-3 h-3 bg-[#4A6CF7] rounded-full shadow-[0_0_15px_rgba(74,108,247,0.8)]"></div>
          SENTINEL
        </div>
        <div className="flex gap-8 text-sm font-medium text-[#E5E7EB]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <Link href="/dashboard" className="text-white hover:text-[#4A6CF7] transition-colors">
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center px-8 lg:px-24 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
          
          <motion.div 
            className="lg:col-span-7 flex flex-col justify-center"
            style={{ y: y1, opacity }}
          >
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-8"
            >
              Predictive. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A6CF7] to-[#7F9CF5]">
                Prescriptive.
              </span> <br/>
              Absolute.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg lg:text-xl text-[#E5E7EB] max-w-lg mb-10 leading-relaxed"
            >
              The world's most advanced traffic command platform. Powered by DuckDB, Llama 3.3, and bipartite mathematical optimization.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link 
                href="/dashboard"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden transition-transform active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Access Command Center
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#4A6CF7] to-[#7F9CF5] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0">
                  <span className="absolute inset-0 flex items-center justify-center text-white font-semibold gap-2">
                    Access Command Center
                    <svg className="w-4 h-4 translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          </motion.div>

          {/* Frosted Glass UI Mockup */}
          <motion.div 
            className="lg:col-span-5 relative"
            style={{ y: y2 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-full aspect-[4/5] bg-[#161618]/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              
              {/* Noise overlay */}
              <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="text-xs font-bold uppercase tracking-widest text-[#E5E7EB]">Live Matrix</div>
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></div>
              </div>

              <div className="space-y-4 relative z-10">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center group-hover:bg-white/10 transition-colors duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A6CF7]/20 to-transparent flex items-center justify-center border border-[#4A6CF7]/30">
                        <div className="w-2 h-2 rounded-full bg-[#4A6CF7]"></div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Node {i * 7}A Alpha</div>
                        <div className="text-xs text-[#E5E7EB]">Calculating Ripple Effect...</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{98 - i * 12}%</div>
                      <div className="text-[10px] text-[#4A6CF7] uppercase tracking-widest">Confidence</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating Element */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-20 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-[#E5E7EB] uppercase tracking-widest font-bold">Routing</div>
                  <div className="text-sm text-white font-semibold">Hungarian Algorithm Active</div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Prop Section */}
      <section id="features" className="relative z-10 px-8 lg:px-24 py-32 bg-[#0A0A0B]">
        <div className="text-center mb-24">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tighter mb-4">Beyond Dashboards.</h2>
          <p className="text-xl text-[#E5E7EB]">We don't just show you data. We resolve it.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Dual-Core Ingestion", desc: "113MB of raw CSV data loaded instantaneously into an in-memory DuckDB engine. Millisecond aggregations." },
            { title: "Cascade Engine", desc: "Mathematical transition matrices calculate conditional probabilities, predicting network gridlock 30 minutes before it happens." },
            { title: "Min-Cost Routing", desc: "Scipy-powered bipartite matching automatically dispatches the nearest tow trucks to high-priority nodes." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="bg-[#161618] border border-white/5 rounded-2xl p-8 hover:bg-[#161618]/80 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#4A6CF7] font-mono text-xl">
                0{i + 1}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-[#E5E7EB] leading-relaxed text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ParkGuard Feature Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-12"
        >
          <Link href="/parkguard" className="block group">
            <div className="relative overflow-hidden bg-gradient-to-r from-[#FF3B30]/10 via-[#FF6B35]/08 to-[#FF9F0A]/10 border border-[#FF3B30]/20 rounded-3xl p-8 md:p-12 hover:border-[#FF3B30]/40 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF3B30]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF3B30, #FF6B35)', boxShadow: '0 0 30px rgba(255,59,48,0.3)' }}>
                  🛡️
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold tracking-widest text-[#FF9F0A] uppercase mb-2">New Module — Smarter Enforcement</div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">ParkGuard — Helping BTP Enforce Smarter</h3>
                  <p className="text-[#E5E7EB] text-sm md:text-base leading-relaxed max-w-2xl">
                    Give your cameras and officers the best chance of success. ParkGuard identifies which devices need recalibration,
                    which junctions deserve focused patrol effort, and which repeat vehicles are worth prioritising — so every
                    deployment counts and every challan holds up.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-5">
                    {['Device Reliability Scoring', 'Junction Congestion Map', 'Repeat Offender Watchlist'].map(tag => (
                      <span key={tag} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)', color: '#FF6B35' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-[#FF3B30] text-2xl group-hover:translate-x-2 transition-transform duration-300 font-light">
                  →
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </section>


    </div>
  );
}
