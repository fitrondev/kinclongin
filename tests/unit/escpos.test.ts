import { describe, expect, it } from "vitest";

import {
  ESC_DRAWER_KICK,
  ReceiptData,
  buildDrawerKickCommand,
  buildEscPosCommands,
  buildVoidReceipt,
  buildXReportReceipt,
  buildZReportReceipt,
  generatePlainTextReceipt,
} from "@/lib/printer/escpos";

describe("ESC/POS Thermal Printer Unit Tests", () => {
  const sampleReceipt: ReceiptData = {
    outletName: "Kinclongin Cabang Pusat",
    outletAddress: "Jl. Pejanggik No. 88, Mataram",
    outletPhone: "08123456789",
    ticketNumber: "20261001-001",
    dateStr: "01/10/2026 09:00",
    cashierName: "Siti Rahma",
    washerNames: "Agus & Budi",
    licensePlate: "DR 1001 AB",
    vehicleModel: "Avanza Silver",
    serviceName: "Cuci Salju + Interior",
    servicePrice: 50000,
    retailItems: [
      {
        name: "Kopi Dingin",
        qty: 1,
        price: 15000,
        subtotal: 15000,
      },
    ],
    subtotal: 65000,
    discount: 0,
    total: 65000,
    paymentMethod: "QRIS",
    loyaltyPoints: 120,
  };

  it("menghasilkan teks struk 58mm dengan batasan 32 karakter per baris", () => {
    const text58 = generatePlainTextReceipt(sampleReceipt, 32);
    expect(text58).toContain("KINCLONGIN CABANG PUSAT");
    expect(text58).toContain("DR 1001 AB");
    expect(text58).toContain("TOTAL");
    expect(text58).toContain("QRIS");

    // Periksa setiap baris tidak melebihi 32 karakter
    const lines = text58.split("\n");
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(32);
    }
  });

  it("menghasilkan teks struk 80mm dengan lebar hingga 48 karakter per baris", () => {
    const text80 = generatePlainTextReceipt(sampleReceipt, 48);
    expect(text80).toContain("KINCLONGIN CABANG PUSAT");
    expect(text80).toContain("DR 1001 AB");

    const lines = text80.split("\n");
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(48);
    }
  });

  it("menghasilkan byte array ESC/POS yang diawali dengan ESC @ (init) dan diakhiri dengan GS V (cut)", () => {
    const text = generatePlainTextReceipt(sampleReceipt, 32);
    const commands = buildEscPosCommands(text);

    expect(commands).toBeInstanceOf(Uint8Array);
    expect(commands.length).toBeGreaterThan(0);

    // Inisialisasi printer: ESC @ (0x1B, 0x40)
    expect(commands[0]).toBe(0x1b);
    expect(commands[1]).toBe(0x40);

    // Pemotong kertas: GS V 66 0 (0x1D, 0x56, 0x42, 0x00)
    const len = commands.length;
    expect(commands[len - 4]).toBe(0x1d);
    expect(commands[len - 3]).toBe(0x56);
    expect(commands[len - 2]).toBe(0x42);
    expect(commands[len - 1]).toBe(0x00);
  });

  it("mencetak slogan, header kustom, footer kustom dan CS kustom untuk white-label", () => {
    const brandedReceipt: ReceiptData = {
      ...sampleReceipt,
      outletName: "Berkah Auto Wash",
      slogan: "Cepat & Mengkilap",
      receiptHeader: "SPESIALIS SALJU & INTERIOR",
      receiptFooter: "Barang berharga harap diamankan.",
      contactPhone: "08987654321",
    };

    const text = generatePlainTextReceipt(brandedReceipt, 32);
    expect(text).toContain("BERKAH AUTO WASH");
    expect(text).toContain('"Cepat & Mengkilap"');
    expect(text).toContain("SPESIALIS SALJU & INTERIOR");
    expect(text).toContain("Barang berharga harap diamankan.");
    expect(text).toContain("CS: 08987654321");
  });

  it("menghasilkan pulse sinyal drawer kick 24V RJ11 standar ESC p", () => {
    expect(ESC_DRAWER_KICK).toEqual(
      new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa])
    );

    const kickOnly = buildDrawerKickCommand();
    expect(kickOnly[0]).toBe(0x1b);
    expect(kickOnly[1]).toBe(0x40); // Init ESC @
    expect(kickOnly[2]).toBe(0x1b);
    expect(kickOnly[3]).toBe(0x70); // Pulse ESC p

    const text = "Test Print";
    const withKick = buildEscPosCommands(text, true);
    // Byte ke-2 s/d 6 harus mengandung ESC p command
    expect(withKick[2]).toBe(0x1b);
    expect(withKick[3]).toBe(0x70);
  });

  it("menghasilkan format struk void pembatalan tiket dengan alasan dan otorisasi", () => {
    const voidReceipt = buildVoidReceipt({
      outletName: "Kinclongin Cabang Mataram",
      ticketNumber: "KNC-20261008-005",
      licensePlate: "DR 1234 XY",
      serviceName: "Cuci Mobil Standar",
      totalAmount: 45000,
      cashierName: "Siti Rahma",
      managerName: "Budi Santoso (Owner)",
      voidReason: "Hujan Deras Tiba-tiba",
      voidReasonNotes: "Pelanggan membatalkan sebelum antrean cuci basah",
      voidedAt: new Date().toISOString(),
    });

    expect(voidReceipt).toContain("*** TIKET DIBATALKAN (VOID) ***");
    expect(voidReceipt).toContain("KNC-20261008-005");
    expect(voidReceipt).toContain("DR 1234 XY");
    expect(voidReceipt).toContain("Hujan Deras Tiba-tiba");
    expect(voidReceipt).toContain("Budi Santoso (Owner)");
    expect(voidReceipt).toContain("DOKUMEN AUDIT PEMBATALAN");
  });

  it("menghasilkan format struk Z-Report penutupan shift kasir dengan rincian pecahan uang", () => {
    const zReport = buildZReportReceipt({
      outletName: "Kinclongin Flagship",
      cashierName: "Ahmad Kasir",
      shiftName: "Shift Pagi",
      closedAt: new Date().toISOString(),
      transactionsCount: 15,
      openingAmount: 200000,
      cashPayments: 650000,
      paidInAmount: 50000,
      paidOutAmount: 25000,
      expectedDrawerCash: 875000,
      physicalCashCounted: 875000,
      discrepancy: 0,
      discrepancyStatus: "BALANCED",
      qrisPayments: 350000,
      transferPayments: 100000,
      nonCashPayments: 450000,
      totalRevenue: 1100000,
      denominations: {
        "100000": 7,
        "50000": 3,
        "20000": 1,
        "5000": 1,
      },
    });

    expect(zReport).toContain("LAPORAN Z-REPORT (TUTUP SHIFT)");
    expect(zReport).toContain("Kasir");
    expect(zReport).toContain("Ahmad Kasir");
    expect(zReport).toContain("1. Modal Awal");
    expect(zReport).toContain("3. Kas Masuk (In)");
    expect(zReport).toContain("4. Kas Keluar (Out)");
    expect(zReport).toContain("SEIMBANG (0)");
    expect(zReport).toContain("PECAHAN UANG LEMBARAN FISIK");
    expect(zReport).toContain("Rp 100.000 x 7");
  });

  it("menghasilkan format struk X-Report audit tengah shift tanpa mereset data", () => {
    const xReport = buildXReportReceipt({
      outletName: "Kinclongin Flagship",
      cashierName: "Ahmad Kasir",
      shiftName: "Shift Pagi",
      printedAt: new Date().toISOString(),
      transactionsCount: 8,
      openingAmount: 200000,
      cashPayments: 350000,
      paidInAmount: 20000,
      paidOutAmount: 15000,
      expectedDrawerCash: 555000,
      qrisPayments: 150000,
      transferPayments: 50000,
      nonCashPayments: 200000,
      totalRevenue: 550000,
    });

    expect(xReport).toContain("LAPORAN X-REPORT (MID-SHIFT)");
    expect(xReport).toContain("*** SEMENTARA - SHIFT AKTIF ***");
    expect(xReport).toContain("Kasir");
    expect(xReport).toContain("Ahmad Kasir");
    expect(xReport).toContain("1. Modal Awal");
    expect(xReport).toContain("2. Penjualan Tunai");
    expect(xReport).toContain("3. Kas Masuk (In)");
    expect(xReport).toContain("4. Kas Keluar (Out)");
    expect(xReport).toContain("Kas Fisik Seharusnya");
    expect(xReport).toContain("TOTAL OMSET BERJALAN");
    expect(xReport).toContain("TIDAK MERESET DATA SHIFT");
  });
});
