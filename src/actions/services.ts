"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import {
  CommissionType,
  UserRole,
  VehicleCategory,
} from "@/generated/prisma/enums";
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

const servicePackageSchema = z.object({
  name: z.string().min(2, "Nama paket layanan minimal 2 karakter"),
  description: z.string().optional().nullable(),
  vehicleCategory: z.nativeEnum(VehicleCategory, {
    error: "Kategori kendaraan wajib dipilih",
  }),
  price: z.number().min(0, "Harga layanan tidak boleh negatif"),
  estimatedMinutes: z
    .number()
    .int()
    .min(5, "Estimasi durasi minimal 5 menit")
    .default(30),
  defaultCommission: z
    .number()
    .min(0, "Komisi tidak boleh negatif")
    .default(10000),
  commissionType: z
    .nativeEnum(CommissionType)
    .default(CommissionType.FIXED_NOMINAL),
  isActive: z.boolean().default(true),
});

const updateServicePackageSchema = servicePackageSchema.extend({
  id: z.string().min(1, "ID paket layanan wajib disertakan"),
});

export type CreateServicePackageInput = z.infer<typeof servicePackageSchema>;
export type UpdateServicePackageInput = z.infer<
  typeof updateServicePackageSchema
>;

export interface ServicePackageItem {
  id: string;
  outletId: string;
  name: string;
  description: string | null;
  vehicleCategory: VehicleCategory;
  price: number;
  estimatedMinutes: number;
  defaultCommission: number;
  commissionType: CommissionType;
  isActive: boolean;
  ticketsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicePackagesSummary {
  packages: ServicePackageItem[];
  stats: {
    totalPackages: number;
    activePackages: number;
    totalCategoriesCovered: number;
    averagePrice: number;
    averageMinutes: number;
    averageCommission: number;
  };
}

// -------------------------------------------------------------
// HELPER: Validate Manager/Owner Authorization
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
        "Hanya Pemilik Bisnis (Owner) dan Manajer yang berwenang mengelola data paket & tarif layanan.",
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
 * Mengambil daftar seluruh paket layanan cabang aktif beserta statistik
 */
export async function getServicePackagesAction(
  customOutletId?: string
): Promise<ActionResponse<ServicePackagesSummary>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const targetOutletId = customOutletId || authCheck.outletId;

    const packages = await prisma.servicePackage.findMany({
      where: { outletId: targetOutletId },
      include: {
        _count: {
          select: { washTickets: true },
        },
      },
      orderBy: [{ vehicleCategory: "asc" }, { price: "asc" }],
    });

    const items: ServicePackageItem[] = packages.map((pkg) => ({
      id: pkg.id,
      outletId: pkg.outletId,
      name: pkg.name,
      description: pkg.description,
      vehicleCategory: pkg.vehicleCategory,
      price: Number(pkg.price),
      estimatedMinutes: pkg.estimatedMinutes,
      defaultCommission: Number(pkg.defaultCommission),
      commissionType: pkg.commissionType,
      isActive: pkg.isActive,
      ticketsCount: pkg._count.washTickets,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }));

    const totalPackages = items.length;
    const activePackages = items.filter((p) => p.isActive).length;
    const categoriesSet = new Set(items.map((p) => p.vehicleCategory));

    const totalRevenueSum = items.reduce((acc, p) => acc + p.price, 0);
    const totalDurationSum = items.reduce(
      (acc, p) => acc + p.estimatedMinutes,
      0
    );
    const totalCommSum = items.reduce((acc, p) => acc + p.defaultCommission, 0);

    return {
      success: true,
      data: {
        packages: items,
        stats: {
          totalPackages,
          activePackages,
          totalCategoriesCovered: categoriesSet.size,
          averagePrice:
            totalPackages > 0 ? Math.round(totalRevenueSum / totalPackages) : 0,
          averageMinutes:
            totalPackages > 0
              ? Math.round(totalDurationSum / totalPackages)
              : 0,
          averageCommission:
            totalPackages > 0 ? Math.round(totalCommSum / totalPackages) : 0,
        },
      },
    };
  } catch (error) {
    console.error("Gagal mengambil paket layanan:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data paket layanan cuci.",
    };
  }
}

/**
 * Menambahkan paket layanan cuci baru
 */
export async function createServicePackageAction(
  rawInput: CreateServicePackageInput
): Promise<ActionResponse<ServicePackageItem>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const validation = servicePackageSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: "Validasi formulir gagal. Periksa kembali input Anda.",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      description,
      vehicleCategory,
      price,
      estimatedMinutes,
      defaultCommission,
      commissionType,
      isActive,
    } = validation.data;

    const newPackage = await prisma.servicePackage.create({
      data: {
        outletId: authCheck.outletId,
        name,
        description: description || null,
        vehicleCategory,
        price,
        estimatedMinutes,
        defaultCommission,
        commissionType,
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
          action: "CREATE_SERVICE_PACKAGE",
          entityType: "ServicePackage",
          entityId: newPackage.id,
          metadata: JSON.stringify({
            name,
            vehicleCategory,
            price,
            estimatedMinutes,
            defaultCommission,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    revalidatePath("/dashboard/layanan");
    revalidatePath("/pos/daftar-baru");
    revalidatePath("/pos");

    return {
      success: true,
      data: {
        id: newPackage.id,
        outletId: newPackage.outletId,
        name: newPackage.name,
        description: newPackage.description,
        vehicleCategory: newPackage.vehicleCategory,
        price: Number(newPackage.price),
        estimatedMinutes: newPackage.estimatedMinutes,
        defaultCommission: Number(newPackage.defaultCommission),
        commissionType: newPackage.commissionType,
        isActive: newPackage.isActive,
        ticketsCount: 0,
        createdAt: newPackage.createdAt,
        updatedAt: newPackage.updatedAt,
      },
    };
  } catch (error) {
    console.error("Gagal membuat paket layanan:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal membuat paket layanan baru.",
    };
  }
}

/**
 * Mengubah data paket layanan cuci yang ada
 */
export async function updateServicePackageAction(
  rawInput: UpdateServicePackageInput
): Promise<ActionResponse<ServicePackageItem>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const validation = updateServicePackageSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: "Validasi formulir gagal.",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const {
      id,
      name,
      description,
      vehicleCategory,
      price,
      estimatedMinutes,
      defaultCommission,
      commissionType,
      isActive,
    } = validation.data;

    const existing = await prisma.servicePackage.findUnique({
      where: { id, outletId: authCheck.outletId },
    });

    if (!existing) {
      return {
        success: false,
        error: "Paket layanan tidak ditemukan pada cabang aktif ini.",
      };
    }

    const updated = await prisma.servicePackage.update({
      where: { id },
      data: {
        name,
        description: description || null,
        vehicleCategory,
        price,
        estimatedMinutes,
        defaultCommission,
        commissionType,
        isActive,
      },
      include: {
        _count: {
          select: { washTickets: true },
        },
      },
    });

    // Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          outletId: authCheck.outletId,
          actorId: authCheck.currentUser.id,
          actorRole: authCheck.currentUser.role,
          action: "UPDATE_SERVICE_PACKAGE",
          entityType: "ServicePackage",
          entityId: updated.id,
          metadata: JSON.stringify({
            name,
            oldPrice: Number(existing.price),
            newPrice: price,
            vehicleCategory,
            isActive,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    revalidatePath("/dashboard/layanan");
    revalidatePath("/pos/daftar-baru");
    revalidatePath("/pos");

    return {
      success: true,
      data: {
        id: updated.id,
        outletId: updated.outletId,
        name: updated.name,
        description: updated.description,
        vehicleCategory: updated.vehicleCategory,
        price: Number(updated.price),
        estimatedMinutes: updated.estimatedMinutes,
        defaultCommission: Number(updated.defaultCommission),
        commissionType: updated.commissionType,
        isActive: updated.isActive,
        ticketsCount: updated._count.washTickets,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  } catch (error) {
    console.error("Gagal mengupdate paket layanan:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui paket layanan.",
    };
  }
}

/**
 * Toggle cepat status aktif/nonaktif paket layanan
 */
export async function toggleServicePackageStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<{ id: string; isActive: boolean }>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const pkg = await prisma.servicePackage.findUnique({
      where: { id, outletId: authCheck.outletId },
    });

    if (!pkg) {
      return {
        success: false,
        error: "Paket layanan tidak ditemukan di cabang ini.",
      };
    }

    await prisma.servicePackage.update({
      where: { id },
      data: { isActive },
    });

    // Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          outletId: authCheck.outletId,
          actorId: authCheck.currentUser.id,
          actorRole: authCheck.currentUser.role,
          action: isActive
            ? "ACTIVATE_SERVICE_PACKAGE"
            : "DEACTIVATE_SERVICE_PACKAGE",
          entityType: "ServicePackage",
          entityId: id,
          metadata: JSON.stringify({
            name: pkg.name,
            isActive,
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    revalidatePath("/dashboard/layanan");
    revalidatePath("/pos/daftar-baru");

    return { success: true, data: { id, isActive } };
  } catch (error) {
    console.error("Gagal mengubah status paket:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengubah status paket layanan.",
    };
  }
}

/**
 * Menghapus paket layanan (atau menonaktifkan jika sudah digunakan transaksi tiket)
 */
export async function deleteServicePackageAction(
  id: string
): Promise<ActionResponse<{ deleted: boolean; deactivatedInstead?: boolean }>> {
  try {
    const authCheck = await authorizeManagerOrOwner();
    if ("error" in authCheck) {
      return { success: false, error: authCheck.error };
    }

    const pkg = await prisma.servicePackage.findUnique({
      where: { id, outletId: authCheck.outletId },
      include: {
        _count: {
          select: { washTickets: true },
        },
      },
    });

    if (!pkg) {
      return { success: false, error: "Paket layanan tidak ditemukan." };
    }

    // Jika sudah ada riwayat tiket, jangan hard delete, otomatis nonaktifkan
    if (pkg._count.washTickets > 0) {
      await prisma.servicePackage.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        success: true,
        data: {
          deleted: false,
          deactivatedInstead: true,
        },
      };
    }

    await prisma.servicePackage.delete({
      where: { id },
    });

    // Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          outletId: authCheck.outletId,
          actorId: authCheck.currentUser.id,
          actorRole: authCheck.currentUser.role,
          action: "DELETE_SERVICE_PACKAGE",
          entityType: "ServicePackage",
          entityId: id,
          metadata: JSON.stringify({ name: pkg.name }),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    revalidatePath("/dashboard/layanan");
    revalidatePath("/pos/daftar-baru");

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("Gagal menghapus paket layanan:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus paket layanan cuci.",
    };
  }
}
