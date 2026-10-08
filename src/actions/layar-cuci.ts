"use server";

import { revalidatePath, updateTag } from "next/cache";

import { z } from "zod";

import { TicketStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { broadcastTicketEvent } from "@/lib/realtime/events";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const verifyWasherPinSchema = z.object({
  outletId: z.string().min(1, "ID Cabang wajib diisi"),
  pinCode: z.string().length(4, "PIN harus 4 digit angka"),
});

export type VerifyWasherPinInput = z.infer<typeof verifyWasherPinSchema>;

/**
 * Server Action untuk verifikasi PIN tukang cuci pada Layar Cuci tablet.
 */
export async function verifyWasherPinAction(
  input: VerifyWasherPinInput
): Promise<
  ActionResponse<{ employeeId: string; fullName: string; role: string }>
> {
  try {
    const parsed = verifyWasherPinSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Format PIN tidak valid (wajib 4 digit angka).",
      };
    }

    const { outletId, pinCode } = parsed.data;

    const employee = await prisma.employee.findFirst({
      where: {
        outletId,
        pinCode,
        isActive: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "PIN salah atau pekerja tidak terdaftar di cabang ini.",
      };
    }

    return {
      success: true,
      data: {
        employeeId: employee.id,
        fullName: employee.fullName,
        role: employee.role,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan verifikasi PIN.";
    return {
      success: false,
      error: message,
    };
  }
}

const claimTicketSchema = z.object({
  ticketId: z.string().min(1, "ID Tiket wajib diisi"),
  washerEmployeeIds: z
    .array(z.string())
    .min(1, "Minimal pilih 1 pekerja cuci")
    .max(2, "Maksimal 2 pekerja per kendaraan"),
});

export type ClaimTicketInput = z.infer<typeof claimTicketSchema>;

/**
 * Server Action untuk mengklaim pengerjaan tiket oleh 1 atau 2 pekerja cuci,
 * membagi komisi otomatis, dan memajukan status menjadi WASHING.
 */
export async function claimTicketAction(
  input: ClaimTicketInput
): Promise<
  ActionResponse<{ assignedWashers: string[]; status: TicketStatus }>
> {
  try {
    const parsed = claimTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Data klaim tiket tidak valid.",
      };
    }

    const { ticketId, washerEmployeeIds } = parsed.data;

    // Ambil data tiket beserta paket layanannya
    const ticket = await prisma.washTicket.findUnique({
      where: { id: ticketId },
      include: {
        servicePackage: true,
        washers: true,
      },
    });

    if (!ticket) {
      return {
        success: false,
        error: "Tiket cuci tidak ditemukan.",
      };
    }

    // Proteksi IDOR: Pastikan seluruh washer yang diklaim terdaftar di cabang outlet tiket ini
    const validEmployees = await prisma.employee.findMany({
      where: {
        id: { in: washerEmployeeIds },
        outletId: ticket.outletId,
        isActive: true,
      },
    });

    if (validEmployees.length !== washerEmployeeIds.length) {
      return {
        success: false,
        error:
          "Satu atau lebih pekerja cuci tidak terdaftar aktif di cabang tiket ini.",
      };
    }

    // Ambil nilai komisi default dari paket layanan
    const totalCommission = Number(ticket.servicePackage.defaultCommission);
    const washerCount = washerEmployeeIds.length;

    // Hitung komisi per washer (100% jika sendiri, 50% jika berdua)
    const commissionPerWasher =
      washerCount === 2 ? Math.floor(totalCommission / 2) : totalCommission;

    // Hapus penugasan washer lama pada tiket ini
    await prisma.ticketWasher.deleteMany({
      where: { ticketId },
    });

    // Simpan penugasan washer baru dengan komisi masing-masing
    for (const employeeId of washerEmployeeIds) {
      await prisma.ticketWasher.create({
        data: {
          ticketId,
          employeeId,
          commissionAmount: commissionPerWasher,
          isPaidToWasher: false,
        },
      });
    }

    // Majukan status tiket menjadi WASHING jika sebelumnya QUEUED
    const shouldUpdateStatus = ticket.status === TicketStatus.QUEUED;
    const now = new Date();

    const updated = await prisma.washTicket.update({
      where: { id: ticketId },
      data: {
        status: shouldUpdateStatus ? TicketStatus.WASHING : ticket.status,
        washingStartedAt:
          ticket.washingStartedAt || (shouldUpdateStatus ? now : undefined),
      },
    });

    revalidatePath("/layar-cuci");
    revalidatePath("/pos/antrean");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    updateTag("dashboard-metrics");

    broadcastTicketEvent({
      type: "WASHER_ASSIGNED",
      outletId: ticket.outletId,
      ticketId,
      ticketNumber: ticket.ticketNumber,
      licensePlate: ticket.licensePlate,
      newStatus: updated.status,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      data: {
        assignedWashers: washerEmployeeIds,
        status: updated.status,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengklaim pengerjaan tiket.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action untuk mengambil rekap komisi & jumlah kendaraan washer pada shift hari ini.
 */
export async function getWasherShiftSummaryAction(employeeId: string): Promise<
  ActionResponse<{
    fullName: string;
    totalWashedToday: number;
    estimatedCommissionToday: number;
  }>
> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "Pekerja tidak ditemukan." };
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const assignments = await prisma.ticketWasher.findMany({
      where: {
        employeeId,
        assignedAt: { gte: todayStart },
      },
    });

    const totalWashedToday = assignments.length;
    const estimatedCommissionToday = assignments.reduce(
      (acc, item) => acc + Number(item.commissionAmount),
      0
    );

    return {
      success: true,
      data: {
        fullName: employee.fullName,
        totalWashedToday,
        estimatedCommissionToday,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat rekap shift.";
    return { success: false, error: message };
  }
}
