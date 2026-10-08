"use client";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Crown,
  History,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MessageSquare,
  Radio,
  Receipt,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import type { SuperadminOverviewMetrics } from "@/actions/superadmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";

interface SuperadminOverviewViewProps {
  metrics: SuperadminOverviewMetrics;
}

export function SuperadminOverviewView({
  metrics,
}: SuperadminOverviewViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header Banner Superadmin Command Center */}
      <div className="via-background to-background relative overflow-hidden rounded-2xl border border-purple-500/20 bg-linear-to-br from-purple-950/20 p-6 shadow-xs">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
                  Pusat Kendali Superadmin Platform
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-600 dark:text-purple-400">
                    Platform Multi-Tenant Kinclongin
                  </Badge>
                  <span className="text-muted-foreground text-xs font-medium">
                    Tarif Flat Rp 50.000 / Cabang / Bulan
                  </span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Pantau performa ekosistem penyewaan software, verifikasi bukti
              transfer, kelola direktori mitra, dan infrastruktur sistem secara
              terpusat.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              asChild
              className="bg-purple-600 font-bold text-white shadow-xs hover:bg-purple-700"
            >
              <Link href="/dashboard/admin/subscriptions">
                <ShieldAlert className="mr-1.5 h-4 w-4" />
                <span>Approval Pembayaran ({metrics.pendingApprovals})</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-bold shadow-xs">
              <Link href="/dashboard/admin/system">
                <Activity className="mr-1.5 h-4 w-4 text-emerald-500" />
                <span>Cek Server Health</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Alert Banner: Menunggu Approval Bukti Transfer */}
      {metrics.pendingApprovals > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                Ada {metrics.pendingApprovals} Pengajuan Pembayaran Menunggu
                Verifikasi!
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Pemilik cabang telah mengunggah bukti transfer sewa Rp 50.000.
                Tinjau dan setujui untuk memperpanjang lisensi mereka.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="border-amber-500/40 bg-amber-600 font-bold text-white shadow-xs hover:bg-amber-700"
          >
            <Link href="/dashboard/admin/subscriptions">
              <span>Buka Ruang Approval</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* 3. Kartu Metrik Finansial Platform Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* M1. MRR Platform */}
        <Card className="border-purple-500/20 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              MRR Platform (Monthly)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground font-mono text-2xl font-black">
              {formatRupiah(metrics.estimatedMRR)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Berdasarkan{" "}
              <strong className="text-purple-600 dark:text-purple-400">
                {metrics.activeOutlets} cabang aktif
              </strong>{" "}
              × Rp 50.000/bln
            </p>
          </CardContent>
        </Card>

        {/* M2. ARR Proyeksi Tahunan */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              ARR Run-Rate
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground font-mono text-2xl font-black">
              {formatRupiah(metrics.estimatedARR)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Estimasi proyeksi sewa 12 bulan
            </p>
          </CardContent>
        </Card>

        {/* M3. Total Omset Lisensi All-Time */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              Total Omset Sewa All-Time
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatRupiah(metrics.totalPlatformRevenue)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Akumulasi pembayaran terverifikasi
            </p>
          </CardContent>
        </Card>

        {/* M4. Skala Platform GMV Transaksi Cuci */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              GMV Cuci Nasional
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground font-mono text-2xl font-black">
              {formatRupiah(metrics.totalPlatformGmv)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Dari{" "}
              <strong>
                {metrics.totalWashTicketsAllTime.toLocaleString("id-ID")} tiket
                cuci
              </strong>{" "}
              di seluruh cabang
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Baris Distribusi: Status Cabang & Pengguna Ekosistem */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Kolom 1: Status Lisensi Cabang */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                Kesehatan Lisensi Cabang
              </CardTitle>
              <Badge variant="outline" className="text-xs font-bold">
                Total: {metrics.totalOutlets} Cabang
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Distribusi status sewa seluruh outlet cuci
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold">Cabang Aktif</span>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-600">
                {metrics.activeOutlets} Cabang
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">
                  Masa Tenggang (Grace Period 3 Hari)
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-amber-600">
                {metrics.gracePeriodOutlets} Cabang
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-4 w-4" />
                <span className="text-xs font-semibold">
                  Kedaluwarsa (Hard Lock)
                </span>
              </div>
              <span className="text-destructive font-mono text-sm font-bold">
                {metrics.expiredOutlets} Cabang
              </span>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full font-bold"
            >
              <Link href="/dashboard/admin/tenants">
                <span>Kelola Seluruh Cabang</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Kolom 2: Demografi Pengguna Platform */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                Pengguna Platform Terdaftar
              </CardTitle>
              <Badge variant="outline" className="text-xs font-bold">
                Total: {metrics.totalUsersCount} Pengguna
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Rincian peran pengguna di seluruh sistem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                Owner (Pemilik Usaha)
              </span>
              <span className="font-mono font-bold">
                {metrics.usersByRole.owners} orang
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                Manajer Cabang
              </span>
              <span className="font-mono font-bold">
                {metrics.usersByRole.managers} orang
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                Kasir Front-Desk
              </span>
              <span className="font-mono font-bold">
                {metrics.usersByRole.cashiers} orang
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-cyan-500" />
                Washer (Pekerja Cuci)
              </span>
              <span className="font-mono font-bold">
                {metrics.usersByRole.washers} orang
              </span>
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
                Superadmin Platform
              </span>
              <span className="font-mono font-bold text-purple-600">
                {metrics.usersByRole.superadmins} orang
              </span>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full font-bold"
            >
              <Link href="/dashboard/admin/users">
                <span>Manajemen Pengguna Global</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Kolom 3: Pertumbuhan 6 Bulan Terakhir */}
        <Card className="shadow-xs md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Tren Pertumbuhan Cabang
            </CardTitle>
            <CardDescription className="text-xs">
              Penambahan cabang & pendapatan sewa 6 bulan terakhir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.monthlyOutletGrowth.map((g, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b pb-2 text-xs last:border-0 last:pb-0"
              >
                <div className="font-medium">{g.month}</div>
                <div className="flex items-center gap-3">
                  <span className="bg-muted rounded px-1.5 py-0.5 text-[11px] font-bold">
                    +{g.newOutlets} Cabang
                  </span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {formatRupiah(g.totalRevenue)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 5. Navigasi Cepat Seluruh Modul Superadmin (8 Pilar Ekosistem) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-muted-foreground text-xs font-black tracking-wider uppercase">
            Pusat Modul & Tata Kelola Platform Global (8 Pilar)
          </h3>
          <span className="text-muted-foreground text-xs">
            Akses menyeluruh se-ekosistem Kinclongin
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* M1. Approval Sewa */}
          <Link
            href="/dashboard/admin/subscriptions"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-purple-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-purple-600">
              Approval Sewa (50k)
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Verifikasi transfer bank/QRIS & approval perpanjangan masa aktif lisensi.
            </p>
          </Link>

          {/* M2. Transaksi Nasional */}
          <Link
            href="/dashboard/admin/transactions"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-emerald-600">
              Transaksi Cuci Nasional
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Feed tiket cuci live seluruh cabang di Indonesia, pantau status dan GMV.
            </p>
          </Link>

          {/* M3. Direktori Tenant & Impersonasi */}
          <Link
            href="/dashboard/admin/tenants"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-cyan-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 transition-colors group-hover:bg-cyan-600 group-hover:text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-cyan-600">
              Direktori Cabang & Tenant
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Seluruh outlet mitra, perpanjang manual, dan mode inspeksi (buka POS cabang).
            </p>
          </Link>

          {/* M4. WhatsApp Gateway Log */}
          <Link
            href="/dashboard/admin/whatsapp"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-green-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-green-600">
              WhatsApp Gateway Log
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Audit status notifikasi Fonnte & pengiriman struk digital ke pelanggan.
            </p>
          </Link>

          {/* M5. S3 Media & Storage Inspector */}
          <Link
            href="/dashboard/admin/media"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-pink-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 transition-colors group-hover:bg-pink-600 group-hover:text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-pink-600">
              S3 Media & Storage Inspector
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Audit pemakaian SumoPod S3, galeri foto inspeksi cacat & bukti bayar.
            </p>
          </Link>

          {/* M6. Template Katalog Layanan */}
          <Link
            href="/dashboard/admin/catalog"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-teal-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-teal-600">
              Master Template Katalog
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Standarisasi paket cuci mobil/motor dan benchmark harga acuan nasional.
            </p>
          </Link>

          {/* M7. Pengguna Global Platform */}
          <Link
            href="/dashboard/admin/users"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-blue-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Users className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-blue-600">
              Pengguna Global Platform
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Kelola status akun Owner, Manajer, Kasir, Washer, dan reset kredensial.
            </p>
          </Link>

          {/* M8. Rekening & Konfigurasi SaaS */}
          <Link
            href="/dashboard/admin/settings"
            className="group bg-card rounded-2xl border p-4 shadow-xs transition-all hover:border-orange-500/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
              <Settings className="h-5 w-5" />
            </div>
            <h4 className="text-foreground mt-3 text-sm font-black group-hover:text-orange-600">
              Rekening & Konfigurasi SaaS
            </h4>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              Atur rekening bank tujuan pembayaran sewa 50k, QRIS, kontak bantuan CS.
            </p>
          </Link>
        </div>
      </div>

      {/* 6. Aktivitas Terkini Platform */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold">
              Aktivitas Terkini Platform
            </CardTitle>
            <CardDescription className="text-xs">
              Jejak audit dan rekaman transaksi terbaru di sistem
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="font-bold">
            <Link href="/dashboard/audit">
              <History className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              <span>Lihat Semua Audit Log</span>
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {metrics.recentActivities.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                Belum ada rekaman aktivitas platform terkini.
              </p>
            ) : (
              metrics.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col gap-1 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {act.action}
                    </Badge>
                    <span className="font-semibold">{act.actorName}</span>
                    <span className="text-muted-foreground">
                      ({act.actorRole})
                    </span>
                    {act.outletName && (
                      <span className="text-muted-foreground">
                        di <strong>{act.outletName}</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {new Date(act.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
