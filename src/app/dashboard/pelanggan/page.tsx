import { Metadata } from "next";
import { redirect } from "next/navigation";

import { Gift } from "lucide-react";

import {
  CustomerLoyaltyTable,
  CustomerRowData,
} from "@/components/dashboard/customer-loyalty-table";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Member & Loyalitas Pelanggan | Kinclongin POS",
  description:
    "Direktori keanggotaan pelanggan cuci mobil dan pelacakan promo Cuci 10x Gratis 1x terkunci per plat kendaraan.",
};

export default async function DashboardPelangganPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Ambil semua pelanggan dengan relasi kendaraan dan riwayat poin
  const customers = await prisma.customer.findMany({
    orderBy: { totalVisits: "desc" },
    include: {
      vehicles: {
        orderBy: { totalVisits: "desc" },
      },
      loyaltyLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  // Hitung metrik agregat
  let totalEligibleVehicles = 0;
  let totalPointsCirculating = 0;

  const initialCustomers: CustomerRowData[] = customers.map((c) => {
    totalPointsCirculating += c.loyaltyPoints;

    const formattedVehicles = c.vehicles.map((v) => {
      const isPromoEligible = v.totalVisits > 0 && v.totalVisits % 10 === 0;
      if (isPromoEligible) {
        totalEligibleVehicles += 1;
      }
      const visitsToNextPromo =
        v.totalVisits % 10 === 0 ? 10 : 10 - (v.totalVisits % 10);

      return {
        id: v.id,
        licensePlate: v.licensePlate,
        category: v.category,
        brand: v.brand,
        model: v.model,
        color: v.color,
        totalVisits: v.totalVisits,
        isPromoEligible,
        visitsToNextPromo,
      };
    });

    return {
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      totalVisits: c.totalVisits,
      loyaltyPoints: c.loyaltyPoints,
      createdAt: c.createdAt.toISOString(),
      vehicles: formattedVehicles,
      recentLogs: c.loyaltyLogs.map((log) => ({
        id: log.id,
        pointsChanged: log.pointsChanged,
        balanceAfter: log.balanceAfter,
        description: log.description,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl">
            <Gift className="h-6 w-6 text-amber-500" />
            <span>Keanggotaan & Loyalitas Pelanggan (B2C)</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Program membership cuci mobil berbasis Nomor WhatsApp otomatis &
            promo Cuci 10x Gratis 1x yang terkunci aman per plat kendaraan.
          </p>
        </div>
      </div>

      {/* Tabel Utama Member & Loyalitas */}
      <CustomerLoyaltyTable
        initialCustomers={initialCustomers}
        totalEligibleVehicles={totalEligibleVehicles}
        totalPointsCirculating={totalPointsCirculating}
      />
    </div>
  );
}
