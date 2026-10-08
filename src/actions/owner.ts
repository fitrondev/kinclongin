"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { SurchargeBearer, TaxType, UserRole } from "@/generated/prisma/enums";
import { createAuditLog } from "@/lib/audit";
import { isSuperadmin } from "@/lib/auth/rbac";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ---------------------------------------------------------------------------
// 1. PENGATURAN WHATSAPP GATEWAY (KHUSUS OWNER)
// ---------------------------------------------------------------------------

const whatsAppConfigSchema = z.object({
  apiKey: z.string().trim().min(5, "API Key WhatsApp minimal 5 karakter"),
  senderNumber: z
    .string()
    .trim()
    .min(8, "Nomor WhatsApp pengirim minimal 8 digit"),
});

export type WhatsAppConfigInput = z.infer<typeof whatsAppConfigSchema>;

export async function saveWhatsAppConfigAction(
  input: WhatsAppConfigInput
): Promise<ActionResponse<{ outletId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid. Silakan login." };
    }

    if (user.role !== UserRole.OWNER) {
      return {
        success: false,
        error: "Hanya Owner yang memiliki izin mengatur WhatsApp Gateway.",
      };
    }

    if (!user.outletId) {
      return { success: false, error: "Cabang aktif tidak ditemukan." };
    }

    const parsed = whatsAppConfigSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi konfigurasi gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await prisma.outlet.update({
      where: { id: user.outletId },
      data: {
        waGatewayApiKey: parsed.data.apiKey,
        waSenderNumber: parsed.data.senderNumber,
      },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "WHATSAPP_CONFIG_UPDATE",
      entityType: "System",
      entityId: user.outletId,
      metadata: {
        senderNumber: parsed.data.senderNumber,
        timestamp: new Date().toISOString(),
      },
    });

    revalidatePath("/dashboard/pengaturan/whatsapp");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { outletId: user.outletId },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan konfigurasi WhatsApp.",
    };
  }
}

export async function testWhatsAppMessageAction(data: {
  targetPhone: string;
  testMessage?: string;
}): Promise<ActionResponse<{ status: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.OWNER) {
      return {
        success: false,
        error: "Hanya Owner yang boleh menguji kirim pesan WhatsApp.",
      };
    }

    if (!user.outletId) {
      return { success: false, error: "Cabang aktif tidak ditemukan." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: user.outletId },
    });

    if (!outlet?.waGatewayApiKey) {
      return {
        success: false,
        error:
          "API Key WhatsApp belum dikonfigurasi. Harap simpan API Key terlebih dahulu.",
      };
    }

    let phone = data.targetPhone.replace(/[^0-9]/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    if (!phone.startsWith("62")) phone = "62" + phone;

    const message =
      data.testMessage?.trim() ||
      `Halo! Ini adalah pesan uji coba dari ${outlet.name} menggunakan WhatsApp Gateway Kinclongin POS. Koneksi aktif & siap mengirim struk digital!`;

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: outlet.waGatewayApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message,
      }),
    });

    const resData = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      detail?: string;
    };

    if (!res.ok || resData.status === false) {
      return {
        success: false,
        error:
          resData.detail ||
          "Gagal mengirim pesan uji coba ke gateway. Periksa keaktifan API Key.",
      };
    }

    return {
      success: true,
      data: { status: "Pesan uji coba berhasil terkirim via WhatsApp!" },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Kendala jaringan saat pengujian WhatsApp.",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. AUDIT LOG KEAMANAN SISTEM
// ---------------------------------------------------------------------------

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function getAuditLogsAction(params?: {
  action?: string;
  limit?: number;
}): Promise<ActionResponse<AuditLogItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return {
        success: false,
        error:
          "Hanya Superadmin Platform yang memiliki otoritas melihat audit log sistem.",
      };
    }

    const limit = params?.limit ?? 50;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(user.outletId ? { outletId: user.outletId } : {}),
        ...(params?.action && params.action !== "ALL"
          ? { action: params.action }
          : {}),
      },
      include: {
        actor: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      success: true,
      data: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        actorName: l.actor?.fullName ?? "System / Admin",
        actorEmail: l.actor?.email ?? "-",
        actorRole: l.actor?.role ?? l.actorRole,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        metadata: (l.metadata as Record<string, unknown>) ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat audit log.",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. LAPORAN ARUS KAS (CASH FLOW) EKSEKUTIF
// ---------------------------------------------------------------------------

export interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  cashBreakdown: {
    cashIn: number;
    qrisIn: number;
    bankTransferIn: number;
  };
  outflowBreakdown: {
    materialExpenses: number;
    commissionsPaid: number;
    pettyCashExpenses: number;
  };
  pnl: {
    washRevenue: number;
    retailRevenue: number;
    totalRevenue: number;
    cogsChemicals: number;
    cogsRetail: number;
    totalCogs: number;
    washerCommissions: number;
    pettyCashExpenses: number;
    grossProfit: number;
    grossMarginPercent: number;
    netOperatingProfit: number;
    netMarginPercent: number;
  };
  transactions: Array<{
    id: string;
    date: string;
    type: "INFLOW" | "OUTFLOW";
    category: string;
    description: string;
    amount: number;
    paymentMethod: string;
  }>;
}

export async function getCashFlowAction(params?: {
  rangeDays?: number;
}): Promise<ActionResponse<CashFlowSummary>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.OWNER) {
      return {
        success: false,
        error: "Hanya Owner yang dapat mengakses laporan arus kas eksekutif.",
      };
    }

    if (!user.outletId) {
      return { success: false, error: "Cabang aktif tidak ditemukan." };
    }

    const days = params?.rangeDays ?? 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Ambil seluruh pembayaran masuk (Kas Masuk)
    const payments = await prisma.payment.findMany({
      where: {
        ticket: { outletId: user.outletId },
        status: "PAID",
        paidAt: { gte: sinceDate },
      },
      include: {
        ticket: {
          select: {
            ticketNumber: true,
            licensePlate: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    let cashIn = 0;
    let qrisIn = 0;
    let bankTransferIn = 0;

    const inflowTransactions: CashFlowSummary["transactions"] = [];

    for (const p of payments) {
      const amount = Number(p.totalAmount);
      if (p.method === "CASH") cashIn += amount;
      else if (p.method === "QRIS") qrisIn += amount;
      else if (p.method === "BANK_TRANSFER") bankTransferIn += amount;
      else cashIn += amount;

      inflowTransactions.push({
        id: `IN-${p.id}`,
        date: p.paidAt.toISOString(),
        type: "INFLOW",
        category: "Pembayaran Cuci & Ritel",
        description: `Tiket #${p.ticket.ticketNumber} (${p.ticket.licensePlate})`,
        amount,
        paymentMethod: p.method,
      });
    }

    // 2. Ambil belanja stok bahan cuci (Kas Keluar)
    const stockPurchases = await prisma.stockMovement.findMany({
      where: {
        outletId: user.outletId,
        movementType: "IN_RESTOCK",
        createdAt: { gte: sinceDate },
      },
      include: {
        operationalSupply: true,
        retailProduct: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let materialExpenses = 0;
    const outflowTransactions: CashFlowSummary["transactions"] = [];

    for (const s of stockPurchases) {
      const qtyNumber = Number(s.quantity);
      const costPerUnit = Number(s.retailProduct?.costPrice || 0);
      const estExpense = costPerUnit > 0 ? costPerUnit * qtyNumber : 0;
      materialExpenses += estExpense;

      const itemName =
        s.operationalSupply?.name ||
        s.retailProduct?.name ||
        "Bahan Operasional";
      outflowTransactions.push({
        id: `OUT-STK-${s.id}`,
        date: s.createdAt.toISOString(),
        type: "OUTFLOW",
        category: "Belanja Bahan & Stok",
        description: `Restok ${qtyNumber}x ${itemName}`,
        amount: estExpense,
        paymentMethod: "TUNAI / VENDOR",
      });
    }

    // 3. Ambil komisi pekerja yang telah dicairkan (Kas Keluar)
    const paidCommissions = await prisma.ticketWasher.findMany({
      where: {
        ticket: { outletId: user.outletId },
        paidAt: { not: null, gte: sinceDate },
      },
      include: {
        washer: { select: { fullName: true } },
        ticket: { select: { ticketNumber: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    let commissionsPaid = 0;
    for (const c of paidCommissions) {
      const amount = Number(c.commissionAmount);
      commissionsPaid += amount;

      outflowTransactions.push({
        id: `OUT-COM-${c.id}`,
        date: (c.paidAt || c.assignedAt).toISOString(),
        type: "OUTFLOW",
        category: "Pencairan Komisi Pekerja",
        description: `Komisi ${c.washer.fullName} (Tiket #${c.ticket.ticketNumber})`,
        amount,
        paymentMethod: "TUNAI PAYROLL",
      });
    }

    // 4. Ambil pengeluaran kas kecil (Petty Cash Paid Out)
    const pettyCashMovements = await prisma.cashMovement.findMany({
      where: {
        outletId: user.outletId,
        type: "PAID_OUT",
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: "desc" },
    });

    let pettyCashExpenses = 0;
    for (const cm of pettyCashMovements) {
      const amt = Number(cm.amount);
      pettyCashExpenses += amt;

      outflowTransactions.push({
        id: `OUT-PETTY-${cm.id}`,
        date: cm.createdAt.toISOString(),
        type: "OUTFLOW",
        category: `Kas Kecil (${cm.category})`,
        description: cm.notes,
        amount: amt,
        paymentMethod: "LACI KAS",
      });
    }

    // 5. Kalkulasi P&L Laba Rugi Cabang
    const completedTickets = await prisma.washTicket.findMany({
      where: {
        outletId: user.outletId,
        status: "COMPLETED",
        completedAt: { gte: sinceDate },
      },
      select: {
        subtotalServices: true,
        subtotalRetail: true,
        cogsAmount: true,
      },
    });

    let washRevenue = 0;
    let retailRevenue = 0;
    let cogsChemicals = 0;

    for (const t of completedTickets) {
      washRevenue += Number(t.subtotalServices || 0);
      retailRevenue += Number(t.subtotalRetail || 0);
      cogsChemicals += Number(t.cogsAmount || 0);
    }

    // HPP Barang Ritel
    const retailItemsSold = await prisma.ticketRetailItem.findMany({
      where: {
        ticket: {
          outletId: user.outletId,
          status: "COMPLETED",
          completedAt: { gte: sinceDate },
        },
      },
      include: { product: { select: { costPrice: true } } },
    });

    let cogsRetail = 0;
    for (const ri of retailItemsSold) {
      const cost = Number(ri.product?.costPrice || 0);
      cogsRetail += cost * ri.quantity;
    }

    const totalRevenue = washRevenue + retailRevenue;
    const totalCogs = cogsChemicals + cogsRetail;
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercent =
      totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    const netOperatingProfit =
      grossProfit - commissionsPaid - pettyCashExpenses;
    const netMarginPercent =
      totalRevenue > 0
        ? Math.round((netOperatingProfit / totalRevenue) * 100)
        : 0;

    const totalInflow = cashIn + qrisIn + bankTransferIn;
    const totalOutflow = materialExpenses + commissionsPaid + pettyCashExpenses;
    const netCashFlow = totalInflow - totalOutflow;

    const allTransactions = [
      ...inflowTransactions,
      ...outflowTransactions,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      data: {
        totalInflow,
        totalOutflow,
        netCashFlow,
        cashBreakdown: { cashIn, qrisIn, bankTransferIn },
        outflowBreakdown: {
          materialExpenses,
          commissionsPaid,
          pettyCashExpenses,
        },
        pnl: {
          washRevenue,
          retailRevenue,
          totalRevenue,
          cogsChemicals,
          cogsRetail,
          totalCogs,
          washerCommissions: commissionsPaid,
          pettyCashExpenses,
          grossProfit,
          grossMarginPercent,
          netOperatingProfit,
          netMarginPercent,
        },
        transactions: allTransactions.slice(0, 100),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghitung arus kas.",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. UPDATE PROFIL CABANG (KHUSUS OWNER)
// ---------------------------------------------------------------------------

const updateOutletProfileSchema = z.object({
  outletId: z.string().min(1),
  name: z.string().min(2, "Nama cabang minimal 2 karakter"),
  address: z.string().min(3, "Alamat cabang minimal 3 karakter"),
  phone: z.string().min(5, "Nomor telepon cabang minimal 5 karakter"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  slogan: z
    .string()
    .max(100, "Slogan maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  receiptHeader: z
    .string()
    .max(100, "Header struk maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  receiptFooter: z
    .string()
    .max(255, "Footer struk maksimal 255 karakter")
    .optional()
    .or(z.literal("")),
  contactPhone: z
    .string()
    .max(25, "Nomor kontak CS maksimal 25 digit")
    .optional()
    .or(z.literal("")),
  taxEnabled: z.boolean().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxType: z.enum(["INCLUSIVE", "EXCLUSIVE"]).optional(),
  taxLabel: z.string().max(20).optional(),
  qrisSurchargeBearer: z.enum(["OUTLET", "CUSTOMER"]).optional(),
  qrisSurchargeRate: z.number().min(0).max(10).optional(),
});

export type UpdateOutletProfileInput = z.infer<
  typeof updateOutletProfileSchema
>;

export async function updateOutletProfileAction(
  input: UpdateOutletProfileInput
): Promise<ActionResponse<{ outletId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.OWNER) {
      return {
        success: false,
        error: "Hanya Owner yang dapat memperbarui profil cabang.",
      };
    }

    const parsed = updateOutletProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi data cabang gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      outletId,
      name,
      address,
      phone,
      logoUrl,
      slogan,
      receiptHeader,
      receiptFooter,
      contactPhone,
      taxEnabled,
      taxRate,
      taxType,
      taxLabel,
      qrisSurchargeBearer,
      qrisSurchargeRate,
    } = parsed.data;

    // Pastikan Owner ini adalah pemilik outlet tersebut
    const outlet = await prisma.outlet.findFirst({
      where: {
        id: outletId,
        ownerId: user.id,
      },
    });

    if (!outlet) {
      return {
        success: false,
        error: "Cabang tidak ditemukan atau bukan milik Anda.",
      };
    }

    await prisma.outlet.update({
      where: { id: outletId },
      data: {
        name,
        address,
        phone,
        logoUrl: logoUrl || null,
        slogan: slogan || null,
        receiptHeader: receiptHeader || null,
        receiptFooter: receiptFooter || null,
        contactPhone: contactPhone || null,
        ...(taxEnabled !== undefined ? { taxEnabled } : {}),
        ...(taxRate !== undefined ? { taxRate } : {}),
        ...(taxType !== undefined ? { taxType: taxType as TaxType } : {}),
        ...(taxLabel !== undefined ? { taxLabel } : {}),
        ...(qrisSurchargeBearer !== undefined
          ? { qrisSurchargeBearer: qrisSurchargeBearer as SurchargeBearer }
          : {}),
        ...(qrisSurchargeRate !== undefined ? { qrisSurchargeRate } : {}),
      },
    });

    await createAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "OUTLET_PROFILE_UPDATE",
      entityType: "Company",
      entityId: outletId,
      metadata: { name, address, phone, slogan, receiptHeader },
    });

    revalidatePath("/dashboard/pengaturan/cabang");
    revalidatePath("/dashboard");
    revalidatePath("/pos");
    revalidatePath("/pos/antrean");
    revalidatePath("/layar-cuci");

    return {
      success: true,
      data: { outletId },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui profil cabang.",
    };
  }
}
