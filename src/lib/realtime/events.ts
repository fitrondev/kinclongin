import { EventEmitter } from "events";

export type TicketEventType =
  | "TICKET_CREATED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_COMPLETED"
  | "TICKET_PAID"
  | "TICKET_VOIDED"
  | "WASHER_ASSIGNED"
  | "HEARTBEAT"
  | "CDS_IDLE"
  | "CDS_CART_UPDATED"
  | "CDS_QRIS_DISPLAY"
  | "CDS_PAYMENT_SUCCESS";

export interface CdsCartItem {
  name: string;
  quantity: number;
  price: number;
}

export interface CdsPayload {
  customerName?: string;
  licensePlate?: string;
  items?: CdsCartItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  totalAmount?: number;
  paymentMethod?: string;
  qrisUrl?: string;
}

export interface TicketRealtimeEvent {
  type: TicketEventType;
  outletId: string;
  ticketId?: string;
  ticketNumber?: string;
  licensePlate?: string;
  newStatus?: string;
  timestamp: string;
  message?: string;
  payload?: CdsPayload;
}

type RealtimeListener = (event: TicketRealtimeEvent) => void;

class RealtimeHub {
  private emitter = new EventEmitter();

  constructor() {
    // Naikkan max listeners agar mendukung banyak kasir dan tablet
    this.emitter.setMaxListeners(100);
  }

  public subscribe(outletId: string, listener: RealtimeListener): () => void {
    const channel = `outlet:${outletId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  public broadcast(event: TicketRealtimeEvent): void {
    const channel = `outlet:${event.outletId}`;
    this.emitter.emit(channel, event);
  }
}

// Global singleton pattern untuk mencegah reset saat HMR Next.js
const globalForRealtime = globalThis as unknown as {
  realtimeHub?: RealtimeHub;
};

export const realtimeHub = globalForRealtime.realtimeHub ?? new RealtimeHub();

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.realtimeHub = realtimeHub;
}

export function broadcastTicketEvent(event: TicketRealtimeEvent): void {
  try {
    realtimeHub.broadcast(event);
  } catch (err) {
    console.error("[Realtime] Gagal broadcast event:", err);
  }
}
