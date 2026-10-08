import { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  type TrackingData,
  TrackingView,
} from "@/components/track/tracking-view";
import { prisma } from "@/lib/db/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}): Promise<Metadata> {
  const { ticketId } = await params;
  const ticket = await prisma.washTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
    select: {
      ticketNumber: true,
      licensePlate: true,
      outlet: { select: { name: true } },
    },
  });

  if (!ticket) {
    return {
      title: "Lacak Status Cuci | Kinclongin",
      description: "Pantau progres cuci mobil & motor Anda secara langsung.",
    };
  }

  return {
    title: `Status Cuci ${ticket.licensePlate} (${ticket.ticketNumber}) | ${ticket.outlet.name}`,
    description: `Pantau progres cuci kendaraan ${ticket.licensePlate} secara langsung di ${ticket.outlet.name}.`,
  };
}

export default async function LacakTiketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;

  // Cari tiket cuci berdasarkan ID unik atau nomor tiket (KNC-YYYYMMDD-XXX)
  const ticket = await prisma.washTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
    include: {
      servicePackage: true,
      vehicle: true,
      customer: true,
      outlet: true,
      washers: {
        include: {
          washer: true,
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const trackingData: TrackingData = {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    licensePlate: ticket.licensePlate,
    vehicleCategory: ticket.vehicleCategory,
    status: ticket.status,
    serviceName: ticket.servicePackage.name,
    servicePrice: Number(ticket.servicePrice),
    customerName: ticket.customer?.fullName,
    vehicleBrand: ticket.vehicle?.brand,
    vehicleModel: ticket.vehicle?.model,
    vehicleColor: ticket.vehicle?.color,
    initialNotes: ticket.initialNotes,
    queuedAt: ticket.queuedAt.toISOString(),
    washingStartedAt: ticket.washingStartedAt?.toISOString() || null,
    dryingStartedAt: ticket.dryingStartedAt?.toISOString() || null,
    readyAt: ticket.readyAt?.toISOString() || null,
    completedAt: ticket.completedAt?.toISOString() || null,
    washers: ticket.washers.map((w) => w.washer.fullName),
    outlet: {
      name: ticket.outlet.name,
      address: ticket.outlet.address,
      phone: ticket.outlet.phone,
      logoUrl: ticket.outlet.logoUrl,
      slogan: ticket.outlet.slogan,
    },
  };

  return <TrackingView initialData={trackingData} />;
}
