/* ========================================
   EventLog — Real-time event feed
   ======================================== */

import { useEffect, useRef } from 'react';
import { formatRelativeTime, formatTime } from '../../utils/formatters.js';
import './EventLog.css';

function EventIcon({ type }) {
  switch (type) {
    case 'zone_intrusion':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="1" width="12" height="12" rx="2" />
          <path d="M5 5l4 4M9 5l-4 4" />
        </svg>
      );
    case 'crowd_alert':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 1L13 12H1L7 1Z" />
          <path d="M7 5v3" />
          <circle cx="7" cy="10" r="0.5" fill="currentColor" />
        </svg>
      );
    case 'crowd_cleared':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="7" r="6" />
          <path d="M4 7l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="4" r="2.5" />
          <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        </svg>
      );
  }
}

function severityClass(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'event-item--critical';
    case 'warning': return 'event-item--warning';
    case 'info': return 'event-item--info';
    default: return 'event-item--info';
  }
}

export default function EventLog({ events = [], onClear }) {
  const listRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  function handleScroll() {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 60;
  }

  return (
    <div className="event-log">
      <div className="event-log__header">
        <div className="event-log__title-row">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 8A6 6 0 11 2 8a6 6 0 0112 0z" />
            <path d="M8 4v4l3 1.5" />
          </svg>
          <h3 className="event-log__title">Event Log</h3>
          <span className="event-log__count">{events.length}</span>
        </div>
        {onClear && (
          <button className="event-log__clear-btn" onClick={onClear} title="Clear events">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4h10" />
              <path d="M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4" />
              <path d="M3 4l.7 8.1a1 1 0 001 .9h4.6a1 1 0 001-.9L11 4" />
            </svg>
          </button>
        )}
      </div>

      <div className="event-log__list" ref={listRef} onScroll={handleScroll}>
        {events.length === 0 ? (
          <div className="event-log__empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
              <circle cx="16" cy="16" r="12" />
              <path d="M16 10v6l4 2" />
            </svg>
            <p>No events recorded</p>
          </div>
        ) : (
          events.slice().reverse().map((event, i) => (
            <div
              key={event.id || i}
              className={`event-item ${severityClass(event.severity)}`}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              <div className="event-item__indicator" />
              <div className="event-item__icon">
                <EventIcon type={event.type} />
              </div>
              <div className="event-item__content">
                <p className="event-item__message">{event.message}</p>
                <div className="event-item__meta">
                  {event.zone_name && (
                    <span className="event-item__zone">{event.zone_name}</span>
                  )}
                  <span className="event-item__time" title={formatTime(event.timestamp)}>
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              </div>
              <span className={`event-item__severity-tag event-item__severity-tag--${event.severity}`}>
                {event.severity}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
