"use server";

import { revalidatePath } from "next/cache";

import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  PaymentStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  TicketStatus,
  UserRole,
  UserStatus,
  VehicleCategory,
  WhatsAppDeliveryStatus,
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

// ---------------------------------------------------------------------------
// 1. METRIK EKSEKUTIF & OVERVIEW SUPERADMIN PLATFORM
// ---------------------------------------------------------------------------

export interface SuperadminOverviewMetrics {
  totalOutlets: number;
  activeOutlets: number;
  gracePeriodOutlets: number;
  expiredOutlets: number;
  pendingApprovals: number;
  estimatedMRR: number;
  estimatedARR: number;
  totalPlatformRevenue: number;
  totalWashTicketsAllTime: number;
  totalPlatformGmv: number;
  totalUsersCount: number;
  usersByRole: {
    superadmins: number;
    owners: number;
    managers: number;
    cashiers: number;
    washers: number;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string;
    outletName?: string | null;
    createdAt: string;
  }>;
  monthlyOutletGrowth: Array<{
    month: string;
    newOutlets: number;
    totalRevenue: number;
  }>;
}

export async function getSuperadminOverviewAction(): Promise<
  ActionResponse<SuperadminOverviewMetrics>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    // Ambil data agregat secara paralel untuk performa maksimal
    const [
      outlets,
      pendingCount,
      approvedPayments,
      totalTickets,
      washPayments,
      users,
      recentLogs,
    ] = await Promise.all([
      prisma.outlet.findMany({
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          createdAt: true,
          isActive: true,
        },
      }),
      prisma.tenantSubscriptionPayment.count({
        where: { status: SubscriptionPaymentStatus.PENDING },
      }),
      prisma.tenantSubscriptionPayment.findMany({
        where: { status: SubscriptionPaymentStatus.APPROVED },
        select: { amount: true, createdAt: true },
      }),
      prisma.washTicket.count(),
      prisma.payment.aggregate({
        _sum: { totalAmount: true },
        where: { status: "PAID" },
      }),
      prisma.user.findMany({
        select: { role: true },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { fullName: true, role: true } },
          outlet: { select: { name: true } },
        },
      }),
    ]);

    const totalOutlets = outlets.length;
    let activeOutlets = 0;
    let gracePeriodOutlets = 0;
    let expiredOutlets = 0;

    outlets.forEach((o) => {
      if (o.subscriptionStatus === SubscriptionStatus.ACTIVE) activeOutlets++;
      else if (o.subscriptionStatus === SubscriptionStatus.GRACE_PERIOD)
        gracePeriodOutlets++;
      else if (o.subscriptionStatus === SubscriptionStatus.EXPIRED)
        expiredOutlets++;
      else activeOutlets++; // TRIAL
    });

    const totalPlatformRevenue = approvedPayments.reduce(
      (acc, p) => acc + Number(p.amount),
      0
    );

    // MRR = Cabang Aktif * Flat 50.000 / bulan
    const estimatedMRR = activeOutlets * 50000;
    const estimatedARR = estimatedMRR * 12;

    const totalPlatformGmv = Number(washPayments._sum.totalAmount || 0);

    const usersByRole = {
      superadmins: users.filter((u) => u.role === UserRole.SUPERADMIN).length,
      owners: users.filter((u) => u.role === UserRole.OWNER).length,
      managers: users.filter((u) => u.role === UserRole.MANAGER).length,
      cashiers: users.filter((u) => u.role === UserRole.CASHIER).length,
      washers: users.filter((u) => u.role === UserRole.WASHER).length,
    };

    // Format 6 bulan terakhir pertumbuhan
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const now = new Date();
    const monthlyOutletGrowth: Array<{
      month: string;
      newOutlets: number;
      totalRevenue: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const monthLabel = `${monthNames[mIdx]} ${y}`;

      const outletsInMonth = outlets.filter((o) => {
        const c = new Date(o.createdAt);
        return c.getMonth() === mIdx && c.getFullYear() === y;
      }).length;

      const revenueInMonth = approvedPayments
        .filter((p) => {
          const c = new Date(p.createdAt);
          return c.getMonth() === mIdx && c.getFullYear() === y;
        })
        .reduce((acc, p) => acc + Number(p.amount), 0);

      monthlyOutletGrowth.push({
        month: monthLabel,
        newOutlets: outletsInMonth,
        totalRevenue: revenueInMonth,
      });
    }

    const recentActivities = recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorName: log.actor?.fullName || "Sistem / Operator",
      actorRole: log.actor?.role || log.actorRole,
      outletName: log.outlet?.name || null,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        totalOutlets,
        activeOutlets,
        gracePeriodOutlets,
        expiredOutlets,
        pendingApprovals: pendingCount,
        estimatedMRR,
        estimatedARR,
        totalPlatformRevenue,
        totalWashTicketsAllTime: totalTickets,
        totalPlatformGmv,
        totalUsersCount: users.length,
        usersByRole,
        recentActivities,
        monthlyOutletGrowth,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil metrik ikhtisar Superadmin.",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. MANAJEMEN PENGGUNA GLOBAL PLATFORM
// ---------------------------------------------------------------------------

export interface PlatformUserItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  outletId?: string | null;
  outletName?: string | null;
  createdAt: string;
}

export async function getAllPlatformUsersAction(params?: {
  role?: string;
  status?: string;
  search?: string;
}): Promise<ActionResponse<PlatformUserItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const users = await prisma.user.findMany({
      where: {
        ...(params?.role && params.role !== "ALL"
          ? { role: params.role as UserRole }
          : {}),
        ...(params?.status && params.status !== "ALL"
          ? { status: params.status as UserStatus }
          : {}),
        ...(params?.search
          ? {
              OR: [
                { fullName: { contains: params.search } },
                { email: { contains: params.search } },
              ],
            }
          : {}),
      },
      include: {
        outlet: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        outletId: u.outletId,
        outletName: u.outlet?.name || null,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar pengguna platform.",
    };
  }
}

const toggleUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  newStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"] as const),
});

export async function togglePlatformUserStatusAction(
  input: z.infer<typeof toggleUserStatusSchema>
): Promise<ActionResponse<{ userId: string; status: string }>> {
  try {
    const operator = await getCurrentUser();
    if (!operator || !isSuperadmin(operator)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const parsed = toggleUserStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input status pengguna tidak valid." };
    }

    const { userId, newStatus } = parsed.data;

    // Larang suspend akun diri sendiri
    if (userId === operator.id) {
      return {
        success: false,
        error: "Anda tidak dapat mengubah status akun Anda sendiri.",
      };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
      select: { id: true, fullName: true, status: true, outletId: true },
    });

    await prisma.auditLog.create({
      data: {
        outletId: updated.outletId ?? undefined,
        actorId: operator.id,
        actorRole: operator.role,
        action: `SUPERADMIN_UPDATE_USER_STATUS_${newStatus}`,
        entityType: "User",
        entityId: updated.id,
        metadata: {
          targetUserName: updated.fullName,
          newStatus,
          operatorName: operator.fullName,
        },
      },
    });

    revalidatePath("/dashboard/admin/users");
    return {
      success: true,
      data: { userId: updated.id, status: updated.status },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengubah status akun pengguna.",
    };
  }
}

const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter"),
});

export async function resetPlatformUserPasswordAction(
  input: z.infer<typeof resetPasswordSchema>
): Promise<ActionResponse<{ message: string }>> {
  try {
    const operator = await getCurrentUser();
    if (!operator || !isSuperadmin(operator)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Format kata sandi tidak valid." };
    }

    const { userId, newPassword } = parsed.data;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { fullName: true, email: true, outletId: true },
    });

    await prisma.auditLog.create({
      data: {
        outletId: user.outletId ?? undefined,
        actorId: operator.id,
        actorRole: operator.role,
        action: "SUPERADMIN_RESET_USER_PASSWORD",
        entityType: "User",
        entityId: userId,
        metadata: {
          targetEmail: user.email,
          operator: operator.fullName,
        },
      },
    });

    return {
      success: true,
      data: {
        message: `Kata sandi akun ${user.fullName} (${user.email}) berhasil diperbarui.`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mereset kata sandi akun pengguna.",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. KESEHATAN SISTEM & INFRASTRUKTUR (HEALTH & DIAGNOSTICS)
// ---------------------------------------------------------------------------

export interface SystemHealthInfo {
  databaseStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  dbLatencyMs: number;
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  tableCounts: {
    outlets: number;
    users: number;
    employees: number;
    washTickets: number;
    payments: number;
    auditLogs: number;
    subscriptionPayments: number;
  };
  storageStatus: {
    provider: string;
    status: "READY" | "UNCONFIGURED";
    bucket: string;
  };
}

export async function getSystemHealthAction(): Promise<
  ActionResponse<SystemHealthInfo>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    // Ukur latensi basis data MySQL
    const t0 = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Math.round(performance.now() - t0);

    const [
      outlets,
      users,
      employees,
      washTickets,
      payments,
      auditLogs,
      subscriptionPayments,
    ] = await Promise.all([
      prisma.outlet.count(),
      prisma.user.count(),
      prisma.employee.count(),
      prisma.washTicket.count(),
      prisma.payment.count(),
      prisma.auditLog.count(),
      prisma.tenantSubscriptionPayment.count(),
    ]);

    const mem = process.memoryUsage();

    return {
      success: true,
      data: {
        databaseStatus: dbLatencyMs < 200 ? "HEALTHY" : "DEGRADED",
        dbLatencyMs,
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        },
        tableCounts: {
          outlets,
          users,
          employees,
          washTickets,
          payments,
          auditLogs,
          subscriptionPayments,
        },
        storageStatus: {
          provider: "SumoPod S3 Object Storage",
          status: process.env.S3_BUCKET_NAME ? "READY" : "UNCONFIGURED",
          bucket: process.env.S3_BUCKET_NAME || "kinclongin-storage-default",
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil diagnostik sistem.",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. PUSAT SIARAN PENGUMUMAN PLATFORM (BROADCAST CENTER)
// ---------------------------------------------------------------------------

const sendBroadcastSchema = z.object({
  title: z.string().trim().min(3, "Judul pengumuman minimal 3 karakter"),
  message: z.string().trim().min(10, "Isi pengumuman minimal 10 karakter"),
  targetAudience: z.enum(["ALL_OWNERS", "ALL_MANAGERS", "ALL_USERS"] as const),
  priority: z.enum(["INFO", "IMPORTANT", "CRITICAL"] as const).default("INFO"),
});

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;

export async function sendPlatformBroadcastAction(
  input: SendBroadcastInput
): Promise<ActionResponse<{ broadcastId: string; recipientCount: number }>> {
  try {
    const operator = await getCurrentUser();
    if (!operator || !isSuperadmin(operator)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const parsed = sendBroadcastSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input siaran tidak valid." };
    }

    const { title, message, targetAudience, priority } = parsed.data;

    let targetRoleFilter = {};
    if (targetAudience === "ALL_OWNERS") {
      targetRoleFilter = { role: UserRole.OWNER };
    } else if (targetAudience === "ALL_MANAGERS") {
      targetRoleFilter = { role: UserRole.MANAGER };
    }

    const recipientCount = await prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        ...targetRoleFilter,
      },
    });

    // Catat ke Audit Trail Platform sebagai riwayat broadcast
    const log = await prisma.auditLog.create({
      data: {
        actorId: operator.id,
        actorRole: operator.role,
        action: "PLATFORM_BROADCAST_SENT",
        entityType: "PlatformBroadcast",
        entityId: `broadcast-${Date.now()}`,
        metadata: {
          title,
          message,
          targetAudience,
          priority,
          recipientCount,
          operatorName: operator.fullName,
        },
      },
    });

    revalidatePath("/dashboard/admin/broadcast");

    return {
      success: true,
      data: {
        broadcastId: log.id,
        recipientCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengirim siaran pengumuman.",
    };
  }
}

export async function getBroadcastHistoryAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      title: string;
      message: string;
      targetAudience: string;
      priority: string;
      recipientCount: number;
      operatorName: string;
      createdAt: string;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const logs = await prisma.auditLog.findMany({
      where: { action: "PLATFORM_BROADCAST_SENT" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const data = logs.map((l) => {
      const meta = (l.metadata as Record<string, unknown>) || {};
      return {
        id: l.id,
        title: (meta.title as string) || "Pengumuman Sistem",
        message: (meta.message as string) || "",
        targetAudience: (meta.targetAudience as string) || "ALL_OWNERS",
        priority: (meta.priority as string) || "INFO",
        recipientCount: (meta.recipientCount as number) || 0,
        operatorName: (meta.operatorName as string) || "Superadmin",
        createdAt: l.createdAt.toISOString(),
      };
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat riwayat pengumuman.",
    };
  }
}

// ---------------------------------------------------------------------------
// 5. MONITORING TRANSAKSI CUCI NASIONAL (LIVE FEED & GMV)
// ---------------------------------------------------------------------------

export interface NationalTransactionItem {
  id: string;
  ticketNumber: string;
  outletId: string;
  outletName: string;
  licensePlate: string;
  vehicleCategory: string;
  serviceName: string;
  servicePrice: number;
  totalAmount: number;
  status: TicketStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | null;
  creatorName: string;
  customerName?: string | null;
  customerPhone?: string | null;
  washers: string[];
  queuedAt: string;
  completedAt?: string | null;
  inspectionPhotosCount: number;
}

export interface NationalTransactionsSummary {
  totalTickets: number;
  totalGmv: number;
  queuedCount: number;
  washingCount: number;
  readyCount: number;
  completedCount: number;
  cancelledCount: number;
  paidCount: number;
  unpaidCount: number;
}

export async function getNationalTransactionsAction(params?: {
  outletId?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<
  ActionResponse<{
    items: NationalTransactionItem[];
    summary: NationalTransactionsSummary;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const limit = Math.min(params?.limit ?? 60, 200);
    const search = params?.search?.trim() || "";

    const whereClause = {
      ...(params?.outletId && params.outletId !== "ALL"
        ? { outletId: params.outletId }
        : {}),
      ...(params?.status && params.status !== "ALL"
        ? { status: params.status as TicketStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search } },
              { licensePlate: { contains: search } },
              { outlet: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [tickets, allStatusCounts, totalGmvAgg] = await Promise.all([
      prisma.washTicket.findMany({
        where: whereClause,
        include: {
          outlet: { select: { id: true, name: true } },
          servicePackage: { select: { name: true, price: true } },
          creator: { select: { fullName: true } },
          customer: { select: { fullName: true, phone: true } },
          washers: {
            include: {
              washer: { select: { fullName: true } },
            },
          },
          payment: { select: { method: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.washTicket.groupBy({
        by: ["status"],
        _count: { id: true },
        where: params?.outletId && params.outletId !== "ALL" ? { outletId: params.outletId } : {},
      }),
      prisma.washTicket.aggregate({
        _sum: { totalAmount: true },
        where: {
          paymentStatus: PaymentStatus.PAID,
          ...(params?.outletId && params.outletId !== "ALL" ? { outletId: params.outletId } : {}),
        },
      }),
    ]);

    const countMap: Record<string, number> = {};
    for (const item of allStatusCounts) {
      countMap[item.status] = item._count.id;
    }

    const summary: NationalTransactionsSummary = {
      totalTickets: Object.values(countMap).reduce((a, b) => a + b, 0),
      totalGmv: Number(totalGmvAgg._sum.totalAmount || 0),
      queuedCount: countMap[TicketStatus.QUEUED] || 0,
      washingCount: countMap[TicketStatus.WASHING] || 0,
      readyCount: countMap[TicketStatus.READY] || 0,
      completedCount: countMap[TicketStatus.COMPLETED] || 0,
      cancelledCount: countMap[TicketStatus.CANCELLED] || 0,
      paidCount: tickets.filter((t) => t.paymentStatus === PaymentStatus.PAID).length,
      unpaidCount: tickets.filter((t) => t.paymentStatus === PaymentStatus.UNPAID).length,
    };

    const items: NationalTransactionItem[] = tickets.map((t) => {
      const photos = Array.isArray(t.inspectionPhotos) ? t.inspectionPhotos : [];
      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        outletId: t.outletId,
        outletName: t.outlet.name,
        licensePlate: t.licensePlate,
        vehicleCategory: t.vehicleCategory,
        serviceName: t.servicePackage.name,
        servicePrice: Number(t.servicePrice),
        totalAmount: Number(t.totalAmount),
        status: t.status,
        paymentStatus: t.paymentStatus,
        paymentMethod: t.payment?.method || null,
        creatorName: t.creator.fullName,
        customerName: t.customer?.fullName || null,
        customerPhone: t.customer?.phone || null,
        washers: t.washers.map((w) => w.washer.fullName),
        queuedAt: t.queuedAt.toISOString(),
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        inspectionPhotosCount: photos.length,
      };
    });

    return { success: true, data: { items, summary } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat transaksi cuci nasional.",
    };
  }
}

// ---------------------------------------------------------------------------
// 6. MONITORING LOG WHATSAPP GATEWAY PLATFORM
// ---------------------------------------------------------------------------

export interface PlatformWhatsAppLogItem {
  id: string;
  ticketNumber: string;
  outletName: string;
  recipientPhone: string;
  messageType: string;
  status: WhatsAppDeliveryStatus;
  externalId?: string | null;
  sentAt: string;
}

export async function getPlatformWhatsAppLogsAction(params?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<
  ActionResponse<{
    logs: PlatformWhatsAppLogItem[];
    stats: {
      totalLogs: number;
      delivered: number;
      sent: number;
      failed: number;
      pending: number;
    };
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const limit = Math.min(params?.limit ?? 50, 100);
    const search = params?.search?.trim() || "";

    const whereClause = {
      ...(params?.status && params.status !== "ALL"
        ? { status: params.status as WhatsAppDeliveryStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { recipientPhone: { contains: search } },
              { ticket: { ticketNumber: { contains: search } } },
              { ticket: { outlet: { name: { contains: search } } } },
            ],
          }
        : {}),
    };

    const [logs, statsGroup] = await Promise.all([
      prisma.whatsAppLog.findMany({
        where: whereClause,
        include: {
          ticket: {
            select: {
              ticketNumber: true,
              outlet: { select: { name: true } },
            },
          },
        },
        orderBy: { sentAt: "desc" },
        take: limit,
      }),
      prisma.whatsAppLog.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    const statMap: Record<string, number> = {};
    for (const s of statsGroup) {
      statMap[s.status] = s._count.id;
    }

    const stats = {
      totalLogs: Object.values(statMap).reduce((a, b) => a + b, 0),
      delivered: statMap[WhatsAppDeliveryStatus.DELIVERED] || 0,
      sent: statMap[WhatsAppDeliveryStatus.SENT] || 0,
      failed: statMap[WhatsAppDeliveryStatus.FAILED] || 0,
      pending: statMap[WhatsAppDeliveryStatus.PENDING] || 0,
    };

    const formattedLogs: PlatformWhatsAppLogItem[] = logs.map((l) => ({
      id: l.id,
      ticketNumber: l.ticket.ticketNumber,
      outletName: l.ticket.outlet.name,
      recipientPhone: l.recipientPhone,
      messageType: l.messageType,
      status: l.status,
      externalId: l.externalId,
      sentAt: l.sentAt.toISOString(),
    }));

    return { success: true, data: { logs: formattedLogs, stats } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat log WhatsApp platform.",
    };
  }
}

// ---------------------------------------------------------------------------
// 7. INSPEKTUR MEDIA & PENYIMPANAN CLOUD OBJECT STORAGE (S3)
// ---------------------------------------------------------------------------

export interface PlatformStorageStats {
  totalOutletsWithLogo: number;
  totalSubscriptionProofs: number;
  totalInspectionPhotosEstimate: number;
  totalCashierPaymentProofs: number;
  estimatedStorageMb: number;
  recentMediaUploads: Array<{
    id: string;
    type: "LOGO" | "SUBSCRIPTION_PROOF" | "INSPECTION_PHOTO" | "PAYMENT_PROOF";
    label: string;
    outletName?: string | null;
    url: string;
    createdAt: string;
  }>;
}

export async function getPlatformStorageStatsAction(): Promise<
  ActionResponse<PlatformStorageStats>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const [outletsWithLogo, subPayments, paymentProofs, recentTickets] =
      await Promise.all([
        prisma.outlet.findMany({
          where: { logoUrl: { not: null } },
          select: { id: true, name: true, logoUrl: true, updatedAt: true },
          take: 10,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.tenantSubscriptionPayment.findMany({
          where: { paymentProofUrl: { not: "" } },
          include: { outlet: { select: { name: true } } },
          take: 10,
          orderBy: { createdAt: "desc" },
        }),
        prisma.payment.findMany({
          where: { proofImageUrl: { not: null } },
          include: { outlet: { select: { name: true } } },
          take: 10,
          orderBy: { paidAt: "desc" },
        }),
        prisma.washTicket.findMany({
          select: { id: true, inspectionPhotos: true },
          take: 200,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Estimasi total foto inspeksi
    let totalInspectionCount = 0;
    for (const t of recentTickets) {
      if (Array.isArray(t.inspectionPhotos)) {
        totalInspectionCount += t.inspectionPhotos.length;
      }
    }

    const totalSubProofs = await prisma.tenantSubscriptionPayment.count();
    const totalOutletsLogoCount = await prisma.outlet.count({
      where: { logoUrl: { not: null } },
    });
    const totalPosPaymentProofs = await prisma.payment.count({
      where: { proofImageUrl: { not: null } },
    });

    // Rata-rata 400KB per gambar terkompresi
    const estimatedFiles =
      totalInspectionCount +
      totalSubProofs +
      totalOutletsLogoCount +
      totalPosPaymentProofs;
    const estimatedStorageMb = Math.round((estimatedFiles * 0.4) * 10) / 10;

    const recentMediaUploads: PlatformStorageStats["recentMediaUploads"] = [];

    for (const o of outletsWithLogo) {
      if (o.logoUrl) {
        recentMediaUploads.push({
          id: `logo-${o.id}`,
          type: "LOGO",
          label: `Logo Cabang: ${o.name}`,
          outletName: o.name,
          url: o.logoUrl,
          createdAt: o.updatedAt.toISOString(),
        });
      }
    }

    for (const s of subPayments) {
      if (s.paymentProofUrl) {
        recentMediaUploads.push({
          id: `sub-${s.id}`,
          type: "SUBSCRIPTION_PROOF",
          label: `Bukti Sewa 50k (${s.outlet.name})`,
          outletName: s.outlet.name,
          url: s.paymentProofUrl,
          createdAt: s.createdAt.toISOString(),
        });
      }
    }

    for (const p of paymentProofs) {
      if (p.proofImageUrl) {
        recentMediaUploads.push({
          id: `pay-${p.id}`,
          type: "PAYMENT_PROOF",
          label: `Bukti Bayar POS (${p.outlet.name})`,
          outletName: p.outlet.name,
          url: p.proofImageUrl,
          createdAt: p.paidAt.toISOString(),
        });
      }
    }

    // Urutkan media terbaru
    recentMediaUploads.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      success: true,
      data: {
        totalOutletsWithLogo: totalOutletsLogoCount,
        totalSubscriptionProofs: totalSubProofs,
        totalInspectionPhotosEstimate: totalInspectionCount,
        totalCashierPaymentProofs: totalPosPaymentProofs,
        estimatedStorageMb,
        recentMediaUploads: recentMediaUploads.slice(0, 20),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat statistik media penyimpanan.",
    };
  }
}

// ---------------------------------------------------------------------------
// 8. MASTER KATALOG & TEMPLATE LAYANAN CUCI NASIONAL
// ---------------------------------------------------------------------------

export interface ServicePackageTemplate {
  name: string;
  category: VehicleCategory;
  defaultPrice: number;
  commissionWasher: number;
  description: string;
  recommendedDurationMinutes: number;
}

const DEFAULT_PLATFORM_SERVICE_TEMPLATES: ServicePackageTemplate[] = [
  {
    name: "Cuci Body Standar Mobil",
    category: VehicleCategory.MOBIL_KECIL,
    defaultPrice: 35000,
    commissionWasher: 8000,
    description: "Cuci sampo salju pH balance, semir ban, & vacuum interior ringan.",
    recommendedDurationMinutes: 25,
  },
  {
    name: "Cuci Hidrolik + Kolong Bersih Mobil",
    category: VehicleCategory.MOBIL_SEDANG,
    defaultPrice: 50000,
    commissionWasher: 12000,
    description: "Angkat hidrolik X, semprot lumpur kolong chasis, sampo salju, semir ban & vacuum.",
    recommendedDurationMinutes: 35,
  },
  {
    name: "Cuci Hidrolik Mobil Besar / SUV",
    category: VehicleCategory.MOBIL_BESAR,
    defaultPrice: 65000,
    commissionWasher: 15000,
    description: "Cuci hidrolik SUV/MPV besar, semprot kolong, semir ban, interior vacuum & fogging.",
    recommendedDurationMinutes: 45,
  },
  {
    name: "Cuci Motor Reguler Bebek / Matik",
    category: VehicleCategory.MOTOR_KECIL,
    defaultPrice: 15000,
    commissionWasher: 4000,
    description: "Sampo salju tebal, sikat velg rantai, lap microfiber kanebo & semir ban.",
    recommendedDurationMinutes: 15,
  },
  {
    name: "Cuci Motor Matik Gambot / 150cc+",
    category: VehicleCategory.MOTOR_BESAR,
    defaultPrice: 20000,
    commissionWasher: 5000,
    description: "Cuci detail bodi, ruang kolong spakbor, sikat knalpot & semir silikon bodi kasar.",
    recommendedDurationMinutes: 20,
  },
  {
    name: "Cuci Moge / Sport 250cc+",
    category: VehicleCategory.MOTOR_MOGE,
    defaultPrice: 35000,
    commissionWasher: 10000,
    description: "Perawatan rantai chain lube, sampo gloss, pembersihan radiator & waxing ringan.",
    recommendedDurationMinutes: 30,
  },
  {
    name: "Poles Kaca Jamur Depan & Samping",
    category: VehicleCategory.MOBIL_SEDANG,
    defaultPrice: 75000,
    commissionWasher: 20000,
    description: "Compound pembersih kerak air dan jamur kaca agar pandangan jernih saat hujan.",
    recommendedDurationMinutes: 40,
  },
  {
    name: "Nano Ceramic Wax & Paint Protection",
    category: VehicleCategory.MOBIL_SEDANG,
    defaultPrice: 120000,
    commissionWasher: 35000,
    description: "Pelapisan sealent hydrophobic kilap basah (wet look) tahan air & debu.",
    recommendedDurationMinutes: 60,
  },
];

export async function getPlatformCatalogTemplateAction(): Promise<
  ActionResponse<{
    templates: ServicePackageTemplate[];
    totalOutletServicesCount: number;
    popularServicesAcrossTenants: Array<{ name: string; count: number }>;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const [totalCount, popularGroup] = await Promise.all([
      prisma.servicePackage.count(),
      prisma.servicePackage.groupBy({
        by: ["name"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
    ]);

    const popularServicesAcrossTenants = popularGroup.map((g) => ({
      name: g.name,
      count: g._count.id,
    }));

    return {
      success: true,
      data: {
        templates: DEFAULT_PLATFORM_SERVICE_TEMPLATES,
        totalOutletServicesCount: totalCount,
        popularServicesAcrossTenants,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat template katalog platform.",
    };
  }
}

// ---------------------------------------------------------------------------
// 9. PENGATURAN PLATFORM & REKENING RESMI SEWA 50K
// ---------------------------------------------------------------------------

export interface PlatformSettingsData {
  platformName: string;
  monthlyRentalPrice: number;
  gracePeriodDays: number;
  supportPhone: string;
  supportEmail: string;
  bankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    code: string;
  }>;
  qrisImageUrl?: string | null;
  qrisHolderName: string;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsData = {
  platformName: "Kinclongin POS B2B Platform",
  monthlyRentalPrice: 50000,
  gracePeriodDays: 3,
  supportPhone: "6281234567890",
  supportEmail: "support@kinclongin.com",
  bankAccounts: [
    {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "8735098123",
      accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
      code: "BCA",
    },
    {
      bankName: "Bank Mandiri",
      accountNumber: "1420019882310",
      accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
      code: "MANDIRI",
    },
    {
      bankName: "Bank Rakyat Indonesia (BRI)",
      accountNumber: "002101009876502",
      accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
      code: "BRI",
    },
  ],
  qrisImageUrl: "/qris-kinclongin-demo.png",
  qrisHolderName: "KINCLONGIN DIGITAL NUSANTARA QRIS",
};

export async function getPlatformSettingsAction(): Promise<
  ActionResponse<PlatformSettingsData>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    const configLog = await prisma.auditLog.findFirst({
      where: { action: "PLATFORM_SETTINGS_UPDATED" },
      orderBy: { createdAt: "desc" },
    });

    if (configLog && configLog.metadata) {
      const data = configLog.metadata as unknown as PlatformSettingsData;
      return { success: true, data };
    }

    return { success: true, data: DEFAULT_PLATFORM_SETTINGS };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat pengaturan platform.",
    };
  }
}

export async function savePlatformSettingsAction(
  data: PlatformSettingsData
): Promise<ActionResponse<PlatformSettingsData>> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "PLATFORM_SETTINGS_UPDATED",
        entityType: "PlatformSettings",
        entityId: "GLOBAL",
        metadata: {
          platformName: data.platformName,
          monthlyRentalPrice: data.monthlyRentalPrice,
          gracePeriodDays: data.gracePeriodDays,
          supportPhone: data.supportPhone,
          supportEmail: data.supportEmail,
          bankAccounts: data.bankAccounts,
          qrisImageUrl: data.qrisImageUrl ?? null,
          qrisHolderName: data.qrisHolderName,
        },
      },
    });

    revalidatePath("/dashboard/admin/settings");
    revalidatePath("/dashboard/pengaturan/langganan");

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan konfigurasi platform.",
    };
  }
}

// ---------------------------------------------------------------------------
// 10. SUPERADMIN OUTLET SWITCHER / IMPERSONASI CABANG (VIEW-AS OUTLET)
// ---------------------------------------------------------------------------

export async function setSuperadminActiveOutletAction(
  targetOutletId: string | null
): Promise<ActionResponse<{ outletId: string | null; outletName?: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error: "Akses ditolak. Khusus Superadmin Platform.",
      };
    }

    let outletName: string | undefined;

    if (targetOutletId) {
      const outlet = await prisma.outlet.findUnique({
        where: { id: targetOutletId },
        select: { id: true, name: true },
      });
      if (!outlet) {
        return { success: false, error: "Cabang outlet tidak ditemukan." };
      }
      outletName = outlet.name;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { outletId: targetOutletId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pos");
    revalidatePath("/pos/antrean");
    revalidatePath("/layar-cuci");

    return {
      success: true,
      data: { outletId: targetOutletId, outletName },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengganti cabang aktif Superadmin.",
    };
  }
}
