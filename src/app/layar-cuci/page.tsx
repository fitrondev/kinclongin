import { Metadata } from "next";

import {
  LayarCuciCard,
  LayarCuciItem,
} from "@/components/layar-cuci/layar-cuci-card";
import { LayarCuciView } from "@/components/layar-cuci/layar-cuci-view";
import { TicketStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Layar Cuci | Kinclongin POS",
  description:
    "Layar klaim pengerjaan cuci mobil & motor berbasis PIN tukang cuci.",
};

export default async function LayarCuciPage() {
  const user = await getCurrentUser();

  // Cari outlet yang sesuai
  let outlet = user?.outletId
    ? await prisma.outlet.findUnique({
        where: { id: user.outletId },
      })
    : null;

  if (!outlet) {
    outlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!outlet) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center p-6 text-center">
        Belum ada outlet cabang aktif yang terdaftar.
      </div>
    );
  }

  // Ambil antrean kendaraan yang relevan untuk pekerja di area basah (QUEUED, WASHING, DRYING)
  const rawTickets = await prisma.washTicket.findMany({
    where: {
      outletId: outlet.id,
      status: {
        in: [TicketStatus.QUEUED, TicketStatus.WASHING, TicketStatus.DRYING],
      },
    },
    include: {
      servicePackage: true,
      vehicle: true,
      washers: {
        include: {
          washer: true,
        },
      },
    },
    orderBy: { queuedAt: "asc" },
  });

  const tickets: LayarCuciItem[] = rawTickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    licensePlate: t.licensePlate,
    vehicleCategory: t.vehicleCategory,
    status: t.status,
    servicePackage: {
      id: t.servicePackage.id,
      name: t.servicePackage.name,
      defaultCommission: Number(t.servicePackage.defaultCommission),
      estimatedMinutes: t.servicePackage.estimatedMinutes,
    },
    vehicle: t.vehicle
      ? {
          brand: t.vehicle.brand,
          model: t.vehicle.model,
          color: t.vehicle.color,
        }
      : null,
    initialNotes: t.initialNotes,
    washers: t.washers.map((w) => ({
      washer: {
        id: w.washer.id,
        fullName: w.washer.fullName,
      },
      commissionAmount: Number(w.commissionAmount),
    })),
  }));

  return (
    <LayarCuciView
      initialTickets={tickets}
      outletId={outlet.id}
      outletName={outlet.name}
    />
  );
}
