import { Metadata } from "next";
import Link from "next/link";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Car,
  Clock,
  Coins,
  CreditCard,
  Droplets,
  LayoutGrid,
  PlusCircle,
  Sparkles,
  Tablet,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  PeakHoursChart,
  RevenueCompositionChart,
  RevenueTrendChart,
  VehicleCategoryChart,
} from "@/components/dashboard/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
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

  const metrics = await getDashboardMetrics(outlet.id);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-card flex flex-col items-start justify-between gap-4 rounded-2xl border p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Halo, {user?.fullName || "Owner"}! 👋
            </h1>
            <Badge
              variant="outline"
              className="text-primary border-primary/20 text-xs font-bold"
            >
              {outlet.name}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Berikut ringkasan performa operasional dan pendapatan cuci cabang
            hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

        {/* 4. Komisi Washer Tertunda */}
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
      </div>

      {/* Pusat Akses Cepat Seluruh Fitur Kinclongin */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <h2 className="text-muted-foreground text-xs font-black tracking-wider uppercase">
              Semua Fitur Kinclongin
            </h2>
          </div>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            Akses langsung ke seluruh modul operasional & analitik
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* 1. Kanban Antrean */}
          <Link
            href="/pos/antrean"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-colors">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Antrean Cuci
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Pantau antrean cuci mobil & motor di hidrolik
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
              Daftar Cuci Baru
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Daftarkan plat nomor cepat & foto baret
            </p>
          </Link>

          {/* 3. Kasir & Transaksi */}
          <Link
            href="/pos/antrean"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors">
              <CreditCard className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Kasir & Pembayaran
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Checkout split-pay, QRIS, & cetak struk thermal
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
              Layar Cuci
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Layar tablet hidrolik: PIN klaim & komisi cuci
            </p>
          </Link>

          {/* 5. Stok & Inventori */}
          <Link
            href="/dashboard/stok"
            className="group bg-card hover:border-primary/50 rounded-2xl border p-3.5 transition-all hover:shadow-md"
          >
            <div className="group-hover:bg-primary group-hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 transition-colors">
              <Boxes className="h-4 w-4" />
            </div>
            <h3 className="text-foreground group-hover:text-primary mt-2.5 text-xs font-black">
              Stok Bahan & Barang
            </h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-tight">
              Kontrol shampoo, semir & resep pemakaian
            </p>
          </Link>

          {/* 6. Payroll & Komisi */}
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
              Cairkan komisi pekerja & ekspor file Excel (.xlsx)
            </p>
          </Link>
        </div>
      </div>

      {/* Visualisasi Grafik: 2 Kolom Baris 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tren Omset 7 Hari (8 Kolom) */}
        <Card className="bg-card border shadow-xs lg:col-span-8">
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
          <CardContent className="p-5 pt-2">
            <RevenueTrendChart data={metrics.sevenDaysTrend} />
          </CardContent>
        </Card>

        {/* Komposisi Omset: Jasa vs Ritel (4 Kolom) */}
        <Card className="bg-card border shadow-xs lg:col-span-4">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-extrabold">
              Komposisi Pendapatan
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan omset jasa cuci vs barang ritel.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <RevenueCompositionChart data={metrics.revenueComposition} />
          </CardContent>
        </Card>
      </div>

      {/* Visualisasi Grafik Baris 2: Jam Sibuk & Kategori Kendaraan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Jam Sibuk Peak Hours (7 Kolom) */}
        <Card className="bg-card border shadow-xs lg:col-span-7">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold">
              <Clock className="text-primary h-4 w-4" />
              <span>Grafik Jam Sibuk (Peak Hours 08:00 - 21:00)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi kedatangan kendaraan untuk optimasi jadwal kerja staf.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <PeakHoursChart data={metrics.peakHours} />
          </CardContent>
        </Card>

        {/* Distribusi Kategori Kendaraan (5 Kolom) */}
        <Card className="bg-card border shadow-xs lg:col-span-5">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold">
              <Car className="h-4 w-4 text-purple-600" />
              <span>Kategori Kendaraan Tercuci</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Perbandingan motor vs tipe mobil di outlet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
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
