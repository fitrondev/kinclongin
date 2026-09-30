"use server";

import { revalidatePath } from "next/cache";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface WasherPayrollSummary {
  washerId: string;
  washerName: string;
  totalVehicles: number;
  soloCount: number;
  tandemCount: number;
  unpaidAmount: number;
  paidAmount: number;
  items: Array<{
    id: string;
    ticketId: string;
    ticketNumber: string;
    licensePlate: string;
    serviceName: string;
    commissionAmount: number;
    isShared: boolean;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}

/**
 * Mengambil ringkasan komisi tukang cuci berdasarkan filter cabang dan status pembayaran.
 */
export async function getPayrollSummaryAction(
  targetOutletId?: string,
  washerId?: string
): Promise<
  ActionResponse<{
    totalUnpaid: number;
    totalPaid: number;
    totalVehicles: number;
    washers: WasherPayrollSummary[];
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan login kembali." };
    }

    const outletId = targetOutletId || user.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang outlet tidak teridentifikasi." };
    }

    const whereClause: Record<string, unknown> = {
      ticket: { outletId },
    };

    if (washerId && washerId !== "ALL") {
      whereClause.employeeId = washerId;
    }

    const rawRecords = await prisma.ticketWasher.findMany({
      where: whereClause,
      include: {
        washer: true,
        ticket: {
          include: {
            servicePackage: true,
            washers: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    const washerMap = new Map<string, WasherPayrollSummary>();
    let totalUnpaid = 0;
    let totalPaid = 0;

    for (const rec of rawRecords) {
      const amount = Number(rec.commissionAmount);
      const isPaid = rec.paidAt !== null || rec.isPaidToWasher;
      const isShared = rec.ticket.washers.length > 1;

      if (isPaid) {
        totalPaid += amount;
      } else {
        totalUnpaid += amount;
      }

      if (!washerMap.has(rec.employeeId)) {
        washerMap.set(rec.employeeId, {
          washerId: rec.employeeId,
          washerName: rec.washer.fullName,
          totalVehicles: 0,
          soloCount: 0,
          tandemCount: 0,
          unpaidAmount: 0,
          paidAmount: 0,
          items: [],
        });
      }

      const summary = washerMap.get(rec.employeeId)!;
      summary.totalVehicles += 1;
      if (isShared) {
        summary.tandemCount += 1;
      } else {
        summary.soloCount += 1;
      }

      if (isPaid) {
        summary.paidAmount += amount;
      } else {
        summary.unpaidAmount += amount;
      }

      summary.items.push({
        id: rec.id,
        ticketId: rec.ticketId,
        ticketNumber: rec.ticket.ticketNumber,
        licensePlate: rec.ticket.licensePlate,
        serviceName: rec.ticket.servicePackage.name,
        commissionAmount: amount,
        isShared,
        createdAt: rec.assignedAt,
        paidAt: rec.paidAt,
      });
    }

    return {
      success: true,
      data: {
        totalUnpaid,
        totalPaid,
        totalVehicles: rawRecords.length,
        washers: Array.from(washerMap.values()),
      },
    };
  } catch (error) {
    console.error("Gagal mengambil data payroll komisi:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Terjadi kesalahan internal.",
    };
  }
}

/**
 * Mencairkan komisi tukang cuci (menandai paidAt = now() pada tiket terpilih).
 */
export async function markCommissionsPaidAction(
  ticketWasherIds: string[]
): Promise<ActionResponse<{ count: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan login kembali." };
    }

    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      return {
        success: false,
        error: "Hanya Owner atau Manajer yang dapat mencairkan komisi.",
      };
    }

    if (!ticketWasherIds || ticketWasherIds.length === 0) {
      return { success: false, error: "Tidak ada data komisi yang dipilih." };
    }

    const updated = await prisma.ticketWasher.updateMany({
      where: {
        id: { in: ticketWasherIds },
        paidAt: null,
      },
      data: {
        paidAt: new Date(),
      },
    });

    // Catat ke Audit Log
    if (user.outletId) {
      await prisma.auditLog.create({
        data: {
          outletId: user.outletId,
          actorId: user.id,
          actorRole: user.role,
          action: "COMMISSION_PAID",
          entityType: "TicketWasher",
          entityId: `batch_${updated.count}`,
          metadata: { count: updated.count, ids: ticketWasherIds.slice(0, 10) },
        },
      });
    }

    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard/analytics/payroll");

    return {
      success: true,
      data: { count: updated.count },
    };
  } catch (error) {
    console.error("Gagal mencairkan komisi:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mencairkan komisi.",
    };
  }
}
