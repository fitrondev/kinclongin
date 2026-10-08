import { DiscountType } from "@/generated/prisma/enums";

export interface PromotionRuleItem {
  id: string;
  name: string;
  code?: string | null;
  discountType: DiscountType | "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number | string | { toNumber?: () => number };
  minOrderAmount?: number | string | { toNumber?: () => number } | null;
  daysOfWeek?: string[] | unknown | null;
  startHour?: string | null;
  endHour?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive: boolean;
  description?: string | null;
}

export interface DiscountEvaluationResult {
  ruleId: string;
  name: string;
  code?: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  calculatedDiscount: number;
  reason: string;
  isAutoApplied: boolean;
}

export interface DiscountCalculationSummary {
  applicableDiscounts: DiscountEvaluationResult[];
  totalDiscount: number;
  finalSubtotal: number;
}

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/**
 * Memeriksa apakah suatu PromotionRule memenuhi syarat berdasarkan waktu dan syarat belanja.
 */
export function isPromotionEligible(
  rule: PromotionRuleItem,
  subtotal: number,
  options?: { couponCode?: string; now?: Date }
): { isEligible: boolean; reason: string } {
  if (!rule.isActive) {
    return { isEligible: false, reason: "Promosi tidak aktif." };
  }

  const now = options?.now || new Date();

  // 1. Validasi Kode Kupon / Voucher (Jika rule mewajibkan kode)
  if (rule.code) {
    const inputCode = (options?.couponCode || "").trim().toUpperCase();
    const ruleCode = rule.code.trim().toUpperCase();
    if (!inputCode || inputCode !== ruleCode) {
      return {
        isEligible: false,
        reason: `Kode voucher tidak sesuai (${ruleCode}).`,
      };
    }
  }

  // 2. Validasi Tanggal (startDate & endDate)
  if (rule.startDate) {
    const start = new Date(rule.startDate);
    if (now < start) {
      return { isEligible: false, reason: "Promosi belum dimulai." };
    }
  }
  if (rule.endDate) {
    const end = new Date(rule.endDate);
    if (now > end) {
      return { isEligible: false, reason: "Promosi telah berakhir." };
    }
  }

  // 3. Validasi Hari dalam Seminggu (daysOfWeek e.g. ["MON", "TUE", "WED", "THU"])
  if (rule.daysOfWeek) {
    let allowedDays: string[] = [];
    if (Array.isArray(rule.daysOfWeek)) {
      allowedDays = rule.daysOfWeek.map((d) => String(d).toUpperCase());
    } else if (typeof rule.daysOfWeek === "string") {
      try {
        const parsed = JSON.parse(rule.daysOfWeek);
        if (Array.isArray(parsed)) {
          allowedDays = parsed.map((d) => String(d).toUpperCase());
        }
      } catch {
        // Abaikan parse error
      }
    }

    if (allowedDays.length > 0) {
      const currentDay = DAY_MAP[now.getDay()];
      if (!allowedDays.includes(currentDay)) {
        return {
          isEligible: false,
          reason: `Promosi hanya berlaku pada hari: ${allowedDays.join(", ")}.`,
        };
      }
    }
  }

  // 4. Validasi Jam / Happy Hour (startHour e.g. "08:00", endHour e.g. "11:00")
  if (rule.startHour && rule.endHour) {
    const currentHourMin = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    if (currentHourMin < rule.startHour || currentHourMin > rule.endHour) {
      return {
        isEligible: false,
        reason: `Promosi Happy Hour hanya berlaku antara jam ${rule.startHour} - ${rule.endHour}.`,
      };
    }
  }

  // 5. Validasi Minimum Belanja
  if (rule.minOrderAmount != null) {
    const minVal =
      typeof rule.minOrderAmount === "object" &&
      "toNumber" in rule.minOrderAmount &&
      rule.minOrderAmount.toNumber
        ? rule.minOrderAmount.toNumber()
        : Number(rule.minOrderAmount);

    if (subtotal < minVal) {
      return {
        isEligible: false,
        reason: `Minimal transaksi Rp ${minVal.toLocaleString("id-ID")} untuk promo ini.`,
      };
    }
  }

  return { isEligible: true, reason: "Memenuhi syarat promosi." };
}

/**
 * Menghitung diskon dari satu rule yang lolos validasi.
 */
export function calculateRuleDiscount(
  rule: PromotionRuleItem,
  subtotal: number
): number {
  const rawVal =
    typeof rule.discountValue === "object" &&
    "toNumber" in rule.discountValue &&
    rule.discountValue.toNumber
      ? rule.discountValue.toNumber()
      : Number(rule.discountValue);

  if (rule.discountType === DiscountType.PERCENTAGE) {
    const discount = Math.round((subtotal * rawVal) / 100);
    return Math.min(discount, subtotal);
  }

  // FIXED_AMOUNT
  return Math.min(Math.round(rawVal), subtotal);
}

/**
 * Mengevaluasi seluruh daftar promosi aktif dan mengembalikan kalkulasi diskon terbaik.
 */
export function calculateDiscounts(
  subtotal: number,
  promotions: PromotionRuleItem[],
  options?: { couponCode?: string; now?: Date }
): DiscountCalculationSummary {
  if (subtotal <= 0 || !promotions || promotions.length === 0) {
    return {
      applicableDiscounts: [],
      totalDiscount: 0,
      finalSubtotal: Math.max(0, subtotal),
    };
  }

  const applicableDiscounts: DiscountEvaluationResult[] = [];
  let totalDiscount = 0;

  for (const promo of promotions) {
    const check = isPromotionEligible(promo, subtotal, options);
    if (check.isEligible) {
      const discountAmount = calculateRuleDiscount(
        promo,
        subtotal - totalDiscount
      );
      if (discountAmount > 0) {
        const val =
          typeof promo.discountValue === "object" &&
          "toNumber" in promo.discountValue &&
          promo.discountValue.toNumber
            ? promo.discountValue.toNumber()
            : Number(promo.discountValue);

        applicableDiscounts.push({
          ruleId: promo.id,
          name: promo.name,
          code: promo.code,
          discountType:
            promo.discountType === DiscountType.PERCENTAGE
              ? "PERCENTAGE"
              : "FIXED_AMOUNT",
          discountValue: val,
          calculatedDiscount: discountAmount,
          reason: check.reason,
          isAutoApplied: !promo.code,
        });

        totalDiscount += discountAmount;
      }
    }
  }

  const finalSubtotal = Math.max(0, subtotal - totalDiscount);

  return {
    applicableDiscounts,
    totalDiscount,
    finalSubtotal,
  };
}
