'use client';

import { useEffect, useRef } from 'react';

const HEARTBEAT_MS = 20_000;

type StartResponse = { sessionId?: string };

export function LabTimeTracker({ day }: { day: number }) {
  const sessionId = useRef<string | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    const controller = new AbortController();
    let interval: ReturnType<typeof setInterval> | null = null;

    const post = async (payload: Record<string, unknown>, keepalive = false) => {
      const response = await fetch('/api/lab-time', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        credentials: 'same-origin',
        keepalive,
        signal: keepalive ? undefined : controller.signal,
      });
      if (!response.ok) throw new Error('Lab timer request failed');
      return response.json() as Promise<StartResponse>;
    };

    const heartbeat = () => {
      if (!sessionId.current || stopped.current) return;
      void post({ action: 'heartbeat', sessionId: sessionId.current }).catch(() => undefined);
    };

    const pause = () => {
      if (!sessionId.current || stopped.current) return;
      stopped.current = true;
      const payload = JSON.stringify({ action: 'pause', sessionId: sessionId.current });
      try {
        const queued = navigator.sendBeacon('/api/lab-time', new Blob([payload], { type: 'application/json' }));
        if (!queued) void post({ action: 'pause', sessionId: sessionId.current }, true).catch(() => undefined);
      } catch {
        void post({ action: 'pause', sessionId: sessionId.current }, true).catch(() => undefined);
      }
    };

    void post({ action: 'start', day })
      .then((data) => {
        if (!data.sessionId) return;
        sessionId.current = data.sessionId;
        if (stopped.current) {
          stopped.current = false;
          pause();
          return;
        }
        interval = setInterval(heartbeat, HEARTBEAT_MS);
      })
      .catch(() => undefined);

    window.addEventListener('pagehide', pause);

    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
      window.removeEventListener('pagehide', pause);
      pause();
    };
  }, [day]);

  return null;
}
