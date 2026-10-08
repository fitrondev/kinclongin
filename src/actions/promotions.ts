"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { DiscountType } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  type DiscountCalculationSummary,
  calculateDiscounts,
} from "@/lib/pos/discount-engine";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const promotionSchema = z.object({
  outletId: z.string().min(1, "ID Cabang wajib diisi"),
  name: z.string().min(2, "Nama promosi minimal 2 karakter"),
  code: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim().toUpperCase() : undefined)),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().positive("Nilai diskon harus lebih dari 0"),
  minOrderAmount: z.number().min(0).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  startHour: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Format jam tidak valid (HH:MM)"
    )
    .optional()
    .or(z.literal("")),
  endHour: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Format jam tidak valid (HH:MM)"
    )
    .optional()
    .or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
});

export type PromotionInput = z.infer<typeof promotionSchema>;

/**
 * Mengambil seluruh aturan promosi aktif / nonaktif untuk cabang tertentu.
 */
export async function getPromotionsAction(outletId: string): Promise<
  ActionResponse<
    Array<{
      id: string;
      outletId: string;
      name: string;
      code: string | null;
      discountType: DiscountType;
      discountValue: number;
      minOrderAmount: number | null;
      daysOfWeek: string[] | null;
      startHour: string | null;
      endHour: string | null;
      startDate: string | null;
      endDate: string | null;
      isActive: boolean;
      description: string | null;
      createdAt: string;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const promotions = await prisma.promotionRule.findMany({
      where: { outletId },
      orderBy: { createdAt: "desc" },
    });

    const mapped = promotions.map((p) => ({
      id: p.id,
      outletId: p.outletId,
      name: p.name,
      code: p.code,
      discountType: p.discountType,
      discountValue: Number(p.discountValue),
      minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
      daysOfWeek: p.daysOfWeek as string[] | null,
      startHour: p.startHour,
      endHour: p.endHour,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      isActive: p.isActive,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
    }));

    return { success: true, data: mapped };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memuat aturan promosi.",
    };
  }
}

/**
 * Membuat aturan promosi baru (Happy Hour, Voucher Diskon, atau Diskon Spesial).
 */
export async function createPromotionAction(
  input: PromotionInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const parsed = promotionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi promosi gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const data = parsed.data;

    // IDOR Protection: Pastikan user berwenang di cabang ini
    const isOwnerOfOutlet = user.ownedOutlets?.some(
      (o) => o.id === data.outletId
    );
    if (
      user.role !== "SUPERADMIN" &&
      user.outletId !== data.outletId &&
      !isOwnerOfOutlet
    ) {
      return { success: false, error: "Akses ditolak ke cabang ini." };
    }

    const created = await prisma.promotionRule.create({
      data: {
        outletId: data.outletId,
        name: data.name,
        code: data.code || null,
        discountType: data.discountType as DiscountType,
        discountValue: data.discountValue,
        minOrderAmount:
          data.minOrderAmount != null ? data.minOrderAmount : null,
        daysOfWeek:
          data.daysOfWeek && data.daysOfWeek.length > 0
            ? data.daysOfWeek
            : undefined,
        startHour: data.startHour || null,
        endHour: data.endHour || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive,
        description: data.description || null,
      },
    });

    revalidatePath("/dashboard/pengaturan/promosi");
    revalidatePath("/pos");
    revalidatePath("/pos/antrean");

    return { success: true, data: { id: created.id } };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal membuat aturan promosi.",
    };
  }
}

/**
 * Mengubah status aktif / nonaktif aturan promosi (Toggle).
 */
export async function togglePromotionAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<{ id: string; isActive: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const promo = await prisma.promotionRule.findUnique({ where: { id } });
    if (!promo) {
      return { success: false, error: "Promosi tidak ditemukan." };
    }

    const updated = await prisma.promotionRule.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/dashboard/pengaturan/promosi");
    revalidatePath("/pos");

    return {
      success: true,
      data: { id: updated.id, isActive: updated.isActive },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengubah status promosi.",
    };
  }
}

/**
 * Menghapus aturan promosi.
 */
export async function deletePromotionAction(
  id: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    await prisma.promotionRule.delete({ where: { id } });

    revalidatePath("/dashboard/pengaturan/promosi");
    revalidatePath("/pos");

    return { success: true, data: { id } };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus aturan promosi.",
    };
  }
}

/**
 * Mengevaluasi diskon yang berlaku secara real-time untuk transaksi kasir.
 */
export async function evaluateOutletDiscountsAction(
  outletId: string,
  subtotal: number,
  couponCode?: string
): Promise<ActionResponse<DiscountCalculationSummary>> {
  try {
    const promotions = await prisma.promotionRule.findMany({
      where: { outletId, isActive: true },
    });

    const summary = calculateDiscounts(subtotal, promotions, {
      couponCode,
      now: new Date(),
    });

    return { success: true, data: summary };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghitung diskon.",
    };
  }
}
