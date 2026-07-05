/* ========================================
   AnalyticsPanel — Charts & visualizations
   ======================================== */

import { useState, useMemo } from 'react';
import './AnalyticsPanel.css';

function MiniChart({ data = [], color = 'var(--color-primary)', height = 60, label = '' }) {
  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;

  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${w},${height}`;

  return (
    <div className="mini-chart">
      <div className="mini-chart__header">
        <span className="mini-chart__label">{label}</span>
        <span className="mini-chart__value" style={{ color }}>
          {data[data.length - 1]?.toFixed?.(1) ?? data[data.length - 1]}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="mini-chart__svg">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${label})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Current value dot */}
        {data.length > 0 && (() => {
          const lastX = w;
          const lastY = height - ((data[data.length - 1] - min) / range) * (height - 8) - 4;
          return (
            <circle cx={lastX} cy={lastY} r="2.5" fill={color}>
              <animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })()}
      </svg>
    </div>
  );
}

function ActivityBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="activity-bar">
      <div className="activity-bar__header">
        <span className="activity-bar__label">{label}</span>
        <span className="activity-bar__value">{value}</span>
      </div>
      <div className="activity-bar__track">
        <div
          className="activity-bar__fill"
          style={{ width: `${pct}%`, background: color }}
        >
          <div className="activity-bar__glow" style={{ background: color }} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ analytics, analyticsHistory = [], zones = [] }) {
  const [activeTab, setActiveTab] = useState('overview');

  const peopleData = useMemo(
    () => analyticsHistory.map((h) => h.people_count),
    [analyticsHistory]
  );

  const fpsData = useMemo(
    () => analyticsHistory.map((h) => h.fps),
    [analyticsHistory]
  );

  const trackedCount = analytics?.tracked_ids?.length ?? 0;

  return (
    <div className="analytics-panel">
      <div className="analytics-panel__header">
        <div className="analytics-panel__title-row">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 14V6l4-4 4 4v8" />
            <rect x="5" y="9" width="4" height="5" />
            <path d="M10 14V4l4 4v6" />
          </svg>
          <h3 className="analytics-panel__title">Analytics</h3>
        </div>

        <div className="analytics-panel__tabs">
          {['overview', 'trends', 'zones'].map((tab) => (
            <button
              key={tab}
              className={`analytics-panel__tab ${activeTab === tab ? 'analytics-panel__tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-panel__body">
        {activeTab === 'overview' && (
          <div className="analytics-panel__overview">
            <div className="analytics-panel__summary-grid">
              <div className="analytics-summary-card">
                <div className="analytics-summary-card__icon analytics-summary-card__icon--primary">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="10" cy="6" r="3" />
                    <path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  </svg>
                </div>
                <div>
                  <span className="analytics-summary-card__label">Tracked Objects</span>
                  <span className="analytics-summary-card__value">{trackedCount}</span>
                </div>
              </div>

              <div className="analytics-summary-card">
                <div className="analytics-summary-card__icon analytics-summary-card__icon--warning">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 2L18 16H2L10 2Z" />
                    <path d="M10 7v4" />
                    <circle cx="10" cy="13.5" r="0.5" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <span className="analytics-summary-card__label">Zone Intrusions</span>
                  <span className="analytics-summary-card__value">{analytics?.zone_intrusions ?? 0}</span>
                </div>
              </div>

              <div className="analytics-summary-card">
                <div className={`analytics-summary-card__icon ${analytics?.crowd_detected ? 'analytics-summary-card__icon--danger' : 'analytics-summary-card__icon--success'}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="7" cy="6" r="2.5" />
                    <circle cx="13" cy="6" r="2.5" />
                    <path d="M2 16c0-2.8 2.2-5 5-5 1 0 2 .3 2.8.8" />
                    <path d="M18 16c0-2.8-2.2-5-5-5-1 0-2 .3-2.8.8" />
                  </svg>
                </div>
                <div>
                  <span className="analytics-summary-card__label">Crowd Status</span>
                  <span className={`analytics-summary-card__value ${analytics?.crowd_detected ? 'analytics-summary-card__value--danger' : 'analytics-summary-card__value--success'}`}>
                    {analytics?.crowd_detected ? 'DETECTED' : 'NORMAL'}
                  </span>
                </div>
              </div>

              <div className="analytics-summary-card">
                <div className="analytics-summary-card__icon analytics-summary-card__icon--info">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="14" height="14" rx="2" />
                    <path d="M3 8h14" />
                    <path d="M8 3v14" />
                  </svg>
                </div>
                <div>
                  <span className="analytics-summary-card__label">Active Zones</span>
                  <span className="analytics-summary-card__value">{zones.length}</span>
                </div>
              </div>
            </div>

            {/* Activity bars */}
            <div className="analytics-panel__activity">
              <h4 className="analytics-panel__section-title">Activity Overview</h4>
              <div className="analytics-panel__bars">
                <ActivityBar label="People Count" value={analytics?.people_count ?? 0} max={30} color="var(--color-primary)" />
                <ActivityBar label="Zone Intrusions" value={analytics?.zone_intrusions ?? 0} max={10} color="var(--color-danger)" />
                <ActivityBar label="Frame Rate" value={analytics?.fps ?? 0} max={60} color="var(--color-success)" />
                <ActivityBar label="Tracked IDs" value={trackedCount} max={30} color="var(--color-info)" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="analytics-panel__trends">
            <MiniChart data={peopleData} color="var(--color-primary)" label="People Count" height={70} />
            <MiniChart data={fpsData} color="var(--color-success)" label="Frame Rate" height={70} />
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="analytics-panel__zones-info">
            {zones.length === 0 ? (
              <div className="analytics-panel__no-zones">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                  <rect x="4" y="4" width="24" height="24" rx="3" strokeDasharray="4 2" />
                </svg>
                <p>No zones configured</p>
              </div>
            ) : (
              <div className="analytics-panel__zone-list">
                {zones.map((zone) => (
                  <div key={zone.id} className="zone-info-card">
                    <div className="zone-info-card__color" style={{ background: zone.color }} />
                    <div className="zone-info-card__details">
                      <span className="zone-info-card__name">{zone.name}</span>
                      <span className="zone-info-card__type">{zone.type}</span>
                    </div>
                    <span className="zone-info-card__points">{zone.points?.length ?? 0} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
