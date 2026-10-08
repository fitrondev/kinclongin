import { Metadata } from "next";

import {
  LayarCuciCard,
  LayarCuciItem,
} from "@/components/layar-cuci/layar-cuci-card";
import { LayarCuciView } from "@/components/layar-cuci/layar-cuci-view";
import { TicketStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Layar Cuci | Kinclongin POS",
  description:
    "Layar klaim pengerjaan cuci mobil & motor berbasis PIN tukang cuci.",
};

interface LayarCuciPageProps {
  searchParams?: Promise<{ outlet?: string }>;
}

export default async function LayarCuciPage({
  searchParams,
}: LayarCuciPageProps) {
  const query = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  // Cari outlet yang sesuai berdasarkan query param, user session, atau default aktif
  let outlet = null;
  if (query?.outlet) {
    outlet = await prisma.outlet.findFirst({
      where: {
        OR: [{ slug: query.outlet }, { id: query.outlet }],
        isActive: true,
      },
    });
  }

  if (!outlet && user?.outletId) {
    outlet = await prisma.outlet.findUnique({
      where: { id: user.outletId },
    });
  }

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

  // Ambil antrean kendaraan yang relevan untuk pekerja di area basah (QUEUED, WASHING, DRYING, READY)
  const rawTickets = await prisma.washTicket.findMany({
    where: {
      outletId: outlet.id,
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
    queuedAt: t.queuedAt,
    washingStartedAt: t.washingStartedAt,
    dryingStartedAt: t.dryingStartedAt,
    readyAt: t.readyAt,
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
      outletLogo={outlet.logoUrl}
      userRole={user?.role ?? null}
    />
  );
}
