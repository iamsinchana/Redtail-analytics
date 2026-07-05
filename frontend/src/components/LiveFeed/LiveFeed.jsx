/* ========================================
   LiveFeed — Real-time video feed display
   ======================================== */

import { useState } from 'react';
import StatusBadge from '../StatusBadge/StatusBadge.jsx';
import './LiveFeed.css';

export default function LiveFeed({ frame, isDemo, analytics, backendStatus }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasFrame = !!frame;
  const isConnected = backendStatus === 'online' && hasFrame;

  return (
    <div className={`live-feed ${isFullscreen ? 'live-feed--fullscreen' : ''}`}>
      {/* ── Header ── */}
      <div className="live-feed__header">
        <div className="live-feed__title-row">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="14" height="11" rx="2" />
            <path d="M6 17h6" />
            <path d="M9 14v3" />
          </svg>
          <h3 className="live-feed__title">Live Feed</h3>
          <StatusBadge status={isConnected ? 'live' : isDemo ? 'demo' : 'offline'} />
        </div>
        <div className="live-feed__actions">
          <button
            className="live-feed__action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen ? (
                <>
                  <polyline points="5,1 5,5 1,5" />
                  <polyline points="11,15 11,11 15,11" />
                  <polyline points="15,5 11,5 11,1" />
                  <polyline points="1,11 5,11 5,15" />
                </>
              ) : (
                <>
                  <polyline points="1,5 1,1 5,1" />
                  <polyline points="15,11 15,15 11,15" />
                  <polyline points="11,1 15,1 15,5" />
                  <polyline points="5,15 1,15 1,11" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Video Area ── */}
      <div className="live-feed__viewport">
        {hasFrame ? (
          <img
            className="live-feed__frame"
            src={frame}
            alt="Live video feed"
            draggable={false}
          />
        ) : (
          /* No Feed Fallback */
          <div className="live-feed__no-feed">
            <div className="live-feed__no-feed-visual">
              <div className="live-feed__orbit-ring live-feed__orbit-ring--1" />
              <div className="live-feed__orbit-ring live-feed__orbit-ring--2" />
              <div className="live-feed__orbit-ring live-feed__orbit-ring--3" />
              <div className="live-feed__camera-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="10" width="28" height="22" rx="3" />
                  <polygon points="34,18 44,13 44,35 34,30" />
                  <circle cx="20" cy="21" r="5" />
                </svg>
              </div>
            </div>
            <h4 className="live-feed__no-feed-title">
              {isDemo ? 'Demo Mode Active' : 'No Video Feed'}
            </h4>
            <p className="live-feed__no-feed-text">
              {isDemo
                ? 'Analytics are simulated. Connect a backend for live video.'
                : 'Connect a video source to begin monitoring.'
              }
            </p>
            {isDemo && (
              <div className="live-feed__demo-grid">
                <div className="live-feed__demo-cell live-feed__demo-cell--1" />
                <div className="live-feed__demo-cell live-feed__demo-cell--2" />
                <div className="live-feed__demo-cell live-feed__demo-cell--3" />
                <div className="live-feed__demo-cell live-feed__demo-cell--4" />
                <div className="live-feed__demo-cell live-feed__demo-cell--5" />
                <div className="live-feed__demo-cell live-feed__demo-cell--6" />
              </div>
            )}
          </div>
        )}

        {/* ── Overlay Stats ── */}
        <div className="live-feed__overlay">
          <div className="live-feed__overlay-top">
            {(isConnected || isDemo) && (
              <div className="live-feed__live-dot">
                <span className="live-feed__live-pulse" />
                <span className="live-feed__live-text">
                  {isDemo ? 'DEMO' : 'REC'}
                </span>
              </div>
            )}
            <span className="live-feed__timestamp">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
          <div className="live-feed__overlay-bottom">
            <div className="live-feed__badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="4" r="2.5" />
                <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" />
              </svg>
              <span>{analytics?.people_count ?? 0}</span>
            </div>
            {analytics?.crowd_detected && (
              <div className="live-feed__badge live-feed__badge--alert">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 1L13 12H1L7 1Z" />
                  <path d="M7 5v3" />
                  <circle cx="7" cy="10" r="0.5" fill="currentColor" />
                </svg>
                <span>CROWD</span>
              </div>
            )}
            <div className="live-feed__badge">
              <span>{analytics?.fps ?? 0} FPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
