"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// -------------------------------------------------------------
// SCHEMAS
// -------------------------------------------------------------

const workShiftSchema = z.object({
  name: z.string().min(2, "Nama shift minimal 2 karakter"),
  startTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Format jam mulai harus HH:mm (contoh: 07:30)"
    ),
  endTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Format jam selesai harus HH:mm (contoh: 15:30)"
    ),
  description: z.string().optional().nullable(),
  color: z.enum(["blue", "emerald", "amber", "purple", "rose"]).default("blue"),
  isActive: z.boolean().default(true),
});

const updateWorkShiftSchema = workShiftSchema.extend({
  id: z.string().min(1, "ID shift wajib disertakan"),
});

const assignShiftSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  shiftId: z.string().min(1, "Shift wajib dipilih"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  notes: z.string().optional().nullable(),
});

export type CreateWorkShiftInput = z.infer<typeof workShiftSchema>;
export type UpdateWorkShiftInput = z.infer<typeof updateWorkShiftSchema>;
export type AssignShiftInput = z.infer<typeof assignShiftSchema>;

export interface WorkShiftItem {
  id: string;
  outletId: string;
  name: string;
  startTime: string;
  endTime: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  assignedCount: number;
}

export interface ShiftEmployeeItem {
  id: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  pinCode: string | null;
  isActive: boolean;
}

export interface ShiftAssignmentItem {
  id: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  color: string;
  employeeId: string;
  employeeName: string;
  employeeRole: UserRole;
  date: string;
  notes: string | null;
}

export interface DailyRosterData {
  date: string;
  shifts: WorkShiftItem[];
  employees: ShiftEmployeeItem[];
  assignments: ShiftAssignmentItem[];
  stats: {
    totalAssigned: number;
    washersOnDuty: number;
    cashiersOnDuty: number;
    unassignedStaff: number;
  };
}

// -------------------------------------------------------------
// HELPER: Validate Authorization
// -------------------------------------------------------------

async function authorizeManagerOrOwner() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "Sesi Anda telah berakhir. Silakan masuk kembali." };
  }

  if (
    currentUser.role !== UserRole.OWNER &&
    currentUser.role !== UserRole.MANAGER
  ) {
    return {
      error:
        "Hanya Pemilik Bisnis (Owner) dan Manajer yang berwenang mengatur jadwal & shift kerja.",
    };
  }

  const outletId = currentUser.outletId;
  if (!outletId) {
    return { error: "Cabang outlet aktif tidak ditemukan pada akun Anda." };
  }

  return { currentUser, outletId };
}

// -------------------------------------------------------------
// ACTIONS
// -------------------------------------------------------------

/**
 * Mengambil daftar master template shift cabang (dengan auto-seed 3 shift default jika kosong)
 */
export async function getWorkShiftsAction(
  customOutletId?: string
): Promise<ActionResponse<WorkShiftItem[]>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const targetOutletId = customOutletId || authCheck.outletId;

    let shifts = await prisma.workShift.findMany({
      where: { outletId: targetOutletId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Auto-seed default standard shifts jika belum ada sama sekali
    if (shifts.length === 0) {
      await prisma.workShift.createMany({
        data: [
          {
            outletId: targetOutletId,
            name: "Shift Pagi (Buka)",
            startTime: "07:30",
            endTime: "15:30",
            description: "Persiapan buka lapak cuci & pembersihan awal",
            color: "emerald",
            isActive: true,
          },
          {
            outletId: targetOutletId,
            name: "Shift Siang (Peak)",
            startTime: "11:00",
            endTime: "18:30",
            description: "Jam sibuk antrean kendaraan siang hari",
            color: "blue",
            isActive: true,
          },
          {
            outletId: targetOutletId,
            name: "Shift Sore (Tutup)",
            startTime: "13:30",
            endTime: "21:30",
            description: "Pembersihan pit cuci & serah terima kasir tutup buku",
            color: "amber",
            isActive: true,
          },
        ],
      });

      shifts = await prisma.workShift.findMany({
        where: { outletId: targetOutletId },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { startTime: "asc" },
      });
    }

    const items: WorkShiftItem[] = shifts.map((s) => ({
      id: s.id,
      outletId: s.outletId,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      description: s.description,
      color: s.color || "blue",
      isActive: s.isActive,
      assignedCount: s._count.assignments,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error("Gagal mengambil master shift:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengambil data shift.",
    };
  }
}

/**
 * Membuat master shift baru
 */
export async function createWorkShiftAction(
  rawInput: CreateWorkShiftInput
): Promise<ActionResponse<WorkShiftItem>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const validation = workShiftSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: "Validasi gagal. Periksa input shift Anda.",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { name, startTime, endTime, description, color, isActive } =
      validation.data;

    const newShift = await prisma.workShift.create({
      data: {
        outletId: authCheck.outletId,
        name,
        startTime,
        endTime,
        description: description || null,
        color,
        isActive,
      },
    });

    // Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          outletId: authCheck.outletId,
          actorId: authCheck.currentUser.id,
          actorRole: authCheck.currentUser.role,
          action: "CREATE_WORK_SHIFT",
          entityType: "WorkShift",
          entityId: newShift.id,
          metadata: JSON.stringify({ name, startTime, endTime }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    revalidatePath("/dashboard/shift");

    return {
      success: true,
      data: {
        id: newShift.id,
        outletId: newShift.outletId,
        name: newShift.name,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        description: newShift.description,
        color: newShift.color,
        isActive: newShift.isActive,
        assignedCount: 0,
      },
    };
  } catch (error) {
    console.error("Gagal membuat shift:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membuat shift baru.",
    };
  }
}

/**
 * Mengubah data template shift
 */
export async function updateWorkShiftAction(
  rawInput: UpdateWorkShiftInput
): Promise<ActionResponse<WorkShiftItem>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const validation = updateWorkShiftSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: "Validasi gagal.",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { id, name, startTime, endTime, description, color, isActive } =
      validation.data;

    const updated = await prisma.workShift.update({
      where: { id, outletId: authCheck.outletId },
      data: {
        name,
        startTime,
        endTime,
        description: description || null,
        color,
        isActive,
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    revalidatePath("/dashboard/shift");

    return {
      success: true,
      data: {
        id: updated.id,
        outletId: updated.outletId,
        name: updated.name,
        startTime: updated.startTime,
        endTime: updated.endTime,
        description: updated.description,
        color: updated.color,
        isActive: updated.isActive,
        assignedCount: updated._count.assignments,
      },
    };
  } catch (error) {
    console.error("Gagal mengupdate shift:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui shift.",
    };
  }
}

/**
 * Menghapus template shift
 */
export async function deleteWorkShiftAction(
  id: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    await prisma.workShift.delete({
      where: { id, outletId: authCheck.outletId },
    });

    revalidatePath("/dashboard/shift");
    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("Gagal menghapus shift:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus shift.",
    };
  }
}

/**
 * Mengambil jadwal roster harian staf & penugasan pada tanggal tertentu
 */
export async function getDailyRosterAction(
  targetDateString: string,
  customOutletId?: string
): Promise<ActionResponse<DailyRosterData>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const targetOutletId = customOutletId || authCheck.outletId;

    // Normalisasi tanggal YYYY-MM-DD ke awal hari UTC
    const dateObj = new Date(targetDateString + "T00:00:00.000Z");

    // Ambil shifts
    const shiftsRes = await getWorkShiftsAction(targetOutletId);
    const shifts = shiftsRes.data || [];

    // Ambil seluruh karyawan aktif di cabang
    const employees = await prisma.employee.findMany({
      where: {
        outletId: targetOutletId,
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    });

    // Ambil penugasan pada tanggal tersebut
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        outletId: targetOutletId,
        date: dateObj,
      },
      include: {
        shift: true,
        employee: true,
      },
    });

    const assignmentItems: ShiftAssignmentItem[] = assignments.map((a) => ({
      id: a.id,
      shiftId: a.shiftId,
      shiftName: a.shift.name,
      startTime: a.shift.startTime,
      endTime: a.shift.endTime,
      color: a.shift.color || "blue",
      employeeId: a.employeeId,
      employeeName: a.employee.fullName,
      employeeRole: a.employee.role,
      date: targetDateString,
      notes: a.notes,
    }));

    const employeeItems: ShiftEmployeeItem[] = employees.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      role: e.role,
      phone: e.phone,
      pinCode: e.pinCode,
      isActive: e.isActive,
    }));

    const assignedEmployeeIds = new Set(
      assignmentItems.map((a) => a.employeeId)
    );
    const washersOnDuty = assignmentItems.filter(
      (a) => a.employeeRole === UserRole.WASHER
    ).length;
    const cashiersOnDuty = assignmentItems.filter(
      (a) => a.employeeRole === UserRole.CASHIER
    ).length;
    const unassignedStaff = employeeItems.filter(
      (e) => !assignedEmployeeIds.has(e.id)
    ).length;

    return {
      success: true,
      data: {
        date: targetDateString,
        shifts,
        employees: employeeItems,
        assignments: assignmentItems,
        stats: {
          totalAssigned: assignmentItems.length,
          washersOnDuty,
          cashiersOnDuty,
          unassignedStaff,
        },
      },
    };
  } catch (error) {
    console.error("Gagal mengambil data roster harian:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat jadwal shift harian.",
    };
  }
}

/**
 * Menugaskan staf ke shift harian (atau memperbarui jika sudah ada penugasan hari itu)
 */
export async function assignStaffShiftAction(
  rawInput: AssignShiftInput
): Promise<ActionResponse<ShiftAssignmentItem>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const validation = assignShiftSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: "Validasi penugasan shift gagal.",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { employeeId, shiftId, date, notes } = validation.data;
    const dateObj = new Date(date + "T00:00:00.000Z");

    const shift = await prisma.workShift.findUnique({
      where: { id: shiftId, outletId: authCheck.outletId },
    });
    if (!shift) {
      return {
        success: false,
        error: "Shift tidak ditemukan pada cabang ini.",
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, outletId: authCheck.outletId },
    });
    if (!employee) {
      return { success: false, error: "Karyawan tidak ditemukan." };
    }

    // Upsert assignment (1 employee, 1 shift per date)
    const assignment = await prisma.shiftAssignment.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: dateObj,
        },
      },
      update: {
        shiftId,
        notes: notes || null,
      },
      create: {
        outletId: authCheck.outletId,
        shiftId,
        employeeId,
        date: dateObj,
        notes: notes || null,
      },
      include: {
        shift: true,
        employee: true,
      },
    });

    // Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          outletId: authCheck.outletId,
          actorId: authCheck.currentUser.id,
          actorRole: authCheck.currentUser.role,
          action: "ASSIGN_SHIFT",
          entityType: "ShiftAssignment",
          entityId: assignment.id,
          metadata: JSON.stringify({
            employeeName: employee.fullName,
            shiftName: shift.name,
            date,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    revalidatePath("/dashboard/shift");

    return {
      success: true,
      data: {
        id: assignment.id,
        shiftId: assignment.shiftId,
        shiftName: assignment.shift.name,
        startTime: assignment.shift.startTime,
        endTime: assignment.shift.endTime,
        color: assignment.shift.color || "blue",
        employeeId: assignment.employeeId,
        employeeName: assignment.employee.fullName,
        employeeRole: assignment.employee.role,
        date,
        notes: assignment.notes,
      },
    };
  } catch (error) {
    console.error("Gagal menugaskan shift:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menetapkan shift staf.",
    };
  }
}

/**
 * Menghapus penugasan shift seorang staf
 */
export async function removeShiftAssignmentAction(
  assignmentId: string
): Promise<ActionResponse<{ removed: boolean }>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    await prisma.shiftAssignment.delete({
      where: { id: assignmentId, outletId: authCheck.outletId },
    });

    revalidatePath("/dashboard/shift");

    return { success: true, data: { removed: true } };
  } catch (error) {
    console.error("Gagal membatalkan shift:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membatalkan shift.",
    };
  }
}
