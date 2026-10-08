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
  assignedWasherIds: z.array(z.string()).optional(),
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

    if (user.role === "WASHER") {
      return {
        success: false,
        error:
          "Akses ditolak. Petugas cuci (Washer) tidak memiliki hak pendaftaran tiket POS.",
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
      assignedWasherIds,
    } = parsed.data;

    // 0. Validasi Lisensi Operasional & Grace Period Cabang (Task 8.1)
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: {
        id: true,
        name: true,
        isActive: true,
        subscriptionExpiresAt: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!outlet) {
      return { success: false, error: "Cabang outlet tidak ditemukan." };
    }

    if (!outlet.isActive) {
      return {
        success: false,
        error:
          "Lisensi operasional cabang ini dinonaktifkan oleh administrator. Hubungi tim dukungan platform.",
      };
    }

    const now = new Date();
    const expiresAt =
      outlet.subscriptionExpiresAt ??
      new Date(outlet.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs < 0) {
      const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      // Jika telah melewati masa tenggang 3 hari (> 3 hari) atau status EXPIRED
      if (overdueDays > 3 || outlet.subscriptionStatus === "EXPIRED") {
        return {
          success: false,
          error:
            "Masa langganan cabang telah berakhir (melewati toleransi masa tenggang 3 hari). Harap hubungi Owner untuk melakukan perpanjangan sewa Rp 50.000/bulan.",
        };
      }
    }

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
        status:
          assignedWasherIds && assignedWasherIds.length > 0
            ? TicketStatus.WASHING
            : TicketStatus.QUEUED,
        washingStartedAt:
          assignedWasherIds && assignedWasherIds.length > 0
            ? new Date()
            : undefined,
        initialNotes: initialNotes || null,
        inspectionPhotos:
          inspectionPhotos && inspectionPhotos.length > 0
            ? inspectionPhotos
            : undefined,
      },
    });

    // 7. Tugaskan Pekerja Cuci Awal jika dipilih di Kasir (Task 4.2)
    if (assignedWasherIds && assignedWasherIds.length > 0) {
      const selectedWashers = await prisma.employee.findMany({
        where: {
          id: { in: assignedWasherIds },
          outletId,
          isActive: true,
        },
      });

      if (selectedWashers.length > 0) {
        const washerCount = selectedWashers.length;
        for (const washer of selectedWashers) {
          let commission = 0;
          if (washer.commissionType === "PERCENTAGE") {
            commission =
              (Number(servicePackage.price) * Number(washer.commissionRate)) /
              100;
          } else {
            commission = Number(washer.commissionRate);
          }
          if (washerCount > 1) {
            commission = commission / washerCount;
          }

          await prisma.ticketWasher.create({
            data: {
              ticketId: ticket.id,
              employeeId: washer.id,
              commissionAmount: Math.round(commission),
            },
          });
        }
      }
    }

    revalidatePath("/pos/antrean");
    revalidatePath("/pos/queue");
    revalidatePath("/pos");
    revalidatePath("/layar-cuci");
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
    if (!user && input.nextStatus === "CANCELLED") {
      return {
        success: false,
        error:
          "Pembatalan tiket hanya dapat dilakukan oleh staf yang telah masuk ke akun.",
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

    // Proteksi IDOR: Staf cabang hanya berhak memodifikasi tiket pada outlet aktifnya
    const userOutletId = user?.outletId;
    const isOwnerOfOutlet = user?.ownedOutlets?.some(
      (o) => o.id === existingTicket.outletId
    );
    if (
      user &&
      user.role !== "SUPERADMIN" &&
      userOutletId &&
      existingTicket.outletId !== userOutletId &&
      !isOwnerOfOutlet
    ) {
      return {
        success: false,
        error: "Akses ditolak: Tiket tidak terdaftar di cabang aktif Anda.",
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

      if (user) {
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

    if (user.role === "WASHER") {
      return {
        success: false,
        error:
          "Akses ditolak. Petugas cuci (Washer) tidak diizinkan memproses pembayaran kasir.",
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

    // Proteksi IDOR: Pastikan tiket cocok dengan outletId dan pengguna memiliki hak akses ke cabang tersebut
    const isOwnerOfOutlet = user.ownedOutlets?.some(
      (o) => o.id === ticket.outletId
    );
    if (user.role !== "SUPERADMIN") {
      if (ticket.outletId !== outletId) {
        return {
          success: false,
          error:
            "Akses ditolak: ID cabang tiket tidak sesuai dengan data checkout.",
        };
      }
      if (
        user.outletId &&
        ticket.outletId !== user.outletId &&
        !isOwnerOfOutlet
      ) {
        return {
          success: false,
          error: "Akses ditolak: Tiket tidak terdaftar pada cabang aktif Anda.",
        };
      }
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

    // 3. Ambil data bahan operasional terlebih dahulu untuk efisiensi transaksi
    const isMotor = ticket.vehicleCategory.startsWith("MOTOR_");
    const supplies = await prisma.operationalSupply.findMany({
      where: { outletId },
    });

    // 4. Jalankan Transaksi Database Terpadu dengan timeout toleran untuk koneksi remote (30 detik)
    const result = await prisma.$transaction(
      async (tx) => {
        // a. Buat Record Pembayaran
        const payment = await tx.payment.create({
          data: {
            ticketId,
            outletId,
            cashierId: user.id,
            method: paymentMethod as PaymentMethod,
            status: PaymentStatus.PAID,
            totalAmount,
            cashGiven:
              paymentMethod === "CASH" ? cashGiven || totalAmount : null,
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
          const pointsEarned = Math.floor(
            (servicePrice + subtotalRetail) / 1000
          );
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
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

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

const openingFloatSchema = z.object({
  outletId: z.string().min(1, "ID Cabang wajib diisi"),
  openingAmount: z.number().min(0, "Modal awal tidak boleh negatif"),
  notes: z.string().optional(),
});

export type RecordOpeningFloatInput = z.infer<typeof openingFloatSchema>;

/**
 * Server Action untuk mencatat modal uang kas awal di laci kasir (Cash Float).
 * Dicatat ke AuditLog dengan action DRAWER_OPENING_FLOAT.
 */
export async function recordOpeningDrawerFloatAction(
  input: RecordOpeningFloatInput
): Promise<ActionResponse<{ openingAmount: number; recordedAt: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi kasir berakhir. Silakan masuk kembali.",
      };
    }

    const parsed = openingFloatSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Input modal awal tidak valid." };
    }

    const { outletId, openingAmount, notes } = parsed.data;
    const now = new Date();

    await prisma.auditLog.create({
      data: {
        outletId,
        actorId: user.id,
        actorRole: user.role,
        action: "DRAWER_OPENING_FLOAT",
        entityType: "CashDrawer",
        entityId: user.id,
        metadata: {
          openingAmount,
          cashierName: user.fullName,
          date: now.toISOString().slice(0, 10),
          notes: notes || "Modal awal kasir",
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pos");

    return {
      success: true,
      data: {
        openingAmount,
        recordedAt: now.toISOString(),
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mencatat modal awal kasir.";
    return { success: false, error: message };
  }
}

/**
 * Server Action untuk mengambil modal awal kasir hari ini.
 */
export async function getOpeningDrawerFloatAction(
  outletId: string
): Promise<ActionResponse<{ openingAmount: number; recordedAt?: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const log = await prisma.auditLog.findFirst({
      where: {
        outletId,
        actorId: user.id,
        action: "DRAWER_OPENING_FLOAT",
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!log || !log.metadata) {
      return {
        success: true,
        data: { openingAmount: 0 },
      };
    }

    const meta = log.metadata as { openingAmount?: number };
    return {
      success: true,
      data: {
        openingAmount: Number(meta.openingAmount || 0),
        recordedAt: log.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengambil modal awal.",
    };
  }
}

const closeCashierShiftSchema = z.object({
  outletId: z.string().min(1, "ID Cabang wajib diisi"),
  openingAmount: z.number().min(0),
  physicalCashCounted: z.number().min(0, "Hitungan fisik tidak boleh negatif"),
  notes: z.string().optional(),
});

export type CloseCashierShiftInput = z.infer<typeof closeCashierShiftSchema>;

export interface ShiftReconciliationReport {
  closedAt: string;
  cashierName: string;
  outletName: string;
  openingAmount: number;
  cashPayments: number;
  qrisPayments: number;
  transferPayments: number;
  nonCashPayments: number;
  totalRevenue: number;
  transactionsCount: number;
  expectedDrawerCash: number;
  physicalCashCounted: number;
  discrepancy: number;
  discrepancyStatus: "BALANCED" | "SURPLUS" | "DEFICIT";
  notes?: string;
}

/**
 * Server Action untuk Rekonsiliasi & Penutupan Shift Kasir (Task 4.5).
 */
export async function closeCashierShiftAction(
  input: CloseCashierShiftInput
): Promise<ActionResponse<ShiftReconciliationReport>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Sesi kasir berakhir. Silakan masuk kembali.",
      };
    }

    const parsed = closeCashierShiftSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Parameter rekonsiliasi kasir tidak valid.",
      };
    }

    const { outletId, openingAmount, physicalCashCounted, notes } = parsed.data;

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { name: true },
    });

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Ambil seluruh pembayaran yang ditangani kasir hari ini
    const payments = await prisma.payment.findMany({
      where: {
        outletId,
        cashierId: user.id,
        paidAt: { gte: todayStart },
      },
    });

    let cashPayments = 0;
    let qrisPayments = 0;
    let transferPayments = 0;

    for (const p of payments) {
      const amt = Number(p.totalAmount);
      if (p.method === "CASH") cashPayments += amt;
      else if (p.method === "QRIS") qrisPayments += amt;
      else if (p.method === "BANK_TRANSFER") transferPayments += amt;
    }

    const nonCashPayments = qrisPayments + transferPayments;
    const totalRevenue = cashPayments + nonCashPayments;
    const expectedDrawerCash = openingAmount + cashPayments;
    const discrepancy = physicalCashCounted - expectedDrawerCash;

    let discrepancyStatus: "BALANCED" | "SURPLUS" | "DEFICIT" = "BALANCED";
    if (discrepancy > 0) discrepancyStatus = "SURPLUS";
    else if (discrepancy < 0) discrepancyStatus = "DEFICIT";

    const report: ShiftReconciliationReport = {
      closedAt: now.toISOString(),
      cashierName: user.fullName,
      outletName: outlet?.name || "Kinclongin Cabang",
      openingAmount,
      cashPayments,
      qrisPayments,
      transferPayments,
      nonCashPayments,
      totalRevenue,
      transactionsCount: payments.length,
      expectedDrawerCash,
      physicalCashCounted,
      discrepancy,
      discrepancyStatus,
      notes: notes || undefined,
    };

    // Catat rekonsiliasi ke AuditLog
    await prisma.auditLog.create({
      data: {
        outletId,
        actorId: user.id,
        actorRole: user.role,
        action: "CASHIER_SHIFT_RECONCILIATION",
        entityType: "CashDrawer",
        entityId: user.id,
        metadata: {
          ...report,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pos");

    return {
      success: true,
      data: report,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memproses rekonsiliasi penutupan shift kasir.";
    return { success: false, error: message };
  }
}
