import { describe, expect, it } from "vitest";

import {
  PAYMENT_METHOD_LABELS,
  TICKET_STATUS_LABELS,
  VEHICLE_CATEGORY_LABELS,
  formatLicensePlate,
  formatRupiah,
  getElapsedMinutes,
} from "@/lib/formatters";

describe("Formatters Unit Tests", () => {
  describe("formatRupiah", () => {
    it("memformat angka nominal rupiah standar dengan benar", () => {
      const formatted = formatRupiah(50000);
      expect(formatted).toMatch(/Rp\s*50\.000/);
    });

    it("menangani angka 0 dan nilai null/undefined dengan aman", () => {
      expect(formatRupiah(0)).toMatch(/Rp\s*0/);
      expect(formatRupiah(null)).toMatch(/Rp\s*0/);
      expect(formatRupiah(undefined)).toMatch(/Rp\s*0/);
    });

    it("memformat string angka dan Prisma Decimal-like object", () => {
      expect(formatRupiah("125000")).toMatch(/Rp\s*125\.000/);
      expect(formatRupiah({ toNumber: () => 75000 })).toMatch(/Rp\s*75\.000/);
    });
  });

  describe("formatLicensePlate", () => {
    it("mengonversi plat nomor huruf kecil menjadi kapital dengan spasi teratur", () => {
      expect(formatLicensePlate("dr1234ab")).toBe("DR 1234 AB");
      expect(formatLicensePlate("b1234xyz")).toBe("B 1234 XYZ");
      expect(formatLicensePlate("dk88ev")).toBe("DK 88 EV");
    });

    it("menangani plat nomor yang sudah berformat rapi", () => {
      expect(formatLicensePlate("DR 1001 AB")).toBe("DR 1001 AB");
    });

    it("mengabaikan karakter khusus non-alfanumerik", () => {
      expect(formatLicensePlate("dr-1234-ab")).toBe("DR 1234 AB");
    });

    it("mengembalikan string kosong jika input kosong", () => {
      expect(formatLicensePlate("")).toBe("");
    });
  });

  describe("getElapsedMinutes", () => {
    it("menghitung selisih menit dengan akurat", () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(getElapsedMinutes(tenMinutesAgo)).toBe(10);
    });

    it("mengembalikan 0 untuk tanggal masa depan", () => {
      const future = new Date(Date.now() + 5 * 60 * 1000);
      expect(getElapsedMinutes(future)).toBe(0);
    });
  });

  describe("Labels Dictionary Integrity", () => {
    it("memastikan seluruh kategori kendaraan memiliki label manusiawi", () => {
      expect(VEHICLE_CATEGORY_LABELS["MOBIL_SEDANG"]).toBe(
        "Mobil Sedang (MPV/SUV)"
      );
      expect(VEHICLE_CATEGORY_LABELS["MOTOR_KECIL"]).toBe(
        "Motor Kecil (110-125cc)"
      );
    });

    it("memastikan status tiket cuci memiliki label yang tepat", () => {
      expect(TICKET_STATUS_LABELS["QUEUED"]).toBe("Menunggu");
      expect(TICKET_STATUS_LABELS["WASHING"]).toBe("Sedang Dicuci");
      expect(TICKET_STATUS_LABELS["DRYING"]).toBe("Pengeringan & Lap");
      expect(TICKET_STATUS_LABELS["READY"]).toBe("Siap Diambil");
    });

    it("memastikan metode pembayaran memiliki label yang benar", () => {
      expect(PAYMENT_METHOD_LABELS["CASH"]).toBe("Tunai (Cash)");
      expect(PAYMENT_METHOD_LABELS["QRIS"]).toBe("QRIS");
    });
  });
});
