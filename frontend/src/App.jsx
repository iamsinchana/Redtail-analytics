/* ========================================
   REDTAIL ANALYTICS — Main App
   ======================================== */

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import LiveFeed from './components/LiveFeed/LiveFeed.jsx';
import StatsCard from './components/StatsCard/StatsCard.jsx';
import EventLog from './components/EventLog/EventLog.jsx';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel.jsx';
import ZoneConfig from './components/ZoneConfig/ZoneConfig.jsx';
import StatusBadge from './components/StatusBadge/StatusBadge.jsx';
import { useAnalytics } from './hooks/useAnalytics.js';
import { formatTime } from './utils/formatters.js';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    analytics,
    events,
    zones,
    frame,
    isDemo,
    backendStatus,
    analyticsHistory,
    addZone,
    clearEvents,
  } = useAnalytics();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isDemo={isDemo}
        backendStatus={backendStatus}
      />

      <main className="app__main">
        {/* ── Top Bar ── */}
        <header className="app__header">
          <div className="app__header-left">
            <h1 className="app__page-title">
              {activeView === 'dashboard' && 'Dashboard'}
              {activeView === 'analytics' && 'Analytics'}
              {activeView === 'zones' && 'Zone Management'}
              {activeView === 'events' && 'Event History'}
              {activeView === 'settings' && 'Settings'}
            </h1>
            <span className="app__header-time">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {formatTime(currentTime)}
            </span>
          </div>
          <div className="app__header-right">
            {isDemo && <StatusBadge status="demo" />}
            <StatusBadge status={backendStatus === 'online' ? 'connected' : 'offline'} label={backendStatus === 'online' ? 'BACKEND' : 'OFFLINE'} />
          </div>
        </header>

        {/* ── Stats Row ── */}
        {(activeView === 'dashboard' || activeView === 'analytics') && (
          <div className="app__stats-row">
            <StatsCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="6" r="3" />
                  <path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                </svg>
              }
              label="People Count"
              value={analytics.people_count}
              color="primary"
              delay={0}
            />
            <StatsCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="6" r="2.5" />
                  <circle cx="13" cy="6" r="2.5" />
                  <path d="M2 16c0-2.8 2.2-5 5-5s5 2.2 5 5" />
                  <path d="M11 16c0-2.8 2.2-5 5-5" />
                </svg>
              }
              label="Crowd Alert"
              value={analytics.crowd_detected}
              color={analytics.crowd_detected ? 'danger' : 'success'}
              delay={80}
            />
            <StatsCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 2L18 16H2L10 2Z" />
                  <path d="M10 7v4" />
                  <circle cx="10" cy="13.5" r="0.5" fill="currentColor" />
                </svg>
              }
              label="Zone Intrusions"
              value={analytics.zone_intrusions}
              color={analytics.zone_intrusions > 0 ? 'warning' : 'success'}
              delay={160}
            />
            <StatsCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="14" height="14" rx="2" />
                  <path d="M7 10l2 2 4-4" />
                </svg>
              }
              label="Frame Rate"
              value={analytics.fps}
              suffix="FPS"
              color="info"
              delay={240}
            />
          </div>
        )}

        {/* ── Dashboard View ── */}
        {activeView === 'dashboard' && (
          <div className="app__dashboard-grid">
            <div className="app__feed-area">
              <LiveFeed
                frame={frame}
                isDemo={isDemo}
                analytics={analytics}
                backendStatus={backendStatus}
              />
            </div>
            <div className="app__events-area">
              <EventLog events={events} onClear={clearEvents} />
            </div>
            <div className="app__analytics-area">
              <AnalyticsPanel
                analytics={analytics}
                analyticsHistory={analyticsHistory}
                zones={zones}
              />
            </div>
            <div className="app__zones-area">
              <ZoneConfig zones={zones} onAddZone={addZone} />
            </div>
          </div>
        )}

        {/* ── Analytics View ── */}
        {activeView === 'analytics' && (
          <div className="app__full-panel">
            <AnalyticsPanel
              analytics={analytics}
              analyticsHistory={analyticsHistory}
              zones={zones}
            />
          </div>
        )}

        {/* ── Zones View ── */}
        {activeView === 'zones' && (
          <div className="app__full-panel">
            <ZoneConfig zones={zones} onAddZone={addZone} />
          </div>
        )}

        {/* ── Events View ── */}
        {activeView === 'events' && (
          <div className="app__full-panel">
            <EventLog events={events} onClear={clearEvents} />
          </div>
        )}

        {/* ── Settings View ── */}
        {activeView === 'settings' && (
          <div className="app__settings">
            <div className="settings-card">
              <div className="settings-card__header">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="3" width="14" height="11" rx="2" />
                  <polygon points="16,7 20,5 20,14 16,12" transform="scale(0.8)" />
                </svg>
                <h3>Video Source</h3>
              </div>
              <p className="settings-card__desc">
                Configure the video input source for real-time monitoring.
              </p>
              <div className="settings-card__options">
                {['webcam', 'file', 'rtsp'].map((src) => (
                  <button key={src} className="settings-card__option-btn">
                    <span className="settings-card__option-label">{src.toUpperCase()}</span>
                    <span className="settings-card__option-desc">
                      {src === 'webcam' && 'Use device camera'}
                      {src === 'file' && 'Upload video file'}
                      {src === 'rtsp' && 'RTSP stream URL'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card__header">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="9" cy="9" r="7" />
                  <path d="M9 5v4l2.5 1.5" />
                </svg>
                <h3>System Status</h3>
              </div>
              <div className="settings-card__status-list">
                <div className="settings-card__status-item">
                  <span>Backend Server</span>
                  <StatusBadge status={backendStatus === 'online' ? 'online' : 'offline'} />
                </div>
                <div className="settings-card__status-item">
                  <span>Mode</span>
                  <StatusBadge status={isDemo ? 'demo' : 'connected'} label={isDemo ? 'DEMO' : 'LIVE'} />
                </div>
                <div className="settings-card__status-item">
                  <span>Active Zones</span>
                  <span className="settings-card__status-value">{zones.length}</span>
                </div>
                <div className="settings-card__status-item">
                  <span>Total Events</span>
                  <span className="settings-card__status-value">{events.length}</span>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card__header">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="9" cy="9" r="7" />
                  <path d="M9 6v3" />
                  <circle cx="9" cy="12" r="0.5" fill="currentColor" />
                </svg>
                <h3>About</h3>
              </div>
              <p className="settings-card__desc">
                <strong>Redtail Analytics</strong> — Real-Time Video Intelligence Platform<br />
                Version 1.0.0<br /><br />
                AI-powered video analytics for security monitoring, crowd detection, and zone management.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
