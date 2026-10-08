import { describe, expect, it } from "vitest";

import {
  formatWhatsAppReengagementMessage,
  formatWhatsAppWashClubPassMessage,
} from "../../src/lib/whatsapp/template";

describe("Tahap 3 Features: Wash Club & WhatsApp Re-engagement Tests", () => {
  it("menghasilkan teks pesan WhatsApp Digital Pass Wash Club dengan format benar", () => {
    const text = formatWhatsAppWashClubPassMessage({
      recipientPhone: "081234567890",
      customerName: "Budi Santoso",
      licensePlate: "B 1234 ABC",
      planName: "Unlimited VIP Mobil",
      priceMonthly: 150000,
      startDate: new Date("2026-10-15"),
      expiresAt: new Date("2026-11-15"),
      qrPassCode: "PASS-VIP-99",
      outletName: "Kinclongin Express Senayan",
      outletAddress: "Jl. Sudirman No. 10",
      slogan: "Bersih Cepat Berkilau",
    });

    expect(text).toContain("DIGITAL PASS — UNLIMITED WASH CLUB");
    expect(text).toContain("B 1234 ABC");
    expect(text).toContain("Unlimited VIP Mobil");
    expect(text).toContain("150.000");
    expect(text).toContain("PASS-VIP-99");
    expect(text).toContain("Kinclongin Express Senayan");
    expect(text).toContain("Bersih Cepat Berkilau");
  });

  it("menghasilkan teks pesan WhatsApp CRM Re-Engagement 14 hari dengan penawaran voucher promo", () => {
    const text = formatWhatsAppReengagementMessage({
      recipientPhone: "081987654321",
      customerName: "Ahmad Dahlan",
      licensePlate: "D 9999 XYZ",
      vehicleDesc: "Toyota Innova Zenix",
      daysSinceLastVisit: 18,
      outletName: "Kinclongin Buah Batu",
      promoOffer: "Diskon 15% Cuci Komplit",
    });

    expect(text).toContain("Halo Kak *Ahmad Dahlan*!");
    expect(text).toContain("D 9999 XYZ");
    expect(text).toContain("Toyota Innova Zenix");
    expect(text).toContain("18 hari");
    expect(text).toContain("Diskon 15% Cuci Komplit");
    expect(text).toContain("Kinclongin Buah Batu");
  });
});
