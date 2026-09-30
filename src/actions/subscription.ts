"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export interface SubscriptionStatusInfo {
  outletId: string;
  outletName: string;
  status: "TRIAL" | "ACTIVE" | "PENDING_VERIFICATION" | "EXPIRED";
  expiresAt: Date | null;
  daysRemaining: number;
  isGracePeriod: boolean;
  graceDaysRemaining: number;
  isHardLocked: boolean;
}

/**
 * Memeriksa status langganan cabang saat ini dan masa tenggang (Grace Period 3 hari).
 */
export async function getSubscriptionStatusAction(
  targetOutletId?: string
): Promise<ActionResponse<SubscriptionStatusInfo>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    const outletId = targetOutletId || user.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang outlet tidak ditemukan." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      return {
        success: false,
        error: "Data cabang tidak ditemukan di database.",
      };
    }

    const now = new Date();
    const expiresAt = outlet.subscriptionExpiresAt;

    let daysRemaining = 0;
    let isGracePeriod = false;
    let graceDaysRemaining = 0;
    let isHardLocked = false;

    if (expiresAt) {
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      daysRemaining = diffDays;

      if (diffDays < 0) {
        // Masa aktif telah lewat
        const daysPast = Math.abs(diffDays);
        if (daysPast <= 3) {
          isGracePeriod = true;
          graceDaysRemaining = 3 - daysPast;
        } else {
          isHardLocked = true;
        }
      }
    }

    const rawStatus =
      outlet.subscriptionStatus as SubscriptionStatusInfo["status"];
    const status: SubscriptionStatusInfo["status"] =
      rawStatus === "TRIAL" ||
      rawStatus === "ACTIVE" ||
      rawStatus === "PENDING_VERIFICATION" ||
      rawStatus === "EXPIRED"
        ? rawStatus
        : "ACTIVE";

    return {
      success: true,
      data: {
        outletId: outlet.id,
        outletName: outlet.name,
        status,
        expiresAt,
        daysRemaining,
        isGracePeriod,
        graceDaysRemaining,
        isHardLocked,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal membaca status langganan.",
    };
  }
}

const submitPaymentSchema = z.object({
  outletId: z.string().optional(),
  durationMonths: z.number().int().min(1).max(24),
  paymentMethod: z.enum(["BANK_TRANSFER", "QRIS"]),
  proofImageUrl: z.string().url("URL bukti transfer tidak valid"),
});

/**
 * Mengajukan perpanjangan langganan cabang dengan mengunggah bukti bayar transfer/QRIS.
 * Tarif Flat Tunggal: Rp 50.000 / bulan.
 */
export async function submitSubscriptionPaymentAction(input: {
  outletId?: string;
  durationMonths: number;
  paymentMethod: "BANK_TRANSFER" | "QRIS";
  proofImageUrl: string;
}): Promise<ActionResponse<{ paymentId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    const parsed = submitPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Data pengajuan langganan tidak valid.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const outletId = parsed.data.outletId || user.outletId;
    if (!outletId) {
      return { success: false, error: "Outlet cabang tidak teridentifikasi." };
    }

    const { durationMonths, paymentMethod, proofImageUrl } = parsed.data;
    const amount = durationMonths * 50000; // Flat Rp 50.000 per bulan

    // Simpan mutasi pembayaran langganan berstatus PENDING
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.tenantSubscriptionPayment.create({
        data: {
          outletId,
          amount,
          durationMonths,
          paymentMethod,
          proofImageUrl,
          status: "PENDING",
        },
      });

      // Tandai status outlet menjadi PENDING_VERIFICATION
      await tx.outlet.update({
        where: { id: outletId },
        data: {
          subscriptionStatus: "PENDING_VERIFICATION",
        },
      });

      return p;
    });

    revalidatePath("/dashboard/pengaturan/langganan");
    revalidatePath("/dashboard/settings/subscription");
    revalidatePath("/dashboard/admin/subscriptions");

    return {
      success: true,
      data: { paymentId: payment.id },
    };
  } catch (error) {
    console.error("Gagal submit bukti langganan:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengajukan pembayaran langganan.",
    };
  }
}

/**
 * Superadmin approval verifikasi pembayaran langganan.
 * +30 hari per bulan dikalikan durationMonths.
 */
export async function verifySubscriptionPaymentAction(input: {
  paymentId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
}): Promise<ActionResponse<{ newExpiresAt?: Date }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (user.role !== UserRole.OWNER) {
      return {
        success: false,
        error: "Hanya Superadmin / Owner platform yang berhak memverifikasi.",
      };
    }

    const payment = await prisma.tenantSubscriptionPayment.findUnique({
      where: { id: input.paymentId },
      include: { outlet: true },
    });

    if (!payment) {
      return { success: false, error: "Data pembayaran tidak ditemukan." };
    }

    if (payment.status !== "PENDING") {
      return {
        success: false,
        error: `Pembayaran telah berstatus ${payment.status}.`,
      };
    }

    if (input.decision === "REJECT") {
      await prisma.tenantSubscriptionPayment.update({
        where: { id: input.paymentId },
        data: {
          status: "REJECTED",
          rejectionReason: input.rejectionReason || "Bukti bayar tidak sesuai.",
          verifiedAt: new Date(),
          verifiedById: user.id,
        },
      });

      revalidatePath("/dashboard/admin/subscriptions");
      return { success: true };
    }

    // Hitung perpanjangan tanggal masa aktif (+30 hari per bulan)
    const now = new Date();
    const currentExpiry = payment.outlet.subscriptionExpiresAt;
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const daysToAdd = payment.durationMonths * 30;

    const newExpiresAt = new Date(
      baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      await tx.tenantSubscriptionPayment.update({
        where: { id: input.paymentId },
        data: {
          status: "APPROVED",
          verifiedAt: new Date(),
          verifiedById: user.id,
        },
      });

      // 2. Perpanjang Outlet subscriptionExpiresAt
      await tx.outlet.update({
        where: { id: payment.outletId },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionExpiresAt: newExpiresAt,
        },
      });
    });

    revalidatePath("/dashboard/admin/subscriptions");
    revalidatePath("/dashboard/pengaturan/langganan");
    revalidatePath("/dashboard/settings/subscription");
    revalidatePath("/pos/antrean");
    revalidatePath("/pos/queue");

    return {
      success: true,
      data: { newExpiresAt },
    };
  } catch (error) {
    console.error("Gagal verifikasi pembayaran langganan:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memproses verifikasi.",
    };
  }
}

/**
 * Mengambil seluruh pengajuan pembayaran langganan untuk tinjauan Superadmin
 */
export async function getPendingSubscriptionsAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      outletId: string;
      outletName: string;
      amount: number;
      durationMonths: number;
      paymentMethod: string;
      proofImageUrl: string;
      status: string;
      rejectionReason: string | null;
      submittedAt: Date;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir." };
    }

    const payments = await prisma.tenantSubscriptionPayment.findMany({
      include: {
        outlet: {
          select: { name: true },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
    });

    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        outletId: p.outletId,
        outletName: p.outlet.name,
        amount: Number(p.amount),
        durationMonths: p.durationMonths,
        paymentMethod: p.paymentMethod,
        proofImageUrl: p.proofImageUrl,
        status: p.status,
        rejectionReason: p.rejectionReason,
        submittedAt: p.submittedAt,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar langganan.",
    };
  }
}
