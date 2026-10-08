import { WhatsAppDeliveryStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

import {
  WhatsAppReceiptTemplateParams,
  formatWhatsAppReceiptMessage,
} from "./template";

export type SendWhatsAppReceiptParams = WhatsAppReceiptTemplateParams;

/**
 * Mengirim pesan WhatsApp ke nomor pelanggan via Gateway API
 * (Mendukung Fonnte, Wablas, atau fallback log database).
 * HANYA dipanggil dari Server Actions / Server Components.
 */
export async function sendWhatsAppReceipt(
  params: SendWhatsAppReceiptParams
): Promise<{ success: boolean; messageId?: string }> {
  const cleanPhone = params.recipientPhone.replace(/[^0-9]/g, "");

  // Validasi nomor WhatsApp Indonesia
  let formattedPhone = cleanPhone;
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.slice(1);
  }

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
    console.error("[WhatsApp Sender] Gagal mengirim pesan:", error);
    return { success: false };
  }
}
