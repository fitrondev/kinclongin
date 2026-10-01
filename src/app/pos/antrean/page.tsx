import { Metadata } from "next";
import { redirect } from "next/navigation";

import { KanbanBoard } from "@/components/pos/kanban-board";
import { KanbanTicket } from "@/components/pos/ticket-card";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getActiveQueueTickets } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Papan Antrean Cuci | Kinclongin POS",
  description:
    "Pantau antrean cuci mobil & motor real-time dari cuci basah, pengeringan, hingga siap bayar.",
};

export default async function POSAntreanPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  let outletId = user.outletId;
  if (!outletId) {
    const defaultOutlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    outletId = defaultOutlet?.id || null;
  }

  if (!outletId) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Belum ada outlet cabang aktif yang terdaftar.
      </div>
    );
  }

  const rawTickets = await getActiveQueueTickets(outletId);

  // Normalisasi data untuk komponen KanbanTicket
  const tickets: KanbanTicket[] = rawTickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    licensePlate: t.licensePlate,
    vehicleCategory: t.vehicleCategory,
    servicePackage: {
      id: t.servicePackage.id,
      name: t.servicePackage.name,
      estimatedMinutes: t.servicePackage.estimatedMinutes,
      price: Number(t.servicePackage.price),
    },
    customer: t.customer
      ? {
          fullName: t.customer.fullName,
          phone: t.customer.phone,
        }
      : null,
    vehicle: t.vehicle
      ? {
          brand: t.vehicle.brand,
          model: t.vehicle.model,
          color: t.vehicle.color,
        }
      : null,
    status: t.status,
    initialNotes: t.initialNotes,
    inspectionPhotos: t.inspectionPhotos,
    queuedAt: t.queuedAt,
    washingStartedAt: t.washingStartedAt,
    dryingStartedAt: t.dryingStartedAt,
    readyAt: t.readyAt,
    washers: t.washers.map((w) => ({
      washer: {
        fullName: w.washer.fullName,
      },
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-foreground text-2xl font-black tracking-tight">
          Papan Antrean Cuci Kendaraan
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Pantau dan geser status kendaraan: Antrean Masuk &rarr; Sedang Dicuci
          &rarr; Pengeringan/Lap &rarr; Siap di Kasir.
        </p>
      </div>

      <KanbanBoard initialTickets={tickets} outletId={outletId} />
    </div>
  );
}
