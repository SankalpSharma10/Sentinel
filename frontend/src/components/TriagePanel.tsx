'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Triage {
  junction: string; type: string; risk_level: string; risk_score: number;
  duration_bucket: string; duration_cls: number;
  tow_likely: boolean; diversion_needed: boolean; escalation_risk: boolean;
  is_peak: boolean; hour: number; day: string;
  risk_factors: string[]; closure_type: string;
  chokepoint_warning?: boolean;
  chokepoint_violations?: number;
  chokepoint_severity?: string;
}
interface SimilarCase {
  id: string; junction: string; cause: string; duration_minutes: number;
  duration_bucket: string; outcome: string; action_taken: string; closure_type: string;
  early_intervention?: boolean; date_str?: string;
}
interface Playbook {
  id: string; name: string; color: string; icon: string;
  description: string; steps: string[];
}
interface PlaybookData {
  recommended_playbook: Playbook;
  historical_warnings: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = { High:'#ff2a2a', Medium:'#ffb320', Low:'#22c55e' };
const RISK_BG:    Record<string, string> = { High:'rgba(255,42,42,0.08)', Medium:'rgba(255,179,32,0.08)', Low:'rgba(34,197,94,0.08)' };

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
      style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

// ─── Tab 1: Triage ───────────────────────────────────────────────────────────
function TriageTab({ data }: { data: Triage }) {
  const color = RISK_COLOR[data.risk_level] || '#4A6CF7';
  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Risk Score Hero */}
      <div className="rounded-2xl p-5 text-center" style={{ background: RISK_BG[data.risk_level], border: `1px solid ${color}30` }}>
        <div className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color }}>Impact Risk</div>
        <div className="text-5xl font-black font-mono" style={{ color }}>{data.risk_score}%</div>
        <div className="text-lg font-bold mt-1" style={{ color }}>{data.risk_level} Risk</div>
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Duration', value: data.duration_bucket, color: '#4A6CF7' },
          { label: 'Tow Needed', value: data.tow_likely ? 'Yes' : 'No', color: data.tow_likely ? '#ff2a2a' : '#22c55e' },
          { label: 'Diversion', value: data.diversion_needed ? 'Activate' : 'Hold', color: data.diversion_needed ? '#ffb320' : '#22c55e' },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: `${c.color}10`, border: `1px solid ${c.color}25` }}>
            <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">{c.label}</div>
            <div className="text-xs font-bold font-mono" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Context */}
      <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.07]">
        <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-2">Context</div>
        <div className="flex flex-wrap gap-2">
          <Badge label={data.day} color="#4A6CF7" />
          <Badge label={`${data.hour}:00`} color="#4A6CF7" />
          {data.is_peak && <Badge label="Peak Hour" color="#ff2a2a" />}
          {data.escalation_risk && <Badge label="Escalation Risk" color="#ff2a2a" />}
          {data.closure_type && <Badge label={data.closure_type} color="#ffb320" />}
        </div>
      </div>

      {/* Risk Factors */}
      <div>
        <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-2">Why this is risky</div>
        <div className="flex flex-col gap-1.5">
          {data.risk_factors.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
              <span className="text-[#ffb320] mt-0.5 shrink-0">›</span>{f}
            </div>
          ))}
        </div>
      </div>

      {/* Chokepoint Warning */}
      {data.chokepoint_warning && (
        <div
          className="rounded-xl p-3"
          style={{
            background: 'rgba(255,179,32,0.07)',
            border: '1px solid rgba(255,179,32,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm">🅿</span>
            <span
              className="text-[10px] font-black tracking-widest uppercase"
              style={{ color: '#ffb320' }}
            >
              {data.chokepoint_severity === 'SEVERE' ? '⚠ Severe Chokepoint' : '⚠ Chokepoint Nearby'}
            </span>
          </div>
          <p className="text-[10px] font-mono leading-relaxed" style={{ color: '#d1a43a' }}>
            {data.chokepoint_violations?.toLocaleString()} parking violations recorded within 1km.
            Emergency vehicles dispatched through this zone may face significant delays.
            Consider alternate routing.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Similar Cases ────────────────────────────────────────────────────
interface SimilarTabProps {
  cases: SimilarCase[];
  onStartGhostReplay: () => void;
  onStopGhostReplay: () => void;
  isGhostActive: boolean;
  ghostEarlyFilter: boolean;
  onToggleGhostFilter: (val: boolean) => void;
}

function SimilarTab({ cases, onStartGhostReplay, onStopGhostReplay, isGhostActive, ghostEarlyFilter, onToggleGhostFilter }: SimilarTabProps) {
  if (cases.length === 0) return <div className="p-5 text-gray-400 text-xs font-mono">No similar historical cases found.</div>;

  const longCases = cases.filter(c => c.duration_minutes > 90).length;
  const towReduced = cases.filter(c => c.early_intervention && c.duration_minutes <= 45).length;

  return (
    <div className="flex flex-col gap-4 p-5">
      
      {/* Ghost Replay Trigger & Verdict */}
      <div className="rounded-2xl p-5 border border-[#4A6CF7]/30 bg-gradient-to-br from-[#4A6CF7]/10 to-transparent relative overflow-hidden">
        <div className="text-[10px] font-mono text-[#4A6CF7] uppercase tracking-widest mb-1 font-bold">Ghost Replay</div>
        <div className="text-sm font-bold text-white mb-3">Watch this incident's future before it happens.</div>
        
        {/* Verdict Details */}
        <div className="flex flex-col gap-1.5 mb-4 border-l-2 border-[#4A6CF7]/50 pl-3">
          <div className="text-[10px] text-gray-300 font-mono">
            › <span className="text-white font-bold">{longCases} of {cases.length}</span> similar incidents escalated past 90 minutes.
          </div>
          {towReduced > 0 && (
            <div className="text-[10px] text-gray-300 font-mono">
              › In <span className="text-[#22c55e] font-bold">{towReduced} of {cases.length}</span>, early tow dispatch reduced duration.
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          {!isGhostActive ? (
            <button onClick={onStartGhostReplay} className="w-full py-2.5 rounded bg-[#4A6CF7] hover:bg-[#3a5ce5] text-white text-[11px] font-bold tracking-widest uppercase font-mono transition-colors shadow-[0_0_15px_rgba(74,108,247,0.4)]">
              ▶ Play Historical Twins
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={onStopGhostReplay} className="w-full py-2 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold tracking-widest uppercase font-mono transition-colors border border-white/20">
                ⏹ Stop Animation
              </button>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded bg-black/40 border border-white/10">
                <input type="checkbox" checked={ghostEarlyFilter} onChange={(e) => onToggleGhostFilter(e.target.checked)} className="rounded border-white/20 bg-black/50 text-[#22c55e] focus:ring-[#22c55e] focus:ring-offset-0" />
                <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">Show only early BTP intervention</span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mt-2 mb-1">Top {cases.length} Similar Historical Incidents</div>
      {cases.map((c, i) => {
        const outColor = c.outcome === 'Resolved' ? '#22c55e' : c.outcome === 'Major Disruption' ? '#ff2a2a' : '#ffb320';
        return (
          <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.08 }}
            className="rounded-xl p-4 border border-white/[0.07] bg-white/[0.025] relative">
            {c.early_intervention && <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] text-[8px] font-mono uppercase font-bold rounded-bl-lg rounded-tr-xl">Early Action</div>}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F5F5F7] font-mono pr-12">{c.date_str || c.junction}</span>
              <Badge label={c.outcome} color={outColor} />
            </div>
            <div className="text-[10px] text-gray-400 font-mono mb-2">{c.cause}</div>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="text-[#4A6CF7]">{c.duration_bucket}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-300">{c.action_taken}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

import { GreenWaveMap } from './GreenWaveMap';

// ─── Tab 3: Playbook ─────────────────────────────────────────────────────────
function PlaybookTab({ data, incidentId, incidentMeta }: { data: PlaybookData; incidentId: string; incidentMeta: any }) {
  const p = data.recommended_playbook;
  const [diversionResult, setDiversionResult] = useState<any>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const runDiversion = async () => {
    const lat = incidentMeta?.lat || 12.917;
    const lng = incidentMeta?.lng || 77.622;
    const res = await fetch(`/api/v1/green-wave?truck_id=TT-01&incident_lat=${lat}&incident_lng=${lng}`);
    const d = await res.json();
    setDiversionResult(d);
    setShowMapModal(true); // Open the Mapbox modal
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      {showMapModal && diversionResult && (
        <GreenWaveMap waypoints={diversionResult.waypoints} onClose={() => setShowMapModal(false)} />
      )}
      
      {/* Recommended playbook card */}
      <div className="rounded-2xl p-5" style={{ background: `${p.color}10`, border: `1px solid ${p.color}35` }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{p.icon}</span>
          <div>
            <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Recommended Playbook</div>
            <div className="text-base font-bold font-mono" style={{ color: p.color }}>{p.name}</div>
          </div>
        </div>
        <p className="text-xs text-gray-300 mb-4 leading-relaxed">{p.description}</p>
        <div className="flex flex-col gap-1.5">
          {p.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
              <span className="font-mono text-[9px] mt-0.5 shrink-0 font-bold" style={{ color: p.color }}>0{i+1}</span>{s}
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {data.historical_warnings.length > 0 && (
        <div className="rounded-xl p-4 bg-[#ffb320]/[0.06] border border-[#ffb320]/20">
          <div className="text-[9px] font-mono text-[#ffb320] uppercase tracking-widest mb-2">⚠ Historical Warnings</div>
          {data.historical_warnings.map((w, i) => (
            <div key={i} className="text-[10px] text-gray-300 mb-1 leading-relaxed">{w}</div>
          ))}
        </div>
      )}

      {/* Diversion trigger */}
      <button onClick={runDiversion}
        className="w-full py-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 hover:bg-[#22c55e]/20 transition-all text-[#22c55e] text-xs font-bold tracking-widest uppercase font-mono cursor-pointer">
        🟢 Show Diversion Route on Map
      </button>

      {diversionResult && (
        <div className="rounded-xl p-3 bg-[#22c55e]/5 border border-[#22c55e]/20 text-[10px] font-mono text-[#22c55e]">
          ETA: {diversionResult.eta_minutes} min · {diversionResult.junctions_cleared} junctions cleared
        </div>
      )}
    </div>
  );
}

// ─── Main Triage Panel ───────────────────────────────────────────────────────
interface TriagePanelProps {
  incidentId: string | null;
  incidentMeta: any;
  onClose: () => void;
  onStartGhostReplay: (twins: any[]) => void;
  onStopGhostReplay: () => void;
  isGhostActive: boolean;
  ghostEarlyFilter: boolean;
  onToggleGhostFilter: (val: boolean) => void;
}

const TABS = ['Triage', 'Similar Cases', 'Playbook'];

export function TriagePanel({ incidentId, incidentMeta, onClose, onStartGhostReplay, onStopGhostReplay, isGhostActive, ghostEarlyFilter, onToggleGhostFilter }: TriagePanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [triage, setTriage]       = useState<Triage | null>(null);
  const [similar, setSimilar]     = useState<SimilarCase[]>([]);
  const [playbook, setPlaybook]   = useState<PlaybookData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!incidentId) return;
    setActiveTab(0); setTriage(null); setSimilar([]); setPlaybook(null);
    setLoading(true); setFetchError(null);

    // Fetch triage first, then use its output to fetch playbook
    // Fetch triage first, then use its output to fetch playbook
    fetch(`/api/v1/triage/${incidentId}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch triage');
        return r.json();
      })
      .then((t: Triage) => {
        setTriage(t);
        setLoading(false);

        // Parallel: similar cases + playbook
        fetch(`/api/v1/similar-incidents/${incidentId}`)
          .then(r => r.ok ? r.json() : [])
          .then(setSimilar)
          .catch(console.error);

        const params = new URLSearchParams({
          risk_level: t.risk_level,
          duration_cls: String(t.duration_cls),
          tow_likely: String(t.tow_likely),
          diversion_needed: String(t.diversion_needed),
          escalation_risk: String(t.escalation_risk),
          event_type: t.type || '',
        });
        fetch(`/api/v1/playbook/${incidentId}?${params}`)
          .then(r => r.ok ? r.json() : null)
          .then(setPlaybook)
          .catch(console.error);
      })
      .catch(err => {
        console.error('Triage fetch error:', err);
        setFetchError('Backend is warming up. Please wait a moment and try again.');
        setLoading(false);
      });
  }, [incidentId]);

  const retryFetch = () => {
    if (!incidentId) return;
    setFetchError(null);
    setTriage(null);
    setLoading(true);
    fetch(`/api/v1/triage/${incidentId}`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then((t: Triage) => { setTriage(t); setLoading(false); })
      .catch(err => { setFetchError('Still warming up. Try again in 30 seconds.'); setLoading(false); });
  };

  const color = triage?.risk_level ? (RISK_COLOR[triage.risk_level] || '#4A6CF7') : '#4A6CF7';

  return (
    <AnimatePresence>
      {incidentId && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          className="absolute top-0 right-0 h-full w-[420px] z-30 flex flex-col"
          style={{ background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.07] shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Incident Triage</div>
                <div className="text-sm font-bold text-[#F5F5F7] font-mono truncate">
                  {triage?.junction || incidentMeta?.junction || '—'}
                </div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {triage?.type || incidentMeta?.type || ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {triage && <Badge label={triage.risk_level} color={color} />}
                <button onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white text-sm cursor-pointer">
                  ×
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all cursor-pointer"
                  style={{
                    background: activeTab === i ? `${color}20` : 'transparent',
                    color: activeTab === i ? color : '#6B7280',
                    border: activeTab === i ? `1px solid ${color}40` : '1px solid transparent',
                  }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 rounded-full border-t-2 border-[#4A6CF7] animate-spin" />
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest animate-pulse">Running XGBoost Triage…</p>
              </div>
            )}
            {!loading && fetchError && (
              <div className="flex flex-col items-center justify-center h-48 gap-4 px-6">
                <div className="w-12 h-12 rounded-full bg-[#ff2a2a]/10 border border-[#ff2a2a]/20 flex items-center justify-center text-xl">⚡</div>
                <p className="text-[10px] font-mono text-gray-400 text-center leading-relaxed">{fetchError}</p>
                <button
                  onClick={retryFetch}
                  className="px-5 py-2 rounded-lg bg-[#4A6CF7]/15 border border-[#4A6CF7]/30 text-[#4A6CF7] text-[10px] font-mono font-bold tracking-widest uppercase hover:bg-[#4A6CF7]/25 transition-all cursor-pointer"
                >
                  ↻ Retry Triage
                </button>
              </div>
            )}
            {!loading && !fetchError && (
              <>
                {activeTab === 0 && triage   && <TriageTab   data={triage} />}
                {activeTab === 0 && !triage  && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 px-6">
                    <p className="text-[10px] font-mono text-gray-500 text-center">No triage data available for this incident.</p>
                  </div>
                )}
                {activeTab === 1 && <SimilarTab cases={similar} onStartGhostReplay={() => onStartGhostReplay(similar)} onStopGhostReplay={onStopGhostReplay} isGhostActive={isGhostActive} ghostEarlyFilter={ghostEarlyFilter} onToggleGhostFilter={onToggleGhostFilter} />}
                {activeTab === 2 && playbook  && <PlaybookTab data={playbook} incidentId={incidentId} incidentMeta={incidentMeta} />}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
