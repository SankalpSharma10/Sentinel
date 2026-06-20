'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IncidentMap } from '@/components/IncidentMap';
import { TriagePanel } from '@/components/TriagePanel';
import { CommanderChat } from '@/components/CommanderChat';
import { GhostFleetPanel } from '@/components/GhostFleetPanel';
import { PenaltyZoneOverlay, PenaltyZoneToggle } from '@/components/PenaltyZoneOverlay';

interface Incident {
  id: string; junction: string; lat: number; lng: number;
  type: string; risk_level: 'Low' | 'Medium' | 'High'; risk_score: number;
  tow_likely: boolean; duration_bucket: string;
}

export default function Dashboard() {
  const [selected, setSelected] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [notification, setNotification] = useState<any | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  // Health ping to keep Render backend awake while dashboard is open
  useEffect(() => {
    const interval = setInterval(() => fetch('/api/v1/health').catch(() => {}), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Ghost Replay State
  const [ghostTwins, setGhostTwins] = useState<any[]>([]);
  const [isGhostActive, setIsGhostActive] = useState(false);
  const [ghostEarlyFilter, setGhostEarlyFilter] = useState(false);
  const [selectedGhostVehicle, setSelectedGhostVehicle] = useState<{lat: number, lng: number, id: string} | null>(null);

  // Penalty Zone State — MUST be useState (not useRef) so React re-renders when map loads
  const [penaltyZonesVisible, setPenaltyZonesVisible] = useState(false);
  const [penaltyZonesData, setPenaltyZonesData] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null); // useState triggers re-render!
  const mapInstanceRef = useRef<any>(null); // keep ref for flyTo (no re-render needed there)

  const handleSelectIncident = (inc: Incident | null) => {
    setSelected(inc);
    setSelectedGhostVehicle(null);
    if (!inc) {
      setIsGhostActive(false);
      setGhostTwins([]);
    }
  };

  const handleMapReady = (map: any) => {
    mapInstanceRef.current = map;
    setMapInstance(map); // triggers re-render so PenaltyZoneOverlay gets the real map
  };

  // Fetch incidents logic
  useEffect(() => {
    const timeoutId = setTimeout(() => setIsWarmingUp(true), 2000);

    fetch(`/api/v1/incidents?demo=${isDemoMode}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        clearTimeout(timeoutId);
        setIsWarmingUp(false);
        if (isDemoMode && data.length > 4) {
          // In demo mode, take first 4 for map
          setIncidents(data.slice(0, 4));
          
          let index = 4;
          const interval = setInterval(() => {
            if (index >= data.length) {
              clearInterval(interval);
              return;
            }
            const popupInc = data[index];
            setIncidents(prev => [...prev, popupInc]);
            
            // Show notification
            setNotification({
              title: "NEW INCIDENT DETECTED",
              type: popupInc.type,
              junction: popupInc.junction,
              level: popupInc.risk_level
            });
            setTimeout(() => setNotification(null), 8000);
            
            // Fly map to popup incident
            if (mapInstanceRef.current) {
              try { mapInstanceRef.current.flyTo({ center: [popupInc.lng, popupInc.lat], zoom: 14, speed: 1.2 }); } catch (_) {}
            }
            index++;
          }, 10000);
          
          return () => {
            clearInterval(interval);
            clearTimeout(timeoutId);
          };
        } else {
          setIncidents(data);
        }
      })
      .catch(e => {
        clearTimeout(timeoutId);
        setIsWarmingUp(false);
        console.error(e);
      });
      
    return () => clearTimeout(timeoutId);
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => {
      const next = !prev;
      if (next) {
        setIncidents([]); // Clear map immediately
        setSelected(null);
        setSelectedGhostVehicle(null);
      }
      return next;
    });
  };

  // Fly map to a ghost fleet vehicle location
  const handleGhostVehicleSelect = (lat: number, lng: number, id: string) => {
    setSelectedGhostVehicle({ lat, lng, id });
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      map.flyTo({ center: [lng, lat], zoom: 16, speed: 1.2 });
    } catch (_) {
      try { map.setCenter([lng, lat]); } catch (__) {}
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0A0B] text-[#F5F5F7] font-sans">

      {/* ── FULL BLEED MAP ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <IncidentMap
          incidents={incidents}
          onSelectIncident={handleSelectIncident}
          selectedId={selected?.id ?? null}
          ghostTwins={ghostTwins}
          isGhostActive={isGhostActive}
          ghostEarlyFilter={ghostEarlyFilter}
          onMapReady={handleMapReady}
          penaltyZonesVisible={penaltyZonesVisible}
          selectedGhostVehicle={selectedGhostVehicle}
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
          <button onClick={toggleDemoMode} className={`px-3 py-1.5 rounded-md border text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-2 shadow-sm cursor-pointer ${isDemoMode ? 'bg-[#ff2a2a]/20 border-[#ff2a2a]/50 text-[#ff2a2a]' : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'}`}>
            <span>{isDemoMode ? '⏹' : '▶'}</span> {isDemoMode ? 'End Demo' : 'Demo Mode'}
          </button>
          <a href="/parkguard" className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono tracking-widest uppercase text-gray-300 hover:text-white transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
            <span className="text-[#ff3b30]">🛡️</span> ParkGuard
          </a>
        </div>

        {/* Right: Penalty Zone Toggle + hint */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <PenaltyZoneToggle
            isActive={penaltyZonesVisible}
            onToggle={() => setPenaltyZonesVisible(v => !v)}
            zonesData={penaltyZonesData}
          />
          <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
            Click any incident to begin triage
          </div>
        </div>
      </motion.div>

      {/* ── NOTIFICATION TOAST ───────────────────────── */}
      <AnimatePresence>
        {isWarmingUp && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[rgba(10,10,11,0.9)] border border-[#ffb320]/50 rounded-full px-6 py-3 shadow-[0_0_20px_rgba(255,179,32,0.15)] flex items-center gap-3 backdrop-blur-md"
          >
            <div className="w-4 h-4 rounded-full border-2 border-[#ffb320] border-t-transparent animate-spin" />
            <div className="text-xs font-mono text-[#ffb320] uppercase tracking-widest font-bold">
              Waking up AI Backend...
            </div>
          </motion.div>
        )}
        
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute top-24 left-6 z-40 bg-[rgba(10,10,11,0.9)] border border-[#ff2a2a]/50 rounded-xl p-4 shadow-[0_0_20px_rgba(255,42,42,0.2)] flex gap-4 items-start max-w-sm backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-[#ff2a2a]/20 flex items-center justify-center text-[#ff2a2a] text-lg shrink-0">
              ⚠
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#ff2a2a] uppercase tracking-widest font-bold mb-1">
                {notification.title}
              </div>
              <div className="text-sm font-bold text-white font-mono leading-tight mb-1">
                {notification.type}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {notification.junction}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GHOST FLEET PANEL (top-right) ────────────── */}
      <GhostFleetPanel onSelectVehicle={handleGhostVehicleSelect} />

      {/* ── PENALTY ZONE OVERLAY (map layer) ─────────── */}
      <PenaltyZoneOverlay
        mapInstance={mapInstance}
        isVisible={penaltyZonesVisible}
      />

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
        onResolve={(id) => {
          setIncidents(prev => prev.filter(i => i.id !== id));
          setSelected(null);
        }}
      />

      {/* ── AI COMMANDER CHAT (Fixed on Left) ────────── */}
      <div className="absolute left-6 bottom-8 z-30 pointer-events-auto">
        <CommanderChat />
      </div>

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
