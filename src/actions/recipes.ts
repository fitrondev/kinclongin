"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export interface RecipeItemDto {
  id?: string;
  operationalSupplyId: string;
  supplyName?: string;
  volumeUsage: number;
  unit: string;
  costPerUnit?: number;
  estimatedCost?: number;
}

const recipeItemSchema = z.object({
  operationalSupplyId: z.string().min(1, "Bahan operasional wajib dipilih"),
  volumeUsage: z.number().positive("Volume pemakaian harus lebih dari 0"),
  unit: z.string().min(1, "Satuan wajib diisi"),
});

const saveServiceRecipesSchema = z.object({
  servicePackageId: z.string().min(1, "ID Paket layanan wajib diisi"),
  items: z.array(recipeItemSchema),
});

export type SaveServiceRecipesInput = z.infer<typeof saveServiceRecipesSchema>;

/**
 * Mengambil daftar resep bahan kimia untuk paket layanan tertentu.
 */
export async function getServiceRecipesAction(
  servicePackageId: string
): Promise<ActionResponse<RecipeItemDto[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const recipes = await prisma.serviceRecipeItem.findMany({
      where: { servicePackageId },
      include: {
        operationalSupply: {
          select: {
            id: true,
            name: true,
            unit: true,
            costPerUnit: true,
          },
        },
      },
    });

    const mapped: RecipeItemDto[] = recipes.map((r) => {
      const vol = Number(r.volumeUsage);
      const costPerUnit = Number(r.operationalSupply.costPerUnit || 0);
      return {
        id: r.id,
        operationalSupplyId: r.operationalSupplyId,
        supplyName: r.operationalSupply.name,
        volumeUsage: vol,
        unit: r.unit,
        costPerUnit,
        estimatedCost: Math.round(vol * costPerUnit),
      };
    });

    return { success: true, data: mapped };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memuat resep layanan.",
    };
  }
}

/**
 * Mengambil daftar bahan operasional cabang untuk pilihan dropdown resep.
 */
export async function getSuppliesForRecipeAction(outletId: string): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      unit: string;
      stock: number;
      costPerUnit: number;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const supplies = await prisma.operationalSupply.findMany({
      where: { outletId },
      orderBy: { name: "asc" },
    });

    const mapped = supplies.map((s) => ({
      id: s.id,
      name: s.name,
      unit: s.unit,
      stock: Number(s.stock),
      costPerUnit: Number(s.costPerUnit || 0),
    }));

    return { success: true, data: mapped };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat bahan operasional.",
    };
  }
}

/**
 * Menyimpan konfigurasi resep pemakaian bahan kimia per paket layanan cuci.
 */
export async function saveServiceRecipesAction(
  input: SaveServiceRecipesInput
): Promise<ActionResponse<{ count: number; totalEstimatedHpp: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    if (
      user.role !== "OWNER" &&
      user.role !== "MANAGER" &&
      user.role !== "SUPERADMIN"
    ) {
      return {
        success: false,
        error: "Hanya Owner atau Manajer yang dapat mengatur resep layanan.",
      };
    }

    const parsed = saveServiceRecipesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi resep gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { servicePackageId, items } = parsed.data;

    // Ambil paket layanan dan verifikasi outlet
    const pkg = await prisma.servicePackage.findUnique({
      where: { id: servicePackageId },
    });

    if (!pkg) {
      return { success: false, error: "Paket layanan tidak ditemukan." };
    }

    // Hitung total estimasi HPP
    let totalEstimatedHpp = 0;

    await prisma.$transaction(async (tx) => {
      // Hapus resep lama untuk paket ini
      await tx.serviceRecipeItem.deleteMany({
        where: { servicePackageId },
      });

      // Tambahkan resep baru
      for (const item of items) {
        const supply = await tx.operationalSupply.findUnique({
          where: { id: item.operationalSupplyId },
        });

        if (supply) {
          const cost = Number(supply.costPerUnit || 0) * item.volumeUsage;
          totalEstimatedHpp += cost;

          await tx.serviceRecipeItem.create({
            data: {
              servicePackageId,
              operationalSupplyId: item.operationalSupplyId,
              volumeUsage: item.volumeUsage,
              unit: item.unit,
            },
          });
        }
      }
    });

    revalidatePath("/dashboard/layanan");
    revalidatePath("/pos");

    return {
      success: true,
      data: {
        count: items.length,
        totalEstimatedHpp: Math.round(totalEstimatedHpp),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan resep layanan.",
    };
  }
}
