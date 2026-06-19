'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy chart/map components
const DeviceReliabilityPanel = dynamic(
  () => import('@/components/parkguard/DeviceReliabilityPanel'),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const HotspotMapPanel = dynamic(
  () => import('@/components/parkguard/HotspotMapPanel'),
  { ssr: false, loading: () => <PanelSkeleton /> }
);
const RepeatOffenderPanel = dynamic(
  () => import('@/components/parkguard/RepeatOffenderPanel'),
  { ssr: false, loading: () => <PanelSkeleton /> }
);

function PanelSkeleton() {
  return (
    <div className="pg-skeleton">
      <div className="pg-skeleton-bar" style={{ width: '60%', height: 24, marginBottom: 16 }} />
      <div className="pg-skeleton-bar" style={{ width: '100%', height: 200 }} />
    </div>
  );
}

interface SummaryKPIs {
  totalChallans: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  overallRejectionRate: number;
  totalDevices: number;
  totalVehicles: number;
  criticalDevices: number;
  warningDevices: number;
  goodDevices: number;
  repeatOffenders10Plus: number;
  repeatOffenders5Plus: number;
  medianRejectionRate: number;
  criticalThreshold: number;
  warnThreshold: number;
  uniqueJunctions: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface ParkGuardData {
  generatedAt: string;
  summaryKPIs: SummaryKPIs;
  deviceMapData: DevicePoint[];
  deviceDistribution: { range: string; count: number }[];
  junctionHotspots: JunctionHotspot[];
  repeatOffenders: RepeatOffender[];
  policeStationMetrics: PSMetric[];
  hourlyPattern: HourlyPoint[];
  monthlyTrend: MonthlyPoint[];
  violationTypes: { type: string; count: number }[];
}

export interface DevicePoint {
  deviceId: string;
  lat: number;
  lon: number;
  total: number;
  rejected: number;
  approved: number;
  rejectionRate: number;
  reliabilityScore: number;
  status: 'critical' | 'warning' | 'good';
  policeStation: string;
}

export interface JunctionHotspot {
  junctionName: string;
  lat: number;
  lon: number;
  total: number;
  rejected: number;
  approved: number;
  rejectionRate: number;
  uniqueVehicles: number;
  policeStation: string;
  peakHour: number;
  inEventDataset: boolean;
  hasRoadClosure: boolean;
  congestionRiskScore: number;
}

export interface RepeatOffender {
  vehicleNumber: string;
  vehicleType: string;
  violations: number;
  locationSpread: number;
  firstSeen: string;
  lastSeen: string;
  tier: number;
  tierLabel: string;
  tierColor: string;
}

export interface PSMetric {
  policeStation: string;
  total: number;
  rejected: number;
  approved: number;
  rejectionRate: number;
  efficiencyScore: number;
  uniqueDevices: number;
  uniqueVehicles: number;
}

export interface HourlyPoint {
  hour: number;
  label: string;
  total: number;
  rejected: number;
  rejectionRate: number;
}

export interface MonthlyPoint {
  month: string;
  total: number;
  rejected: number;
  approved: number;
  rejectionRate: number;
}

const ACTIVE_TAB_STYLES: Record<string, React.CSSProperties> = {
  reliability: { background: 'linear-gradient(135deg, #FF3B30, #FF6B35)', boxShadow: '0 0 20px rgba(255,59,48,0.4)' },
  hotspots: { background: 'linear-gradient(135deg, #4A6CF7, #7B9CFF)', boxShadow: '0 0 20px rgba(74,108,247,0.4)' },
  offenders: { background: 'linear-gradient(135deg, #FF9F0A, #FFD60A)', boxShadow: '0 0 20px rgba(255,159,10,0.4)' },
};

export default function ParkGuardDashboard() {
  const [data, setData] = useState<ParkGuardData | null>(null);
  const [activeTab, setActiveTab] = useState<'reliability' | 'hotspots' | 'offenders'>('reliability');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animCount, setAnimCount] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/parkguard_data.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ParkGuardData) => {
        setData(d);
        setLoading(false);
        setTimeout(() => setAnimCount(true), 100);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
          --bg-base: #08090C;
          --bg-card: #0F1117;
          --bg-card-hover: #161921;
          --bg-glass: rgba(255,255,255,0.04);
          --border: rgba(255,255,255,0.08);
          --border-bright: rgba(255,255,255,0.15);
          --text-primary: #F5F5F7;
          --text-secondary: #9E9EA7;
          --text-dim: #5A5A6A;
          --accent-blue: #4A6CF7;
          --accent-red: #FF3B30;
          --accent-orange: #FF9F0A;
          --accent-green: #34C759;
          --accent-yellow: #FFD60A;
          --accent-purple: #AF52DE;
          --critical: #FF3B30;
          --warning: #FF9F0A;
          --good: #34C759;
          --font-mono: 'JetBrains Mono', monospace;
        }

        .pg-root {
          min-height: 100vh;
          background: var(--bg-base);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* HEADER */
        .pg-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(8,9,12,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: 0 32px;
        }
        .pg-header-inner {
          max-width: 1600px;
          margin: 0 auto;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .pg-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .pg-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #FF3B30, #FF6B35);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 0 16px rgba(255,59,48,0.4);
        }
        .pg-logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #F5F5F7, #9E9EA7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pg-logo-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: var(--accent-red);
          background: rgba(255,59,48,0.12);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(255,59,48,0.25);
          text-transform: uppercase;
        }
        .pg-header-spacer { flex: 1; }
        .pg-date-badge {
          font-size: 11px;
          color: var(--text-dim);
          font-family: var(--font-mono);
          background: var(--bg-glass);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 6px;
        }
        .pg-back-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          transition: all 0.2s;
        }
        .pg-back-link:hover {
          border-color: var(--border-bright);
          color: var(--text-primary);
          background: var(--bg-glass);
        }

        /* HERO */
        .pg-hero {
          position: relative;
          padding: 60px 32px 40px;
          max-width: 1600px;
          margin: 0 auto;
          overflow: hidden;
        }
        .pg-hero-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 800px 400px at 30% 50%, rgba(255,59,48,0.08) 0%, transparent 70%),
                      radial-gradient(ellipse 600px 300px at 80% 30%, rgba(74,108,247,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .pg-hero-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--accent-red);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pg-hero-label::before {
          content: '';
          width: 20px;
          height: 2px;
          background: var(--accent-red);
        }
        .pg-hero-title {
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1.05;
          margin-bottom: 16px;
        }
        .pg-hero-title span {
          background: linear-gradient(135deg, #FF3B30 0%, #FF6B35 50%, #FF9F0A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pg-hero-subtitle {
          font-size: 16px;
          color: var(--text-secondary);
          max-width: 640px;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        /* KPI GRID */
        .pg-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          padding: 0 32px 40px;
          max-width: 1600px;
          margin: 0 auto;
        }
        .pg-kpi-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: default;
        }
        .pg-kpi-card:hover {
          border-color: var(--border-bright);
          background: var(--bg-card-hover);
          transform: translateY(-2px);
        }
        .pg-kpi-card::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .pg-kpi-card:hover::before { opacity: 1; }
        .pg-kpi-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }
        .pg-kpi-value {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1;
          font-family: var(--font-mono);
        }
        .pg-kpi-sub {
          font-size: 12px;
          color: var(--text-dim);
          margin-top: 4px;
        }
        .pg-kpi-icon {
          position: absolute;
          top: 16px;
          right: 16px;
          font-size: 20px;
          opacity: 0.4;
        }
        .pg-kpi-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 6px;
        }
        .pg-kpi-trend.bad { background: rgba(255,59,48,0.12); color: var(--critical); }
        .pg-kpi-trend.warn { background: rgba(255,159,10,0.12); color: var(--warning); }
        .pg-kpi-trend.good { background: rgba(52,199,89,0.12); color: var(--good); }

        /* TAB BAR */
        .pg-tabs-wrapper {
          padding: 0 32px;
          max-width: 1600px;
          margin: 0 auto 24px;
        }
        .pg-tabs {
          display: flex;
          gap: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 6px;
          width: fit-content;
        }
        .pg-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: var(--text-secondary);
          background: transparent;
          transition: all 0.25s ease;
          white-space: nowrap;
        }
        .pg-tab-btn:hover:not(.active) {
          color: var(--text-primary);
          background: var(--bg-glass);
        }
        .pg-tab-btn.active {
          color: white;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .pg-tab-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.6;
        }
        .pg-tab-btn.active .pg-tab-dot {
          opacity: 1;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.7; }
        }

        /* PANEL CONTENT */
        .pg-panel-area {
          padding: 0 32px 60px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* SKELETON */
        .pg-skeleton {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px;
        }
        .pg-skeleton-bar {
          background: linear-gradient(90deg, var(--bg-glass) 0%, rgba(255,255,255,0.08) 50%, var(--bg-glass) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* LOADING / ERROR */
        .pg-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
        }
        .pg-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--border);
          border-top-color: var(--accent-red);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pg-error {
          background: rgba(255,59,48,0.1);
          border: 1px solid rgba(255,59,48,0.3);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin: 32px;
        }

        /* BOTTOM BANNER */
        .pg-banner {
          background: linear-gradient(135deg, rgba(255,59,48,0.08) 0%, rgba(74,108,247,0.08) 100%);
          border-top: 1px solid var(--border);
          padding: 16px 32px;
          text-align: center;
          font-size: 12px;
          color: var(--text-dim);
        }

        /* COUNTER ANIMATION */
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pg-count-anim { animation: countUp 0.5s ease forwards; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .pg-hero { padding: 40px 16px 24px; }
          .pg-kpi-grid { padding: 0 16px 24px; grid-template-columns: repeat(2, 1fr); }
          .pg-tabs-wrapper { padding: 0 16px; }
          .pg-panel-area { padding: 0 16px 40px; }
          .pg-header { padding: 0 16px; }
        }
      `}</style>

      <div className="pg-root">
        {/* HEADER */}
        <header className="pg-header">
          <div className="pg-header-inner">
            <a href="/" className="pg-logo" aria-label="ParkGuard Home">
              <div className="pg-logo-icon">🛡️</div>
              <span className="pg-logo-text">ParkGuard</span>
              <span className="pg-logo-badge">ASTraM</span>
            </a>
            <div className="pg-header-spacer" />
            {data && (
              <span className="pg-date-badge">
                {data.summaryKPIs.dateRangeStart} → {data.summaryKPIs.dateRangeEnd}
              </span>
            )}
            <a href="/dashboard" className="pg-back-link">
              ← Sentinel
            </a>
          </div>
        </header>

        {/* HERO */}
        <section className="pg-hero">
          <div className="pg-hero-glow" />
          <p className="pg-hero-label">Smarter Enforcement, Together</p>
          <h1 className="pg-hero-title">
            Helping BTP enforce<br />
            <span>smarter every day.</span>
          </h1>
          <p className="pg-hero-subtitle">
            ParkGuard gives Bengaluru Traffic Police the intelligence to get more out of every deployment.
            Surface which devices need recalibration, focus patrol effort on the junctions that matter most,
            and direct escalation exactly where it will have the greatest impact.
          </p>
        </section>

        {/* KPI CARDS */}
        {loading ? (
          <div className="pg-kpi-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pg-kpi-card">
                <div className="pg-skeleton-bar" style={{ width: '50%', height: 14, marginBottom: 12 }} />
                <div className="pg-skeleton-bar" style={{ width: '70%', height: 36 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="pg-error">
            <p style={{ color: 'var(--critical)', fontWeight: 700, marginBottom: 8 }}>⚠ Data Load Failed</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 8 }}>Run: python ml_pipeline/generate_parkguard_data.py</p>
          </div>
        ) : data ? (
          <div className="pg-kpi-grid" ref={counterRef}>
            <KPICard
              label="Total Challans"
              value={data.summaryKPIs.totalChallans.toLocaleString()}
              sub="Nov 2023 – Apr 2024"
              icon="📋"
              animate={animCount}
            />
            <KPICard
              label="Review Rate"
              value={`${data.summaryKPIs.overallRejectionRate}%`}
              sub={`${data.summaryKPIs.totalRejected.toLocaleString()} challans reviewed out`}
              icon="🔍"
              trendClass="warn"
              trendLabel="Improvement opportunity"
              animate={animCount}
            />
            <KPICard
              label="Cameras to Recalibrate"
              value={data.summaryKPIs.criticalDevices.toString()}
              sub={`>${data.summaryKPIs.criticalThreshold}% review rate`}
              icon="🔧"
              trendClass="warn"
              trendLabel="Quick wins available"
              animate={animCount}
            />
            <KPICard
              label="Cameras to Review"
              value={data.summaryKPIs.warningDevices.toString()}
              sub={`>${data.summaryKPIs.warnThreshold.toFixed(0)}% review rate`}
              icon="📡"
              trendClass="warn"
              trendLabel="Schedule maintenance"
              animate={animCount}
            />
            <KPICard
              label="Priority Targets"
              value={data.summaryKPIs.repeatOffenders10Plus.toLocaleString()}
              sub="Vehicles: 10+ violations"
              icon="🎯"
              trendClass="warn"
              trendLabel="Focus patrol here"
              animate={animCount}
            />
            <KPICard
              label="Active Junctions"
              value={data.summaryKPIs.uniqueJunctions.toString()}
              sub="Named enforcement zones"
              icon="📍"
              animate={animCount}
            />
            <KPICard
              label="Total Devices"
              value={data.summaryKPIs.totalDevices.toLocaleString()}
              sub="Cameras/officers tracked"
              icon="📷"
              animate={animCount}
            />
            <KPICard
              label="Approved Challans"
              value={data.summaryKPIs.totalApproved.toLocaleString()}
              sub={`${(data.summaryKPIs.totalApproved / data.summaryKPIs.totalChallans * 100).toFixed(1)}% success rate`}
              icon="✅"
              trendClass="good"
              trendLabel="Valid enforcement"
              animate={animCount}
            />
          </div>
        ) : null}

        {/* TAB BAR */}
        {data && (
          <div className="pg-tabs-wrapper">
            <div className="pg-tabs" role="tablist">
              {[
                { id: 'reliability' as const, label: 'Device Reliability', icon: '📡', count: data.summaryKPIs.criticalDevices + data.summaryKPIs.warningDevices },
                { id: 'hotspots' as const, label: 'Hotspot Map', icon: '🗺️', count: data.junctionHotspots.length },
                { id: 'offenders' as const, label: 'Repeat Offenders', icon: '🚗', count: data.summaryKPIs.repeatOffenders10Plus },
              ].map(tab => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`pg-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                  style={activeTab === tab.id ? ACTIVE_TAB_STYLES[tab.id] : {}}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="pg-tab-dot" />
                  <span>{tab.icon} {tab.label}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    padding: '1px 5px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono)',
                  }}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PANEL CONTENT */}
        {data && (
          <div className="pg-panel-area" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'reliability' && <DeviceReliabilityPanel data={data} />}
            {activeTab === 'hotspots' && <HotspotMapPanel data={data} />}
            {activeTab === 'offenders' && <RepeatOffenderPanel data={data} />}
          </div>
        )}

        {loading && (
          <div className="pg-loading">
            <div className="pg-spinner" />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading enforcement intelligence…</p>
          </div>
        )}

        {/* BANNER */}
        <footer className="pg-banner">
          <p>ParkGuard · Built for Bengaluru Traffic Police (ASTraM) · Gridlock 2.0 · 298,450 records analysed · Smarter enforcement through data</p>
        </footer>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon, trendClass, trendLabel, animate
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  trendClass?: 'bad' | 'warn' | 'good';
  trendLabel?: string;
  animate?: boolean;
}) {
  return (
    <div className="pg-kpi-card">
      {icon && <span className="pg-kpi-icon">{icon}</span>}
      <div className="pg-kpi-label">{label}</div>
      <div className={`pg-kpi-value${animate ? ' pg-count-anim' : ''}`}>{value}</div>
      {sub && <div className="pg-kpi-sub">{sub}</div>}
      {trendClass && trendLabel && (
        <div className={`pg-kpi-trend ${trendClass}`}>
          {trendClass === 'bad' ? '↑' : trendClass === 'warn' ? '~' : '↓'} {trendLabel}
        </div>
      )}
    </div>
  );
}
