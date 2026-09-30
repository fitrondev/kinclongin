import { Metadata } from "next";

import {
  type InventoryData,
  InventoryView,
} from "@/components/dashboard/inventory-view";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Stok Barang & Bahan Cuci | Kinclongin",
  description:
    "Kelola stok produk ritel kasir dan takaran pemakaian bahan cuci mobil & motor.",
};

export default async function DashboardStokPage() {
  const user = await getCurrentUser();
  const outlet = user?.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Outlet cabang tidak ditemukan.
      </div>
    );
  }

  const [rawProducts, rawSupplies, rawMovements] = await Promise.all([
    prisma.retailProduct.findMany({
      where: { outletId: outlet.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.operationalSupply.findMany({
      where: { outletId: outlet.id },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { outletId: outlet.id },
      include: {
        retailProduct: { select: { name: true } },
        operationalSupply: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const inventoryData: InventoryData = {
    products: rawProducts.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      sellingPrice: Number(p.sellingPrice),
      costPrice: p.costPrice ? Number(p.costPrice) : null,
      stock: p.stock,
      minStockAlert: p.minStockAlert,
    })),
    supplies: rawSupplies.map((s) => ({
      id: s.id,
      name: s.name,
      unit: s.unit,
      currentStock: Number(s.stock),
      minStockAlert: Number(s.minStockAlert),
      usagePerCarWash: Number(s.usagePerCarWash),
      usagePerMotorWash: Number(s.usagePerMotorWash),
    })),
    movements: rawMovements.map((m) => ({
      id: m.id,
      itemName: m.retailProduct?.name || m.operationalSupply?.name || "Item",
      type: m.movementType,
      quantity: Number(m.quantity),
      previousStock: 0,
      currentStock: Number(m.balanceAfter),
      notes: m.referenceNote,
      createdAt: m.createdAt,
    })),
  };

  return <InventoryView data={inventoryData} />;
}
