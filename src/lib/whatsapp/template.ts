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
    loyaltyPoints = 0,
  } = params;

  return `*STRUK DIGITAL — ${outletName.toUpperCase()}*
${outletAddress}

Halo, *${customerName || "Sahabat Kinclong"}*! Terima kasih telah mencuci kendaraan Anda di ${outletName}.

*DETAIL TRANSAKSI:*
• No. Tiket: *#${ticketNumber}*
• Kendaraan: *${licensePlate}* ${vehicleDesc ? `(${vehicleDesc})` : ""}
• Layanan: *${packageName}*
• Metode Bayar: *${paymentMethod}*
• Total Bayar: *${formatRupiah(totalAmount)}* (LUNAS)
• Saldo Poin: *${loyaltyPoints} Poin*

*Pantau E-Nota & Status Kendaraan:*
https://kinclongin.com/lacak/${params.ticketId}

_Kendaraan Kinclong, Perjalanan Menyenangkan!_
=================================`;
}
