"use server";

import { getCurrentUser } from "@/lib/auth/session";
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
 * Status cabang kini 100% Bebas Biaya Langganan SaaS (Selalu Aktif)
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
    let outletName = "Kinclongin Cabang Utama";
    if (outletId) {
      const outlet = await prisma.outlet.findUnique({
        where: { id: outletId },
      });
      if (outlet) outletName = outlet.name;
    }

    return {
      success: true,
      data: {
        outletId: outletId || "default",
        outletName,
        status: "ACTIVE",
        expiresAt: null,
        daysRemaining: 9999,
        isGracePeriod: false,
        graceDaysRemaining: 0,
        isHardLocked: false,
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

export async function submitSubscriptionPaymentAction(): Promise<
  ActionResponse<{ paymentId: string; status: string }>
> {
  return {
    success: true,
    data: { paymentId: "free", status: "ACTIVE" },
  };
}

export async function verifySubscriptionPaymentAction(): Promise<
  ActionResponse<{ paymentId: string; status: string }>
> {
  return {
    success: true,
    data: { paymentId: "free", status: "ACTIVE" },
  };
}

export async function getPendingSubscriptionsAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      outletId: string;
      outletName: string;
      ownerName: string;
      amount: number;
      durationMonths: number;
      paymentMethod: string;
      proofImageUrl: string;
      submittedAt: string;
    }>
  >
> {
  return {
    success: true,
    data: [],
  };
}
