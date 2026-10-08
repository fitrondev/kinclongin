"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { PaymentMethod, VehicleCategory } from "@/generated/prisma/enums";
import { createAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sendWhatsAppWashClubPass } from "@/lib/whatsapp/sender";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export interface WashClubSubscriptionItem {
  id: string;
  outletId: string;
  planName: string;
  priceMonthly: number;
  startDate: string;
  expiresAt: string;
  isActive: boolean;
  qrPassCode: string;
  notes?: string | null;
  daysRemaining: number;
  isExpired: boolean;
  vehicle: {
    id: string;
    licensePlate: string;
    category: string;
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    totalVisits: number;
  };
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
}

const subscribeWashClubSchema = z.object({
  outletId: z.string().optional(),
  licensePlate: z.string().min(3, "Nomor plat kendaraan minimal 3 karakter"),
  vehicleCategory: z.nativeEnum(VehicleCategory),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  customerPhone: z.string().min(8, "Nomor WhatsApp minimal 8 digit"),
  customerName: z.string().min(2, "Nama pelanggan minimal 2 karakter"),
  planName: z.string().min(2, "Nama paket langganan minimal 2 karakter"),
  priceMonthly: z.number().min(0, "Harga paket tidak boleh negatif"),
  durationMonths: z.number().int().min(1).default(1),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
});

export type SubscribeWashClubInput = z.infer<typeof subscribeWashClubSchema>;

/**
 * Mendaftarkan kendaraan dan pelanggan ke program Unlimited Wash Club Bulanan
 */
export async function subscribeWashClubAction(
  input: SubscribeWashClubInput
): Promise<ActionResponse<WashClubSubscriptionItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid. Silakan login." };
    }

    const outletId = input.outletId || user.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang aktif tidak ditemukan." };
    }

    const parsed = subscribeWashClubSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi gagal",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const data = parsed.data;
    const cleanPlate = data.licensePlate
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    const cleanPhone = data.customerPhone.replace(/[^0-9]/g, "");

    // 1. Upsert Customer
    const customer = await prisma.customer.upsert({
      where: { phone: cleanPhone },
      create: {
        phone: cleanPhone,
        fullName: data.customerName,
        totalVisits: 1,
      },
      update: {
        fullName: data.customerName,
      },
    });

    // 2. Upsert Vehicle
    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate: cleanPlate },
      create: {
        licensePlate: cleanPlate,
        category: data.vehicleCategory,
        brand: data.brand || null,
        model: data.model || null,
        color: data.color || null,
        customerId: customer.id,
      },
      update: {
        category: data.vehicleCategory,
        brand: data.brand || undefined,
        model: data.model || undefined,
        color: data.color || undefined,
        customerId: customer.id,
      },
    });

    // 3. Generate Unique Pass Code
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const plateCode = cleanPlate.replace(/[^A-Z0-9]/g, "");
    const qrPassCode = `WC-${plateCode}-${randomHex}`;

    // 4. Hitung masa aktif
    const now = new Date();
    // Cek jika sudah punya subscription aktif untuk kendaraan ini, perpanjang dari tanggal kedaluwarsa terakhir
    const existingSub = await prisma.washClubSubscription.findFirst({
      where: {
        vehicleId: vehicle.id,
        outletId,
        isActive: true,
        expiresAt: { gte: now },
      },
    });

    const startDate = existingSub ? existingSub.startDate : now;
    const baseExpiry = existingSub ? existingSub.expiresAt : now;
    const durationDays = data.durationMonths * 30;
    const expiresAt = new Date(
      baseExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    let subscription;
    if (existingSub) {
      subscription = await prisma.washClubSubscription.update({
        where: { id: existingSub.id },
        data: {
          planName: data.planName,
          priceMonthly: data.priceMonthly,
          expiresAt,
          isActive: true,
          notes: data.notes || existingSub.notes,
        },
        include: {
          vehicle: true,
          customer: true,
          outlet: true,
        },
      });
    } else {
      subscription = await prisma.washClubSubscription.create({
        data: {
          outletId,
          vehicleId: vehicle.id,
          customerId: customer.id,
          planName: data.planName,
          priceMonthly: data.priceMonthly,
          startDate,
          expiresAt,
          isActive: true,
          qrPassCode,
          notes: data.notes || null,
        },
        include: {
          vehicle: true,
          customer: true,
          outlet: true,
        },
      });
    }

    // 5. Catat Audit Log
    await createAuditLog({
      outletId,
      actorId: user.id,
      actorRole: user.role,
      action: "WASH_CLUB_SUBSCRIBED",
      entityType: "WashClubSubscription",
      entityId: subscription.id,
      metadata: {
        licensePlate: cleanPlate,
        customerName: customer.fullName,
        planName: data.planName,
        priceMonthly: data.priceMonthly,
        durationMonths: data.durationMonths,
        paymentMethod: data.paymentMethod,
        qrPassCode: subscription.qrPassCode,
        expiresAt: subscription.expiresAt.toISOString(),
      },
    });

    // 6. Kirim Digital Pass WhatsApp
    await sendWhatsAppWashClubPass({
      outletId,
      recipientPhone: customer.phone,
      customerName: customer.fullName,
      licensePlate: cleanPlate,
      planName: data.planName,
      priceMonthly: Number(subscription.priceMonthly),
      startDate: subscription.startDate,
      expiresAt: subscription.expiresAt,
      qrPassCode: subscription.qrPassCode,
      outletName: subscription.outlet.name,
      outletAddress: subscription.outlet.address,
      slogan: subscription.outlet.slogan,
    });

    revalidatePath("/dashboard/membership");
    revalidatePath("/pos/antrean");
    revalidatePath("/pos/daftar-baru");

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
    );

    return {
      success: true,
      data: {
        id: subscription.id,
        outletId: subscription.outletId,
        planName: subscription.planName,
        priceMonthly: Number(subscription.priceMonthly),
        startDate: subscription.startDate.toISOString(),
        expiresAt: subscription.expiresAt.toISOString(),
        isActive: subscription.isActive,
        qrPassCode: subscription.qrPassCode,
        notes: subscription.notes,
        daysRemaining,
        isExpired: subscription.expiresAt < new Date(),
        vehicle: {
          id: subscription.vehicle.id,
          licensePlate: subscription.vehicle.licensePlate,
          category: subscription.vehicle.category,
          brand: subscription.vehicle.brand,
          model: subscription.vehicle.model,
          color: subscription.vehicle.color,
          totalVisits: subscription.vehicle.totalVisits,
        },
        customer: {
          id: subscription.customer.id,
          fullName: subscription.customer.fullName,
          phone: subscription.customer.phone,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mendaftarkan paket Wash Club.",
    };
  }
}

/**
 * Mengambil daftar langganan Wash Club di outlet aktif
 */
export async function getWashClubSubscriptionsAction(params?: {
  outletId?: string;
  status?: "ALL" | "ACTIVE" | "EXPIRED";
}): Promise<ActionResponse<WashClubSubscriptionItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid. Silakan login." };
    }

    const outletId = params?.outletId || user.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang aktif tidak ditemukan." };
    }

    const now = new Date();
    const whereClause: {
      outletId: string;
      isActive?: boolean;
      expiresAt?: { gte?: Date; lt?: Date };
    } = { outletId };

    if (params?.status === "ACTIVE") {
      whereClause.isActive = true;
      whereClause.expiresAt = { gte: now };
    } else if (params?.status === "EXPIRED") {
      whereClause.expiresAt = { lt: now };
    }

    const list = await prisma.washClubSubscription.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        customer: true,
      },
      orderBy: { expiresAt: "desc" },
    });

    const items: WashClubSubscriptionItem[] = list.map((s) => {
      const daysRemaining = Math.max(
        0,
        Math.ceil((s.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      );
      return {
        id: s.id,
        outletId: s.outletId,
        planName: s.planName,
        priceMonthly: Number(s.priceMonthly),
        startDate: s.startDate.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isActive: s.isActive,
        qrPassCode: s.qrPassCode,
        notes: s.notes,
        daysRemaining,
        isExpired: s.expiresAt < now,
        vehicle: {
          id: s.vehicle.id,
          licensePlate: s.vehicle.licensePlate,
          category: s.vehicle.category,
          brand: s.vehicle.brand,
          model: s.vehicle.model,
          color: s.vehicle.color,
          totalVisits: s.vehicle.totalVisits,
        },
        customer: {
          id: s.customer.id,
          fullName: s.customer.fullName,
          phone: s.customer.phone,
        },
      };
    });

    return { success: true, data: items };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memuat langganan Wash Club.",
    };
  }
}

/**
 * Menonaktifkan status langganan Wash Club
 */
export async function toggleWashClubSubscriptionAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<{ id: string; isActive: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const sub = await prisma.washClubSubscription.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/dashboard/membership");
    revalidatePath("/pos/daftar-baru");

    return { success: true, data: { id: sub.id, isActive: sub.isActive } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status Wash Club.",
    };
  }
}

/**
 * Mengirim ulang kartu digital pass WhatsApp ke pelanggan
 */
export async function sendWashClubPassAction(
  id: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const sub = await prisma.washClubSubscription.findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: true,
        outlet: true,
      },
    });

    if (!sub) {
      return { success: false, error: "Data langganan tidak ditemukan." };
    }

    const res = await sendWhatsAppWashClubPass({
      outletId: sub.outletId,
      recipientPhone: sub.customer.phone,
      customerName: sub.customer.fullName,
      licensePlate: sub.vehicle.licensePlate,
      planName: sub.planName,
      priceMonthly: Number(sub.priceMonthly),
      startDate: sub.startDate,
      expiresAt: sub.expiresAt,
      qrPassCode: sub.qrPassCode,
      outletName: sub.outlet.name,
      outletAddress: sub.outlet.address,
      slogan: sub.outlet.slogan,
    });

    if (!res.success) {
      return { success: false, error: "Gagal mengirim pesan WhatsApp." };
    }

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengirim WhatsApp pass.",
    };
  }
}
