import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  Car,
  Clock,
  Coins,
  CreditCard,
  Droplets,
  History,
  LayoutGrid,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Tablet,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import {
  PeakHoursChart,
  RevenueCompositionChart,
  RevenueTrendChart,
  VehicleCategoryChart,
} from "@/components/dashboard/analytics-charts";
import {
  CashierDashboardView,
  type CashierPaymentItem,
  type PendingTicketItem,
} from "@/components/dashboard/cashier-dashboard-view";
import {
  WasherDashboardView,
  type WasherJobHistoryItem,
} from "@/components/dashboard/washer-dashboard-view";
import { MembershipDialog } from "@/components/pos/membership-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/lib/db/dashboard-queries";
import { prisma } from "@/lib/db/prisma";
import { formatLicensePlate, formatRupiah } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Dasbor Analitik Operasional | Kinclongin",
  description:
    "Pantau omset harian, tren jam sibuk, dan performa cuci kendaraan.",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const outlet = user?.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Belum ada outlet cabang aktif yang ditemukan.
      </div>
    );
  }

  // Khusus Peran CASHIER: Tampilkan Dasbor Khusus Shift Kasir & Laci Kas
  if (user?.role === "CASHIER") {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // 1. Ambil pembayaran yang diproses kasir ini hari ini
    const todayPayments = await prisma.payment.findMany({
      where: {
        cashierId: user.id,
        outletId: outlet.id,
        paidAt: { gte: todayStart },
      },
      include: {
        ticket: {
          include: {
            servicePackage: true,
            customer: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    let todayCashInDrawer = 0;
    let todayQris = 0;
    let todayTransfer = 0;
    let todayTotalAmount = 0;

    for (const p of todayPayments) {
      const amount = Number(p.totalAmount);
      todayTotalAmount += amount;
      if (p.method === "CASH") {
        todayCashInDrawer += amount;
      } else if (p.method === "QRIS") {
        todayQris += amount;
      } else if (p.method === "BANK_TRANSFER") {
        todayTransfer += amount;
      }
    }

    const todayNonCash = todayQris + todayTransfer;
    const todayTransactionsCount = todayPayments.length;

    // 2. Tiket cuci yang didaftarkan oleh kasir ini hari ini
    const todayCreatedTicketsCount = await prisma.washTicket.count({
      where: {
        createdById: user.id,
        outletId: outlet.id,
        createdAt: { gte: todayStart },
      },
    });

    // 3. Pendaftaran member baru oleh kasir ini hari ini
    const todayMembershipsCount = await prisma.customerMembership.count({
      where: {
        cashierId: user.id,
        outletId: outlet.id,
        createdAt: { gte: todayStart },
      },
    });

    // 4. Ambil tiket antrean aktif di cabang yang belum lunas
    const pendingTickets = await prisma.washTicket.findMany({
      where: {
        outletId: outlet.id,
        paymentStatus: PaymentStatus.UNPAID,
        createdAt: { gte: todayStart },
      },
      include: {
        servicePackage: true,
        customer: true,
      },
      orderBy: [{ status: "desc" }, { createdAt: "asc" }],
      take: 12,
    });

    const pendingPaymentTickets: PendingTicketItem[] = pendingTickets.map(
      (t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        licensePlate: t.licensePlate,
        vehicleCategory: t.vehicleCategory,
        serviceName: t.servicePackage.name,
        customerName: t.customer?.fullName || null,
        totalAmount: Number(t.totalAmount),
        status: t.status,
        queuedAt: t.queuedAt,
      })
    );

    // 5. Cek jadwal shift kerja kasir hari ini jika ada
    const shiftAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        outletId: outlet.id,
        date: todayStart,
        employee: {
          OR: [
            { userId: user.id },
            { fullName: user.fullName, outletId: outlet.id },
          ],
        },
      },
      include: {
        shift: true,
      },
    });

    const shiftName = shiftAssignment
      ? `${shiftAssignment.shift.name} (${shiftAssignment.shift.startTime} - ${shiftAssignment.shift.endTime})`
      : "Shift Kasir Aktif";

    // 6. Format recent payments
    const recentPayments: CashierPaymentItem[] = todayPayments
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        ticketId: p.ticketId,
        ticketNumber: p.ticket.ticketNumber,
        licensePlate: p.ticket.licensePlate,
        vehicleCategory: p.ticket.vehicleCategory,
        serviceName: p.ticket.servicePackage.name,
        customerName: p.ticket.customer?.fullName || null,
        customerPhone: p.ticket.customer?.phone || null,
        totalAmount: Number(p.totalAmount),
        method: p.method,
        cashGiven: p.cashGiven ? Number(p.cashGiven) : null,
        changeGiven: p.changeGiven ? Number(p.changeGiven) : null,
        paidAt: p.paidAt,
        referenceNumber: p.referenceNumber,
      }));

    return (
      <CashierDashboardView
        cashierName={user.fullName || "Kasir"}
        cashierEmail={user.email}
        outletName={outlet.name}
        outletAddress={outlet.address}
        outletPhone={outlet.phone}
        outletId={outlet.id}
        shiftName={shiftName}
        todayCashInDrawer={todayCashInDrawer}
        todayNonCash={todayNonCash}
        todayQris={todayQris}
        todayTransfer={todayTransfer}
        todayTotalAmount={todayTotalAmount}
        todayTransactionsCount={todayTransactionsCount}
        todayCreatedTicketsCount={todayCreatedTicketsCount}
        todayMembershipsCount={todayMembershipsCount}
        recentPayments={recentPayments}
        pendingPaymentTickets={pendingPaymentTickets}
      />
    );
  }

  // Khusus Peran WASHER: Tampilkan Dasbor Personal Pekerja Cuci
  if (user?.role === "WASHER") {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { fullName: user.fullName, outletId: outlet.id },
        ],
      },
      include: {
        assignedTickets: {
          include: {
            ticket: {
              include: {
                servicePackage: true,
                washers: {
                  include: { washer: true },
                },
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const assignedTickets = employee?.assignedTickets || [];
    const assignedToday = assignedTickets.filter(
      (item) => new Date(item.assignedAt) >= todayStart
    );

    const todayWashedCount = assignedToday.length;
    const todayCommission = assignedToday.reduce(
      (sum, item) => sum + Number(item.commissionAmount),
      0
    );
    const unpaidCommission = assignedTickets
      .filter((item) => !item.isPaidToWasher)
      .reduce((sum, item) => sum + Number(item.commissionAmount), 0);
    const paidCommission = assignedTickets
      .filter((item) => item.isPaidToWasher)
      .reduce((sum, item) => sum + Number(item.commissionAmount), 0);
    const totalAllTimeCount = assignedTickets.length;

    const recentJobs: WasherJobHistoryItem[] = assignedTickets
      .slice(0, 20)
      .map((item) => {
        const otherWashers = item.ticket.washers
          .filter((w) => w.employeeId !== employee?.id)
          .map((w) => w.washer.fullName);

        return {
          id: item.id,
          ticketNumber: item.ticket.ticketNumber,
          licensePlate: item.ticket.licensePlate,
          vehicleCategory: item.ticket.vehicleCategory,
          serviceName: item.ticket.servicePackage.name,
          commissionAmount: Number(item.commissionAmount),
          isTandem: item.ticket.washers.length > 1,
          partnerNames:
            otherWashers.length > 0 ? otherWashers.join(", ") : undefined,
          assignedAt: item.assignedAt,
          isPaidToWasher: item.isPaidToWasher,
          ticketStatus: item.ticket.status,
        };
      });

    return (
      <WasherDashboardView
        washerName={user.fullName || employee?.fullName || "Pekerja Cuci"}
        outletName={outlet.name}
        outletId={outlet.id}
        pinCode={employee?.pinCode || "1234"}
        commissionType={
          employee?.commissionType === "PERCENTAGE"
            ? "PERCENTAGE"
            : "FIXED_NOMINAL"
        }
        commissionRate={Number(employee?.commissionRate || 10000)}
        todayWashedCount={todayWashedCount}
        todayCommission={todayCommission}
        unpaidCommission={unpaidCommission}
        paidCommission={paidCommission}
        totalAllTimeCount={totalAllTimeCount}
        recentJobs={recentJobs}
      />
    );
  }

  const metrics = await getDashboardMetrics(outlet.id);

  const isOwner = user.role === "OWNER";
  const isManager = user.role === "MANAGER";
  const isOwnerOrManager = isOwner || isManager;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-card flex flex-col items-start justify-between gap-4 rounded-2xl border p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Halo, {user.fullName || (isManager ? "Manajer" : "Owner")}! 👋
            </h1>
            <Badge
              variant="outline"
              className="text-primary border-primary/20 text-xs font-bold"
            >
              {outlet.name}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[10px] font-bold ${
                isOwner
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                  : isManager
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {isOwner ? "Owner" : isManager ? "Manajer" : "Kasir"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Berikut ringkasan performa operasional dan pendapatan cuci cabang
            hari ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MembershipDialog
            outletId={outlet.id}
            buttonText="+ Daftar Member"
            className="h-9 text-xs font-bold shadow-xs"
          />
          <Button asChild size="sm" className="h-9 gap-1.5 font-bold shadow-xs">
            <Link href="/pos/daftar-baru">
              <PlusCircle className="h-4 w-4" />
              <span>Daftar Kendaraan Baru</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 font-bold shadow-xs"
          >
            <Link href="/pos/antrean">
              <span>Buka Antrean Cuci</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Kartu Metrik KPI Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Omset Hari Ini */}
        <Card className="bg-card border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Omset Hari Ini
            </span>
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-foreground text-2xl font-black">
              {formatRupiah(metrics.todayRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {metrics.revenueChangePercent >= 0 ? (
                <span className="flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />+
                  {metrics.revenueChangePercent}%
                </span>
              ) : (
                <span className="text-destructive flex items-center font-bold">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  {metrics.revenueChangePercent}%
                </span>
              )}
              <span className="text-muted-foreground">vs kemarin</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Kendaraan Selesai */}
        <Card className="bg-card border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Kendaraan Selesai
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Car className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-foreground text-2xl font-black">
              {metrics.todayCompletedCount}{" "}
              <span className="text-muted-foreground text-sm font-semibold">
                Unit
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {metrics.completedChangePercent >= 0 ? "+" : ""}
              {metrics.completedChangePercent}% perubahan harian
            </p>
          </CardContent>
        </Card>

        {/* 3. SLA Rata-rata Durasi Cuci */}
        <Card className="bg-card border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Rata-rata Durasi
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-foreground text-2xl font-black">
              {metrics.averageMinutes}{" "}
              <span className="text-muted-foreground text-sm font-semibold">
                Menit
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Sesuai target SLA (&lt; 35 menit)
            </p>
          </CardContent>
        </Card>

        {/* 4. Metrik Keempat: Komisi Washer untuk Owner/Manager, atau Status Kasir untuk Kasir */}
        {isOwnerOrManager ? (
          <Card className="bg-card border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Komisi Belum Dicairkan
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-foreground text-2xl font-black">
                {formatRupiah(metrics.totalUnpaidCommission)}
              </div>
              <Link
                href="/dashboard/komisi"
                className="text-primary mt-1 flex items-center gap-1 text-xs font-bold hover:underline"
              >
                <span>Buka Menu Komisi</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Antrean & Kasir POS
              </span>
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-xl">
                <LayoutGrid className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-foreground text-2xl font-black">
                Mode Kasir
              </div>
              <Link
                href="/pos/antrean"
                className="text-primary mt-1 flex items-center gap-1 text-xs font-bold hover:underline"
              >
                <span>Buka Papan Antrean</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pusat Akses Cepat Seluruh Fitur Kinclongin */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h2 className="text-muted-foreground text-xs font-black tracking-wider uppercase">
              Operasional & Data Master Cabang
            </h2>
          </div>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            Akses langsung ke seluruh modul operasional harian
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* 1. Kanban Antrean */}
          <Link
            href="/pos/antrean"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Antrean Cuci Live
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Pantau antrean cuci mobil & motor di pit hidrolik
            </p>
          </Link>

          {/* 2. Walk-In Baru */}
          <Link
            href="/pos/daftar-baru"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-colors">
              <PlusCircle className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Daftar Cuci Baru (&lt;15s)
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Daftarkan plat nomor cepat & foto lecet awal
            </p>
          </Link>

          {/* 3. Kasir & Transaksi */}
          <Link
            href="/pos"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors">
              <CreditCard className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Kasir & Pembayaran
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Checkout Tunai, QRIS, cetak struk Bluetooth thermal
            </p>
          </Link>

          {/* 4. Layar Cuci PIN */}
          <Link
            href="/layar-cuci"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition-colors">
              <Tablet className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Layar Cuci (Kiosk PIN)
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Kiosk pengerjaan pit: PIN klaim & komisi washer
            </p>
          </Link>

          {/* 5. Master Paket Layanan */}
          <Link
            href="/dashboard/layanan"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 transition-colors">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Paket & Tarif Layanan
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Katalog paket cuci, tarif per kategori unit, SLA & komisi
            </p>
          </Link>

          {/* 6. Jadwal Shift Kerja */}
          <Link
            href="/dashboard/shift"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-colors">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Jadwal Shift Kerja
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Roster shift harian staf & jam kerja (Pagi, Siang, Sore)
            </p>
          </Link>

          {/* 7. Stok & Inventori */}
          <Link
            href="/dashboard/stok"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 transition-colors">
              <Boxes className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Stok Bahan & Barang
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Kontrol shampoo, semir ban & produk ritel toko
            </p>
          </Link>

          {/* 8. Gaji & Komisi Pekerja */}
          <Link
            href="/dashboard/komisi"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-colors">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Gaji & Komisi Pekerja
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Rekap unit cuci, validasi pencairan & ekspor Excel
            </p>
          </Link>

          {/* 9. Member & Loyalitas */}
          <Link
            href="/dashboard/pelanggan"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors">
              <Coins className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Member & Loyalitas
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Poin pelanggan setia & promo Cuci 10x Gratis 1x
            </p>
          </Link>
        </div>
      </div>

      {/* Bagian Khusus: Fitur Eksekutif Owner (Superadmin) */}
      {isOwner && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">👑</span>
              <h2 className="text-muted-foreground text-xs font-black tracking-wider uppercase">
                Otoritas & Tata Kelola Owner
              </h2>
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-600"
            >
              Superadmin Only
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* O1. Laporan Arus Kas */}
            <Link
              href="/dashboard/arus-kas"
              className="group bg-card rounded-2xl border p-3.5 transition-all hover:border-emerald-500/50 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Wallet className="h-4 w-4" />
              </div>
              <h3 className="text-foreground mt-2.5 text-xs font-black group-hover:text-emerald-600">
                Arus Kas (Cash Flow)
              </h3>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
                Ringkasan kasir tunai vs QRIS, belanja stok & ekspor CSV
              </p>
            </Link>

            {/* O2. Audit Log Keamanan */}
            <Link
              href="/dashboard/audit"
              className="group bg-card rounded-2xl border p-3.5 transition-all hover:border-blue-500/50 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <History className="h-4 w-4" />
              </div>
              <h3 className="text-foreground mt-2.5 text-xs font-black group-hover:text-blue-600">
                Audit Log Keamanan
              </h3>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
                Rekaman forensik jejak mutasi & pembatalan tiket cuci
              </p>
            </Link>

            {/* O3. Webhook WhatsApp */}
            <Link
              href="/dashboard/pengaturan/whatsapp"
              className="group bg-card rounded-2xl border p-3.5 transition-all hover:border-green-500/50 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="text-foreground mt-2.5 text-xs font-black group-hover:text-green-600">
                Webhook WhatsApp
              </h3>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
                API gateway pengirim struk & uji koneksi test-ping
              </p>
            </Link>

            {/* O4. Kelola & Ekspansi Cabang */}
            <Link
              href="/dashboard/pengaturan/cabang"
              className="group bg-card rounded-2xl border p-3.5 transition-all hover:border-purple-500/50 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <h3 className="text-foreground mt-2.5 text-xs font-black group-hover:text-purple-600">
                Kelola Cabang
              </h3>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
                Edit profil outlet aktif & buka cabang ekspansi baru
              </p>
            </Link>

            {/* O5. Manajemen Akun & Role */}
            <Link
              href="/dashboard/pengguna"
              className="group bg-card rounded-2xl border p-3.5 transition-all hover:border-amber-500/50 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-foreground mt-2.5 text-xs font-black group-hover:text-amber-600">
                Akun & Hak Akses
              </h3>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
                Buat akun staf, atur hak role & setel PIN Kiosk
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* Visualisasi Grafik: 2 Kolom Baris 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tren Omset 7 Hari (8 Kolom) */}
        <Card className="bg-card min-w-0 border shadow-xs lg:col-span-8">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-extrabold">
                  <TrendingUp className="text-primary h-4 w-4" />
                  <span>Tren Pendapatan 7 Hari Terakhir</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Fluktuasi pendapatan dari paket cuci dan penjualan produk
                  ritel.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 p-5 pt-2">
            <RevenueTrendChart data={metrics.sevenDaysTrend} />
          </CardContent>
        </Card>

        {/* Komposisi Omset: Jasa vs Ritel (4 Kolom) */}
        <Card className="bg-card min-w-0 border shadow-xs lg:col-span-4">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-extrabold">
              Komposisi Pendapatan
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan omset jasa cuci vs barang ritel.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 p-5 pt-0">
            <RevenueCompositionChart data={metrics.revenueComposition} />
          </CardContent>
        </Card>
      </div>

      {/* Visualisasi Grafik Baris 2: Jam Sibuk & Kategori Kendaraan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Jam Sibuk Peak Hours (7 Kolom) */}
        <Card className="bg-card min-w-0 border shadow-xs lg:col-span-7">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold">
              <Clock className="text-primary h-4 w-4" />
              <span>Grafik Jam Sibuk (Peak Hours 08:00 - 21:00)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi kedatangan kendaraan untuk optimasi jadwal kerja staf.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 p-5 pt-2">
            <PeakHoursChart data={metrics.peakHours} />
          </CardContent>
        </Card>

        {/* Distribusi Kategori Kendaraan (5 Kolom) */}
        <Card className="bg-card min-w-0 border shadow-xs lg:col-span-5">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold">
              <Car className="h-4 w-4 text-purple-600" />
              <span>Kategori Kendaraan Tercuci</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan motor vs tipe mobil di outlet.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 p-5 pt-2">
            <VehicleCategoryChart data={metrics.vehicleCategories} />
          </CardContent>
        </Card>
      </div>

      {/* Tabel 5 Transaksi Tiket Terbaru */}
      <Card className="bg-card border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold">
                Aktivitas Tiket Terkini
              </CardTitle>
              <CardDescription className="text-xs">
                Data tiket cuci terbaru yang diproses di cabang ini.
              </CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
            >
              <Link href="/pos/antrean">Lihat Seluruh Antrean</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-y text-[10px] font-bold uppercase">
                <tr>
                  <th className="px-5 py-3">No. Tiket</th>
                  <th className="px-5 py-3">Plat Kendaraan</th>
                  <th className="px-5 py-3">Paket Layanan</th>
                  <th className="px-5 py-3">Total Tagihan</th>
                  <th className="px-5 py-3">Status Cuci</th>
                  <th className="px-5 py-3">Pembayaran</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {metrics.recentTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold">
                      #{t.ticketNumber}
                    </td>
                    <td className="text-foreground px-5 py-3.5 font-mono font-extrabold">
                      {formatLicensePlate(t.licensePlate)}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{t.serviceName}</td>
                    <td className="text-primary px-5 py-3.5 font-bold">
                      {formatRupiah(t.totalAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                          t.status === "READY"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : t.status === "WASHING"
                              ? "bg-blue-500/15 text-blue-600"
                              : t.status === "DRYING"
                                ? "bg-purple-500/15 text-purple-600"
                                : "bg-amber-500/15 text-amber-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          t.paymentStatus === "PAID" ? "default" : "outline"
                        }
                        className="h-4 px-1.5 py-0 text-[10px] font-bold"
                      >
                        {t.paymentStatus === "PAID" ? "Lunas" : "Belum Bayar"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs font-semibold"
                      >
                        <Link href={`/lacak/${t.id}`} target="_blank">
                          Lacak
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
