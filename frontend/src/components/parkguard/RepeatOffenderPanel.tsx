'use client';

import React, { useState, useMemo } from 'react';
import type { ParkGuardData, RepeatOffender } from '@/app/parkguard/page';

interface Props { data: ParkGuardData; }

const TIER_CONFIG = {
  3: {
    label: 'Tier 3',
    sub: 'Impound Priority',
    color: '#FF3B30',
    bg: 'rgba(255,59,48,0.1)',
    border: 'rgba(255,59,48,0.25)',
    icon: '🚔',
    description: '20+ violations. Escalate to impound. These vehicles are habitual and deliberate.',
    minViolations: 20,
    action: 'Impound Vehicle',
    actionNote: 'Issue immediate court summons + tow notice'
  },
  2: {
    label: 'Tier 2',
    sub: 'Escalated Monitoring',
    color: '#FF9F0A',
    bg: 'rgba(255,159,10,0.1)',
    border: 'rgba(255,159,10,0.25)',
    icon: '⚠️',
    description: '10–19 violations. Formal warning letter + watchlist. Police patrol routes should flag these.',
    minViolations: 10,
    action: 'Issue Warning',
    actionNote: 'Formal notice + traffic court date'
  },
  1: {
    label: 'Tier 1',
    sub: 'Warning Issued',
    color: '#FFD60A',
    bg: 'rgba(255,214,10,0.1)',
    border: 'rgba(255,214,10,0.25)',
    icon: '⚡',
    description: '5–9 violations. Automated warning SMS + doubled fine amount.',
    minViolations: 5,
    action: 'Send Warning',
    actionNote: 'Automated SMS + double fine next time'
  },
  0: {
    label: 'Tier 0',
    sub: 'Monitor',
    color: '#6E6E73',
    bg: 'rgba(110,110,115,0.1)',
    border: 'rgba(110,110,115,0.2)',
    icon: '👁',
    description: '3–4 violations. Flagged for tracking. No action yet.',
    minViolations: 3,
    action: 'Monitor',
    actionNote: 'Track activity'
  },
};

function OffenderRow({ offender, rank }: { offender: RepeatOffender; rank: number }) {
  const tier = TIER_CONFIG[offender.tier as keyof typeof TIER_CONFIG];
  const daySpan = offender.firstSeen !== 'N/A' && offender.lastSeen !== 'N/A'
    ? Math.round((new Date(offender.lastSeen).getTime() - new Date(offender.firstSeen).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ padding: '10px 12px', color: '#5A5A6A', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#F5F5F7', letterSpacing: '0.5px' }}>
          {offender.vehicleNumber}
        </div>
        <div style={{ fontSize: 11, color: '#5A5A6A', marginTop: 2 }}>{offender.vehicleType}</div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 8,
          background: tier.bg,
          border: `1px solid ${tier.border}`,
        }}>
          <span style={{ fontSize: 12 }}>{tier.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: tier.color }}>{tier.label}</span>
          <span style={{ fontSize: 10, color: tier.color + 'AA' }}>— {tier.sub}</span>
        </div>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: tier.bg,
          border: `2px solid ${tier.color}`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          fontWeight: 800,
          color: tier.color,
        }}>{offender.violations}</div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
            <div style={{
              width: `${Math.min(100, offender.violations / 55 * 100)}%`,
              height: '100%',
              background: tier.color,
              borderRadius: 3,
            }} />
          </div>
          <span style={{ fontSize: 12, color: '#9E9EA7', fontFamily: 'JetBrains Mono, monospace' }}>×{offender.violations}</span>
        </div>
      </td>
      <td style={{ padding: '10px 12px', color: '#9E9EA7', fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: Math.min(offender.locationSpread, 8) }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#4A6CF7', opacity: 0.6 + i * 0.05 }} />
          ))}
          {offender.locationSpread > 8 && <span style={{ fontSize: 10, color: '#5A5A6A' }}>+{offender.locationSpread - 8}</span>}
        </div>
        <div style={{ fontSize: 10, color: '#5A5A6A', marginTop: 2 }}>{offender.locationSpread} stations</div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: '#9E9EA7' }}>
          {offender.lastSeen !== 'N/A' ? offender.lastSeen : '—'}
        </div>
        {daySpan > 0 && (
          <div style={{ fontSize: 10, color: '#5A5A6A', marginTop: 1 }}>
            over {daySpan} days
          </div>
        )}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <button
          style={{
            padding: '5px 12px',
            borderRadius: 7,
            border: `1px solid ${tier.border}`,
            background: tier.bg,
            color: tier.color,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap',
          }}
          title={tier.actionNote}
        >
          {tier.icon} {tier.action}
        </button>
      </td>
    </tr>
  );
}

export default function RepeatOffenderPanel({ data }: Props) {
  const [filterTier, setFilterTier] = useState<'all' | '3' | '2' | '1' | '0'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'violations' | 'locationSpread' | 'lastSeen'>('violations');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const vehicleTypes = useMemo(() => {
    const types = new Set(data.repeatOffenders.map(o => o.vehicleType));
    return ['all', ...Array.from(types)];
  }, [data.repeatOffenders]);

  const filtered = useMemo(() => {
    let offs = data.repeatOffenders;
    if (filterTier !== 'all') offs = offs.filter(o => o.tier === parseInt(filterTier));
    if (filterType !== 'all') offs = offs.filter(o => o.vehicleType === filterType);
    return [...offs].sort((a, b) => {
      if (sortBy === 'violations') return b.violations - a.violations;
      if (sortBy === 'locationSpread') return b.locationSpread - a.locationSpread;
      if (sortBy === 'lastSeen') return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      return 0;
    });
  }, [data.repeatOffenders, filterTier, filterType, sortBy]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const tier3Count = data.repeatOffenders.filter(o => o.tier === 3).length;
  const tier2Count = data.repeatOffenders.filter(o => o.tier === 2).length;
  const tier1Count = data.repeatOffenders.filter(o => o.tier === 1).length;
  const tier0Count = data.repeatOffenders.filter(o => o.tier === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* INSIGHT BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,159,10,0.08) 0%, rgba(255,59,48,0.06) 100%)',
        border: '1px solid rgba(255,159,10,0.2)',
        borderRadius: 20,
        padding: 24,
      }}>
        <div style={{ fontSize: 13, color: '#FF9F0A', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
          🎯 Focused Enforcement Opportunity
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#F5F5F7', marginBottom: 8, letterSpacing: '-0.5px' }}>
          711 vehicles where targeted action delivers the highest return
        </div>
        <div style={{ fontSize: 14, color: '#9E9EA7', lineHeight: 1.6, maxWidth: 800 }}>
          The top 711 vehicles have <strong style={{ color: '#FF9F0A' }}>10+ violations each</strong> in just 5 months.
          A tiered escalation strategy — automated reminders → formal notices → summons → impound —
          lets BTP resolve the highest-impact cases without stretching patrol resources.
          The 87 vehicles with <strong style={{ color: '#FF9F0A' }}>20+ violations</strong> are the clearest starting point for action.
        </div>
      </div>

      {/* TIER OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {([3, 2, 1, 0] as const).map(tier => {
          const config = TIER_CONFIG[tier];
          const count = [tier3Count, tier2Count, tier1Count, tier0Count][3 - tier];
          return (
            <div
              key={tier}
              onClick={() => setFilterTier(filterTier === String(tier) as typeof filterTier ? 'all' : String(tier) as typeof filterTier)}
              style={{
                background: filterTier === String(tier) ? config.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterTier === String(tier) ? config.border : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 18,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = config.bg; }}
              onMouseLeave={e => { if (filterTier !== String(tier)) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 24, opacity: 0.3 }}>{config.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: config.color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                {config.label} — {config.sub}
              </div>
              <div style={{ fontSize: 40, fontWeight: 900, color: config.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: 6 }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: '#5A5A6A', lineHeight: 1.5 }}>{config.description}</div>
              <div style={{ marginTop: 10, padding: '6px 10px', background: config.bg, border: `1px solid ${config.border}`, borderRadius: 8, fontSize: 11, color: config.color, fontWeight: 600 }}>
                {config.icon} {config.action} → {config.actionNote}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONTROLS */}
      <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F7' }}>Watchlist</div>
            <div style={{ fontSize: 12, color: '#5A5A6A' }}>{filtered.length} vehicles | {data.repeatOffenders.filter(o=>o.violations>=5).length} require action</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Vehicle type filter */}
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(0); }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '6px 10px',
                color: '#F5F5F7',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
              }}
            >
              {vehicleTypes.map(t => (
                <option key={t} value={t} style={{ background: '#0F1117' }}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '6px 10px',
                color: '#F5F5F7',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
              }}
            >
              <option value="violations" style={{ background: '#0F1117' }}>Sort: Most Violations</option>
              <option value="locationSpread" style={{ background: '#0F1117' }}>Sort: Location Spread</option>
              <option value="lastSeen" style={{ background: '#0F1117' }}>Sort: Most Recent</option>
            </select>
            {/* Export button (UI only) */}
            <button
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid rgba(52,199,89,0.3)',
                background: 'rgba(52,199,89,0.1)',
                color: '#34C759',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
              title="Export watchlist as CSV (demo)"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Rank', 'Vehicle', 'Escalation Tier', 'Violations', 'Volume', 'Location Spread', 'Last Seen', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#5A5A6A', fontWeight: 600, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((offender, idx) => (
                <OffenderRow key={offender.vehicleNumber} offender={offender} rank={page * PAGE_SIZE + idx + 1} />
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: page === 0 ? '#3A3A4A' : '#F5F5F7',
                cursor: page === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13
              }}
            >← Prev</button>
            <span style={{ color: '#9E9EA7', fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: page === totalPages - 1 ? '#3A3A4A' : '#F5F5F7',
                cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13
              }}
            >Next →</button>
          </div>
        )}
      </div>

      {/* ESCALATION FLOW DIAGRAM */}
      <div style={{
        background: '#0F1117',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 28,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 20 }}>Recommended Escalation Framework</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {[
            { violations: '1–4', label: 'Standard Challan', desc: 'Normal fine issued via SCITA', icon: '📋', color: '#5A5A6A', bg: 'rgba(90,90,106,0.1)', border: 'rgba(90,90,106,0.2)' },
            { violations: '5–9', label: 'Tier 1 Warning', desc: 'Auto-SMS + 2× fine multiplier', icon: '⚡', color: '#FFD60A', bg: 'rgba(255,214,10,0.08)', border: 'rgba(255,214,10,0.2)' },
            { violations: '10–19', label: 'Tier 2 Escalation', desc: 'Formal notice + court date set', icon: '⚠️', color: '#FF9F0A', bg: 'rgba(255,159,10,0.08)', border: 'rgba(255,159,10,0.2)' },
            { violations: '20+', label: 'Tier 3: Impound', desc: 'Tow notice + license flag', icon: '🚔', color: '#FF3B30', bg: 'rgba(255,59,48,0.08)', border: 'rgba(255,59,48,0.2)' },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.violations}>
              <div style={{
                flex: '0 0 200px',
                background: step.bg,
                border: `1px solid ${step.border}`,
                borderRadius: 16,
                padding: '18px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{step.icon}</div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: step.color, fontWeight: 700, marginBottom: 6, letterSpacing: '1px' }}>
                  {step.violations} violations
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F7', marginBottom: 4 }}>{step.label}</div>
                <div style={{ fontSize: 11, color: '#9E9EA7', lineHeight: 1.4 }}>{step.desc}</div>
              </div>
              {idx < arr.length - 1 && (
                <div style={{ padding: '0 8px', color: step.color, fontSize: 20, opacity: 0.6, flex: '0 0 auto' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
