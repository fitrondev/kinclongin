"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  Coins,
  Droplets,
  KeyRound,
  LayoutGrid,
  Search,
  ShieldCheck,
  Sparkles,
  Tablet,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLicensePlate, formatRupiah } from "@/lib/formatters";

export interface WasherJobHistoryItem {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  serviceName: string;
  commissionAmount: number;
  isTandem: boolean;
  partnerNames?: string;
  assignedAt: Date | string;
  isPaidToWasher: boolean;
  ticketStatus: string;
}

export interface WasherDashboardViewProps {
  washerName: string;
  outletName: string;
  outletId: string;
  pinCode: string;
  commissionType: "FIXED_NOMINAL" | "PERCENTAGE";
  commissionRate: number;
  todayWashedCount: number;
  todayCommission: number;
  unpaidCommission: number;
  paidCommission: number;
  totalAllTimeCount: number;
  recentJobs: WasherJobHistoryItem[];
}

export function WasherDashboardView({
  washerName,
  outletName,
  pinCode,
  commissionType,
  commissionRate,
  todayWashedCount,
  todayCommission,
  unpaidCommission,
  paidCommission,
  totalAllTimeCount,
  recentJobs,
}: WasherDashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "SOLO" | "TANDEM" | "UNPAID" | "PAID"
  >("ALL");

  const formattedRate =
    commissionType === "PERCENTAGE"
      ? `${commissionRate}% per transaksi`
      : `${formatRupiah(commissionRate)} / unit kendaraan`;

  const filteredJobs = useMemo(() => {
    return recentJobs.filter((job) => {
      const matchSearch =
        job.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (typeFilter === "SOLO") return !job.isTandem;
      if (typeFilter === "TANDEM") return job.isTandem;
      if (typeFilter === "UNPAID") return !job.isPaidToWasher;
      if (typeFilter === "PAID") return job.isPaidToWasher;
      return true;
    });
  }, [recentJobs, searchQuery, typeFilter]);

  const filteredCommissionTotal = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + job.commissionAmount, 0);
  }, [filteredJobs]);

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner Khusus Washer */}
      <div className="bg-card flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 shadow-xs sm:p-5 xl:flex-row xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-lg font-black tracking-tight sm:text-xl md:text-2xl">
              Halo, {washerName}!
            </h1>
            <Badge
              variant="outline"
              className="text-primary border-primary/20 text-xs font-bold"
            >
              {outletName}
            </Badge>
            <Badge
              variant="secondary"
              className="border-purple-500/20 bg-purple-500/10 text-xs font-bold text-purple-600 dark:text-purple-400"
            >
              Washer (Pencuci)
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Selamat bekerja! Pantau perolehan komisi dan riwayat kendaraan yang
            telah Anda kerjakan hari ini.
          </p>
        </div>

        {/* Quick Actions untuk Washer */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            asChild
            className="h-10 w-full justify-center gap-2 bg-cyan-600 font-bold text-white shadow-xs hover:bg-cyan-700 sm:w-auto"
          >
            <Link href="/layar-cuci">
              <Tablet className="h-4 w-4" />
              <span>Buka Layar Cuci (Tablet)</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-10 w-full justify-center gap-1.5 font-bold sm:w-auto"
          >
            <Link href="/pos/antrean">
              <LayoutGrid className="h-4 w-4" />
              <span>Papan Antrean</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Kartu Identitas PIN Tablet Kiosk Pekerja */}
      <Card className="border-cyan-500/30 bg-cyan-500/5 shadow-xs">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground text-sm font-bold sm:text-base">
                  PIN Tablet Kiosk Anda
                </span>
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-700 dark:text-cyan-300"
                >
                  Area Basah
                </Badge>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Ketik 4 angka ini di layar sentuh tablet area cuci basah untuk
                mengklaim pengerjaan mobil tanpa perlu login email.
              </p>
              <div className="mt-1.5 text-xs">
                <span className="text-muted-foreground">Skema Komisi: </span>
                <span className="text-foreground font-bold">
                  {formattedRate}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-cyan-500/40 px-5 py-2.5 shadow-xs sm:w-auto">
            <span className="text-muted-foreground text-xs font-semibold uppercase">
              PIN:
            </span>
            <span className="font-mono text-2xl font-black tracking-widest text-cyan-600 sm:text-3xl dark:text-cyan-400">
              {pinCode}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Kartu Metrik KPI Personal Washer (2 kolom di tablet, 4 kolom di desktop XL) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Unit Dicuci Hari Ini */}
        <Card className="bg-card min-w-0 border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Dicuci Hari Ini
            </span>
            <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Droplets className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-foreground truncate text-xl font-black sm:text-2xl">
              {todayWashedCount}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                unit
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Total {totalAllTimeCount} kendaraan sepanjang masa
            </p>
          </CardContent>
        </Card>

        {/* Estimasi Komisi Hari Ini */}
        <Card className="bg-card min-w-0 border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Komisi Hari Ini
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-foreground truncate text-xl font-black sm:text-2xl">
              {formatRupiah(todayCommission)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Hasil kerja shift hari ini
            </p>
          </CardContent>
        </Card>

        {/* Komisi Siap Cair (Pending) */}
        <Card className="min-w-0 border-amber-500/30 bg-amber-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-300">
              Komisi Belum Dicairkan
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="truncate text-xl font-black text-amber-700 sm:text-2xl dark:text-amber-300">
              {formatRupiah(unpaidCommission)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Saldo komisi yang siap dicairkan oleh kasir
            </p>
          </CardContent>
        </Card>

        {/* Komisi Sudah Diterima (Lunas) */}
        <Card className="min-w-0 border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
              Komisi Sudah Diterima
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="truncate text-xl font-black text-emerald-700 sm:text-2xl dark:text-emerald-300">
              {formatRupiah(paidCommission)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Total komisi yang telah dibayarkan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Tabel Riwayat Pekerjaan Saya */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <CardTitle className="text-foreground text-base font-black tracking-tight sm:text-lg">
              Riwayat Pengerjaan Unit Saya
            </CardTitle>
            <CardDescription className="text-xs">
              Daftar kendaraan yang telah Anda klaim dan kerjakan di area cuci.
            </CardDescription>
          </div>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 w-full justify-center gap-1.5 text-xs font-bold sm:w-auto"
          >
            <Link href="/layar-cuci">
              <span>Ambil Job di Layar Cuci</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        {/* Search & Filter Toolbar */}
        <div className="bg-muted/20 space-y-3 border-t border-b p-4">
          <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari plat nomor, paket layanan, atau nomor tiket..."
                className="bg-background h-10 pr-9 pl-9 text-xs sm:text-sm"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  typeFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Semua ({recentJobs.length})
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter("SOLO")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  typeFilter === "SOLO"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Solo ({recentJobs.filter((j) => !j.isTandem).length})
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter("TANDEM")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  typeFilter === "TANDEM"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Tandem ({recentJobs.filter((j) => j.isTandem).length})
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter("UNPAID")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  typeFilter === "UNPAID"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Belum Cair ({recentJobs.filter((j) => !j.isPaidToWasher).length}
                )
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter("PAID")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  typeFilter === "PAID"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Cair ({recentJobs.filter((j) => j.isPaidToWasher).length})
              </button>
            </div>
          </div>

          <div className="text-muted-foreground flex items-center justify-between pt-1 text-xs">
            <span>
              Menampilkan <strong>{filteredJobs.length}</strong> dari{" "}
              {recentJobs.length} pekerjaan
            </span>
            <span>
              Total Komisi Tampil:{" "}
              <strong className="text-foreground font-mono font-bold">
                {formatRupiah(filteredCommissionTotal)}
              </strong>
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          {filteredJobs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
              <Car className="text-muted-foreground/40 mb-2 h-10 w-10" />
              <p className="text-foreground text-sm font-bold">
                {searchQuery || typeFilter !== "ALL"
                  ? "Tidak Ada Pekerjaan yang Sesuai Filter"
                  : "Belum Ada Riwayat Pekerjaan"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {searchQuery || typeFilter !== "ALL" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("ALL");
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Reset Filter Pencarian
                  </button>
                ) : (
                  "Klaim pengerjaan kendaraan di Layar Cuci untuk mulai mengumpulkan komisi."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-160">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Tiket & Plat
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Paket Layanan
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Tipe Pengerjaan
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Komisi Unit
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Waktu Mulai
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold whitespace-nowrap">
                      Status Komisi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const dateObj =
                      typeof job.assignedAt === "string"
                        ? new Date(job.assignedAt)
                        : job.assignedAt;

                    const formattedDate = dateObj.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <TableRow key={job.id} className="hover:bg-muted/40">
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="font-mono text-sm font-black">
                            {formatLicensePlate(job.licensePlate)}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            #{job.ticketNumber}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="text-foreground text-xs font-bold">
                            {job.serviceName}
                          </div>
                          <Badge
                            variant="outline"
                            className="mt-0.5 text-[10px]"
                          >
                            {job.vehicleCategory.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 whitespace-nowrap">
                          {job.isTandem ? (
                            <Badge
                              variant="secondary"
                              className="border-blue-500/20 bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400"
                            >
                              <Users className="mr-1 h-3 w-3" />
                              Tandem ({job.partnerNames || "Berdua"})
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                            >
                              <UserCheck className="mr-1 h-3 w-3" />
                              Solo (Mandiri)
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="py-3 font-mono text-sm font-black whitespace-nowrap text-amber-600 dark:text-amber-400">
                          {formatRupiah(job.commissionAmount)}
                        </TableCell>

                        <TableCell className="text-muted-foreground py-3 text-xs whitespace-nowrap">
                          {formattedDate}
                        </TableCell>

                        <TableCell className="py-3 text-right whitespace-nowrap">
                          {job.isPaidToWasher ? (
                            <Badge
                              variant="secondary"
                              className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
                            >
                              Sudah Dicairkan
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-600"
                            >
                              Menunggu Pencairan
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
