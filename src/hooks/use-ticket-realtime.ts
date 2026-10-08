"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { chimePlayer } from "@/lib/audio/chime";
import type { TicketRealtimeEvent } from "@/lib/realtime/events";

interface UseTicketRealtimeOptions {
  outletId: string;
  enabled?: boolean;
  enableSound?: boolean;
  onEvent?: (event: TicketRealtimeEvent) => void;
}

export function useTicketRealtime({
  outletId,
  enabled = true,
  enableSound = true,
  onEvent,
}: UseTicketRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastEvent, setLastEvent] = useState<TicketRealtimeEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    chimePlayer.setMuted(nextState);
    toast.info(
      nextState
        ? "Suara notifikasi antrean dinonaktifkan."
        : "Suara notifikasi antrean diaktifkan."
    );
  };

  useEffect(() => {
    if (!enabled || !outletId) {
      return;
    }

    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;

      try {
        const es = new EventSource(
          `/api/realtime/antrean?outletId=${encodeURIComponent(outletId)}`
        );
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isUnmounted) {
            setIsConnected(true);
          }
        };

        es.onmessage = (messageEvent) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(messageEvent.data) as TicketRealtimeEvent;

            // Abaikan heartbeat rutin
            if (
              data.type === "HEARTBEAT" ||
              data.type === ("CONNECTED" as unknown)
            ) {
              return;
            }

            setLastEvent(data);
            onEventRef.current?.(data);

            // Mainkan suara chime jika diizinkan
            if (enableSound && !isMuted) {
              if (data.type === "TICKET_CREATED") {
                chimePlayer.playNewTicketChime();
              } else if (
                data.type === "TICKET_STATUS_CHANGED" &&
                data.newStatus === "READY"
              ) {
                chimePlayer.playReadyChime();
              }
            }
          } catch {
            // parsing error ignored
          }
        };

        es.onerror = () => {
          if (!isUnmounted) {
            setIsConnected(false);
            es.close();
            // Reconnect setelah 4 detik
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 4000);
          }
        };
      } catch (err) {
        console.warn("[Realtime] Error connecting EventSource:", err);
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [outletId, enabled, enableSound, isMuted]);

  return {
    isConnected: Boolean(enabled && outletId && isConnected),
    lastEvent,
    isMuted,
    toggleMute,
  };
}
