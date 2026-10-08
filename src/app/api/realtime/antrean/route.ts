import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { type TicketRealtimeEvent, realtimeHub } from "@/lib/realtime/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");

  if (!outletId) {
    return new Response(
      JSON.stringify({ error: "Parameter outletId wajib disertakan." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validasi sesi pengguna
  const user = await getCurrentUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Sesi tidak terautentikasi." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Buat ReadableStream SSE
  const encoder = new TextEncoder();
  let cleanupSubscriber: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Kirim pesan inisiasi koneksi SSE
      const initPayload = `data: ${JSON.stringify({
        type: "CONNECTED",
        outletId,
        timestamp: new Date().toISOString(),
        message: "Koneksi Live SSE Antrean Aktif",
      })}\n\n`;
      controller.enqueue(encoder.encode(initPayload));

      // 2. Langganan event broadcast untuk outletId ini
      cleanupSubscriber = realtimeHub.subscribe(
        outletId,
        (event: TicketRealtimeEvent) => {
          try {
            const chunk = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          } catch (err) {
            console.warn("[SSE] Controller enqueue error:", err);
          }
        }
      );

      // 3. Heartbeat keep-alive setiap 15 detik
      heartbeatTimer = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({
            type: "HEARTBEAT",
            outletId,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          // ignore closed stream
        }
      }, 15000);
    },
    cancel() {
      if (cleanupSubscriber) cleanupSubscriber();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  // Saat client menutup koneksi HTTP (tab ditutup atau navigasi)
  req.signal.addEventListener("abort", () => {
    if (cleanupSubscriber) cleanupSubscriber();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
