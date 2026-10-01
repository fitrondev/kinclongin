"use server";

import { revalidatePath, updateTag } from "next/cache";

import { z } from "zod";

import { PaymentMethod } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const registerMembershipSchema = z.object({
  outletId: z.string().optional(),
  customerPhone: z
    .string()
    .min(8, "Nomor telepon pelanggan minimal 8 karakter")
    .transform((v) => v.replace(/\D/g, "")),
  customerName: z.string().min(2, "Nama pelanggan minimal 2 karakter"),
  licensePlate: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.toUpperCase().replace(/\s+/g, " ").trim() : undefined
    ),
  planName: z.string().min(2, "Pilih atau isi nama paket langganan"),
  price: z.number().min(0, "Harga paket tidak boleh negatif"),
  durationDays: z.number().int().min(1).default(30),
  totalQuota: z.number().int().min(1, "Kuota minimal 1x cuci").default(4),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["CASH", "QRIS", "BANK_TRANSFER"] as const),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
});

export type RegisterMembershipInput = z.infer<typeof registerMembershipSchema>;

/**
 * Pendaftaran & Pembayaran Langganan Member Cuci oleh Kasir POS / Dasbor
 */
export async function registerCustomerMembershipAction(
  input: RegisterMembershipInput
): Promise<
  ActionResponse<{
    membershipId: string;
    customerName: string;
    planName: string;
    endDate: string;
    remainingQuota: number;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi tidak valid. Silakan login kembali.",
      };
    }

    const parsed = registerMembershipSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi data langganan member gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      outletId: inputOutletId,
      customerPhone,
      customerName,
      licensePlate,
      planName,
      price,
      durationDays,
      totalQuota,
      discountPercent,
      paymentMethod,
      paymentRef,
      notes,
    } = parsed.data;

    let targetOutletId: string;
    if (inputOutletId) {
      targetOutletId = inputOutletId;
    } else if (user.outletId) {
      targetOutletId = user.outletId;
    } else {
      const activeOutlet = await prisma.outlet.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (!activeOutlet) {
        return {
          success: false,
          error: "Cabang outlet aktif tidak ditemukan.",
        };
      }
      targetOutletId = activeOutlet.id;
    }

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Cari atau buat Pelanggan berdasarkan nomor WhatsApp
        let customer = await tx.customer.findUnique({
          where: { phone: customerPhone },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              phone: customerPhone,
              fullName: customerName,
              loyaltyPoints: 0,
              totalVisits: 0,
            },
          });
        } else if (customer.fullName !== customerName) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: { fullName: customerName },
          });
        }

        // 2. Hubungkan plat nomor jika disertakan
        if (licensePlate) {
          await tx.vehicle.upsert({
            where: { licensePlate },
            update: { customerId: customer.id },
            create: {
              licensePlate,
              category: "MOBIL_SEDANG",
              customerId: customer.id,
            },
          });
        }

        // 3. Buat CustomerMembership baru
        const membership = await tx.customerMembership.create({
          data: {
            customerId: customer.id,
            outletId: targetOutletId,
            planName,
            price,
            startDate,
            endDate,
            status: "ACTIVE",
            totalQuota,
            remainingQuota: totalQuota,
            discountPercent,
            paymentMethod: paymentMethod as PaymentMethod,
            paymentRef: paymentRef || null,
            cashierId: user.id,
            notes: notes || null,
          },
        });

        // 4. Berikan bonus poin loyalty (1 poin per Rp 2.000)
        const bonusPoints = Math.max(10, Math.floor(price / 2000));
        await tx.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: { increment: bonusPoints } },
        });

        await tx.customerLoyaltyLog.create({
          data: {
            customerId: customer.id,
            pointsChanged: bonusPoints,
            balanceAfter: customer.loyaltyPoints + bonusPoints,
            description: `Bonus aktivasi langganan ${planName}`,
          },
        });

        return { membership, customer };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    revalidatePath("/pos");
    revalidatePath("/pos/daftar-baru");
    revalidatePath("/pos/antrean");
    revalidatePath("/dashboard/pelanggan");
    revalidatePath("/dashboard/membership");
    revalidatePath("/dashboard");
    updateTag("dashboard-metrics");

    return {
      success: true,
      data: {
        membershipId: result.membership.id,
        customerName: result.customer.fullName,
        planName: result.membership.planName,
        endDate: result.membership.endDate.toISOString(),
        remainingQuota: result.membership.remainingQuota,
      },
    };
  } catch (error) {
    console.error("Gagal mendaftarkan langganan member:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mendaftarkan langganan member.",
    };
  }
}

/**
 * Memeriksa status langganan member aktif pelanggan berdasarkan nomor HP atau Plat Nomor
 */
export async function checkCustomerActiveMembershipAction(params: {
  phone?: string;
  licensePlate?: string;
}): Promise<
  ActionResponse<{
    hasActiveMembership: boolean;
    membership?: {
      id: string;
      planName: string;
      remainingQuota: number;
      totalQuota: number;
      endDate: string;
      discountPercent: number;
      customerName: string;
      customerPhone: string;
    };
  }>
> {
  try {
    const { phone, licensePlate } = params;

    let customerId: string | null = null;
    let customerName = "";
    let customerPhone = "";

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      const customer = await prisma.customer.findUnique({
        where: { phone: cleanPhone },
      });
      if (customer) {
        customerId = customer.id;
        customerName = customer.fullName;
        customerPhone = customer.phone;
      }
    }

    if (!customerId && licensePlate) {
      const cleanPlate = licensePlate.toUpperCase().replace(/\s+/g, " ").trim();
      const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate: cleanPlate },
        include: { customer: true },
      });
      if (vehicle?.customer) {
        customerId = vehicle.customer.id;
        customerName = vehicle.customer.fullName;
        customerPhone = vehicle.customer.phone;
      }
    }

    if (!customerId) {
      return { success: true, data: { hasActiveMembership: false } };
    }

    const now = new Date();
    const activeMembership = await prisma.customerMembership.findFirst({
      where: {
        customerId,
        status: "ACTIVE",
        endDate: { gte: now },
        remainingQuota: { gt: 0 },
      },
      orderBy: { endDate: "desc" },
    });

    if (!activeMembership) {
      return { success: true, data: { hasActiveMembership: false } };
    }

    return {
      success: true,
      data: {
        hasActiveMembership: true,
        membership: {
          id: activeMembership.id,
          planName: activeMembership.planName,
          remainingQuota: activeMembership.remainingQuota,
          totalQuota: activeMembership.totalQuota,
          endDate: activeMembership.endDate.toISOString(),
          discountPercent: activeMembership.discountPercent,
          customerName,
          customerPhone,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memeriksa status membership.",
    };
  }
}

/**
 * Mengambil daftar seluruh langganan member pelanggan di cabang
 */
export async function getCustomerMembershipsAction(query?: {
  status?: "ACTIVE" | "EXPIRED" | "ALL";
  search?: string;
}): Promise<
  ActionResponse<
    Array<{
      id: string;
      planName: string;
      price: number;
      startDate: string;
      endDate: string;
      status: string;
      totalQuota: number;
      remainingQuota: number;
      discountPercent: number;
      paymentMethod: string;
      customerName: string;
      customerPhone: string;
      cashierName: string;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.outletId) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const now = new Date();
    const statusFilter =
      query?.status === "ACTIVE"
        ? { status: "ACTIVE", endDate: { gte: now } }
        : query?.status === "EXPIRED"
          ? { OR: [{ status: "EXPIRED" }, { endDate: { lt: now } }] }
          : undefined;

    const memberships = await prisma.customerMembership.findMany({
      where: {
        outletId: user.outletId,
        ...statusFilter,
        ...(query?.search
          ? {
              OR: [
                {
                  customer: {
                    fullName: { contains: query.search },
                  },
                },
                {
                  customer: {
                    phone: { contains: query.search },
                  },
                },
                { planName: { contains: query.search } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        cashier: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: memberships.map((m) => ({
        id: m.id,
        planName: m.planName,
        price: Number(m.price),
        startDate: m.startDate.toISOString(),
        endDate: m.endDate.toISOString(),
        status: m.endDate < now ? "EXPIRED" : m.status,
        totalQuota: m.totalQuota,
        remainingQuota: m.remainingQuota,
        discountPercent: m.discountPercent,
        paymentMethod: m.paymentMethod,
        customerName: m.customer.fullName,
        customerPhone: m.customer.phone,
        cashierName: m.cashier?.fullName || "Kasir",
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data langganan member.",
    };
  }
}
