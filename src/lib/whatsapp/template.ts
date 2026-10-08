import { formatRupiah } from "@/lib/formatters";

export interface WhatsAppReceiptTemplateParams {
  ticketId: string;
  ticketNumber: string;
  recipientPhone: string;
  customerName?: string | null;
  licensePlate: string;
  vehicleDesc?: string | null;
  packageName: string;
  totalAmount: number;
  paymentMethod: string;
  outletName: string;
  outletAddress: string;
  outletPhone: string;
  slogan?: string | null;
  loyaltyPoints?: number;
}

/**
 * Format pesan struk transaksi digital WhatsApp (Murni fungsi string, aman untuk client & server)
 */
export function formatWhatsAppReceiptMessage(
  params: WhatsAppReceiptTemplateParams
): string {
  const {
    ticketNumber,
    customerName,
    licensePlate,
    vehicleDesc,
    packageName,
    totalAmount,
    paymentMethod,
    outletName,
    outletAddress,
    slogan,
    loyaltyPoints = 0,
  } = params;

  const appUrl =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "https://kinclongin.com";

  const closingSlogan = slogan
    ? `_${slogan}_`
    : `_Kendaraan Bersih, Perjalanan Menyenangkan!_`;

  return `*STRUK DIGITAL — ${outletName.toUpperCase()}*
${outletAddress}

Halo, *${customerName || `Pelanggan Setia ${outletName}`}*! Terima kasih telah mencuci kendaraan Anda di ${outletName}.

*DETAIL TRANSAKSI:*
• No. Tiket: *#${ticketNumber}*
• Kendaraan: *${licensePlate}* ${vehicleDesc ? `(${vehicleDesc})` : ""}
• Layanan: *${packageName}*
• Metode Bayar: *${paymentMethod}*
• Total Bayar: *${formatRupiah(totalAmount)}* (LUNAS)
• Saldo Poin: *${loyaltyPoints} Poin*

*Pantau E-Nota & Status Kendaraan:*
${appUrl}/lacak/${params.ticketId}

${closingSlogan}
=================================`;
}
