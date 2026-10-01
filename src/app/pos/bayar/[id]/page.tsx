import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  CheckoutTicketData,
  CheckoutView,
  RetailProductItem,
} from "@/components/pos/checkout-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getActiveRetailProducts } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Kasir & Pembayaran Tiket | Kinclongin POS",
  description:
    "Penyelesaian transaksi cuci mobil & motor, klaim promo 10x cuci, dan cetak struk.",
};

export default async function POSBayarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Kasir, Manajer & Owner: Washer dilarang menerima pembayaran/checkout kasir
  if (user.role === "WASHER") {
    redirect("/pos/antrean");
  }

  // Ambil data tiket
  const ticket = await prisma.washTicket.findUnique({
    where: { id },
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

  // Ambil master produk ritel aktif untuk cabang ini
  const rawProducts = await getActiveRetailProducts(ticket.outletId);

  const retailProducts: RetailProductItem[] = rawProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    sellingPrice: Number(p.sellingPrice),
    stock: p.stock,
    imageUrl: p.imageUrl,
  }));

  const checkoutData: CheckoutTicketData = {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    licensePlate: ticket.licensePlate,
    vehicleCategory: ticket.vehicleCategory,
    servicePrice: Number(ticket.servicePrice),
    servicePackage: {
      id: ticket.servicePackage.id,
      name: ticket.servicePackage.name,
    },
    vehicle: ticket.vehicle
      ? {
          brand: ticket.vehicle.brand,
          model: ticket.vehicle.model,
          color: ticket.vehicle.color,
          totalVisits: ticket.vehicle.totalVisits,
        }
      : null,
    customer: ticket.customer
      ? {
          id: ticket.customer.id,
          fullName: ticket.customer.fullName,
          phone: ticket.customer.phone,
          loyaltyPoints: ticket.customer.loyaltyPoints,
          totalVisits: ticket.customer.totalVisits,
        }
      : null,
    washers: ticket.washers.map((w) => ({
      washer: {
        fullName: w.washer.fullName,
      },
    })),
    outlet: {
      id: ticket.outlet.id,
      name: ticket.outlet.name,
      address: ticket.outlet.address,
      phone: ticket.outlet.phone,
    },
  };

  return (
    <CheckoutView
      ticket={checkoutData}
      retailProducts={retailProducts}
      cashierName={user.fullName}
    />
  );
}
