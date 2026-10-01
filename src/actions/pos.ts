"use server";

import { revalidatePath, updateTag } from "next/cache";

import { z } from "zod";

import {
  MovementType,
  PaymentMethod,
  PaymentStatus,
  TicketStatus,
  VehicleCategory,
} from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { sendWhatsAppReceipt } from "@/lib/whatsapp/sender";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const createWashTicketSchema = z.object({
  outletId: z.string().min(1, "ID Cabang wajib diisi"),
  licensePlate: z
    .string()
    .min(3, "Nomor plat tidak valid")
    .transform((val) => val.toUpperCase().replace(/\s+/g, " ").trim()),
  vehicleCategory: z.enum([
    "MOTOR_KECIL",
    "MOTOR_BESAR",
    "MOTOR_MOGE",
    "MOBIL_KECIL",
    "MOBIL_SEDANG",
    "MOBIL_BESAR",
    "KENDARAAN_LAIN",
  ] as const),
  servicePackageId: z.string().min(1, "Paket layanan wajib dipilih"),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  initialNotes: z.string().optional(),
  inspectionPhotos: z.array(z.string()).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  useMembershipQuota: z.boolean().optional(),
  membershipId: z.string().optional(),
});

export type CreateWashTicketInput = z.infer<typeof createWashTicketSchema>;

/**
 * Server Action untuk membuat tiket antrean baru dari input walk-in Kasir.
 */
export async function createWashTicketAction(
  input: CreateWashTicketInput
): Promise<ActionResponse<{ ticketId: string; ticketNumber: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi kasir berakhir. Silakan masuk kembali.",
      };
    }

    const parsed = createWashTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi form tiket gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      outletId,
      licensePlate,
      vehicleCategory,
      servicePackageId,
      customerPhone,
      customerName,
      initialNotes,
      inspectionPhotos,
      brand,
      model,
      color,
      useMembershipQuota,
      membershipId,
    } = parsed.data;

    // 1. Ambil detail paket layanan cuci
    const servicePackage = await prisma.servicePackage.findUnique({
      where: { id: servicePackageId, outletId },
    });

    if (!servicePackage) {
      return {
        success: false,
        error:
          "Paket layanan cuci tidak ditemukan atau tidak aktif di cabang ini.",
      };
    }

    // 2. Generate nomor seri tiket: KNC-YYYYMMDD-XXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const countToday = await prisma.washTicket.count({
      where: {
        outletId,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    const sequence = String(countToday + 1).padStart(3, "0");
    const ticketNumber = `KNC-${dateStr}-${sequence}`;

    // 3. Tangani Pelanggan (Customer) jika nomor HP disediakan
    let customerId: string | null = null;
    const cleanPhone = customerPhone?.replace(/[^0-9]/g, "");

    if (cleanPhone && cleanPhone.length >= 9) {
      const customer = await prisma.customer.upsert({
        where: { phone: cleanPhone },
        create: {
          phone: cleanPhone,
          fullName: customerName || "Pelanggan Tanpa Nama",
          totalVisits: 1,
        },
        update: {
          fullName: customerName || undefined,
          totalVisits: { increment: 1 },
        },
      });
      customerId = customer.id;
    }

    // 4. Tangani Kendaraan (Vehicle) - Terkunci per plat nomor
    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate },
      create: {
        licensePlate,
        category: vehicleCategory as VehicleCategory,
        brand: brand || null,
        model: model || null,
        color: color || null,
        customerId: customerId || undefined,
        totalVisits: 1,
      },
      update: {
        category: vehicleCategory as VehicleCategory,
        brand: brand || undefined,
        model: model || undefined,
        color: color || undefined,
        customerId: customerId || undefined,
        totalVisits: { increment: 1 },
      },
    });

    // 5. Periksa jika pelanggan menggunakan Kuota Langganan Member
    let isMembershipWash = false;
    let validMembershipId: string | null = null;
    let finalDiscount = 0;
    let finalTotal = Number(servicePackage.price);
    let finalPaymentStatus: PaymentStatus = PaymentStatus.UNPAID;

    if (useMembershipQuota && membershipId) {
      const activeMembership = await prisma.customerMembership.findFirst({
        where: {
          id: membershipId,
          status: "ACTIVE",
          remainingQuota: { gt: 0 },
        },
      });

      if (activeMembership) {
        // Potong 1 kuota cuci dari langganan
        await prisma.customerMembership.update({
          where: { id: activeMembership.id },
          data: {
            remainingQuota: { decrement: 1 },
          },
        });
        isMembershipWash = true;
        validMembershipId = activeMembership.id;
        finalDiscount = Number(servicePackage.price);
        finalTotal = 0;
        finalPaymentStatus = PaymentStatus.PAID;
      }
    }

    // 6. Buat Tiket Cuci Baru di status QUEUED
    const ticket = await prisma.washTicket.create({
      data: {
        ticketNumber,
        outletId,
        createdById: user.id,
        customerId,
        vehicleId: vehicle.id,
        licensePlate,
        vehicleCategory: vehicleCategory as VehicleCategory,
        servicePackageId,
        servicePrice: servicePackage.price,
        subtotalServices: servicePackage.price,
        subtotalRetail: 0,
        discountAmount: finalDiscount,
        totalAmount: finalTotal,
        paidAmount: isMembershipWash ? 0 : 0,
        paymentStatus: finalPaymentStatus,
        membershipId: validMembershipId,
        isMembershipWash,
        status: TicketStatus.QUEUED,
        initialNotes: initialNotes || null,
        inspectionPhotos:
          inspectionPhotos && inspectionPhotos.length > 0
            ? inspectionPhotos
            : undefined,
      },
    });

    revalidatePath("/pos/antrean");
    revalidatePath("/pos/queue");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    updateTag("dashboard-metrics");

    return {
      success: true,
      data: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kegagalan pembuatan tiket cuci.";
    return {
      success: false,
      error: message,
    };
  }
}

const advanceTicketStatusSchema = z.object({
  ticketId: z.string().min(1, "ID Tiket wajib diisi"),
  nextStatus: z.enum([
    "WASHING",
    "DRYING",
    "READY",
    "COMPLETED",
    "CANCELLED",
  ] as const),
  cancellationReason: z.string().optional(),
});

export type AdvanceTicketStatusInput = z.infer<
  typeof advanceTicketStatusSchema
>;

/**
 * Server Action untuk memajukan tahapan cuci kendaraan (Kanban Board Action).
 */
export async function advanceTicketStatusAction(
  input: AdvanceTicketStatusInput
): Promise<ActionResponse<{ ticketId: string; newStatus: TicketStatus }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized. Silakan masuk terlebih dahulu.",
      };
    }

    const parsed = advanceTicketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Parameter status tidak valid.",
      };
    }

    const { ticketId, nextStatus, cancellationReason } = parsed.data;

    const existingTicket = await prisma.washTicket.findUnique({
      where: { id: ticketId },
      include: { outlet: true },
    });

    if (!existingTicket) {
      return {
        success: false,
        error: "Tiket tidak ditemukan.",
      };
    }

    const updateData: Record<string, unknown> = {
      status: nextStatus as TicketStatus,
    };

    const now = new Date();
    if (nextStatus === "WASHING" && !existingTicket.washingStartedAt) {
      updateData.washingStartedAt = now;
    } else if (nextStatus === "DRYING" && !existingTicket.dryingStartedAt) {
      updateData.dryingStartedAt = now;
    } else if (nextStatus === "READY" && !existingTicket.readyAt) {
      updateData.readyAt = now;
    } else if (nextStatus === "COMPLETED" && !existingTicket.completedAt) {
      updateData.completedAt = now;
    }

    const updated = await prisma.washTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Jika dibatalkan, catat ke AuditLog dan kurangi kunjungan jika belum pernah selesai
    if (nextStatus === "CANCELLED") {
      if (existingTicket.customerId) {
        await prisma.customer
          .update({
            where: { id: existingTicket.customerId },
            data: { totalVisits: { decrement: 1 } },
          })
          .catch(() => null);
      }
      if (existingTicket.vehicleId) {
        await prisma.vehicle
          .update({
            where: { id: existingTicket.vehicleId },
            data: { totalVisits: { decrement: 1 } },
          })
          .catch(() => null);
      }

      await prisma.auditLog.create({
        data: {
          outletId: existingTicket.outletId,
          actorId: user.id,
          actorRole: user.role,
          action: "TICKET_CANCELLED",
          entityType: "WashTicket",
          entityId: ticketId,
          metadata: {
            reason: cancellationReason || "Dibatalkan oleh kasir",
            ticketNumber: existingTicket.ticketNumber,
          },
        },
      });
    }

    revalidatePath("/pos/antrean");
    revalidatePath("/pos/queue");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    updateTag("dashboard-metrics");

    return {
      success: true,
      data: {
        ticketId: updated.id,
        newStatus: updated.status,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui status tiket.";
    return {
      success: false,
      error: message,
    };
  }
}

const checkoutTicketSchema = z.object({
  ticketId: z.string().min(1, "ID Tiket wajib diisi"),
  outletId: z.string().min(1, "ID Cabang wajib diisi"),
  paymentMethod: z.enum([
    "CASH",
    "QRIS",
    "BANK_TRANSFER",
    "SPLIT",
    "LOYALTY_POINTS",
  ] as const),
  cashGiven: z.number().min(0).optional(),
  referenceNumber: z.string().optional(),
  proofImageUrl: z.string().url().optional(),
  retailItems: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      })
    )
    .default([]),
  discountAmount: z.number().min(0).default(0),
  redeemPoints: z.number().int().min(0).default(0),
  registerMembership: z.boolean().optional(),
});

export type CheckoutTicketInput = z.infer<typeof checkoutTicketSchema>;

/**
 * Server Action untuk memproses pembayaran kasir POS,
 * memotong stok barang ritel, memotong bahan habis pakai operasional (recipe deduction),
 * dan mengirim struk via WhatsApp.
 */
export async function checkoutTicketAction(input: CheckoutTicketInput): Promise<
  ActionResponse<{
    paymentId: string;
    changeGiven: number;
    totalAmount: number;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi kasir berakhir. Silakan masuk kembali.",
      };
    }

    const parsed = checkoutTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi parameter checkout gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      ticketId,
      outletId,
      paymentMethod,
      cashGiven,
      referenceNumber,
      proofImageUrl,
      retailItems,
      discountAmount,
      redeemPoints,
      registerMembership,
    } = parsed.data;

    // 1. Ambil detail tiket cuci
    const ticket = await prisma.washTicket.findUnique({
      where: { id: ticketId },
      include: {
        servicePackage: true,
        vehicle: true,
        customer: true,
        outlet: true,
      },
    });

    if (!ticket) {
      return { success: false, error: "Tiket cuci tidak ditemukan." };
    }

    if (ticket.status === TicketStatus.COMPLETED) {
      return {
        success: false,
        error: "Tiket ini sudah diselesaikan dan dibayar sebelumnya.",
      };
    }

    // 2. Kalkulasi Keuangan
    const servicePrice = Number(ticket.servicePrice);
    const subtotalRetail = retailItems.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0
    );

    // Hitung potongan jika ada redeem poin (10 poin = Rp 1.000)
    const pointsDiscount = Math.floor(redeemPoints / 10) * 1000;
    const effectiveDiscount = discountAmount + pointsDiscount;
    const membershipFee = registerMembership ? 50000 : 0;

    const totalAmount = Math.max(
      0,
      servicePrice + subtotalRetail + membershipFee - effectiveDiscount
    );

    let changeGiven = 0;
    if (
      paymentMethod === "CASH" &&
      cashGiven != null &&
      cashGiven > totalAmount
    ) {
      changeGiven = cashGiven - totalAmount;
    }

    // 3. Jalankan Transaksi Database Terpadu
    const result = await prisma.$transaction(async (tx) => {
      // a. Buat Record Pembayaran
      const payment = await tx.payment.create({
        data: {
          ticketId,
          outletId,
          cashierId: user.id,
          method: paymentMethod as PaymentMethod,
          status: PaymentStatus.PAID,
          totalAmount,
          cashGiven: paymentMethod === "CASH" ? cashGiven || totalAmount : null,
          changeGiven: changeGiven > 0 ? changeGiven : null,
          referenceNumber: referenceNumber || null,
          proofImageUrl: proofImageUrl || null,
          paidAt: new Date(),
        },
      });

      // b. Catat Produk Ritel & Potong Stok Toko
      if (retailItems.length > 0) {
        await tx.ticketRetailItem.deleteMany({ where: { ticketId } });

        for (const item of retailItems) {
          await tx.ticketRetailItem.create({
            data: {
              ticketId,
              retailProductId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
            },
          });

          // Kurangi stok ritel
          const updatedProduct = await tx.retailProduct.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });

          // Catat mutasi stok OUT_SALE
          await tx.stockMovement.create({
            data: {
              outletId,
              retailProductId: item.productId,
              movementType: MovementType.OUT_SALE,
              quantity: item.quantity,
              balanceAfter: updatedProduct.stock,
              referenceNote: `Penjualan Ritel Tiket #${ticket.ticketNumber}`,
            },
          });
        }
      }

      // c. Recipe Deduction: Potong Bahan Habis Pakai Operasional (Shampoo & Semir Ban)
      const isMotor = ticket.vehicleCategory.startsWith("MOTOR_");
      const supplies = await tx.operationalSupply.findMany({
        where: { outletId },
      });

      for (const supply of supplies) {
        const usage = isMotor
          ? Number(supply.usagePerMotorWash)
          : Number(supply.usagePerCarWash);

        if (usage > 0) {
          const updatedSupply = await tx.operationalSupply.update({
            where: { id: supply.id },
            data: { stock: { decrement: usage } },
          });

          await tx.stockMovement.create({
            data: {
              outletId,
              operationalSupplyId: supply.id,
              movementType: MovementType.OUT_USAGE,
              quantity: usage,
              balanceAfter: updatedSupply.stock,
              referenceNote: `Pemakaian Cuci Tiket #${ticket.ticketNumber} (${ticket.licensePlate})`,
            },
          });
        }
      }

      // d. Registrasi Membership Baru Rp 50.000 (Jika Dipilih Kasir)
      let membershipBonusPoints = 0;
      if (registerMembership && ticket.customerId) {
        const startDate = new Date();
        const endDate = new Date(
          startDate.getTime() + 365 * 24 * 60 * 60 * 1000
        );
        await tx.customerMembership.create({
          data: {
            customerId: ticket.customerId,
            outletId,
            planName: "Member Loyalitas Kinclongin",
            price: 50000,
            startDate,
            endDate,
            status: "ACTIVE",
            totalQuota: 999,
            remainingQuota: 999,
            discountPercent: 0,
            paymentMethod: paymentMethod as PaymentMethod,
            paymentRef: referenceNumber || null,
            cashierId: user.id,
            notes: "Pendaftaran member saat checkout kasir",
          },
        });
        membershipBonusPoints = 50;
      }

      // e. Akumulasi Poin Loyalitas Pelanggan (1 poin per Rp 1.000 belanja)
      if (ticket.customerId) {
        const pointsEarned = Math.floor((servicePrice + subtotalRetail) / 1000);
        const netPointsChange =
          pointsEarned - redeemPoints + membershipBonusPoints;

        const updatedCustomer = await tx.customer.update({
          where: { id: ticket.customerId },
          data: {
            loyaltyPoints: { increment: netPointsChange },
          },
        });

        await tx.customerLoyaltyLog.create({
          data: {
            customerId: ticket.customerId,
            ticketId,
            pointsChanged: netPointsChange,
            balanceAfter: updatedCustomer.loyaltyPoints,
            description: `Transaksi Tiket #${ticket.ticketNumber} (+${pointsEarned} poin${
              redeemPoints > 0 ? `, -${redeemPoints} redeem` : ""
            }${membershipBonusPoints > 0 ? `, +${membershipBonusPoints} bonus member` : ""})`,
          },
        });
      }

      // e. Update Status Tiket Menjadi Selesai (COMPLETED)
      const now = new Date();
      await tx.washTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          subtotalServices: servicePrice,
          subtotalRetail,
          discountAmount: effectiveDiscount,
          totalAmount,
          paidAmount:
            paymentMethod === "CASH" ? cashGiven || totalAmount : totalAmount,
          readyAt: ticket.readyAt || now,
          completedAt: now,
        },
      });

      return payment;
    });

    // 4. Kirim Struk Digital via WhatsApp jika nomor pelanggan ada
    if (ticket.customer?.phone) {
      const vehicleDesc = [
        ticket.vehicle?.brand,
        ticket.vehicle?.model,
        ticket.vehicle?.color,
      ]
        .filter(Boolean)
        .join(" ");

      sendWhatsAppReceipt({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        recipientPhone: ticket.customer.phone,
        customerName: ticket.customer.fullName,
        licensePlate: ticket.licensePlate,
        vehicleDesc: vehicleDesc || undefined,
        packageName: ticket.servicePackage.name,
        totalAmount,
        paymentMethod,
        outletName: ticket.outlet.name,
        outletAddress: ticket.outlet.address,
        outletPhone: ticket.outlet.phone,
        loyaltyPoints:
          ticket.customer.loyaltyPoints + Math.floor(totalAmount / 10000),
      }).catch((e) => console.error("Gagal kirim WhatsApp async:", e));
    }

    revalidatePath("/pos");
    revalidatePath("/pos/antrean");
    revalidatePath("/pos/queue");
    revalidatePath(`/pos/bayar/${ticketId}`);
    revalidatePath(`/pos/checkout/${ticketId}`);
    revalidatePath("/dashboard");
    updateTag("dashboard-metrics");

    return {
      success: true,
      data: {
        paymentId: result.id,
        changeGiven,
        totalAmount,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kegagalan proses checkout.";
    return {
      success: false,
      error: message,
    };
  }
}
