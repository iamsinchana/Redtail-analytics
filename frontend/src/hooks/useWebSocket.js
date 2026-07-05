/* ========================================
   REDTAIL ANALYTICS — WebSocket Hook
   Auto-reconnect with exponential backoff
   ======================================== */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE = 'ws://localhost:8000';

/**
 * Custom hook for WebSocket connections with auto-reconnect
 * @param {string} path - WebSocket endpoint path (e.g., '/ws/feed')
 * @param {object} options
 * @param {function} options.onMessage - Callback for incoming messages
 * @param {boolean} options.enabled - Whether to connect (default true)
 * @param {number} options.maxRetries - Maximum reconnection attempts (default 20)
 */
export function useWebSocket(path, { onMessage, enabled = true, maxRetries = 20 } = {}) {
  const [status, setStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const enabledRef = useRef(enabled);

  // Keep callback ref current
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const connect = useCallback(() => {
    if (!enabledRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(`${WS_BASE}${path}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.warn('[WS] Parse error:', err);
        }
      };

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        // Exponential backoff reconnect
        if (enabledRef.current && retriesRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
          retriesRef.current += 1;
          timeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      setStatus('error');
    }
  }, [path, maxRetries]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { status, send };
}

export default useWebSocket;
