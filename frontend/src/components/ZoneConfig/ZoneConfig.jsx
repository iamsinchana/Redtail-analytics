/* ========================================
   ZoneConfig — Zone management panel
   ======================================== */

import { useState } from 'react';
import './ZoneConfig.css';

const ZONE_COLORS = [
  '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
];

export default function ZoneConfig({ zones = [], onAddZone }) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'counting',
    color: ZONE_COLORS[0],
    pointsStr: '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    // Parse points string: "100,100 400,100 400,350 100,350"
    let points;
    try {
      const str = form.pointsStr.trim();
      if (str) {
        points = str.split(/\s+/).map((p) => {
          const [x, y] = p.split(',').map(Number);
          return [x, y];
        });
      } else {
        // Default rectangle
        points = [[50,50],[300,50],[300,250],[50,250]];
      }
    } catch {
      points = [[50,50],[300,50],[300,250],[50,250]];
    }

    onAddZone?.({
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      points,
    });

    setForm({ name: '', type: 'counting', color: ZONE_COLORS[0], pointsStr: '' });
    setIsAdding(false);
  }

  return (
    <div className="zone-config">
      <div className="zone-config__header">
        <div className="zone-config__title-row">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="2,2 14,2 14,14 2,14" strokeDasharray="4 2" />
            <rect x="5" y="5" width="6" height="6" rx="1" />
          </svg>
          <h3 className="zone-config__title">Zone Configuration</h3>
          <span className="zone-config__count">{zones.length}</span>
        </div>
        <button
          className="zone-config__add-btn"
          onClick={() => setIsAdding(!isAdding)}
          title={isAdding ? 'Cancel' : 'Add zone'}
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }}
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
      </div>

      {/* ── Add Zone Form ── */}
      {isAdding && (
        <form className="zone-config__form" onSubmit={handleSubmit}>
          <div className="zone-config__field">
            <label className="zone-config__label">Zone Name</label>
            <input
              className="zone-config__input"
              type="text"
              placeholder="e.g. Entrance Gate"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="zone-config__field-row">
            <div className="zone-config__field">
              <label className="zone-config__label">Type</label>
              <select
                className="zone-config__select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="counting">Counting</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div className="zone-config__field">
              <label className="zone-config__label">Color</label>
              <div className="zone-config__colors">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`zone-config__color-btn ${form.color === c ? 'zone-config__color-btn--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="zone-config__field">
            <label className="zone-config__label">Points <span className="zone-config__hint">(x,y pairs, space-separated)</span></label>
            <input
              className="zone-config__input"
              type="text"
              placeholder="100,100 400,100 400,350 100,350"
              value={form.pointsStr}
              onChange={(e) => setForm({ ...form, pointsStr: e.target.value })}
            />
          </div>

          <button type="submit" className="zone-config__submit-btn" disabled={!form.name.trim()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 7l3 3 5-5" />
            </svg>
            Create Zone
          </button>
        </form>
      )}

      {/* ── Zone List ── */}
      <div className="zone-config__list">
        {zones.length === 0 && !isAdding ? (
          <div className="zone-config__empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <rect x="5" y="5" width="30" height="30" rx="4" strokeDasharray="5 3" />
              <path d="M15 20h10M20 15v10" />
            </svg>
            <p>No zones configured yet</p>
            <p className="zone-config__empty-hint">Click + to add a monitoring zone</p>
          </div>
        ) : (
          zones.map((zone, i) => (
            <div
              key={zone.id}
              className="zone-config__zone-card"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="zone-config__zone-color" style={{ background: zone.color }}>
                <div className="zone-config__zone-color-glow" style={{ background: zone.color }} />
              </div>
              <div className="zone-config__zone-info">
                <span className="zone-config__zone-name">{zone.name}</span>
                <div className="zone-config__zone-meta">
                  <span className={`zone-config__zone-type zone-config__zone-type--${zone.type}`}>
                    {zone.type}
                  </span>
                  <span className="zone-config__zone-points">{zone.points?.length ?? 0} points</span>
                </div>
              </div>
              {/* Mini zone preview */}
              <div className="zone-config__zone-preview">
                <svg viewBox="0 0 80 50" className="zone-config__zone-preview-svg">
                  {zone.points?.length >= 3 && (
                    <polygon
                      points={zone.points.map(([x, y]) => {
                        const scaleX = 80 / 640;
                        const scaleY = 50 / 480;
                        return `${x * scaleX},${y * scaleY}`;
                      }).join(' ')}
                      fill={zone.color}
                      fillOpacity="0.15"
                      stroke={zone.color}
                      strokeWidth="1"
                      strokeOpacity="0.6"
                    />
                  )}
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
