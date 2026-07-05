/* ========================================
   StatsCard — Glassmorphism metric card
   ======================================== */

import { useState, useEffect, useRef } from 'react';
import './StatsCard.css';

export default function StatsCard({ icon, label, value, suffix = '', color = 'primary', trend, delay = 0 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current === value) return;
    setIsAnimating(true);

    const numValue = typeof value === 'number' ? value : parseFloat(value);
    const numPrev = typeof prevValueRef.current === 'number' ? prevValueRef.current : parseFloat(prevValueRef.current);

    if (!isNaN(numValue) && !isNaN(numPrev)) {
      // Animate number transition
      const diff = numValue - numPrev;
      const steps = 15;
      const stepDuration = 300 / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = numPrev + diff * eased;
        setDisplayValue(Number.isInteger(numValue) ? Math.round(current) : Math.round(current * 10) / 10);

        if (step >= steps) {
          clearInterval(timer);
          setDisplayValue(numValue);
          setIsAnimating(false);
        }
      }, stepDuration);

      prevValueRef.current = value;
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
      prevValueRef.current = value;
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [value]);

  const colorClass = `stats-card--${color}`;

  return (
    <div
      className={`stats-card ${colorClass} ${isAnimating ? 'stats-card--pulse' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stats-card__accent" />
      <div className="stats-card__icon">{icon}</div>
      <div className="stats-card__content">
        <span className="stats-card__label">{label}</span>
        <div className="stats-card__value-row">
          <span className={`stats-card__value ${isAnimating ? 'stats-card__value--animating' : ''}`}>
            {typeof displayValue === 'boolean' ? (displayValue ? 'YES' : 'NO') : displayValue}
          </span>
          {suffix && <span className="stats-card__suffix">{suffix}</span>}
          {trend !== undefined && trend !== null && (
            <span className={`stats-card__trend ${trend >= 0 ? 'stats-card__trend--up' : 'stats-card__trend--down'}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                {trend >= 0 ? (
                  <path d="M5 2L8 6H2L5 2Z" fill="currentColor" />
                ) : (
                  <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />
                )}
              </svg>
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>

      {/* Sparkline-style mini bar */}
      <div className="stats-card__spark">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="stats-card__spark-bar"
            style={{
              height: `${20 + Math.random() * 80}%`,
              opacity: 0.3 + (i / 8) * 0.7,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
