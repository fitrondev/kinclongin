import { unstable_cache } from "next/cache";

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
    createdAt: string | Date;
  }>;
}

async function fetchDashboardMetricsFromDB(
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
  const sevenDaysAgoStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6
  );
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Jalankan seluruh kueri database secara paralel via Promise.all (menghilangkan sequential waterfalls)
  const [
    todayPayments,
    yesterdayPayments,
    todayCompletedCount,
    yesterdayCompletedCount,
    completedTicketsWithTimes,
    unpaidCommissions,
    sevenDaysTickets,
    recentTicketsTimes,
    categoryCounts,
    recentTickets,
  ] = await Promise.all([
    // 1a. Omset Hari Ini
    prisma.payment.aggregate({
      where: {
        outletId,
        paidAt: { gte: todayStart, lt: todayEnd },
      },
      _sum: { totalAmount: true },
    }),
    // 1b. Omset Kemarin
    prisma.payment.aggregate({
      where: {
        outletId,
        paidAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
      _sum: { totalAmount: true },
    }),
    // 2a. Selesai Hari Ini
    prisma.washTicket.count({
      where: {
        outletId,
        status: { in: ["READY", "COMPLETED"] },
        createdAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    // 2b. Selesai Kemarin
    prisma.washTicket.count({
      where: {
        outletId,
        status: { in: ["READY", "COMPLETED"] },
        createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
    }),
    // 3. Durasi Cuci 7 Hari Terakhir
    prisma.washTicket.findMany({
      where: {
        outletId,
        washingStartedAt: { not: null },
        readyAt: { not: null },
        createdAt: { gte: sevenDaysAgoStart },
      },
      select: {
        washingStartedAt: true,
        readyAt: true,
      },
    }),
    // 4. Komisi Belum Dicairkan
    prisma.ticketWasher.aggregate({
      where: {
        ticket: { outletId },
        paidAt: null,
      },
      _sum: { commissionAmount: true },
    }),
    // 5. Tiket 7 Hari Terakhir (Single Batch Range Query menggantikan 7 query berulang)
    prisma.washTicket.findMany({
      where: {
        outletId,
        createdAt: { gte: sevenDaysAgoStart, lt: todayEnd },
      },
      select: {
        createdAt: true,
        subtotalServices: true,
        subtotalRetail: true,
        totalAmount: true,
      },
    }),
    // 6. Jam Sibuk (14 Hari Terakhir)
    prisma.washTicket.findMany({
      where: {
        outletId,
        createdAt: { gte: fourteenDaysAgo },
      },
      select: { createdAt: true },
    }),
    // 7. Distribusi Kategori Kendaraan
    prisma.washTicket.groupBy({
      by: ["vehicleCategory"],
      where: { outletId },
      _count: { id: true },
    }),
    // 8. Tiket Terbaru
    prisma.washTicket.findMany({
      where: { outletId },
      include: {
        servicePackage: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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

  const completedChangePercent =
    yesterdayCompletedCount === 0
      ? 100
      : Math.round(
          ((todayCompletedCount - yesterdayCompletedCount) /
            yesterdayCompletedCount) *
            100
        );

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

  const totalUnpaidCommission = Number(
    unpaidCommissions._sum.commissionAmount || 0
  );

  // In-memory aggregation untuk tren 7 hari (zero DB query)
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

    const ticketsInDay = sevenDaysTickets.filter(
      (t) => t.createdAt >= dStart && t.createdAt < dEnd
    );

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

  // Grafik Jam Sibuk (08:00 - 21:00) 14 hari terakhir
  const peakHoursMap = new Map<number, number>();
  for (let h = 8; h <= 21; h++) {
    peakHoursMap.set(h, 0);
  }

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

  // Komposisi Omset: Jasa Cuci vs Penjualan Ritel
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
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

/**
 * Mengambil ringkasan metrik dasbor operasional dengan Data Caching terkelola.
 * - Cache disimpan selama 30 detik (ISR background revalidation)
 * - Di-purge instan via revalidateTag("dashboard-metrics") saat ada mutasi tiket/transaksi baru
 */
export const getDashboardMetrics = async (
  outletId: string
): Promise<DashboardMetrics> => {
  return unstable_cache(
    async () => fetchDashboardMetricsFromDB(outletId),
    [`dashboard-metrics-${outletId}`],
    {
      revalidate: 30,
      tags: ["dashboard-metrics", `outlet-${outletId}`],
    }
  )();
};
