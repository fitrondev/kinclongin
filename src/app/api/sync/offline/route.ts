import { NextResponse } from "next/server";

import {
  PaymentMethod,
  PaymentStatus,
  TicketStatus,
  type VehicleCategory,
} from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

interface SyncMutationRequest {
  id?: number;
  mutationType: "CREATE_TICKET" | "UPDATE_STATUS" | "PROCESS_PAYMENT";
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan untuk sinkronisasi data." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const mutations: SyncMutationRequest[] = body.mutations;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada antrean mutasi untuk disinkronkan." },
        { status: 400 }
      );
    }

    const results: Array<{
      mutationId?: number;
      entityId: string;
      serverId?: string;
      ticketNumber?: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const item of mutations) {
      try {
        if (item.mutationType === "CREATE_TICKET") {
          const payload = item.payload;
          const outletId = (payload.outletId as string) || user.outletId;
          const licensePlate = (payload.licensePlate as string)
            ?.trim()
            .toUpperCase();
          const vehicleCategory = payload.vehicleCategory as VehicleCategory;
          const servicePackageId = payload.servicePackageId as string;
          const customerPhone = payload.customerPhone as string | undefined;
          const customerName = payload.customerName as string | undefined;
          const initialNotes = payload.initialNotes as string | undefined;
          const inspectionPhotos = payload.inspectionPhotos as
            string[] | undefined;
          const brand = payload.brand as string | undefined;
          const model = payload.model as string | undefined;
          const color = payload.color as string | undefined;

          if (!outletId || !licensePlate || !servicePackageId) {
            results.push({
              mutationId: item.id,
              entityId: item.entityId,
              success: false,
              error: "Data pembuatan tiket tidak lengkap.",
            });
            continue;
          }

          // IDEMPOTENCY CHECK: Cegah duplikasi jika tiket lokal ini telah pernah tersimpan sebelumnya
          const offlineTag = `[Luring ID:${item.entityId}]`;
          const existingOfflineTicket = await prisma.washTicket.findFirst({
            where: {
              outletId,
              initialNotes: { contains: offlineTag },
            },
          });

          if (existingOfflineTicket) {
            results.push({
              mutationId: item.id,
              entityId: item.entityId,
              serverId: existingOfflineTicket.id,
              ticketNumber: existingOfflineTicket.ticketNumber,
              success: true,
            });
            continue;
          }

          // Cek paket layanan
          const servicePackage = await prisma.servicePackage.findUnique({
            where: { id: servicePackageId },
          });

          if (!servicePackage) {
            results.push({
              mutationId: item.id,
              entityId: item.entityId,
              success: false,
              error: "Paket layanan tidak ditemukan di server.",
            });
            continue;
          }

          // Generate nomor tiket resmi server
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
              createdAt: { gte: todayStart, lt: todayEnd },
            },
          });

          const sequence = String(countToday + 1).padStart(3, "0");
          const ticketNumber = `KNC-${dateStr}-${sequence}`;

          // Tangani Customer & Vehicle
          let customerId: string | null = null;
          if (customerPhone) {
            let customer = await prisma.customer.findUnique({
              where: { phone: customerPhone },
            });
            if (!customer) {
              customer = await prisma.customer.create({
                data: {
                  phone: customerPhone,
                  fullName: customerName || "Pelanggan Offline",
                },
              });
            }
            customerId = customer.id;
          }

          let vehicleId: string | null = null;
          let vehicle = await prisma.vehicle.findUnique({
            where: { licensePlate },
          });

          if (!vehicle) {
            vehicle = await prisma.vehicle.create({
              data: {
                licensePlate,
                category: vehicleCategory,
                brand,
                model,
                color,
                customerId,
              },
            });
          }
          vehicleId = vehicle.id;

          const composedNotes = initialNotes
            ? `${offlineTag} ${initialNotes}`
            : `${offlineTag} Dicatat saat perangkat luring`;

          // Buat tiket cuci di MySQL
          const createdTicket = await prisma.washTicket.create({
            data: {
              ticketNumber,
              outletId,
              createdById: user.id,
              customerId,
              vehicleId,
              licensePlate,
              vehicleCategory,
              servicePackageId,
              servicePrice: servicePackage.price,
              status: TicketStatus.QUEUED,
              initialNotes: composedNotes,
              inspectionPhotos: inspectionPhotos || [],
              subtotalServices: servicePackage.price,
              subtotalRetail: 0,
              discountAmount: 0,
              totalAmount: servicePackage.price,
              paidAmount: 0,
              paymentStatus: PaymentStatus.UNPAID,
            },
          });

          results.push({
            mutationId: item.id,
            entityId: item.entityId,
            serverId: createdTicket.id,
            ticketNumber: createdTicket.ticketNumber,
            success: true,
          });
        } else if (item.mutationType === "UPDATE_STATUS") {
          const payload = item.payload;
          let targetTicketId = (payload.ticketId as string) || item.entityId;

          // Jika targetTicketId merupakan localId, cari server ID yang sesuai
          if (targetTicketId.startsWith("local_")) {
            const matched = await prisma.washTicket.findFirst({
              where: {
                initialNotes: { contains: `[Luring ID:${targetTicketId}]` },
              },
            });
            if (matched) {
              targetTicketId = matched.id;
            }
          }

          const newStatus = payload.status as TicketStatus;

          const updateData: Record<string, unknown> = { status: newStatus };
          if (newStatus === "WASHING") updateData.washingStartedAt = new Date();
          if (newStatus === "DRYING") updateData.dryingStartedAt = new Date();
          if (newStatus === "READY") updateData.readyAt = new Date();
          if (newStatus === "COMPLETED") updateData.completedAt = new Date();

          await prisma.washTicket.update({
            where: { id: targetTicketId },
            data: updateData,
          });

          results.push({
            mutationId: item.id,
            entityId: item.entityId,
            serverId: targetTicketId,
            success: true,
          });
        } else if (item.mutationType === "PROCESS_PAYMENT") {
          const payload = item.payload;
          let targetTicketId = (payload.ticketId as string) || item.entityId;

          if (targetTicketId.startsWith("local_")) {
            const matched = await prisma.washTicket.findFirst({
              where: {
                initialNotes: { contains: `[Luring ID:${targetTicketId}]` },
              },
            });
            if (matched) {
              targetTicketId = matched.id;
            }
          }

          const ticket = await prisma.washTicket.findUnique({
            where: { id: targetTicketId },
          });

          if (!ticket) {
            results.push({
              mutationId: item.id,
              entityId: item.entityId,
              success: false,
              error: "Tiket pembayaran tidak ditemukan.",
            });
            continue;
          }

          const existingPayment = await prisma.payment.findUnique({
            where: { ticketId: ticket.id },
          });

          if (!existingPayment) {
            const rawMethod = (payload.paymentMethod as string) || "CASH";
            const validMethod =
              rawMethod in PaymentMethod
                ? (rawMethod as PaymentMethod)
                : PaymentMethod.CASH;

            const totalAmount = Number(
              payload.totalAmount || ticket.totalAmount
            );

            await prisma.payment.create({
              data: {
                ticketId: ticket.id,
                outletId: ticket.outletId,
                cashierId: user.id,
                method: validMethod,
                status: PaymentStatus.PAID,
                totalAmount,
                cashGiven: payload.cashGiven ? Number(payload.cashGiven) : null,
                changeGiven: payload.changeGiven
                  ? Number(payload.changeGiven)
                  : null,
                referenceNumber: (payload.referenceNumber as string) || null,
              },
            });

            await prisma.washTicket.update({
              where: { id: ticket.id },
              data: {
                paymentStatus: PaymentStatus.PAID,
                paidAmount: totalAmount,
                status:
                  ticket.status === TicketStatus.READY
                    ? TicketStatus.COMPLETED
                    : ticket.status,
                completedAt:
                  ticket.status === TicketStatus.READY ? new Date() : undefined,
              },
            });
          }

          results.push({
            mutationId: item.id,
            entityId: item.entityId,
            serverId: ticket.id,
            success: true,
          });
        }
      } catch (mutationErr) {
        console.error("Gagal memproses item mutasi offline:", mutationErr);
        results.push({
          mutationId: item.id,
          entityId: item.entityId,
          success: false,
          error:
            mutationErr instanceof Error
              ? mutationErr.message
              : "Gagal memproses mutasi.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error pada route sync offline:", error);
    return NextResponse.json(
      { error: "Gagal memproses sinkronisasi offline." },
      { status: 500 }
    );
  }
}
