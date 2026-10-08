import { describe, expect, it } from "vitest";

import {
  PromotionRuleItem,
  calculateDiscounts,
  calculateRuleDiscount,
  isPromotionEligible,
} from "../../src/lib/pos/discount-engine";

describe("Discount Engine & Happy Hour Unit Tests", () => {
  const happyHourRule: PromotionRuleItem = {
    id: "promo-hh-1",
    name: "Happy Hour Pagi 20%",
    discountType: "PERCENTAGE",
    discountValue: 20,
    daysOfWeek: ["MON", "TUE", "WED", "THU"],
    startHour: "08:00",
    endHour: "11:00",
    minOrderAmount: 30000,
    isActive: true,
  };

  const couponRule: PromotionRuleItem = {
    id: "promo-voucher-1",
    name: "Diskon Komunitas Mobil",
    code: "KOMUNITAS10K",
    discountType: "FIXED_AMOUNT",
    discountValue: 10000,
    minOrderAmount: 25000,
    isActive: true,
  };

  it("menerapkan diskon Happy Hour jika waktu berada di dalam jam 08:00 - 11:00 pada hari aktif (Senin)", () => {
    // 2026-10-12 adalah hari Senin
    const mondayMorning = new Date("2026-10-12T09:30:00");
    const subtotal = 50000;

    const check = isPromotionEligible(happyHourRule, subtotal, {
      now: mondayMorning,
    });
    expect(check.isEligible).toBe(true);

    const discount = calculateRuleDiscount(happyHourRule, subtotal);
    expect(discount).toBe(10000); // 20% dari 50.000 = 10.000
  });

  it("menolak diskon Happy Hour jika di luar rentang jam (misal 14:00 siang)", () => {
    const mondayAfternoon = new Date("2026-10-12T14:00:00");
    const subtotal = 50000;

    const check = isPromotionEligible(happyHourRule, subtotal, {
      now: mondayAfternoon,
    });
    expect(check.isEligible).toBe(false);
    expect(check.reason).toContain("Happy Hour");
  });

  it("menolak diskon Happy Hour jika hari Sabtu (di luar MON-THU)", () => {
    // 2026-10-17 adalah hari Sabtu
    const saturdayMorning = new Date("2026-10-17T09:30:00");
    const subtotal = 50000;

    const check = isPromotionEligible(happyHourRule, subtotal, {
      now: saturdayMorning,
    });
    expect(check.isEligible).toBe(false);
    expect(check.reason).toContain("hanya berlaku pada hari");
  });

  it("menolak jika subtotal pesanan di bawah batas minimum belanja", () => {
    const mondayMorning = new Date("2026-10-12T09:30:00");
    const subtotal = 20000; // di bawah 30.000

    const check = isPromotionEligible(happyHourRule, subtotal, {
      now: mondayMorning,
    });
    expect(check.isEligible).toBe(false);
    expect(check.reason).toContain("Minimal transaksi");
  });

  it("memvalidasi kode kupon / voucher manual dengan tepat (case-insensitive)", () => {
    const subtotal = 40000;

    // Tanpa kupon -> tidak lolos
    const withoutCode = isPromotionEligible(couponRule, subtotal);
    expect(withoutCode.isEligible).toBe(false);

    // Kode salah -> tidak lolos
    const wrongCode = isPromotionEligible(couponRule, subtotal, {
      couponCode: "SALAH",
    });
    expect(wrongCode.isEligible).toBe(false);

    // Kode benar huruf kecil -> lolos
    const rightCode = isPromotionEligible(couponRule, subtotal, {
      couponCode: "komunitas10k",
    });
    expect(rightCode.isEligible).toBe(true);

    const discount = calculateRuleDiscount(couponRule, subtotal);
    expect(discount).toBe(10000);
  });

  it("menghitung total akumulasi diskon dan final subtotal dengan benar", () => {
    const mondayMorning = new Date("2026-10-12T09:30:00");
    const subtotal = 100000;

    const result = calculateDiscounts(subtotal, [happyHourRule, couponRule], {
      now: mondayMorning,
      couponCode: "KOMUNITAS10K",
    });

    expect(result.applicableDiscounts.length).toBe(2);
    // Happy hour: 20% dari 100.000 = 20.000. Sisa subtotal: 80.000.
    // Voucher: Rp 10.000.
    // Total diskon: 30.000. Final: 70.000.
    expect(result.totalDiscount).toBe(30000);
    expect(result.finalSubtotal).toBe(70000);
  });
});
