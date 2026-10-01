import { describe, expect, it } from "vitest";

import {
  ReceiptData,
  buildEscPosCommands,
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
});
