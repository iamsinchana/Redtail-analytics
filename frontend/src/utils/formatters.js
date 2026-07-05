/* ========================================
   REDTAIL ANALYTICS — Utility Formatters
   ======================================== */

/**
 * Format a timestamp to a relative time string (e.g., "2m ago")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = Math.max(0, now - time);

  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format a timestamp to a time string (HH:MM:SS)
 */
export function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format a number with commas and optional decimal places
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '—';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Clamp a number to a range
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random number in a range
 */
export function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Severity to color mapping
 */
export function severityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'var(--color-danger)';
    case 'warning': return 'var(--color-warning)';
    case 'info': return 'var(--color-info)';
    default: return 'var(--text-secondary)';
  }
}

/**
 * Severity to background glow
 */
export function severityGlow(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'var(--color-danger-glow)';
    case 'warning': return 'var(--color-warning-glow)';
    case 'info': return 'var(--color-info-glow)';
    default: return 'transparent';
  }
}
