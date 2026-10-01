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

export interface CustomerLoyaltyProfile {
  id: string;
  phone: string;
  fullName: string;
  totalVisits: number;
  loyaltyPoints: number;
  isRewardEligible: boolean;
  nextRewardInVisits: number;
  rewardDescription?: string;
  vehicles: Array<{
    id: string;
    licensePlate: string;
    category: string;
    brand?: string | null;
    model?: string | null;
    totalVisits: number;
    isPromoEligible: boolean;
    visitsToNextPromo: number;
  }>;
  recentLogs: Array<{
    id: string;
    pointsChanged: number;
    balanceAfter: number;
    description: string;
    createdAt: Date;
  }>;
}

const lookupSchema = z.object({
  query: z.string().min(3, "Nomor HP atau plat minimal 3 karakter"),
});

/**
 * Mencari data loyalitas pelanggan berdasarkan Nomor Telepon WhatsApp atau Plat Kendaraan.
 */
export async function lookupCustomerLoyaltyAction(
  query: string
): Promise<ActionResponse<CustomerLoyaltyProfile | null>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi kasir berakhir. Silakan masuk kembali.",
      };
    }

    const clean = query.trim().replace(/\s+/g, "");

    // 1. Coba cari berdasarkan nomor telepon
    let customer = await prisma.customer.findFirst({
      where: {
        phone: { contains: clean },
      },
      include: {
        loyaltyLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        vehicles: true,
      },
    });

    // 2. Jika tidak ditemukan, coba cari lewat plat kendaraan
    if (!customer) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          licensePlate: { contains: clean.toUpperCase() },
        },
        include: {
          customer: {
            include: {
              loyaltyLogs: {
                orderBy: { createdAt: "desc" },
                take: 5,
              },
              vehicles: true,
            },
          },
        },
      });

      if (vehicle?.customer) {
        customer = vehicle.customer;
      }
    }

    if (!customer) {
      return { success: true, data: null };
    }

    // Format kendaraan dengan validasi promo Cuci 10x Gratis 1x terkunci per plat
    const formattedVehicles = customer.vehicles.map((v) => {
      const isPromoEligible = v.totalVisits > 0 && v.totalVisits % 10 === 0;
      const visitsToNextPromo =
        v.totalVisits % 10 === 0 ? 10 : 10 - (v.totalVisits % 10);
      return {
        id: v.id,
        licensePlate: v.licensePlate,
        category: v.category,
        brand: v.brand,
        model: v.model,
        totalVisits: v.totalVisits,
        isPromoEligible,
        visitsToNextPromo,
      };
    });

    // Pelanggan berhak jika salah satu kendaraannya berhak promo 10x ATAU memiliki saldo poin >= 10
    const hasVehicleReward = formattedVehicles.some((v) => v.isPromoEligible);
    const isRewardEligible = customer.loyaltyPoints >= 10 || hasVehicleReward;

    return {
      success: true,
      data: {
        id: customer.id,
        phone: customer.phone,
        fullName: customer.fullName,
        totalVisits: customer.totalVisits,
        loyaltyPoints: customer.loyaltyPoints,
        isRewardEligible,
        nextRewardInVisits: 10 - (customer.totalVisits % 10),
        rewardDescription: hasVehicleReward
          ? "🎉 Plat kendaraan terdaftar telah mencapai kelipatan 10 kunjungan (Cuci 10x Gratis 1x)!"
          : customer.loyaltyPoints >= 10
            ? "✨ Saldo poin mencukupi untuk klaim diskon cuci gratis!"
            : undefined,
        vehicles: formattedVehicles,
        recentLogs: customer.loyaltyLogs.map((log) => ({
          id: log.id,
          pointsChanged: log.pointsChanged,
          balanceAfter: log.balanceAfter,
          description: log.description,
          createdAt: log.createdAt,
        })),
      },
    };
  } catch (error) {
    console.error("Gagal lookup loyalitas pelanggan:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Terjadi kesalahan sistem.",
    };
  }
}

const redeemSchema = z.object({
  ticketId: z.string().cuid(),
  customerId: z.string().cuid(),
});

/**
 * Mengklaim reward Cuci Gratis (Diskon 100% dari biaya jasa cuci) untuk tiket yang belum dibayar.
 */
export async function redeemLoyaltyRewardAction(input: {
  ticketId: string;
  customerId: string;
}): Promise<ActionResponse<{ discountAmount: number; newTotal: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi kasir berakhir. Silakan masuk kembali.",
      };
    }

    const parsed = redeemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Parameter tiket atau pelanggan tidak valid.",
      };
    }

    const { ticketId, customerId } = parsed.data;

    // 1. Validasi tiket dan pelanggan
    const [ticket, customer] = await Promise.all([
      prisma.washTicket.findUnique({
        where: { id: ticketId },
        include: { servicePackage: true, vehicle: true },
      }),
      prisma.customer.findUnique({
        where: { id: customerId },
      }),
    ]);

    if (!ticket) {
      return { success: false, error: "Tiket cuci tidak ditemukan." };
    }

    if (!customer) {
      return { success: false, error: "Data pelanggan tidak ditemukan." };
    }

    if (ticket.paymentStatus === "PAID") {
      return {
        success: false,
        error: "Tiket sudah dibayar, tidak dapat mengubah diskon reward.",
      };
    }

    // Cek kelayakan reward: Terkunci ke plat kendaraan ATAU saldo poin pelanggan
    const isVehiclePromoEligible =
      ticket.vehicle &&
      ticket.vehicle.totalVisits > 0 &&
      ticket.vehicle.totalVisits % 10 === 0;
    const isPointsEligible = customer.loyaltyPoints >= 10;

    if (!isVehiclePromoEligible && !isPointsEligible) {
      return {
        success: false,
        error:
          "Kendaraan belum mencapai kelipatan 10 kunjungan dan saldo poin belum mencukupi.",
      };
    }

    const servicePrice = Number(ticket.servicePrice);
    const subtotalRetail = Number(ticket.subtotalRetail);
    const discountAmount = servicePrice; // Diskon 100% biaya jasa cuci
    const newTotal = Math.max(0, subtotalRetail); // Hanya bayar produk ritel jika ada

    // Eksekusi transaksi pengurangan poin dan update tiket
    await prisma.$transaction(async (tx) => {
      // 1. Update WashTicket diskon dan total bayar
      await tx.washTicket.update({
        where: { id: ticketId },
        data: {
          discountAmount,
          totalAmount: newTotal,
        },
      });

      // 2. Jika bukan promo kendaraan, potong 10 poin loyalitas
      if (!isVehiclePromoEligible && isPointsEligible) {
        const newPointsBalance = Math.max(0, customer.loyaltyPoints - 10);
        await tx.customer.update({
          where: { id: customerId },
          data: {
            loyaltyPoints: newPointsBalance,
          },
        });

        await tx.customerLoyaltyLog.create({
          data: {
            customerId,
            ticketId,
            pointsChanged: -10,
            balanceAfter: newPointsBalance,
            description: `Tukar 10 Poin Cuci Gratis (#${ticket.ticketNumber})`,
          },
        });
      } else {
        // Catat klaim promo 10x cuci kendaraan (tanpa potong poin)
        await tx.customerLoyaltyLog.create({
          data: {
            customerId,
            ticketId,
            pointsChanged: 0,
            balanceAfter: customer.loyaltyPoints,
            description: `Klaim Promo Cuci 10x Gratis 1x Plat ${ticket.licensePlate} (#${ticket.ticketNumber})`,
          },
        });
      }
    });

    revalidatePath(`/pos/bayar/${ticketId}`);
    revalidatePath(`/pos/checkout/${ticketId}`);
    revalidatePath("/pos/antrean");
    revalidatePath("/pos/queue");

    return {
      success: true,
      data: {
        discountAmount,
        newTotal,
      },
    };
  } catch (error) {
    console.error("Gagal klaim reward loyalitas:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memproses klaim reward loyalitas.",
    };
  }
}
