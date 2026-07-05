/* ========================================
   REDTAIL ANALYTICS — REST API Service
   ======================================== */

const BASE_URL = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} failed:`, err.message);
    return null;
  }
}

export const api = {
  /** Health check */
  healthCheck() {
    return request('/api/health');
  },

  /** Get current analytics snapshot */
  getAnalytics() {
    return request('/api/analytics');
  },

  /** Get event log */
  getEvents() {
    return request('/api/events');
  },

  /** Get configured zones */
  getZones() {
    return request('/api/zones');
  },

  /** Create a new zone */
  createZone(zone) {
    return request('/api/zones', {
      method: 'POST',
      body: JSON.stringify(zone),
    });
  },

  /** Set video source */
  setVideoSource(source, path) {
    return request('/api/video/source', {
      method: 'POST',
      body: JSON.stringify({ source, path }),
    });
  },
};

export default api;
