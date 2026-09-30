import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPlate = searchParams.get("plate");

    if (!rawPlate || rawPlate.trim().length < 3) {
      return NextResponse.json({ found: false });
    }

    const cleanPlate = rawPlate.toUpperCase().replace(/\s+/g, " ").trim();

    // Cari kendaraan berdasarkan plat nomor
    const vehicle = await prisma.vehicle.findUnique({
      where: { licensePlate: cleanPlate },
      include: {
        customer: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ found: false });
    }

    // Ambil riwayat cuci terakhir untuk rekomendasi paket
    const lastTicket = await prisma.washTicket.findFirst({
      where: { licensePlate: cleanPlate },
      orderBy: { createdAt: "desc" },
      include: {
        servicePackage: true,
      },
    });

    return NextResponse.json({
      found: true,
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        category: vehicle.category,
        brand: vehicle.brand,
        model: vehicle.model,
        color: vehicle.color,
        totalVisits: vehicle.totalVisits,
        isRewardEligible:
          vehicle.totalVisits + 1 > 0 && (vehicle.totalVisits + 1) % 10 === 0,
        visitsToReward:
          (vehicle.totalVisits + 1) % 10 === 0
            ? 0
            : 10 - ((vehicle.totalVisits + 1) % 10),
      },
      customer: vehicle.customer
        ? {
            id: vehicle.customer.id,
            phone: vehicle.customer.phone,
            fullName: vehicle.customer.fullName,
            totalVisits: vehicle.customer.totalVisits,
            loyaltyPoints: vehicle.customer.loyaltyPoints,
          }
        : null,
      lastService: lastTicket
        ? {
            servicePackageId: lastTicket.servicePackageId,
            servicePackageName: lastTicket.servicePackage.name,
            visitedAt: lastTicket.createdAt,
          }
        : null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error looking up license plate";
    return NextResponse.json({ found: false, error: message }, { status: 500 });
  }
}
