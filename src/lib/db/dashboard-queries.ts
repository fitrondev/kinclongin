import { prisma } from "@/lib/db/prisma";

export interface DashboardMetrics {
  todayRevenue: number;
  revenueChangePercent: number;
  todayCompletedCount: number;
  completedChangePercent: number;
  averageMinutes: number;
  totalUnpaidCommission: number;
  sevenDaysTrend: Array<{
    date: string;
    dayLabel: string;
    services: number;
    retail: number;
    total: number;
  }>;
  peakHours: Array<{
    hour: string;
    vehicles: number;
  }>;
  revenueComposition: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  vehicleCategories: Array<{
    name: string;
    count: number;
  }>;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    licensePlate: string;
    serviceName: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: Date;
  }>;
}

export async function getDashboardMetrics(
  outletId: string
): Promise<DashboardMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = todayStart;

  // 1. Omset Hari Ini vs Kemarin
  const [todayPayments, yesterdayPayments] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        outletId,
        paidAt: { gte: todayStart, lt: todayEnd },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: {
        outletId,
        paidAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const todayRevenue = Number(todayPayments._sum.totalAmount || 0);
  const yesterdayRevenue = Number(yesterdayPayments._sum.totalAmount || 0);
  const revenueChangePercent =
    yesterdayRevenue === 0
      ? 100
      : Math.round(
          ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        );

  // 2. Jumlah Kendaraan Selesai Hari Ini
  const [todayCompletedCount, yesterdayCompletedCount] = await Promise.all([
    prisma.washTicket.count({
      where: {
        outletId,
        status: { in: ["READY", "COMPLETED"] },
        createdAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.washTicket.count({
      where: {
        outletId,
        status: { in: ["READY", "COMPLETED"] },
        createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
    }),
  ]);

  const completedChangePercent =
    yesterdayCompletedCount === 0
      ? 100
      : Math.round(
          ((todayCompletedCount - yesterdayCompletedCount) /
            yesterdayCompletedCount) *
            100
        );

  // 3. Rata-rata Durasi Cuci (Waktu dari washingStartedAt s/d readyAt atau completedAt)
  const completedTicketsWithTimes = await prisma.washTicket.findMany({
    where: {
      outletId,
      washingStartedAt: { not: null },
      readyAt: { not: null },
      createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: {
      washingStartedAt: true,
      readyAt: true,
    },
  });

  let averageMinutes = 28; // Default wajar jika belum ada data durasi
  if (completedTicketsWithTimes.length > 0) {
    const totalMinutes = completedTicketsWithTimes.reduce((sum, t) => {
      if (!t.washingStartedAt || !t.readyAt) return sum;
      const diff = Math.floor(
        (t.readyAt.getTime() - t.washingStartedAt.getTime()) / 60000
      );
      return sum + Math.max(5, diff);
    }, 0);
    averageMinutes = Math.round(
      totalMinutes / completedTicketsWithTimes.length
    );
  }

  // 4. Total Komisi Belum Dicairkan
  const unpaidCommissions = await prisma.ticketWasher.aggregate({
    where: {
      ticket: { outletId },
      paidAt: null,
    },
    _sum: { commissionAmount: true },
  });
  const totalUnpaidCommission = Number(
    unpaidCommissions._sum.commissionAmount || 0
  );

  // 5. Tren Omset 7 Hari Terakhir
  const sevenDaysTrend: DashboardMetrics["sevenDaysTrend"] = [];
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  for (let i = 6; i >= 0; i--) {
    const dStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i
    );
    const dEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i + 1
    );

    const ticketsInDay = await prisma.washTicket.findMany({
      where: {
        outletId,
        createdAt: { gte: dStart, lt: dEnd },
      },
      select: {
        subtotalServices: true,
        subtotalRetail: true,
        totalAmount: true,
      },
    });

    const services = ticketsInDay.reduce(
      (acc, t) => acc + Number(t.subtotalServices),
      0
    );
    const retail = ticketsInDay.reduce(
      (acc, t) => acc + Number(t.subtotalRetail),
      0
    );

    const dateStr = dStart.toISOString().slice(5, 10);
    const dayLabel = dayNames[dStart.getDay()];

    sevenDaysTrend.push({
      date: dateStr,
      dayLabel,
      services,
      retail,
      total: services + retail,
    });
  }

  // 6. Grafik Jam Sibuk (08:00 - 21:00) 14 hari terakhir
  const peakHoursMap = new Map<number, number>();
  for (let h = 8; h <= 21; h++) {
    peakHoursMap.set(h, 0);
  }

  const recentTicketsTimes = await prisma.washTicket.findMany({
    where: {
      outletId,
      createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
    },
    select: { createdAt: true },
  });

  for (const t of recentTicketsTimes) {
    const hour = t.createdAt.getHours();
    if (hour >= 8 && hour <= 21) {
      peakHoursMap.set(hour, (peakHoursMap.get(hour) || 0) + 1);
    }
  }

  const peakHours = Array.from(peakHoursMap.entries()).map(
    ([hour, vehicles]) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      vehicles,
    })
  );

  // 7. Komposisi Omset: Jasa Cuci vs Penjualan Ritel
  const totalServicesAll = sevenDaysTrend.reduce(
    (acc, d) => acc + d.services,
    0
  );
  const totalRetailAll = sevenDaysTrend.reduce((acc, d) => acc + d.retail, 0);

  const revenueComposition = [
    {
      name: "Jasa Cuci",
      value: totalServicesAll || 1,
      color: "var(--primary)",
    },
    {
      name: "Produk Ritel",
      value: totalRetailAll || 0,
      color: "#10b981", // Emerald
    },
  ];

  // 8. Distribusi Kategori Kendaraan
  const categoryCounts = await prisma.washTicket.groupBy({
    by: ["vehicleCategory"],
    where: { outletId },
    _count: { id: true },
  });

  const categoryLabels: Record<string, string> = {
    MOTOR_KECIL: "Motor Kecil",
    MOTOR_BESAR: "Motor Bebek/Matic",
    MOTOR_MOGE: "Moge (250cc+)",
    MOBIL_KECIL: "Mobil Kecil",
    MOBIL_SEDANG: "Mobil Sedang",
    MOBIL_BESAR: "Mobil Besar",
    KENDARAAN_LAIN: "Niaga/Pick-up",
  };

  const vehicleCategories = categoryCounts.map((c) => ({
    name: categoryLabels[c.vehicleCategory] || c.vehicleCategory,
    count: c._count.id,
  }));

  // 9. 5 Tiket Terbaru
  const recentTickets = await prisma.washTicket.findMany({
    where: { outletId },
    include: {
      servicePackage: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return {
    todayRevenue,
    revenueChangePercent,
    todayCompletedCount,
    completedChangePercent,
    averageMinutes,
    totalUnpaidCommission,
    sevenDaysTrend,
    peakHours,
    revenueComposition,
    vehicleCategories,
    recentTickets: recentTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      licensePlate: t.licensePlate,
      serviceName: t.servicePackage.name,
      totalAmount: Number(t.totalAmount),
      status: t.status,
      paymentStatus: t.paymentStatus,
      createdAt: t.createdAt,
    })),
  };
}
