import { WhatsAppDeliveryStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

import {
  WhatsAppReceiptTemplateParams,
  WhatsAppReengagementParams,
  WhatsAppWashClubPassParams,
  formatWhatsAppReceiptMessage,
  formatWhatsAppReengagementMessage,
  formatWhatsAppWashClubPassMessage,
} from "./template";

export type SendWhatsAppReceiptParams = WhatsAppReceiptTemplateParams;

export function formatIndonesianPhone(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    return "62" + cleanPhone.slice(1);
  }
  return cleanPhone;
}

/**
 * Mengirim pesan WhatsApp ke nomor pelanggan via Gateway API
 * (Mendukung Fonnte, Wablas, atau fallback log database).
 * HANYA dipanggil dari Server Actions / Server Components.
 */
export async function sendWhatsAppReceipt(
  params: SendWhatsAppReceiptParams
): Promise<{ success: boolean; messageId?: string }> {
  const formattedPhone = formatIndonesianPhone(params.recipientPhone);

  try {
    // Cari konfigurasi API Gateway outlet
    const ticket = await prisma.washTicket.findUnique({
      where: { id: params.ticketId },
      include: { outlet: true },
    });

    const messageText = formatWhatsAppReceiptMessage({
      ...params,
      slogan: params.slogan ?? ticket?.outlet.slogan,
    });

    const apiKey = ticket?.outlet.waGatewayApiKey;
    let deliveryStatus: WhatsAppDeliveryStatus = WhatsAppDeliveryStatus.SENT;

    if (apiKey) {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: messageText,
        }),
      });

      if (!res.ok) {
        deliveryStatus = WhatsAppDeliveryStatus.FAILED;
      }
    }

    // Catat ke WhatsAppLog untuk audit trail
    await prisma.whatsAppLog.create({
      data: {
        ticketId: params.ticketId,
        recipientPhone: formattedPhone,
        messageType: "RECEIPT",
        status: deliveryStatus,
        payloadJson: {
          message: messageText,
          gatewayConfigured: !!apiKey,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[WhatsApp Sender] Gagal mengirim pesan struk:", error);
    return { success: false };
  }
}

/**
 * Mengirim Kartu Digital Pass Unlimited Wash Club via WhatsApp
 */
export async function sendWhatsAppWashClubPass(
  params: WhatsAppWashClubPassParams & { outletId: string }
): Promise<{ success: boolean }> {
  const formattedPhone = formatIndonesianPhone(params.recipientPhone);

  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: params.outletId },
    });

    const messageText = formatWhatsAppWashClubPassMessage({
      ...params,
      slogan: params.slogan ?? outlet?.slogan,
    });

    const apiKey = outlet?.waGatewayApiKey;
    let deliveryStatus: WhatsAppDeliveryStatus = WhatsAppDeliveryStatus.SENT;

    if (apiKey) {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: messageText,
        }),
      });

      if (!res.ok) {
        deliveryStatus = WhatsAppDeliveryStatus.FAILED;
      }
    }

    await prisma.whatsAppLog.create({
      data: {
        ticketId: null,
        recipientPhone: formattedPhone,
        messageType: "WASH_CLUB_PASS",
        status: deliveryStatus,
        payloadJson: {
          message: messageText,
          gatewayConfigured: !!apiKey,
          licensePlate: params.licensePlate,
          qrPassCode: params.qrPassCode,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[WhatsApp Sender] Gagal mengirim Wash Club pass:", error);
    return { success: false };
  }
}

/**
 * Mengirim pesan CRM Re-Engagement ke kendaraan yang belum cuci > 14 hari
 */
export async function sendWhatsAppReengagementReminder(
  params: WhatsAppReengagementParams & { outletId: string }
): Promise<{ success: boolean }> {
  const formattedPhone = formatIndonesianPhone(params.recipientPhone);

  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: params.outletId },
    });

    const messageText = formatWhatsAppReengagementMessage({
      ...params,
      slogan: params.slogan ?? outlet?.slogan,
    });

    const apiKey = outlet?.waGatewayApiKey;
    let deliveryStatus: WhatsAppDeliveryStatus = WhatsAppDeliveryStatus.SENT;

    if (apiKey) {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: messageText,
        }),
      });

      if (!res.ok) {
        deliveryStatus = WhatsAppDeliveryStatus.FAILED;
      }
    }

    await prisma.whatsAppLog.create({
      data: {
        ticketId: null,
        recipientPhone: formattedPhone,
        messageType: "CRM_REENGAGEMENT",
        status: deliveryStatus,
        payloadJson: {
          message: messageText,
          gatewayConfigured: !!apiKey,
          licensePlate: params.licensePlate,
          daysSinceLastVisit: params.daysSinceLastVisit,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error(
      "[WhatsApp Sender] Gagal mengirim pesan re-engagement:",
      error
    );
    return { success: false };
  }
}
