/* ========================================
   REDTAIL ANALYTICS — Analytics State Hook
   Manages real-time analytics + demo mode
   ======================================== */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { api } from '../services/api';
import { randomInRange } from '../utils/formatters';

// Demo data generators
function generateDemoAnalytics(prev) {
  const peopleCount = Math.max(0, Math.round((prev?.people_count ?? 8) + randomInRange(-2, 2)));
  const fps = Math.round(randomInRange(24, 32) * 10) / 10;
  const crowdThreshold = 15;

  return {
    people_count: peopleCount,
    crowd_detected: peopleCount >= crowdThreshold,
    zone_intrusions: Math.max(0, Math.round((prev?.zone_intrusions ?? 2) + randomInRange(-1, 1))),
    fps,
    tracked_ids: Array.from({ length: peopleCount }, (_, i) => i + 1),
    timestamp: new Date().toISOString(),
  };
}

const DEMO_EVENT_TYPES = [
  { type: 'person_detected', message: 'Person detected in Zone A', severity: 'info', zone_name: 'Zone A' },
  { type: 'crowd_alert', message: 'Crowd threshold exceeded — 16 people detected', severity: 'warning', zone_name: 'Main Area' },
  { type: 'zone_intrusion', message: 'Unauthorized entry in Restricted Zone B', severity: 'critical', zone_name: 'Zone B' },
  { type: 'person_detected', message: 'New person entered counting zone', severity: 'info', zone_name: 'Entrance' },
  { type: 'crowd_cleared', message: 'Crowd density returned to normal levels', severity: 'info', zone_name: 'Main Area' },
  { type: 'zone_intrusion', message: 'Movement detected in restricted area', severity: 'critical', zone_name: 'Server Room' },
  { type: 'person_detected', message: 'Person detected near exit point', severity: 'info', zone_name: 'Exit' },
  { type: 'crowd_alert', message: 'High occupancy warning — approaching capacity', severity: 'warning', zone_name: 'Lobby' },
];

const DEMO_ZONES = [
  { id: '1', name: 'Main Entrance', points: [[100,100],[400,100],[400,350],[100,350]], type: 'counting', color: '#6366f1' },
  { id: '2', name: 'Restricted Area', points: [[450,80],[640,80],[640,280],[450,280]], type: 'restricted', color: '#ef4444' },
  { id: '3', name: 'Lobby Zone', points: [[50,370],[350,370],[350,460],[50,460]], type: 'counting', color: '#10b981' },
];

let demoEventId = 100;

function generateDemoEvent() {
  const template = DEMO_EVENT_TYPES[Math.floor(Math.random() * DEMO_EVENT_TYPES.length)];
  return {
    ...template,
    id: String(demoEventId++),
    timestamp: new Date().toISOString(),
  };
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState({
    people_count: 0,
    crowd_detected: false,
    zone_intrusions: 0,
    fps: 0,
    tracked_ids: [],
    timestamp: null,
  });

  const [events, setEvents] = useState([]);
  const [zones, setZones] = useState([]);
  const [frame, setFrame] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [analyticsHistory, setAnalyticsHistory] = useState([]);

  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  // Check backend health
  useEffect(() => {
    let mounted = true;
    async function check() {
      const result = await api.healthCheck();
      if (!mounted) return;
      if (result) {
        setBackendStatus('online');
        setIsDemo(false);
        // Load initial data
        const [evts, zns] = await Promise.all([api.getEvents(), api.getZones()]);
        if (evts) setEvents(evts);
        if (zns) setZones(zns);
      } else {
        setBackendStatus('offline');
        setIsDemo(true);
        setZones(DEMO_ZONES);
        // Generate initial demo events
        const initialEvents = Array.from({ length: 8 }, () => {
          const evt = generateDemoEvent();
          evt.timestamp = new Date(Date.now() - Math.random() * 600000).toISOString();
          return evt;
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setEvents(initialEvents);
      }
    }
    check();
    const interval = setInterval(check, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // WebSocket for analytics data
  const handleAnalyticsMessage = useCallback((data) => {
    setAnalytics({
      people_count: data.people_count ?? 0,
      crowd_detected: data.crowd_detected ?? false,
      zone_intrusions: data.zone_intrusions ?? 0,
      fps: data.fps ?? 0,
      tracked_ids: data.tracked_ids ?? [],
      timestamp: data.timestamp ?? new Date().toISOString(),
    });

    if (data.events?.length) {
      setEvents((prev) => [...prev, ...data.events].slice(-200));
    }

    setAnalyticsHistory((prev) => [
      ...prev,
      { people_count: data.people_count ?? 0, fps: data.fps ?? 0, time: Date.now() },
    ].slice(-60));
  }, []);

  const handleFeedMessage = useCallback((data) => {
    if (data.frame) {
      setFrame(`data:image/jpeg;base64,${data.frame}`);
    }
  }, []);

  useWebSocket('/ws/analytics', {
    onMessage: handleAnalyticsMessage,
    enabled: backendStatus === 'online',
  });

  useWebSocket('/ws/feed', {
    onMessage: handleFeedMessage,
    enabled: backendStatus === 'online',
  });

  // Demo mode: simulate updates
  useEffect(() => {
    if (!isDemo) return;

    const analyticsInterval = setInterval(() => {
      setAnalytics((prev) => {
        const next = generateDemoAnalytics(prev);
        setAnalyticsHistory((hist) => [
          ...hist,
          { people_count: next.people_count, fps: next.fps, time: Date.now() },
        ].slice(-60));
        return next;
      });
    }, 1500);

    const eventInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        const evt = generateDemoEvent();
        setEvents((prev) => [...prev, evt].slice(-200));
      }
    }, 4000);

    return () => {
      clearInterval(analyticsInterval);
      clearInterval(eventInterval);
    };
  }, [isDemo]);

  const addZone = useCallback(async (zone) => {
    if (isDemo) {
      const newZone = { ...zone, id: String(Date.now()) };
      setZones((prev) => [...prev, newZone]);
      return newZone;
    }
    const result = await api.createZone(zone);
    if (result) {
      setZones((prev) => [...prev, result]);
    }
    return result;
  }, [isDemo]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    analytics,
    events,
    zones,
    frame,
    isDemo,
    backendStatus,
    analyticsHistory,
    addZone,
    clearEvents,
  };
}

export default useAnalytics;
