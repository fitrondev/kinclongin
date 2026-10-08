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

export interface WhatsAppWashClubPassParams {
  recipientPhone: string;
  customerName?: string | null;
  licensePlate: string;
  planName: string;
  priceMonthly: number;
  startDate: Date | string;
  expiresAt: Date | string;
  qrPassCode: string;
  outletName: string;
  outletAddress: string;
  slogan?: string | null;
}

/**
 * Format pesan Kartu Digital Pass Unlimited Wash Club WhatsApp
 */
export function formatWhatsAppWashClubPassMessage(
  params: WhatsAppWashClubPassParams
): string {
  const {
    customerName,
    licensePlate,
    planName,
    priceMonthly,
    expiresAt,
    qrPassCode,
    outletName,
    outletAddress,
    slogan,
  } = params;

  const expDateStr = new Date(expiresAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const closingSlogan = slogan
    ? `_${slogan}_`
    : `_Cuci Sepuasnya Tanpa Batas, Kendaraan Selalu Kinclong!_`;

  return `*DIGITAL PASS — UNLIMITED WASH CLUB*
${outletName.toUpperCase()}
${outletAddress}

Halo, *${customerName || "Member Setia"}*! Selamat datang di program *Unlimited Wash Club* ${outletName}!

*KARTU DIGITAL MEMBER:*
• No. Plat Kendaraan: *${licensePlate}*
• Paket Langganan: *${planName}*
• Iuran Bulanan: *${formatRupiah(priceMonthly)}/bulan*
• Masa Berlaku s/d: *${expDateStr}*
• Kode Pass Member: *${qrPassCode}*

*CARA MENGGUNAKAN:*
Cukup sebutkan nomor plat *${licensePlate}* atau tunjukkan kode *${qrPassCode}* ke kasir kami saat datang. Seluruh cuci mobil Anda GRATIS (Rp 0) tanpa batas kuota selama masa aktif.

${closingSlogan}
=================================`;
}

export interface WhatsAppReengagementParams {
  recipientPhone: string;
  customerName?: string | null;
  licensePlate: string;
  vehicleDesc?: string | null;
  daysSinceLastVisit: number;
  outletName: string;
  outletAddress?: string;
  promoOffer?: string | null;
  slogan?: string | null;
}

/**
 * Format pesan pengingat CRM re-engagement untuk kendaraan yang belum cuci > 14 hari
 */
export function formatWhatsAppReengagementMessage(
  params: WhatsAppReengagementParams
): string {
  const {
    customerName,
    licensePlate,
    vehicleDesc,
    daysSinceLastVisit,
    outletName,
    promoOffer = "Diskon 10% atau Gratis Semir Ban Premium",
    slogan,
  } = params;

  const closingSlogan = slogan
    ? `_${slogan}_`
    : `_Bikin Kendaraan Kesayangan Bersih & Nyaman Kembali!_`;

  return `Halo Kak *${customerName || "Pelanggan Setia"}*! 👋

Semoga harinya menyenangkan! Kami dari *${outletName}* melihat kendaraan *${licensePlate}* ${
    vehicleDesc ? `(${vehicleDesc})` : ""
  } sudah sekitar *${daysSinceLastVisit} hari* belum mampir cuci nih.

Pasti sudah mulai berdebu setelah menemani mobilitas harian. Yuk buat kinclong dan segar kembali hari ini!

🎁 *PROMO KHUSUS UNTUK KAKAK:*
Dapatkan *${promoOffer}* cukup dengan menunjukkan pesan WhatsApp ini ke kasir kami.

Ditunggu kedatangannya di ${outletName} ya Kak!
${closingSlogan}`;
}
