/* ========================================
   StatusBadge — Pulsing status indicator
   ======================================== */

import './StatusBadge.css';

export default function StatusBadge({ status = 'offline', label, size = 'sm' }) {
  const statusMap = {
    live: { color: 'danger', text: label || 'LIVE' },
    connected: { color: 'success', text: label || 'CONNECTED' },
    connecting: { color: 'warning', text: label || 'CONNECTING' },
    alert: { color: 'danger', text: label || 'ALERT' },
    demo: { color: 'warning', text: label || 'DEMO MODE' },
    offline: { color: 'muted', text: label || 'OFFLINE' },
    online: { color: 'success', text: label || 'ONLINE' },
  };

  const config = statusMap[status] || statusMap.offline;

  return (
    <span className={`status-badge status-badge--${config.color} status-badge--${size}`}>
      <span className="status-badge__dot" />
      <span className="status-badge__label">{config.text}</span>
    </span>
  );
}
