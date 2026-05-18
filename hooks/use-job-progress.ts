"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import type { JobProgressEvent } from "@/types/api";

/**
 * Subscribes to the backend SSE stream for an AI generation job.
 * Returns the latest progress frame plus a connection status.
 * Reconnects automatically on drop until the job hits a terminal state.
 */
export function useJobProgress(jobId: string | null): {
  progress: JobProgressEvent | null;
  connected: boolean;
  error: string | null;
} {
  const [progress, setProgress] = useState<JobProgressEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let es: EventSource | null = null;

    const connect = async () => {
      const session = await getSession();
      const token = session?.user?.accessToken;
      if (!token) {
        setError("Not authenticated");
        return;
      }
      const base = process.env.NEXT_PUBLIC_API_URL;
      // SSE doesn't support custom headers in the browser — append token as a
      // query param and have the backend verify it as an alternative source.
      const url = `${base}/admin/ai-generation/jobs/${jobId}/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);

      es.onopen = () => {
        if (!cancelled) setConnected(true);
      };
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as JobProgressEvent;
          if (!cancelled) setProgress(parsed);
          const terminal = ["completed", "failed", "cancelled"] as const;
          if (terminal.includes(parsed.status as (typeof terminal)[number])) {
            es?.close();
            setConnected(false);
          }
        } catch {
          // ignore malformed frame
        }
      };
      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        setError("Connection lost — retrying");
      };
    };

    connect();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [jobId]);

  return { progress, connected, error };
}
