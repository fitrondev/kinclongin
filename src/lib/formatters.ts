import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Memformat angka ke format mata uang Rupiah Indonesia (Rp XX.XXX)
 */
export function formatRupiah(
  amount?: number | string | { toNumber?: () => number } | null
): string {
  if (amount == null) return "Rp 0";

  const num =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? parseFloat(amount) || 0
        : (amount.toNumber ? amount.toNumber() : Number(amount)) || 0;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format plat nomor kendaraan Indonesia:
 * Menyeragamkan menjadi huruf kapital dan memisahkan kode wilayah, angka, dan seri huruf.
 * Contoh: "dr1234ab" -> "DR 1234 AB", "b1234xyz" -> "B 1234 XYZ"
 */
export function formatLicensePlate(input: string): string {
  if (!input) return "";
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Pola Plat Indonesia: 1-2 huruf awal + 1-4 angka + 1-3 huruf akhir
  const match = cleaned.match(/^([A-Z]{1,2})([0-9]{0,4})([A-Z]{0,3})$/);
  if (match) {
    const [, area, number, series] = match;
    const parts = [area, number, series].filter(Boolean);
    return parts.join(" ");
  }

  return cleaned;
}

/**
 * Menghitung waktu berlalu dalam menit dan detik
 */
export function getElapsedMinutes(startDate: Date | string): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

/**
 * Format tanggal relatif Indonesia
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) {
    return "Hari ini";
  }
  if (isYesterday(d)) {
    return "Kemarin";
  }
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
}

/**
 * Format tanggal lengkap bahasa Indonesia (contoh: "Kamis, 1 Oktober 2026")
 */
export function formatTanggalIndo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  MOTOR_KECIL: "Motor Kecil (110-125cc)",
  MOTOR_BESAR: "Motor Besar (150-250cc)",
  MOTOR_MOGE: "Moge (250cc+)",
  MOBIL_KECIL: "Mobil Kecil (Hatchback)",
  MOBIL_SEDANG: "Mobil Sedang (MPV/SUV)",
  MOBIL_BESAR: "Mobil Besar (Big SUV/Van)",
  KENDARAAN_LAIN: "Kendaraan Niaga / Box",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Menunggu",
  WASHING: "Sedang Dicuci",
  DRYING: "Pengeringan & Lap",
  READY: "Siap Diambil",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tunai (Cash)",
  QRIS: "QRIS",
  BANK_TRANSFER: "Transfer Bank",
  SPLIT: "Split Payment",
  LOYALTY_POINTS: "Tukar Poin",
};
