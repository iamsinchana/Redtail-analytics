/* ========================================
   Sidebar — Navigation sidebar with branding
   ======================================== */

import { useState } from 'react';
import StatusBadge from '../StatusBadge/StatusBadge.jsx';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="8" rx="1.5" />
        <rect x="11" y="2" width="7" height="5" rx="1.5" />
        <rect x="2" y="12" width="7" height="6" rx="1.5" />
        <rect x="11" y="9" width="7" height="9" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,16 6,10 10,13 14,6 18,9" />
        <circle cx="6" cy="10" r="1.5" fill="currentColor" />
        <circle cx="10" cy="13" r="1.5" fill="currentColor" />
        <circle cx="14" cy="6" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'zones',
    label: 'Zones',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3,3 17,3 17,17 3,17" strokeDasharray="4 2" />
        <rect x="6" y="6" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Events',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L12 7H18L13 10.5L15 16L10 12.5L5 16L7 10.5L2 7H8L10 2Z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeView, onViewChange, isDemo, backendStatus }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* ── Brand ── */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <path d="M16 3L28 9V23L16 29L4 23V9L16 3Z" stroke="url(#logo-grad)" strokeWidth="2" fill="none" />
            <path d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z" fill="url(#logo-grad)" opacity="0.3" />
            <circle cx="16" cy="15" r="3" fill="url(#logo-grad)" />
          </svg>
        </div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">
              <span className="sidebar__brand-red">RED</span>TAIL
            </span>
            <span className="sidebar__brand-sub">ANALYTICS</span>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${activeView === item.id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
            {activeView === item.id && <span className="sidebar__nav-indicator" />}
          </button>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar__footer">
        {!collapsed && (
          <div className="sidebar__status">
            <StatusBadge status={backendStatus === 'online' ? 'online' : isDemo ? 'demo' : 'offline'} />
          </div>
        )}
        <button
          className="sidebar__collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
            <polyline points="11,4 6,9 11,14" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
