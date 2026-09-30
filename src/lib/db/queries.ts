import { cache } from "react";

import { TicketStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

/**
 * Mengambil data cabang outlet berdasarkan Clerk Organization ID.
 * Di-memoize per-request menggunakan React.cache() untuk mencegah query ganda.
 */
export const getOutletByOrgId = cache(async (clerkOrgId: string) => {
  return await prisma.outlet.findUnique({
    where: { clerkOrgId },
  });
});

/**
 * Mengambil daftar seluruh paket layanan cuci aktif untuk cabang outlet tertentu.
 */
export const getActiveServicePackages = cache(async (outletId: string) => {
  return await prisma.servicePackage.findMany({
    where: { outletId, isActive: true },
    orderBy: [{ vehicleCategory: "asc" }, { price: "asc" }],
  });
});

/**
 * Mengambil daftar staf pencuci aktif untuk Layar Cuci / klaim tiket.
 */
export const getActiveWashers = cache(async (outletId: string) => {
  return await prisma.employee.findMany({
    where: { outletId, isActive: true, role: "WASHER" },
    select: {
      id: true,
      fullName: true,
      role: true,
      commissionType: true,
      commissionRate: true,
    },
    orderBy: { fullName: "asc" },
  });
});

/**
 * Mengambil master produk ritel aktif untuk upsell kasir.
 */
export const getActiveRetailProducts = cache(async (outletId: string) => {
  return await prisma.retailProduct.findMany({
    where: { outletId, isActive: true },
    orderBy: { name: "asc" },
  });
});

/**
 * Mengambil daftar bahan habis pakai / operasional untuk monitoring stok.
 */
export const getOperationalSupplies = cache(async (outletId: string) => {
  return await prisma.operationalSupply.findMany({
    where: { outletId },
    orderBy: { name: "asc" },
  });
});

/**
 * Mengambil antrean tiket aktif (QUEUED, WASHING, DRYING, READY) untuk papan Kanban.
 */
export const getActiveQueueTickets = cache(async (outletId: string) => {
  return await prisma.washTicket.findMany({
    where: {
      outletId,
      status: {
        in: [
          TicketStatus.QUEUED,
          TicketStatus.WASHING,
          TicketStatus.DRYING,
          TicketStatus.READY,
        ],
      },
    },
    include: {
      servicePackage: true,
      customer: true,
      vehicle: true,
      washers: {
        include: {
          washer: true,
        },
      },
      retailItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { queuedAt: "asc" },
  });
});
