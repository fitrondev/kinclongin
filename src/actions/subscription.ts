"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import {
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { isSuperadmin } from "@/lib/auth/rbac";
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
  status: SubscriptionStatus;
  expiresAt: string | null;
  daysRemaining: number;
  isGracePeriod: boolean;
  graceDaysRemaining: number;
  isHardLocked: boolean;
  hasPendingPayment: boolean;
  pendingPaymentId?: string;
}

export interface TenantSubscriptionPaymentItem {
  id: string;
  outletId: string;
  outletName?: string;
  amount: number;
  periodMonths: number;
  paymentMethod: SubscriptionPaymentMethod;
  paymentProofUrl: string;
  status: SubscriptionPaymentStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

/**
 * Mengambil status lisensi cabang outlet aktif beserta kalkulasi grace period (3 hari)
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
      include: {
        subscriptionPayments: {
          where: { status: SubscriptionPaymentStatus.PENDING },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!outlet) {
      return { success: false, error: "Data outlet tidak ditemukan." };
    }

    const now = new Date();

    // Jika belum pernah diatur, default trial 30 hari sejak outlet dibuat
    const expiresAt =
      outlet.subscriptionExpiresAt ??
      new Date(outlet.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const diffMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
    let isGracePeriod = false;
    let graceDaysRemaining = 0;
    let isHardLocked = false;

    if (diffMs >= 0) {
      // Masih aktif dalam masa langganan
      status = SubscriptionStatus.ACTIVE;
      isGracePeriod = false;
      graceDaysRemaining = 0;
      isHardLocked = false;
    } else {
      // Melewati batas waktu (overdue)
      const overdueMs = Math.abs(diffMs);
      const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));

      // Masa tenggang (Grace Period): Hari 1 s.d. 3
      if (overdueDays <= 3) {
        status = SubscriptionStatus.GRACE_PERIOD;
        isGracePeriod = true;
        graceDaysRemaining = Math.max(0, 3 - overdueDays);
        isHardLocked = false;
      } else {
        // Melewati hari ke-3 -> Terkunci penuh (Hard Locked)
        status = SubscriptionStatus.EXPIRED;
        isGracePeriod = false;
        graceDaysRemaining = 0;
        isHardLocked = true;
      }
    }

    // Sinkronkan status DB jika berbeda
    if (outlet.subscriptionStatus !== status) {
      await prisma.outlet.update({
        where: { id: outlet.id },
        data: { subscriptionStatus: status },
      });
    }

    const pendingPayment = outlet.subscriptionPayments[0];

    return {
      success: true,
      data: {
        outletId: outlet.id,
        outletName: outlet.name,
        status,
        expiresAt: expiresAt.toISOString(),
        daysRemaining: Math.max(0, daysRemaining),
        isGracePeriod,
        graceDaysRemaining,
        isHardLocked,
        hasPendingPayment: !!pendingPayment,
        pendingPaymentId: pendingPayment?.id,
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

const submitSubscriptionPaymentSchema = z.object({
  outletId: z.string().min(1, "Outlet ID wajib diisi"),
  periodMonths: z.number().int().min(1).max(24).default(1),
  paymentMethod: z
    .enum(["MANUAL_TRANSFER", "QRIS"] as const)
    .default("MANUAL_TRANSFER"),
  paymentProofUrl: z
    .string()
    .min(1, "Bukti transfer pembayaran wajib diunggah"),
  notes: z.string().optional(),
});

export type SubmitSubscriptionPaymentInput = z.infer<
  typeof submitSubscriptionPaymentSchema
>;

/**
 * Mengirim bukti transfer pembayaran sewa lisensi flat Rp 50.000 / bulan
 */
export async function submitSubscriptionPaymentAction(
  input: SubmitSubscriptionPaymentInput
): Promise<ActionResponse<{ paymentId: string; status: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    // Validasi input
    const parsed = submitSubscriptionPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi data pembayaran gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { outletId, periodMonths, paymentMethod, paymentProofUrl, notes } =
      parsed.data;

    // Proteksi IDOR & Kepemilikan Cabang
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      return { success: false, error: "Cabang outlet tidak ditemukan." };
    }

    const isAuthorized =
      user.role === "OWNER" ||
      user.role === "MANAGER" ||
      outlet.ownerId === user.id ||
      outlet.id === user.outletId;

    if (!isAuthorized) {
      return {
        success: false,
        error:
          "Anda tidak memiliki izin mengajukan pembayaran untuk cabang ini.",
      };
    }

    // Tarif flat lisensi Rp 50.000 / bulan
    const amount = periodMonths * 50000;

    const payment = await prisma.tenantSubscriptionPayment.create({
      data: {
        outletId,
        amount,
        periodMonths,
        paymentMethod:
          paymentMethod === "QRIS"
            ? SubscriptionPaymentMethod.QRIS
            : SubscriptionPaymentMethod.MANUAL_TRANSFER,
        paymentProofUrl,
        status: SubscriptionPaymentStatus.PENDING,
        notes: notes?.trim() || null,
      },
    });

    // Catat Audit Trail
    await prisma.auditLog.create({
      data: {
        outletId,
        actorId: user.id,
        actorRole: user.role,
        action: "SUBSCRIPTION_PAYMENT_SUBMITTED",
        entityType: "TenantSubscriptionPayment",
        entityId: payment.id,
        metadata: {
          periodMonths,
          amount,
          paymentMethod,
        },
      },
    });

    revalidatePath("/dashboard/pengaturan/langganan");
    revalidatePath("/dashboard");
    revalidatePath("/pos");

    return {
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengirim bukti pembayaran langganan.",
    };
  }
}

/**
 * Mengambil riwayat pengajuan dan verifikasi sewa lisensi cabang outlet
 */
export async function getSubscriptionHistoryAction(
  targetOutletId?: string
): Promise<ActionResponse<TenantSubscriptionPaymentItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    const outletId = targetOutletId || user.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang outlet tidak ditemukan." };
    }

    const payments = await prisma.tenantSubscriptionPayment.findMany({
      where: { outletId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        outletId: p.outletId,
        amount: Number(p.amount),
        periodMonths: p.periodMonths,
        paymentMethod: p.paymentMethod,
        paymentProofUrl: p.paymentProofUrl,
        status: p.status,
        notes: p.notes,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt.toISOString(),
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
        verifiedBy: p.verifiedBy,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil riwayat pembayaran langganan.",
    };
  }
}

const verifySubscriptionPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID wajib diisi"),
  action: z.enum(["APPROVE", "REJECT"] as const),
  rejectionReason: z.string().optional(),
});

export type VerifySubscriptionPaymentInput = z.infer<
  typeof verifySubscriptionPaymentSchema
>;

/**
 * Verifikasi & Approval Pembayaran Sewa Lisensi oleh Superadmin Platform
 */
export async function verifySubscriptionPaymentAction(
  input: VerifySubscriptionPaymentInput
): Promise<ActionResponse<{ paymentId: string; status: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (!isSuperadmin(user)) {
      return {
        success: false,
        error:
          "Hanya Superadmin Platform yang berhak memverifikasi pembayaran sewa lisensi.",
      };
    }

    const parsed = verifySubscriptionPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input verifikasi tidak valid." };
    }

    const { paymentId, action, rejectionReason } = parsed.data;

    const payment = await prisma.tenantSubscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { outlet: true },
    });

    if (!payment) {
      return { success: false, error: "Data pembayaran tidak ditemukan." };
    }

    const verifierName = user.fullName || user.email;

    if (action === "APPROVE") {
      const now = new Date();
      // Tambahkan 30 hari * durasi bulan
      const extensionMs = payment.periodMonths * 30 * 24 * 60 * 60 * 1000;

      let baseDate = now;
      if (
        payment.outlet.subscriptionExpiresAt &&
        payment.outlet.subscriptionExpiresAt > now
      ) {
        baseDate = payment.outlet.subscriptionExpiresAt;
      }

      const newExpiresAt = new Date(baseDate.getTime() + extensionMs);

      await prisma.$transaction([
        prisma.tenantSubscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: SubscriptionPaymentStatus.APPROVED,
            verifiedAt: now,
            verifiedBy: verifierName,
            rejectionReason: null,
          },
        }),
        prisma.outlet.update({
          where: { id: payment.outletId },
          data: {
            subscriptionExpiresAt: newExpiresAt,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
          },
        }),
        prisma.auditLog.create({
          data: {
            outletId: payment.outletId,
            actorId: user.id,
            actorRole: user.role,
            action: "SUBSCRIPTION_PAYMENT_APPROVED",
            entityType: "TenantSubscriptionPayment",
            entityId: payment.id,
            metadata: {
              newExpiresAt: newExpiresAt.toISOString(),
              periodMonths: payment.periodMonths,
            },
          },
        }),
      ]);

      revalidatePath("/dashboard/pengaturan/langganan");
      revalidatePath("/dashboard/admin/subscriptions");
      revalidatePath("/pos");

      return {
        success: true,
        data: { paymentId: payment.id, status: "APPROVED" },
      };
    } else {
      // REJECT
      const now = new Date();
      await prisma.$transaction([
        prisma.tenantSubscriptionPayment.update({
          where: { id: payment.id },
          data: {
            status: SubscriptionPaymentStatus.REJECTED,
            verifiedAt: now,
            verifiedBy: verifierName,
            rejectionReason:
              rejectionReason?.trim() ||
              "Bukti bayar tidak valid atau tidak terbaca",
          },
        }),
        prisma.auditLog.create({
          data: {
            outletId: payment.outletId,
            actorId: user.id,
            actorRole: user.role,
            action: "SUBSCRIPTION_PAYMENT_REJECTED",
            entityType: "TenantSubscriptionPayment",
            entityId: payment.id,
            metadata: {
              rejectionReason,
            },
          },
        }),
      ]);

      revalidatePath("/dashboard/pengaturan/langganan");
      revalidatePath("/dashboard/admin/subscriptions");

      return {
        success: true,
        data: { paymentId: payment.id, status: "REJECTED" },
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memproses verifikasi pembayaran.",
    };
  }
}

/**
 * Mengambil seluruh antrean pembayaran langganan pending untuk portal Superadmin
 */
export interface PendingSubscriptionItem {
  id: string;
  outletId: string;
  outletName: string;
  outletSlug: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  amount: number;
  periodMonths: number;
  paymentMethod: string;
  paymentProofUrl: string;
  notes?: string | null;
  submittedAt: string;
}

export async function getPendingSubscriptionsAction(): Promise<
  ActionResponse<PendingSubscriptionItem[]>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (!isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin platform.",
      };
    }

    const pendingPayments = await prisma.tenantSubscriptionPayment.findMany({
      where: { status: SubscriptionPaymentStatus.PENDING },
      include: {
        outlet: {
          include: {
            owner: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: pendingPayments.map((p) => ({
        id: p.id,
        outletId: p.outletId,
        outletName: p.outlet.name,
        outletSlug: p.outlet.slug,
        ownerName: p.outlet.owner?.fullName || "Owner Outlet",
        ownerPhone: p.outlet.phone,
        ownerEmail: p.outlet.owner?.email || "-",
        amount: Number(p.amount),
        periodMonths: p.periodMonths,
        paymentMethod: p.paymentMethod,
        paymentProofUrl: p.paymentProofUrl,
        notes: p.notes,
        submittedAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar antrean pembayaran langganan.",
    };
  }
}

export interface PlatformMetrics {
  totalOutlets: number;
  activeOutlets: number;
  gracePeriodOutlets: number;
  expiredOutlets: number;
  pendingApprovals: number;
  estimatedMRR: number;
  totalRevenueAllTime: number;
}

/**
 * Task 7.3: Metrik Developer Platform (MRR & Status Lisensi Seluruh Outlet)
 */
export async function getPlatformMetricsAction(): Promise<
  ActionResponse<PlatformMetrics>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (!isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin platform.",
      };
    }

    const [outlets, pendingCount, approvedPayments] = await Promise.all([
      prisma.outlet.findMany({
        select: {
          id: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
          isActive: true,
        },
      }),
      prisma.tenantSubscriptionPayment.count({
        where: { status: SubscriptionPaymentStatus.PENDING },
      }),
      prisma.tenantSubscriptionPayment.findMany({
        where: { status: SubscriptionPaymentStatus.APPROVED },
        select: { amount: true },
      }),
    ]);

    const totalOutlets = outlets.length;
    let activeOutlets = 0;
    let gracePeriodOutlets = 0;
    let expiredOutlets = 0;

    outlets.forEach((o) => {
      if (o.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        activeOutlets++;
      } else if (o.subscriptionStatus === SubscriptionStatus.GRACE_PERIOD) {
        gracePeriodOutlets++;
      } else if (o.subscriptionStatus === SubscriptionStatus.EXPIRED) {
        expiredOutlets++;
      } else {
        // TRIAL or other
        activeOutlets++;
      }
    });

    const totalRevenueAllTime = approvedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    // Estimasi Pendapatan Bulanan: Total Outlet Aktif x Rp 50.000 (MRR Platform)
    const estimatedMRR = activeOutlets * 50000;

    return {
      success: true,
      data: {
        totalOutlets,
        activeOutlets,
        gracePeriodOutlets,
        expiredOutlets,
        pendingApprovals: pendingCount,
        estimatedMRR,
        totalRevenueAllTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil metrik platform.",
    };
  }
}

export interface TenantDirectoryItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  ownerName: string;
  ownerEmail: string;
  subscriptionExpiresAt: string | null;
  subscriptionStatus: SubscriptionStatus;
  isActive: boolean;
  createdAt: string;
  daysRemaining: number;
  totalTickets: number;
  totalPaymentsApproved: number;
}

/**
 * Task 7.3: Mengambil direktori seluruh cabang tenant tempat cuci untuk Superadmin
 */
export async function getAllTenantsAction(): Promise<
  ActionResponse<TenantDirectoryItem[]>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (!isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin platform.",
      };
    }

    const outlets = await prisma.outlet.findMany({
      include: {
        owner: true,
        _count: {
          select: {
            washTickets: true,
            subscriptionPayments: {
              where: { status: SubscriptionPaymentStatus.APPROVED },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const data: TenantDirectoryItem[] = outlets.map((o) => {
      const expiresAt =
        o.subscriptionExpiresAt ??
        new Date(o.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      const diffMs = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );

      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        address: o.address,
        phone: o.phone,
        ownerName: o.owner?.fullName || "Belum Terkait",
        ownerEmail: o.owner?.email || "-",
        subscriptionExpiresAt: expiresAt.toISOString(),
        subscriptionStatus: o.subscriptionStatus,
        isActive: o.isActive,
        createdAt: o.createdAt.toISOString(),
        daysRemaining,
        totalTickets: o._count.washTickets,
        totalPaymentsApproved: o._count.subscriptionPayments,
      };
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil direktori tenant.",
    };
  }
}

const toggleOutletLicenseSchema = z.object({
  outletId: z.string().min(1, "Outlet ID wajib diisi"),
  action: z.enum(["TOGGLE_ACTIVE", "EXTEND_30_DAYS", "SET_STATUS"]),
  newStatus: z
    .enum(["ACTIVE", "GRACE_PERIOD", "EXPIRED", "TRIAL"] as const)
    .optional(),
  isActive: z.boolean().optional(),
});

export type ToggleOutletLicenseInput = z.infer<
  typeof toggleOutletLicenseSchema
>;

/**
 * Task 7.3: Saklar darurat manual lisensi operasional outlet tertentu oleh Superadmin
 */
export async function toggleOutletLicenseAction(
  input: ToggleOutletLicenseInput
): Promise<ActionResponse<{ outletId: string; message: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (!isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin platform.",
      };
    }

    const parsed = toggleOutletLicenseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input saklar lisensi tidak valid." };
    }

    const { outletId, action, newStatus, isActive } = parsed.data;

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      return { success: false, error: "Data outlet tidak ditemukan." };
    }

    let message = "";

    if (action === "TOGGLE_ACTIVE") {
      const nextActive = isActive !== undefined ? isActive : !outlet.isActive;
      await prisma.outlet.update({
        where: { id: outlet.id },
        data: { isActive: nextActive },
      });
      message = nextActive
        ? `Lisensi cabang ${outlet.name} berhasil DIAKTIFKAN.`
        : `Lisensi cabang ${outlet.name} berhasil DINONAKTIFKAN (Saklar Darurat).`;
    } else if (action === "EXTEND_30_DAYS") {
      const now = new Date();
      let baseDate = now;
      if (outlet.subscriptionExpiresAt && outlet.subscriptionExpiresAt > now) {
        baseDate = outlet.subscriptionExpiresAt;
      }
      const newExpiresAt = new Date(
        baseDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      await prisma.outlet.update({
        where: { id: outlet.id },
        data: {
          subscriptionExpiresAt: newExpiresAt,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          isActive: true,
        },
      });
      message = `Masa aktif cabang ${outlet.name} berhasil diperpanjang +30 hari (Komplementer Superadmin).`;
    } else if (action === "SET_STATUS" && newStatus) {
      await prisma.outlet.update({
        where: { id: outlet.id },
        data: { subscriptionStatus: newStatus as SubscriptionStatus },
      });
      message = `Status lisensi cabang ${outlet.name} diubah menjadi ${newStatus}.`;
    }

    // Catat Audit Trail Superadmin
    await prisma.auditLog.create({
      data: {
        outletId: outlet.id,
        actorId: user.id,
        actorRole: user.role,
        action: "SUPERADMIN_TOGGLED_OUTLET_LICENSE",
        entityType: "Outlet",
        entityId: outlet.id,
        metadata: {
          action,
          newStatus,
          isActive,
          operator: user.fullName || user.email,
        },
      },
    });

    revalidatePath("/dashboard/admin/subscriptions");
    revalidatePath("/dashboard/pengaturan/langganan");
    revalidatePath("/pos");

    return {
      success: true,
      data: { outletId: outlet.id, message },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengubah status lisensi cabang.",
    };
  }
}

/**
 * Mengambil seluruh riwayat pembayaran sewa lisensi platform untuk audit keuangan
 */
export async function getAllSubscriptionPaymentsAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      outletId: string;
      outletName: string;
      amount: number;
      periodMonths: number;
      paymentMethod: string;
      paymentProofUrl: string;
      status: string;
      notes?: string | null;
      rejectionReason?: string | null;
      createdAt: string;
      verifiedAt?: string | null;
      verifiedBy?: string | null;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (!isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin platform.",
      };
    }

    const payments = await prisma.tenantSubscriptionPayment.findMany({
      include: {
        outlet: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        outletId: p.outletId,
        outletName: p.outlet.name,
        amount: Number(p.amount),
        periodMonths: p.periodMonths,
        paymentMethod: p.paymentMethod,
        paymentProofUrl: p.paymentProofUrl,
        status: p.status,
        notes: p.notes,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt.toISOString(),
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
        verifiedBy: p.verifiedBy,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil seluruh riwayat pembayaran langganan.",
    };
  }
}
