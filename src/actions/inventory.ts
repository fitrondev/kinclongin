"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { MovementType, UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// -------------------------------------------------------------
// HELPER OTORISASI
// -------------------------------------------------------------

async function authorizeOwnerOrManager() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sesi berakhir. Silakan login kembali." };
  }

  if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
    return {
      error:
        "Akses ditolak. Hanya Pemilik (Owner) dan Manajer yang berwenang mengelola inventaris.",
    };
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return { error: "Outlet cabang tidak ditemukan." };
  }

  return { user, outlet };
}

// -------------------------------------------------------------
// RESTOCK SCHEMAS & ACTIONS
// -------------------------------------------------------------

const restockProductSchema = z.object({
  productId: z.string().min(1, "ID produk wajib diisi"),
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
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { user, outlet } = auth;

    const parsed = restockProductSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input restok tidak valid." };
    }

    const { productId, quantity, notes } = parsed.data;

    const product = await prisma.retailProduct.findFirst({
      where: { id: productId, outletId: outlet.id },
    });

    if (!product) {
      return {
        success: false,
        error: "Produk ritel tidak ditemukan di cabang ini.",
      };
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
    revalidatePath("/pos/bayar");

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
  supplyId: z.string().min(1, "ID bahan wajib diisi"),
  quantity: z.number().min(0.01, "Jumlah restok minimal 0.01"),
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
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { user, outlet } = auth;

    const parsed = restockSupplySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input restok bahan tidak valid." };
    }

    const { supplyId, quantity, notes } = parsed.data;

    const supply = await prisma.operationalSupply.findFirst({
      where: { id: supplyId, outletId: outlet.id },
    });

    if (!supply) {
      return {
        success: false,
        error: "Bahan operasional tidak ditemukan di cabang ini.",
      };
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

// -------------------------------------------------------------
// CRUD PRODUK RITEL (TASK 6.2)
// -------------------------------------------------------------

const createRetailProductSchema = z.object({
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  category: z.string().min(1, "Kategori produk wajib diisi"),
  costPrice: z.number().min(0, "Harga modal minimal 0"),
  sellingPrice: z.number().min(100, "Harga jual minimal Rp 100"),
  initialStock: z.number().int().min(0, "Stok awal minimal 0").default(0),
  minStockAlert: z
    .number()
    .int()
    .min(1, "Batas minimum alert minimal 1")
    .default(5),
  sku: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export type CreateRetailProductInput = z.infer<
  typeof createRetailProductSchema
>;

export async function createRetailProductAction(
  input: CreateRetailProductInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { user, outlet } = auth;

    const parsed = createRetailProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid.",
      };
    }

    const {
      name,
      category,
      costPrice,
      sellingPrice,
      initialStock,
      minStockAlert,
      sku,
      imageUrl,
    } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const prod = await tx.retailProduct.create({
        data: {
          outletId: outlet.id,
          name,
          category,
          costPrice,
          sellingPrice,
          stock: initialStock,
          minStockAlert,
          sku: sku || null,
          imageUrl: imageUrl || null,
          isActive: true,
        },
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            outletId: outlet.id,
            retailProductId: prod.id,
            movementType: MovementType.IN_RESTOCK,
            quantity: initialStock,
            balanceAfter: initialStock,
            referenceNote: `Stok awal produk baru oleh ${user.fullName}`,
          },
        });
      }

      return prod;
    });

    revalidatePath("/dashboard/stok");
    revalidatePath("/pos/bayar");

    return {
      success: true,
      data: { id: created.id, name: created.name },
    };
  } catch (error) {
    console.error("Gagal membuat produk ritel:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menambahkan produk ritel.",
    };
  }
}

const updateRetailProductSchema = z.object({
  id: z.string().min(1, "ID produk wajib disertakan"),
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  category: z.string().min(1, "Kategori produk wajib diisi"),
  costPrice: z.number().min(0, "Harga modal minimal 0"),
  sellingPrice: z.number().min(100, "Harga jual minimal Rp 100"),
  minStockAlert: z.number().int().min(1, "Batas minimum alert minimal 1"),
  sku: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type UpdateRetailProductInput = z.infer<
  typeof updateRetailProductSchema
>;

export async function updateRetailProductAction(
  input: UpdateRetailProductInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { outlet } = auth;

    const parsed = updateRetailProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid.",
      };
    }

    const {
      id,
      name,
      category,
      costPrice,
      sellingPrice,
      minStockAlert,
      sku,
      isActive,
    } = parsed.data;

    const existing = await prisma.retailProduct.findFirst({
      where: { id, outletId: outlet.id },
    });

    if (!existing) {
      return {
        success: false,
        error: "Produk ritel tidak ditemukan di cabang ini.",
      };
    }

    await prisma.retailProduct.update({
      where: { id },
      data: {
        name,
        category,
        costPrice,
        sellingPrice,
        minStockAlert,
        sku: sku || null,
        isActive,
      },
    });

    revalidatePath("/dashboard/stok");
    revalidatePath("/pos/bayar");

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error("Gagal mengupdate produk ritel:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengupdate produk ritel.",
    };
  }
}

export async function deleteRetailProductAction(
  productId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { outlet } = auth;

    const product = await prisma.retailProduct.findFirst({
      where: { id: productId, outletId: outlet.id },
      include: { ticketItems: { select: { id: true }, take: 1 } },
    });

    if (!product) {
      return { success: false, error: "Produk ritel tidak ditemukan." };
    }

    // Jika sudah pernah terjual dalam tiket, lakukan soft delete (nonaktifkan)
    if (product.ticketItems.length > 0) {
      await prisma.retailProduct.update({
        where: { id: productId },
        data: { isActive: false },
      });
    } else {
      await prisma.retailProduct.delete({
        where: { id: productId },
      });
    }

    revalidatePath("/dashboard/stok");
    revalidatePath("/pos/bayar");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Gagal menghapus produk ritel:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus produk ritel.",
    };
  }
}

// -------------------------------------------------------------
// CRUD MASTER BAHAN OPERASIONAL CUCI (TASK 6.1)
// -------------------------------------------------------------

const createOperationalSupplySchema = z.object({
  name: z.string().min(2, "Nama bahan minimal 2 karakter"),
  unit: z.string().min(1, "Satuan wajib diisi (contoh: Liter, Botol, Lembar)"),
  initialStock: z.number().min(0, "Stok awal minimal 0").default(0),
  minStockAlert: z
    .number()
    .min(0.01, "Batas minimum alert minimal 0.01")
    .default(5),
  usagePerCarWash: z
    .number()
    .min(0, "Estimasi pemakaian mobil minimal 0")
    .default(0.1),
  usagePerMotorWash: z
    .number()
    .min(0, "Estimasi pemakaian motor minimal 0")
    .default(0.04),
  sku: z.string().optional().nullable(),
});

export type CreateOperationalSupplyInput = z.infer<
  typeof createOperationalSupplySchema
>;

export async function createOperationalSupplyAction(
  input: CreateOperationalSupplyInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { user, outlet } = auth;

    const parsed = createOperationalSupplySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid.",
      };
    }

    const {
      name,
      unit,
      initialStock,
      minStockAlert,
      usagePerCarWash,
      usagePerMotorWash,
      sku,
    } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const supply = await tx.operationalSupply.create({
        data: {
          outletId: outlet.id,
          name,
          unit,
          stock: initialStock,
          minStockAlert,
          usagePerCarWash,
          usagePerMotorWash,
          sku: sku || null,
        },
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            outletId: outlet.id,
            operationalSupplyId: supply.id,
            movementType: MovementType.IN_RESTOCK,
            quantity: initialStock,
            balanceAfter: initialStock,
            referenceNote: `Stok awal bahan baru oleh ${user.fullName}`,
          },
        });
      }

      return supply;
    });

    revalidatePath("/dashboard/stok");

    return {
      success: true,
      data: { id: created.id, name: created.name },
    };
  } catch (error) {
    console.error("Gagal menambah bahan operasional:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menambah bahan operasional.",
    };
  }
}

const updateOperationalSupplySchema = z.object({
  id: z.string().min(1, "ID bahan wajib disertakan"),
  name: z.string().min(2, "Nama bahan minimal 2 karakter"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  minStockAlert: z.number().min(0.01, "Batas minimum alert minimal 0.01"),
  usagePerCarWash: z.number().min(0, "Estimasi pemakaian mobil minimal 0"),
  usagePerMotorWash: z.number().min(0, "Estimasi pemakaian motor minimal 0"),
  sku: z.string().optional().nullable(),
});

export type UpdateOperationalSupplyInput = z.infer<
  typeof updateOperationalSupplySchema
>;

export async function updateOperationalSupplyAction(
  input: UpdateOperationalSupplyInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { outlet } = auth;

    const parsed = updateOperationalSupplySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid.",
      };
    }

    const {
      id,
      name,
      unit,
      minStockAlert,
      usagePerCarWash,
      usagePerMotorWash,
      sku,
    } = parsed.data;

    const existing = await prisma.operationalSupply.findFirst({
      where: { id, outletId: outlet.id },
    });

    if (!existing) {
      return {
        success: false,
        error: "Bahan operasional tidak ditemukan di cabang ini.",
      };
    }

    await prisma.operationalSupply.update({
      where: { id },
      data: {
        name,
        unit,
        minStockAlert,
        usagePerCarWash,
        usagePerMotorWash,
        sku: sku || null,
      },
    });

    revalidatePath("/dashboard/stok");

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error("Gagal mengupdate bahan operasional:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengupdate bahan operasional.",
    };
  }
}

export async function deleteOperationalSupplyAction(
  supplyId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { outlet } = auth;

    const supply = await prisma.operationalSupply.findFirst({
      where: { id: supplyId, outletId: outlet.id },
    });

    if (!supply) {
      return { success: false, error: "Bahan operasional tidak ditemukan." };
    }

    await prisma.operationalSupply.delete({
      where: { id: supplyId },
    });

    revalidatePath("/dashboard/stok");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Gagal menghapus bahan operasional:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus bahan operasional.",
    };
  }
}

// -------------------------------------------------------------
// MODUL STOCK OPNAME & REKONSILIASI FISIK (TASK 6.3)
// -------------------------------------------------------------

const submitStockOpnameSchema = z.object({
  itemType: z.enum(["RETAIL", "SUPPLY"]),
  itemId: z.string().min(1, "ID barang/bahan wajib disertakan"),
  physicalStock: z.number().min(0, "Stok fisik riil minimal 0"),
  reason: z
    .string()
    .min(
      3,
      "Alasan penyesuaian wajib diisi (misal: Rusak, Bocor, Selisih Hitung)"
    ),
});

export type SubmitStockOpnameInput = z.infer<typeof submitStockOpnameSchema>;

/**
 * Mencatat hasil penghitungan fisik (Stock Opname) dan menyesuaikan saldo stok ke angka riil.
 */
export async function submitStockOpnameAction(
  input: SubmitStockOpnameInput
): Promise<
  ActionResponse<{
    itemName: string;
    previousStock: number;
    physicalStock: number;
    difference: number;
  }>
> {
  try {
    const auth = await authorizeOwnerOrManager();
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const { user, outlet } = auth;

    const parsed = submitStockOpnameSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input opname tidak valid.",
      };
    }

    const { itemType, itemId, physicalStock, reason } = parsed.data;

    const result = await prisma.$transaction(
      async (tx) => {
        if (itemType === "RETAIL") {
          const product = await tx.retailProduct.findFirst({
            where: { id: itemId, outletId: outlet.id },
          });

          if (!product) {
            throw new Error("Produk ritel tidak ditemukan di cabang ini.");
          }

          const previousStock = product.stock;
          const difference = physicalStock - previousStock;

          const updated = await tx.retailProduct.update({
            where: { id: itemId },
            data: { stock: Math.round(physicalStock) },
          });

          const diffPrefix =
            difference >= 0 ? `+${difference}` : `${difference}`;
          await tx.stockMovement.create({
            data: {
              outletId: outlet.id,
              retailProductId: itemId,
              movementType: MovementType.ADJUSTMENT_OPNAME,
              quantity: Math.abs(difference),
              balanceAfter: updated.stock,
              referenceNote: `Opname Fisik (${diffPrefix} unit): ${reason} [Disesuaikan oleh ${user.fullName}]`,
            },
          });

          await tx.auditLog.create({
            data: {
              outletId: outlet.id,
              actorId: user.id,
              actorRole: user.role,
              action: "STOCK_OPNAME_ADJUSTED",
              entityType: "RetailProduct",
              entityId: itemId,
              metadata: {
                productName: product.name,
                previousStock,
                physicalStock,
                difference,
                reason,
              },
            },
          });

          return {
            itemName: product.name,
            previousStock,
            physicalStock: updated.stock,
            difference,
          };
        } else {
          const supply = await tx.operationalSupply.findFirst({
            where: { id: itemId, outletId: outlet.id },
          });

          if (!supply) {
            throw new Error("Bahan operasional tidak ditemukan di cabang ini.");
          }

          const previousStock = Number(supply.stock);
          const difference = physicalStock - previousStock;

          const updated = await tx.operationalSupply.update({
            where: { id: itemId },
            data: { stock: physicalStock },
          });

          const diffPrefix =
            difference >= 0
              ? `+${difference.toFixed(2)}`
              : `${difference.toFixed(2)}`;
          await tx.stockMovement.create({
            data: {
              outletId: outlet.id,
              operationalSupplyId: itemId,
              movementType: MovementType.ADJUSTMENT_OPNAME,
              quantity: Math.abs(difference),
              balanceAfter: physicalStock,
              referenceNote: `Opname Fisik (${diffPrefix} ${supply.unit}): ${reason} [Disesuaikan oleh ${user.fullName}]`,
            },
          });

          await tx.auditLog.create({
            data: {
              outletId: outlet.id,
              actorId: user.id,
              actorRole: user.role,
              action: "STOCK_OPNAME_ADJUSTED",
              entityType: "OperationalSupply",
              entityId: itemId,
              metadata: {
                supplyName: supply.name,
                unit: supply.unit,
                previousStock,
                physicalStock,
                difference,
                reason,
              },
            },
          });

          return {
            itemName: supply.name,
            previousStock,
            physicalStock: Number(updated.stock),
            difference,
          };
        }
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    revalidatePath("/dashboard/stok");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Gagal submit stock opname:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memproses penyesuaian opname.",
    };
  }
}
