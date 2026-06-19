'use client';

import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell, LineChart, Line, Legend
} from 'recharts';
import type { ParkGuardData, DevicePoint } from '@/app/parkguard/page';

interface Props { data: ParkGuardData; }

const STATUS_COLORS = { critical: '#FF3B30', warning: '#FF9F0A', good: '#34C759' };
const STATUS_BG = { critical: 'rgba(255,59,48,0.1)', warning: 'rgba(255,159,10,0.1)', good: 'rgba(52,199,89,0.1)' };
const STATUS_BORDER = { critical: 'rgba(255,59,48,0.3)', warning: 'rgba(255,159,10,0.3)', good: 'rgba(52,199,89,0.3)' };

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: DevicePoint }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#0F1117',
      border: `1px solid ${STATUS_COLORS[d.status]}`,
      borderRadius: 12,
      padding: '12px 16px',
      fontSize: 13,
      fontFamily: 'Inter, sans-serif',
      boxShadow: `0 8px 32px ${STATUS_BG[d.status]}`
    }}>
      <div style={{ fontWeight: 700, color: '#F5F5F7', marginBottom: 6 }}>{d.deviceId}</div>
      <div style={{ color: '#9E9EA7', marginBottom: 2 }}>📍 {d.policeStation}</div>
      <div style={{ color: STATUS_COLORS[d.status], fontWeight: 600, marginBottom: 2 }}>
        ❌ Rejection: {d.rejectionRate}%
      </div>
      <div style={{ color: '#9E9EA7' }}>📋 Total challans: {d.total.toLocaleString()}</div>
      <div style={{ marginTop: 6, padding: '3px 8px', borderRadius: 5, background: STATUS_BG[d.status], color: STATUS_COLORS[d.status], fontWeight: 600, fontSize: 11, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {d.status}
      </div>
    </div>
  );
};

export default function DeviceReliabilityPanel({ data }: Props) {
  const [sortBy, setSortBy] = useState<'rejectionRate' | 'total' | 'reliabilityScore'>('rejectionRate');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'good'>('all');
  const [searchPS, setSearchPS] = useState('');
  const [leaderboardPage, setLeaderboardPage] = useState(0);

  const PAGE_SIZE = 15;

  const filteredDevices = useMemo(() => {
    let d = data.deviceMapData;
    if (filterStatus !== 'all') d = d.filter(x => x.status === filterStatus);
    if (searchPS) d = d.filter(x => x.policeStation.toLowerCase().includes(searchPS.toLowerCase()));
    return [...d].sort((a, b) => {
      if (sortBy === 'rejectionRate') return b.rejectionRate - a.rejectionRate;
      if (sortBy === 'total') return b.total - a.total;
      return b.reliabilityScore - a.reliabilityScore;
    });
  }, [data.deviceMapData, filterStatus, sortBy, searchPS]);

  const paginatedDevices = filteredDevices.slice(leaderboardPage * PAGE_SIZE, (leaderboardPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredDevices.length / PAGE_SIZE);

  const scatterData = data.deviceMapData.map(d => ({
    ...d,
    x: d.total,
    y: d.rejectionRate,
  }));

  const kpis = data.summaryKPIs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* INSIGHT BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,59,48,0.08) 0%, rgba(255,106,53,0.06) 100%)',
        border: '1px solid rgba(255,59,48,0.2)',
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, color: '#4A6CF7', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            📊 Device Health Snapshot
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F5F5F7', marginBottom: 6, letterSpacing: '-0.5px' }}>
            {kpis.criticalDevices + kpis.warningDevices} devices can be improved
          </div>
          <div style={{ fontSize: 14, color: '#9E9EA7', lineHeight: 1.6 }}>
            One camera has a <strong style={{ color: '#FF9F0A' }}>80.95% review-out rate</strong> — recalibrating it alone will save significant reviewer time
            and prevent valid challans from being lost. The fleet median is <strong style={{ color: '#34C759' }}>{kpis.medianRejectionRate}%</strong>.
            Devices above <strong style={{ color: '#FF9F0A' }}>{kpis.criticalThreshold.toFixed(1)}%</strong> are statistical outliers that maintenance can fix.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, minWidth: 300 }}>
          {(['critical', 'warning', 'good'] as const).map(s => {
            const count = s === 'critical' ? kpis.criticalDevices : s === 'warning' ? kpis.warningDevices : kpis.goodDevices;
            const label = s === 'critical' ? 'Recalibrate' : s === 'warning' ? 'Review' : 'Healthy';
            const desc = s === 'critical' ? `>${kpis.criticalThreshold.toFixed(0)}% review rate` : s === 'warning' ? `>${kpis.warnThreshold.toFixed(0)}% review rate` : 'Performing well';
            return (
              <div key={s} style={{
                background: STATUS_BG[s],
                border: `1px solid ${STATUS_BORDER[s]}`,
                borderRadius: 14,
                padding: '14px 16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_COLORS[s], fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[s], textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#5A5A6A', marginTop: 2 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* SCATTER: Volume vs Rejection Rate */}
        <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 4 }}>
              Volume vs. Rejection Rate
            </div>
            <div style={{ fontSize: 12, color: '#5A5A6A' }}>
              Top-right quadrant = high-volume, high-rejection cameras (worst offenders)
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Total Challans"
                tick={{ fill: '#5A5A6A', fontSize: 11 }}
                label={{ value: 'Total Challans', position: 'insideBottom', offset: -5, fill: '#5A5A6A', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Rejection Rate (%)"
                tick={{ fill: '#5A5A6A', fontSize: 11 }}
                label={{ value: 'Rejection %', angle: -90, position: 'insideLeft', fill: '#5A5A6A', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={kpis.criticalThreshold} stroke="#FF3B30" strokeDasharray="5 3" strokeOpacity={0.6} label={{ value: `Critical (${kpis.criticalThreshold.toFixed(0)}%)`, fill: '#FF3B30', fontSize: 10 }} />
              <ReferenceLine y={kpis.medianRejectionRate} stroke="#FF9F0A" strokeDasharray="5 3" strokeOpacity={0.5} label={{ value: `Median (${kpis.medianRejectionRate}%)`, fill: '#FF9F0A', fontSize: 10 }} />
              {(['critical', 'warning', 'good'] as const).map(status => (
                <Scatter
                  key={status}
                  data={scatterData.filter(d => d.status === status)}
                  fill={STATUS_COLORS[status]}
                  fillOpacity={0.75}
                  r={4}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* BAR: Distribution of rejection rates */}
        <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 4 }}>
              Rejection Rate Distribution
            </div>
            <div style={{ fontSize: 12, color: '#5A5A6A' }}>
              Device count per rejection rate bracket
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.deviceDistribution} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: '#5A5A6A', fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: '#5A5A6A', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#F5F5F7' }}
                formatter={(v: unknown) => [`${v} devices`, 'Count']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.deviceDistribution.map((entry, index) => {
                  const pct = parseInt(entry.range.split('-')[0]);
                  const color = pct >= 30 ? '#FF3B30' : pct >= 20 ? '#FF9F0A' : pct >= 10 ? '#FFD60A' : '#34C759';
                  return <Cell key={index} fill={color} fillOpacity={0.8} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MONTHLY + HOURLY CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 4 }}>Monthly Trend</div>
          <div style={{ fontSize: 12, color: '#5A5A6A', marginBottom: 16 }}>Challan volume + rejection rate over time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#5A5A6A', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#5A5A6A', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#5A5A6A', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#F5F5F7' }} />
              <Legend wrapperStyle={{ color: '#9E9EA7', fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="total" stroke="#4A6CF7" strokeWidth={2} dot={false} name="Total" />
              <Line yAxisId="left" type="monotone" dataKey="approved" stroke="#34C759" strokeWidth={2} dot={false} name="Approved" />
              <Line yAxisId="right" type="monotone" dataKey="rejectionRate" stroke="#FF3B30" strokeWidth={2} dot={false} name="Rej.Rate%" strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F7', marginBottom: 4 }}>Hour-of-Day Rejection Pattern</div>
          <div style={{ fontSize: 12, color: '#5A5A6A', marginBottom: 16 }}>Which hours have the worst false positive rate?</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourlyPattern}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#5A5A6A', fontSize: 9 }} interval={3} />
              <YAxis tick={{ fill: '#5A5A6A', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#F5F5F7' }}
                formatter={(v: unknown) => [`${v}%`, 'Rejection Rate']}
              />
              <Bar dataKey="rejectionRate" radius={[3, 3, 0, 0]}>
                {data.hourlyPattern.map((entry, i) => (
                  <Cell key={i} fill={entry.rejectionRate > 30 ? '#FF3B30' : entry.rejectionRate > 20 ? '#FF9F0A' : '#4A6CF7'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DEVICE LEADERBOARD */}
      <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F7' }}>Device Leaderboard</div>
            <div style={{ fontSize: 12, color: '#5A5A6A' }}>{filteredDevices.length} devices shown</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search station…"
              value={searchPS}
              onChange={e => { setSearchPS(e.target.value); setLeaderboardPage(0); }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '6px 12px',
                color: '#F5F5F7',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                width: 150,
              }}
            />
            {/* Filter */}
            {(['all', 'critical', 'warning', 'good'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setLeaderboardPage(0); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${filterStatus === s ? (s === 'all' ? '#4A6CF7' : STATUS_COLORS[s as 'critical' | 'warning' | 'good']) : 'rgba(255,255,255,0.08)'}`,
                  background: filterStatus === s ? (s === 'all' ? 'rgba(74,108,247,0.15)' : STATUS_BG[s as 'critical' | 'warning' | 'good']) : 'transparent',
                  color: filterStatus === s ? (s === 'all' ? '#4A6CF7' : STATUS_COLORS[s as 'critical' | 'warning' | 'good']) : '#9E9EA7',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {s}
              </button>
            ))}
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
                cursor: 'pointer'
              }}
            >
              <option value="rejectionRate" style={{ background: '#0F1117' }}>Sort: Rejection Rate</option>
              <option value="total" style={{ background: '#0F1117' }}>Sort: Volume</option>
              <option value="reliabilityScore" style={{ background: '#0F1117' }}>Sort: Reliability Score</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Rank', 'Device ID', 'Police Station', 'Total', 'Rejected', 'Rejection Rate', 'Reliability Score', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#5A5A6A', fontWeight: 600, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedDevices.map((device, idx) => {
                const rank = leaderboardPage * PAGE_SIZE + idx + 1;
                const action = device.status === 'critical' ? '🔧 Recalibrate' : device.status === 'warning' ? '👁 Review' : '✓ Monitor';
                const actionColor = device.status === 'critical' ? '#FF3B30' : device.status === 'warning' ? '#FF9F0A' : '#34C759';
                return (
                  <tr
                    key={device.deviceId}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', color: '#5A5A6A', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>#{rank}</td>
                    <td style={{ padding: '10px 12px', color: '#F5F5F7', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{device.deviceId}</td>
                    <td style={{ padding: '10px 12px', color: '#9E9EA7' }}>{device.policeStation}</td>
                    <td style={{ padding: '10px 12px', color: '#F5F5F7', fontFamily: 'JetBrains Mono, monospace' }}>{device.total.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#FF3B30', fontFamily: 'JetBrains Mono, monospace' }}>{device.rejected.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 60,
                          height: 6,
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(device.rejectionRate, 100)}%`,
                            height: '100%',
                            background: STATUS_COLORS[device.status],
                            borderRadius: 3
                          }} />
                        </div>
                        <span style={{ color: STATUS_COLORS[device.status], fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                          {device.rejectionRate}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 50,
                          height: 6,
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${device.reliabilityScore}%`,
                            height: '100%',
                            background: STATUS_COLORS[device.status],
                            borderRadius: 3
                          }} />
                        </div>
                        <span style={{ color: '#F5F5F7', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{device.reliabilityScore}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: STATUS_BG[device.status],
                        color: STATUS_COLORS[device.status],
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {device.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: actionColor, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{action}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setLeaderboardPage(p => Math.max(0, p - 1))}
              disabled={leaderboardPage === 0}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: leaderboardPage === 0 ? '#3A3A4A' : '#F5F5F7',
                cursor: leaderboardPage === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13
              }}
            >← Prev</button>
            <span style={{ color: '#9E9EA7', fontSize: 13 }}>Page {leaderboardPage + 1} of {totalPages}</span>
            <button
              onClick={() => setLeaderboardPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={leaderboardPage === totalPages - 1}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: leaderboardPage === totalPages - 1 ? '#3A3A4A' : '#F5F5F7',
                cursor: leaderboardPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13
              }}
            >Next →</button>
          </div>
        )}
      </div>

      {/* POLICE STATION EFFICIENCY */}
      <div style={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F7', marginBottom: 4 }}>Police Station Efficiency</div>
        <div style={{ fontSize: 12, color: '#5A5A6A', marginBottom: 20 }}>Volume vs. rejection rate by station — higher bars = more challans, redder = worse quality</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.policeStationMetrics.slice(0, 15)} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 140 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#5A5A6A', fontSize: 11 }} />
            <YAxis type="category" dataKey="policeStation" tick={{ fill: '#9E9EA7', fontSize: 11 }} width={135} />
            <Tooltip
              contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#F5F5F7', fontSize: 12 }}
              formatter={(v: unknown, name: unknown) => [(name === 'total' ? (v as number).toLocaleString() : `${v}%`), (name === 'total' ? 'Total Challans' : 'Rejection Rate')]}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.policeStationMetrics.slice(0, 15).map((entry, i) => {
                const color = entry.rejectionRate > 22 ? '#FF3B30' : entry.rejectionRate > 17 ? '#FF9F0A' : '#4A6CF7';
                return <Cell key={i} fill={color} fillOpacity={0.75} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
