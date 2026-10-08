"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  type CdsCartItem,
  type CdsPayload,
  broadcastTicketEvent,
} from "@/lib/realtime/events";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Memancarkan pembaruan keranjang belanja kasir ke Customer Display Screen (CDS)
 */
export async function broadcastCdsCartAction(input: {
  outletId: string;
  ticketId?: string;
  ticketNumber?: string;
  licensePlate?: string;
  customerName?: string;
  items: CdsCartItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  totalAmount: number;
  paymentMethod?: string;
}): Promise<ActionResponse<{ broadcasted: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    broadcastTicketEvent({
      type: "CDS_CART_UPDATED",
      outletId: input.outletId,
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      licensePlate: input.licensePlate,
      timestamp: new Date().toISOString(),
      payload: {
        customerName: input.customerName,
        licensePlate: input.licensePlate,
        items: input.items,
        subtotal: input.subtotal,
        discount: input.discount || 0,
        tax: input.tax || 0,
        totalAmount: input.totalAmount,
        paymentMethod: input.paymentMethod || "CASH",
      },
    });

    return { success: true, data: { broadcasted: true } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal broadcast ke layar tamu.",
    };
  }
}

/**
 * Menampilkan kode QRIS ukuran besar di Customer Display Screen (CDS)
 */
export async function broadcastCdsQrisAction(input: {
  outletId: string;
  ticketNumber: string;
  licensePlate?: string;
  totalAmount: number;
  qrisUrl?: string;
}): Promise<ActionResponse<{ broadcasted: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    broadcastTicketEvent({
      type: "CDS_QRIS_DISPLAY",
      outletId: input.outletId,
      ticketNumber: input.ticketNumber,
      licensePlate: input.licensePlate,
      timestamp: new Date().toISOString(),
      payload: {
        licensePlate: input.licensePlate,
        totalAmount: input.totalAmount,
        qrisUrl: input.qrisUrl,
        paymentMethod: "QRIS",
      },
    });

    return { success: true, data: { broadcasted: true } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memancarkan QRIS ke layar tamu.",
    };
  }
}

/**
 * Menampilkan animasi sukses pembayaran selesai di Customer Display Screen (CDS)
 */
export async function broadcastCdsPaymentSuccessAction(input: {
  outletId: string;
  ticketNumber: string;
  licensePlate?: string;
  totalAmount: number;
}): Promise<ActionResponse<{ broadcasted: boolean }>> {
  try {
    broadcastTicketEvent({
      type: "CDS_PAYMENT_SUCCESS",
      outletId: input.outletId,
      ticketNumber: input.ticketNumber,
      licensePlate: input.licensePlate,
      timestamp: new Date().toISOString(),
      payload: {
        totalAmount: input.totalAmount,
        licensePlate: input.licensePlate,
      },
    });

    return { success: true, data: { broadcasted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal broadcast sukses.",
    };
  }
}

/**
 * Mengembalikan Customer Display Screen (CDS) ke mode idle / promosi carousel
 */
export async function broadcastCdsIdleAction(
  outletId: string
): Promise<ActionResponse<{ broadcasted: boolean }>> {
  try {
    broadcastTicketEvent({
      type: "CDS_IDLE",
      outletId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, data: { broadcasted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal broadcast idle.",
    };
  }
}
