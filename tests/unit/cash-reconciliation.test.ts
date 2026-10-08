import { describe, expect, it } from "vitest";

import {
  buildVoidReceipt,
  buildXReportReceipt,
  buildZReportReceipt,
} from "@/lib/printer/escpos";

describe("Cash Drawer, Reconciliation & Void Unit Tests", () => {
  describe("Petty Cash & Shift Reconciliation Formula", () => {
    it("menghitung saldo fisik kas di laci dengan formula: modal + tunai + paidIn - paidOut", () => {
      const openingAmount = 150000;
      const cashPayments = 450000;
      const paidIn = 50000; // Misal modal tambahan
      const paidOut = 30000; // Misal beli galon air & bensin genset

      const expectedDrawerCash =
        openingAmount + cashPayments + paidIn - paidOut;

      expect(expectedDrawerCash).toBe(620000);
    });

    it("mendeteksi status selisih kas (BALANCED, SURPLUS, DEFICIT)", () => {
      const expectedDrawerCash = 500000;

      // Kasus 1: Pas (Klop)
      const countedBalanced = 500000;
      const discrepancy1 = countedBalanced - expectedDrawerCash;
      expect(discrepancy1).toBe(0);
      expect(
        discrepancy1 === 0
          ? "BALANCED"
          : discrepancy1 > 0
            ? "SURPLUS"
            : "DEFICIT"
      ).toBe("BALANCED");

      // Kasus 2: Kelebihan uang fisik (Surplus)
      const countedSurplus = 520000;
      const discrepancy2 = countedSurplus - expectedDrawerCash;
      expect(discrepancy2).toBe(20000);
      expect(discrepancy2 > 0 ? "SURPLUS" : "DEFICIT").toBe("SURPLUS");

      // Kasus 3: Kekurangan uang fisik (Defisit)
      const countedDeficit = 480000;
      const discrepancy3 = countedDeficit - expectedDrawerCash;
      expect(discrepancy3).toBe(-20000);
      expect(discrepancy3 < 0 ? "DEFICIT" : "SURPLUS").toBe("DEFICIT");
    });

    it("menghitung kalkulasi pecahan lembaran uang Rupiah (Denomination Breakdown)", () => {
      const denominations: Record<string, number> = {
        "100k": 3, // 300.000
        "50k": 2, // 100.000
        "20k": 4, // 80.000
        "10k": 5, // 50.000
        "5k": 2, // 10.000
        "2k": 5, // 10.000
        "1k": 10, // 10.000
        coin: 5, // 5.000 (koin)
      };

      const multipliers: Record<string, number> = {
        "100k": 100000,
        "50k": 50000,
        "20k": 20000,
        "10k": 10000,
        "5k": 5000,
        "2k": 2000,
        "1k": 1000,
        coin: 1000,
      };

      let total = 0;
      for (const [key, count] of Object.entries(denominations)) {
        total += count * multipliers[key];
      }

      expect(total).toBe(565000);
    });
  });

  describe("Thermal Z-Report & X-Report Generation", () => {
    it("mencetak Z-Report lengkap dengan petty cash dan rincian pecahan fisik", () => {
      const zReport = buildZReportReceipt({
        outletName: "Kinclongin Cabang Barat",
        cashierName: "Dewi Lestari",
        shiftName: "Shift Pagi",
        closedAt: "2026-10-08T17:00:00.000Z",
        transactionsCount: 22,
        openingAmount: 200000,
        cashPayments: 850000,
        paidInAmount: 50000,
        paidOutAmount: 35000,
        expectedDrawerCash: 1065000,
        physicalCashCounted: 1065000,
        discrepancy: 0,
        discrepancyStatus: "BALANCED",
        qrisPayments: 420000,
        transferPayments: 150000,
        nonCashPayments: 570000,
        totalRevenue: 1420000,
        denominations: {
          "100k": 9,
          "50k": 3,
          "10k": 1,
          "5k": 1,
        },
      });

      expect(zReport).toContain("LAPORAN Z-REPORT (TUTUP SHIFT)");
      expect(zReport).toContain("Dewi Lestari");
      expect(zReport).toContain("3. Kas Masuk (In)");
      expect(zReport).toContain("4. Kas Keluar (Out)");
      expect(zReport).toContain("SEIMBANG (0)");
      expect(zReport).toContain("Rp 100.000 x 9");
      expect(zReport).toContain("TOTAL OMSET SHIFT");
    });

    it("mencetak X-Report interim tengah shift tanpa mereset data", () => {
      const xReport = buildXReportReceipt({
        outletName: "Kinclongin Cabang Barat",
        cashierName: "Dewi Lestari",
        shiftName: "Shift Pagi",
        printedAt: "2026-10-08T12:00:00.000Z",
        transactionsCount: 10,
        openingAmount: 200000,
        cashPayments: 400000,
        paidInAmount: 20000,
        paidOutAmount: 15000,
        expectedDrawerCash: 605000,
        qrisPayments: 200000,
        transferPayments: 50000,
        nonCashPayments: 250000,
        totalRevenue: 650000,
      });

      expect(xReport).toContain("LAPORAN X-REPORT (MID-SHIFT)");
      expect(xReport).toContain("*** SEMENTARA - SHIFT AKTIF ***");
      expect(xReport).toContain("DOKUMEN AUDIT INTERIM");
    });
  });

  describe("Void & Pembatalan Tiket Governance", () => {
    it("mencetak struk VOID dengan alasan dan supervisor pembatalan", () => {
      const voidReceipt = buildVoidReceipt({
        outletName: "Kinclongin Cabang Mataram",
        ticketNumber: "KNC-20261008-012",
        licensePlate: "DR 5555 ZZ",
        serviceName: "Cuci Salju Reguler",
        totalAmount: 35000,
        cashierName: "Rian Kasir",
        managerName: "Hendra (Supervisor)",
        voidReason: "Hujan Deras Tiba-tiba",
        voidReasonNotes: "Pelanggan izin pulang karena cuaca mendung gelap",
        voidedAt: "2026-10-08T14:30:00.000Z",
      });

      expect(voidReceipt).toContain("*** TIKET DIBATALKAN (VOID) ***");
      expect(voidReceipt).toContain("KNC-20261008-012");
      expect(voidReceipt).toContain("DR 5555 ZZ");
      expect(voidReceipt).toContain("Hujan Deras Tiba-tiba");
      expect(voidReceipt).toContain("Hendra (Supervisor)");
    });
  });
});
