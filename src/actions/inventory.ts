"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { MovementType } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const restockProductSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1, "Jumlah restok minimal 1 unit"),
  notes: z.string().optional(),
});

/**
 * Mencatat penambahan / restok barang ritel ke gudang kasir.
 */
export async function restockProductAction(input: {
  productId: string;
  quantity: number;
  notes?: string;
}): Promise<ActionResponse<{ newStock: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan login kembali." };
    }

    if (user.role !== "OWNER" && user.role !== "MANAGER") {
      return {
        success: false,
        error:
          "Akses ditolak. Hanya Pemilik (Owner) dan Manajer yang berwenang mengelola stok barang ritel.",
      };
    }

    const parsed = restockProductSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input restok tidak valid." };
    }

    const { productId, quantity, notes } = parsed.data;

    const product = await prisma.retailProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return { success: false, error: "Produk ritel tidak ditemukan." };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.retailProduct.update({
          where: { id: productId },
          data: {
            stock: { increment: quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            outletId: product.outletId,
            retailProductId: productId,
            movementType: MovementType.IN_RESTOCK,
            quantity,
            balanceAfter: updated.stock,
            referenceNote: notes || `Restok manual oleh ${user.fullName}`,
          },
        });

        return updated.stock;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    revalidatePath("/dashboard/stok");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/pos/bayar");
    revalidatePath("/pos/checkout");

    return {
      success: true,
      data: { newStock: result },
    };
  } catch (error) {
    console.error("Gagal restok produk ritel:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mencatat restok.",
    };
  }
}

const restockSupplySchema = z.object({
  supplyId: z.string().cuid(),
  quantity: z.number().min(1, "Jumlah restok minimal 1 unit"),
  notes: z.string().optional(),
});

/**
 * Mencatat penambahan bahan habis pakai (shampo salju, semir ban) ke operasional cuci.
 */
export async function restockSupplyAction(input: {
  supplyId: string;
  quantity: number;
  notes?: string;
}): Promise<ActionResponse<{ newStock: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan login kembali." };
    }

    if (user.role !== "OWNER" && user.role !== "MANAGER") {
      return {
        success: false,
        error:
          "Akses ditolak. Hanya Pemilik (Owner) dan Manajer yang berwenang mengelola stok bahan operasional.",
      };
    }

    const parsed = restockSupplySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input restok bahan tidak valid." };
    }

    const { supplyId, quantity, notes } = parsed.data;

    const supply = await prisma.operationalSupply.findUnique({
      where: { id: supplyId },
    });

    if (!supply) {
      return { success: false, error: "Bahan operasional tidak ditemukan." };
    }

    const prevStock = Number(supply.stock);
    const newStock = prevStock + quantity;

    await prisma.$transaction(
      async (tx) => {
        await tx.operationalSupply.update({
          where: { id: supplyId },
          data: {
            stock: newStock,
          },
        });

        await tx.stockMovement.create({
          data: {
            outletId: supply.outletId,
            operationalSupplyId: supplyId,
            movementType: MovementType.IN_RESTOCK,
            quantity,
            balanceAfter: newStock,
            referenceNote:
              notes || `Restok bahan operasional oleh ${user.fullName}`,
          },
        });
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    revalidatePath("/dashboard/stok");
    revalidatePath("/dashboard/inventory");

    return {
      success: true,
      data: { newStock },
    };
  } catch (error) {
    console.error("Gagal restok bahan operasional:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mencatat restok bahan.",
    };
  }
}
