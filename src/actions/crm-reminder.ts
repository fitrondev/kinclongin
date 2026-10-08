"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  formatIndonesianPhone,
  sendWhatsAppReengagementReminder,
} from "@/lib/whatsapp/sender";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface ReengagementVehicleItem {
  vehicleId: string;
  licensePlate: string;
  vehicleCategory: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lastVisitAt: string;
  daysSinceLastVisit: number;
  lastServiceName?: string;
  lastTicketNumber?: string;
  alreadyRemindedThisMonth: boolean;
  lastRemindedAt?: string | null;
}

/**
 * Mengambil daftar kendaraan pelanggan yang belum mampir cuci > 14 hari
 */
export async function getReengagementVehiclesAction(
  targetOutletId?: string
): Promise<ActionResponse<ReengagementVehicleItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const effectiveOutletId = targetOutletId || user.outletId;
    if (!effectiveOutletId) {
      return { success: false, error: "Outlet tidak ditemukan." };
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Ambil log reminder 30 hari terakhir untuk pencegahan spam
    const recentLogs = await prisma.whatsAppLog.findMany({
      where: {
        messageType: "CRM_REENGAGEMENT",
        sentAt: { gte: thirtyDaysAgo },
      },
      select: {
        recipientPhone: true,
        sentAt: true,
      },
    });

    const recentReminderMap = new Map<string, Date>();
    for (const log of recentLogs) {
      recentReminderMap.set(log.recipientPhone, log.sentAt);
    }

    // Ambil semua kendaraan yang memiliki riwayat cuci di outlet ini
    const vehicles = await prisma.vehicle.findMany({
      where: {
        washTickets: {
          some: {
            outletId: effectiveOutletId,
            status: { not: "CANCELLED" },
          },
        },
        customer: {
          isNot: null,
        },
      },
      include: {
        customer: true,
        washTickets: {
          where: {
            outletId: effectiveOutletId,
            status: { not: "CANCELLED" },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            servicePackage: {
              select: { name: true },
            },
          },
        },
      },
    });

    const results: ReengagementVehicleItem[] = [];

    for (const v of vehicles) {
      if (!v.customer) continue;
      const latestTicket = v.washTickets[0];
      if (!latestTicket) continue;

      // Filter: hanya yang kunjungan terakhirnya >= 14 hari yang lalu
      if (latestTicket.createdAt <= fourteenDaysAgo) {
        const daysDiff = Math.floor(
          (now.getTime() - latestTicket.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const formattedPhone = formatIndonesianPhone(v.customer.phone);
        const lastRemindedDate = recentReminderMap.get(formattedPhone);

        results.push({
          vehicleId: v.id,
          licensePlate: v.licensePlate,
          vehicleCategory: v.category,
          brand: v.brand,
          model: v.model,
          color: v.color,
          customerId: v.customer.id,
          customerName: v.customer.fullName,
          customerPhone: v.customer.phone,
          lastVisitAt: latestTicket.createdAt.toISOString(),
          daysSinceLastVisit: daysDiff,
          lastServiceName: latestTicket.servicePackage?.name,
          lastTicketNumber: latestTicket.ticketNumber,
          alreadyRemindedThisMonth: !!lastRemindedDate,
          lastRemindedAt: lastRemindedDate
            ? lastRemindedDate.toISOString()
            : null,
        });
      }
    }

    // Urutkan berdasarkan yang paling lama belum berkunjung
    results.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);

    return { success: true, data: results };
  } catch (error) {
    console.error("[CRM Reminder Action] Gagal memuat data:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat data re-engagement.",
    };
  }
}

/**
 * Mengirim pesan reminder CRM re-engagement untuk 1 kendaraan via WhatsApp
 */
export async function sendReengagementReminderAction(input: {
  outletId: string;
  vehicleId: string;
  promoOffer?: string;
}): Promise<ActionResponse<{ sent: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
      include: {
        customer: true,
        washTickets: {
          where: {
            outletId: input.outletId,
            status: { not: "CANCELLED" },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!vehicle || !vehicle.customer) {
      return {
        success: false,
        error: "Kendaraan atau pelanggan tidak ditemukan.",
      };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: input.outletId },
    });

    if (!outlet) {
      return { success: false, error: "Outlet tidak ditemukan." };
    }

    const latestTicket = vehicle.washTickets[0];
    const daysSinceLastVisit = latestTicket
      ? Math.floor(
          (Date.now() - latestTicket.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 14;

    const vehicleDesc = [vehicle.brand, vehicle.model, vehicle.color]
      .filter(Boolean)
      .join(" ");

    const res = await sendWhatsAppReengagementReminder({
      outletId: input.outletId,
      recipientPhone: vehicle.customer.phone,
      customerName: vehicle.customer.fullName,
      licensePlate: vehicle.licensePlate,
      vehicleDesc: vehicleDesc || undefined,
      daysSinceLastVisit: Math.max(14, daysSinceLastVisit),
      outletName: outlet.name,
      outletAddress: outlet.address,
      promoOffer:
        input.promoOffer || "Diskon 10% atau Gratis Semir Ban Premium",
      slogan: outlet.slogan,
    });

    if (!res.success) {
      return { success: false, error: "Gagal mengirim pesan WhatsApp." };
    }

    revalidatePath("/dashboard/pelanggan");
    return { success: true, data: { sent: true } };
  } catch (error) {
    console.error("[CRM Reminder Action] Send single error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengirim reminder.",
    };
  }
}

/**
 * Mengirim pesan reminder CRM re-engagement secara batch untuk banyak kendaraan sekaligus
 */
export async function batchSendReengagementRemindersAction(input: {
  outletId: string;
  vehicleIds: string[];
  promoOffer?: string;
}): Promise<ActionResponse<{ countSent: number; total: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    if (!input.vehicleIds || input.vehicleIds.length === 0) {
      return { success: false, error: "Pilih minimal 1 kendaraan." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: input.outletId },
    });

    if (!outlet) {
      return { success: false, error: "Outlet tidak ditemukan." };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Ambil recent logs agar tidak mengirim spam
    const recentLogs = await prisma.whatsAppLog.findMany({
      where: {
        messageType: "CRM_REENGAGEMENT",
        sentAt: { gte: thirtyDaysAgo },
      },
      select: { recipientPhone: true },
    });
    const sentPhones = new Set(recentLogs.map((l) => l.recipientPhone));

    const vehicles = await prisma.vehicle.findMany({
      where: {
        id: { in: input.vehicleIds },
        customer: { isNot: null },
      },
      include: {
        customer: true,
        washTickets: {
          where: {
            outletId: input.outletId,
            status: { not: "CANCELLED" },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    let countSent = 0;

    for (const vehicle of vehicles) {
      if (!vehicle.customer) continue;
      const formattedPhone = formatIndonesianPhone(vehicle.customer.phone);

      // Skip jika sudah dikirimi dalam 30 hari terakhir
      if (sentPhones.has(formattedPhone)) {
        continue;
      }

      const latestTicket = vehicle.washTickets[0];
      const daysSince = latestTicket
        ? Math.floor(
            (Date.now() - latestTicket.createdAt.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 14;

      const vehicleDesc = [vehicle.brand, vehicle.model, vehicle.color]
        .filter(Boolean)
        .join(" ");

      const result = await sendWhatsAppReengagementReminder({
        outletId: input.outletId,
        recipientPhone: vehicle.customer.phone,
        customerName: vehicle.customer.fullName,
        licensePlate: vehicle.licensePlate,
        vehicleDesc: vehicleDesc || undefined,
        daysSinceLastVisit: Math.max(14, daysSince),
        outletName: outlet.name,
        outletAddress: outlet.address,
        promoOffer:
          input.promoOffer || "Diskon 10% atau Gratis Semir Ban Premium",
        slogan: outlet.slogan,
      });

      if (result.success) {
        sentPhones.add(formattedPhone);
        countSent++;
      }
    }

    revalidatePath("/dashboard/pelanggan");
    return {
      success: true,
      data: { countSent, total: input.vehicleIds.length },
    };
  } catch (error) {
    console.error("[CRM Reminder Action] Batch send error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memproses batch reminder.",
    };
  }
}
