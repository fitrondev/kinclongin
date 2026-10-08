"use client";

import { useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Download,
  Eye,
  FileText,
  Filter,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Power,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  PendingSubscriptionItem,
  PlatformMetrics,
  TenantDirectoryItem,
  getAllSubscriptionPaymentsAction,
  getAllTenantsAction,
  getPendingSubscriptionsAction,
  getPlatformMetricsAction,
  toggleOutletLicenseAction,
  verifySubscriptionPaymentAction,
} from "@/actions/subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SubscriptionStatus } from "@/generated/prisma/enums";
import { formatRupiah, formatTanggalIndo } from "@/lib/formatters";

interface SuperadminSubscriptionsViewProps {
  initialMetrics: PlatformMetrics;
  initialPending: PendingSubscriptionItem[];
  initialTenants: TenantDirectoryItem[];
  initialHistory: Array<{
    id: string;
    outletId: string;
    outletName: string;
    amount: number;
    periodMonths: number;
    paymentMethod: string;
    paymentProofUrl: string;
    status: string;
    notes?: string | null;
    rejectionReason?: string | null;
    createdAt: string;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
  }>;
}

export function SuperadminSubscriptionsView({
  initialMetrics,
  initialPending,
  initialTenants,
  initialHistory,
}: SuperadminSubscriptionsViewProps) {
  const router = useRouter();

  // Data States
  const [metrics, setMetrics] = useState<PlatformMetrics>(initialMetrics);
  const [pendingItems, setPendingItems] =
    useState<PendingSubscriptionItem[]>(initialPending);
  const [tenants, setTenants] = useState<TenantDirectoryItem[]>(initialTenants);
  const [historyItems, setHistoryItems] = useState(initialHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal Pembesaran Bukti Bayar
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedProofTitle, setSelectedProofTitle] = useState<string>("");

  // Modal Penolakan (Reject)
  const [rejectingItem, setRejectingItem] =
    useState<PendingSubscriptionItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Action Loading ID
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Search & Filter State untuk Tenant Directory
  const [tenantSearch, setTenantSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Refresh semua data Superadmin
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [metRes, pendRes, tenRes, histRes] = await Promise.all([
        getPlatformMetricsAction(),
        getPendingSubscriptionsAction(),
        getAllTenantsAction(),
        getAllSubscriptionPaymentsAction(),
      ]);

      if (metRes.success && metRes.data) setMetrics(metRes.data);
      if (pendRes.success && pendRes.data) setPendingItems(pendRes.data);
      if (tenRes.success && tenRes.data) setTenants(tenRes.data);
      if (histRes.success && histRes.data) setHistoryItems(histRes.data);

      toast.success("Data portal Superadmin berhasil diperbarui.");
    } catch {
      toast.error("Gagal menyegarkan data platform.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Setujui Pembayaran (+30 Hari x Durasi)
  const handleApprovePayment = async (item: PendingSubscriptionItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await verifySubscriptionPaymentAction({
        paymentId: item.id,
        action: "APPROVE",
      });

      if (res.success) {
        toast.success(
          `Pembayaran ${formatRupiah(item.amount)} untuk ${item.outletName} BERHASIL DISETUJUI! (+${item.periodMonths * 30} hari aktif)`
        );
        await handleRefresh();
        router.refresh();
      } else {
        toast.error(res.error || "Gagal menyetujui pembayaran.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Tolak Pembayaran
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;

    setIsRejecting(true);
    try {
      const res = await verifySubscriptionPaymentAction({
        paymentId: rejectingItem.id,
        action: "REJECT",
        rejectionReason: rejectionReason.trim(),
      });

      if (res.success) {
        toast.warning(
          `Pengajuan pembayaran sewa untuk ${rejectingItem.outletName} telah DITOLAK.`
        );
        setRejectingItem(null);
        setRejectionReason("");
        await handleRefresh();
        router.refresh();
      } else {
        toast.error(res.error || "Gagal menolak pembayaran.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setIsRejecting(false);
    }
  };

  // Saklar Darurat Lisensi Cabang (Task 7.3)
  const handleToggleLicense = async (
    outletId: string,
    action: "TOGGLE_ACTIVE" | "EXTEND_30_DAYS" | "SET_STATUS",
    options?: { newStatus?: SubscriptionStatus; isActive?: boolean }
  ) => {
    setActionLoadingId(outletId);
    try {
      const res = await toggleOutletLicenseAction({
        outletId,
        action,
        newStatus: options?.newStatus,
        isActive: options?.isActive,
      });

      if (res.success && res.data) {
        toast.success(res.data.message);
        await handleRefresh();
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengeksekusi aksi lisensi.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter Tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.ownerName.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.phone.includes(tenantSearch);

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "ACTIVE")
        return t.subscriptionStatus === "ACTIVE" && t.isActive;
      if (statusFilter === "GRACE_PERIOD")
        return t.subscriptionStatus === "GRACE_PERIOD";
      if (statusFilter === "EXPIRED") return t.subscriptionStatus === "EXPIRED";
      if (statusFilter === "INACTIVE") return !t.isActive;

      return true;
    });
  }, [tenants, tenantSearch, statusFilter]);

  return (
    <div className="space-y-8">
      {/* 1. Header Superadmin Portal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Portal Superadmin Platform
            </h1>
            <Badge className="bg-purple-600 font-black text-white hover:bg-purple-700">
              <Crown className="mr-1 h-3 w-3" />
              Platform Provider
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Pantau ratusan tempat cuci, pantau estimasi MRR sewa flat Rp
            50.000/bulan, dan verifikasi bukti transfer pembayaran sewa cabang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan Data</span>
          </Button>

          <Button
            asChild
            size="sm"
            variant="secondary"
            className="gap-1.5 text-xs font-semibold"
          >
            <Link href="/dashboard">
              <span>Ke Dasbor Utama</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Metrik Lisensi Cabang Platform (Task 7.3) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Estimasi MRR */}
        <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Estimasi MRR Platform
              </CardDescription>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {formatRupiah(metrics.estimatedMRR)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-[11px]">
            {metrics.activeOutlets} outlet aktif x Rp 50.000 / bulan
          </CardContent>
        </Card>

        {/* Metric 2: Antrean Verifikasi Pending */}
        <Card
          className={`border shadow-xs ${
            metrics.pendingApprovals > 0
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border"
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-foreground text-xs font-bold">
                Antrean Approval Sewa
              </CardDescription>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-foreground text-2xl font-black">
              {metrics.pendingApprovals} Pengajuan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-[11px]">
            {metrics.pendingApprovals > 0 ? (
              <span className="font-bold text-amber-600">
                Memerlukan verifikasi transfer bukti bayar
              </span>
            ) : (
              "Semua bukti bayar telah diverifikasi"
            )}
          </CardContent>
        </Card>

        {/* Metric 3: Direktori Cabang */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-foreground text-xs font-bold">
                Total Cabang Terdaftar
              </CardDescription>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-foreground text-2xl font-black">
              {metrics.totalOutlets} Outlet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-[11px]">
            <span className="font-bold text-emerald-600">
              {metrics.activeOutlets} Aktif
            </span>{" "}
            •{" "}
            <span className="font-bold text-amber-600">
              {metrics.gracePeriodOutlets} Tenggang
            </span>{" "}
            •{" "}
            <span className="text-destructive font-bold">
              {metrics.expiredOutlets} Kadaluwarsa
            </span>
          </CardContent>
        </Card>

        {/* Metric 4: Total Pendapatan Sewa Terkumpul */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-foreground text-xs font-bold">
                Pendapatan Sewa Diterima
              </CardDescription>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-foreground text-2xl font-black">
              {formatRupiah(metrics.totalRevenueAllTime)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-[11px]">
            Total transfer sewa lisensi disetujui
          </CardContent>
        </Card>
      </div>

      {/* 3. Tab Konten Superadmin */}
      <Tabs defaultValue="pending" className="w-full space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="pending" className="gap-2 text-xs font-bold">
            <Clock className="h-3.5 w-3.5" />
            <span>Antrean Approval</span>
            {pendingItems.length > 0 && (
              <Badge
                variant="destructive"
                className="h-4 px-1.5 text-[9px] font-black"
              >
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-2 text-xs font-bold">
            <Building2 className="h-3.5 w-3.5" />
            <span>Direktori Tenant ({tenants.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-bold">
            <FileText className="h-3.5 w-3.5" />
            <span>Riwayat & Audit Log</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Antrean Approval Pembayaran Sewa (Task 7.2) */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Antrean Verifikasi Bukti Pembayaran Sewa 50k
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Periksa foto bukti transfer pelanggan, cocokkan mutasi
                    rekening, dan klik &quot;Setujui&quot; untuk memperpanjang
                    masa aktif cabang +30 hari per bulan.
                  </CardDescription>
                </div>
                <Badge
                  variant={pendingItems.length > 0 ? "outline" : "secondary"}
                  className="text-xs font-bold"
                >
                  {pendingItems.length} Butuh Verifikasi
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-foreground mt-3 text-base font-bold">
                    Semua Pembayaran Telah Selesai Diverifikasi!
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                    Tidak ada antrean bukti transfer yang tertunda saat ini.
                    Cabang yang melakukan pembayaran baru akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-bold">
                          Outlet & Pemilik
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Tanggal & Nominal
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Metode
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Catatan Pengirim
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Bukti Transfer
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold">
                          Aksi Verifikasi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id} className="text-xs">
                          {/* Nama Outlet & Pemilik */}
                          <TableCell>
                            <div>
                              <span className="text-foreground block text-sm font-bold">
                                {item.outletName}
                              </span>
                              <span className="text-muted-foreground block text-[11px]">
                                Owner: {item.ownerName} ({item.ownerPhone})
                              </span>
                              <span className="text-muted-foreground/70 text-[10px]">
                                {item.ownerEmail}
                              </span>
                            </div>
                          </TableCell>

                          {/* Tanggal & Nominal */}
                          <TableCell className="whitespace-nowrap">
                            <span className="text-primary block text-base font-black">
                              {formatRupiah(item.amount)}
                            </span>
                            <span className="text-foreground text-[11px] font-semibold">
                              {item.periodMonths} Bulan (+
                              {item.periodMonths * 30} Hari)
                            </span>
                            <span className="text-muted-foreground block text-[10px]">
                              {formatTanggalIndo(item.submittedAt)}
                            </span>
                          </TableCell>

                          {/* Metode */}
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold"
                            >
                              {item.paymentMethod === "QRIS"
                                ? "QRIS Usaha"
                                : "Transfer Bank"}
                            </Badge>
                          </TableCell>

                          {/* Catatan Pengirim */}
                          <TableCell className="text-muted-foreground max-w-xs text-[11px]">
                            {item.notes ? (
                              <span className="italic">{item.notes}</span>
                            ) : (
                              <span className="opacity-50">-</span>
                            )}
                          </TableCell>

                          {/* Bukti Transfer */}
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProofUrl(item.paymentProofUrl);
                                setSelectedProofTitle(
                                  `Bukti Transfer - ${item.outletName} (${formatRupiah(
                                    item.amount
                                  )})`
                                );
                              }}
                              className="h-8 gap-1.5 text-xs font-semibold"
                            >
                              <Eye className="text-primary h-3.5 w-3.5" />
                              <span>Lihat Bukti Foto</span>
                            </Button>
                          </TableCell>

                          {/* Aksi Verifikasi: Setujui / Tolak */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprovePayment(item)}
                                disabled={actionLoadingId === item.id}
                                className="h-8 gap-1.5 bg-emerald-600 font-bold text-white shadow-xs hover:bg-emerald-700"
                              >
                                {actionLoadingId === item.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 stroke-3" />
                                )}
                                <span>Setujui (+30 Hari)</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setRejectingItem(item);
                                  setRejectionReason("");
                                }}
                                disabled={actionLoadingId === item.id}
                                className="h-8 gap-1 text-xs font-bold"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Tolak</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Direktori Tenant & Saklar Darurat Lisensi (Task 7.3) */}
        <TabsContent value="tenants" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Direktori Seluruh Tenant & Manajemen Lisensi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pantau masa aktif setiap tempat cuci, gunakan saklar darurat
                    lisensi, atau tambahkan dispensasi sewa manual.
                  </CardDescription>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                    <Input
                      placeholder="Cari cabang, owner, HP..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-background text-foreground focus:ring-primary h-8 rounded-md border px-2.5 text-xs font-medium focus:ring-1 focus:outline-none"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="GRACE_PERIOD">Masa Tenggang</option>
                    <option value="EXPIRED">Kedaluwarsa</option>
                    <option value="INACTIVE">Lisensi Dimatikan</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">
                        Tempat Cuci
                      </TableHead>
                      <TableHead className="text-xs font-bold">
                        Pemilik & Kontak
                      </TableHead>
                      <TableHead className="text-xs font-bold">
                        Status Lisensi
                      </TableHead>
                      <TableHead className="text-xs font-bold">
                        Masa Berlaku Sewa
                      </TableHead>
                      <TableHead className="text-xs font-bold">
                        Aktivitas
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold">
                        Saklar Darurat Lisensi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-muted-foreground p-8 text-center text-xs"
                        >
                          Tidak ada tenant yang cocok dengan filter pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants.map((t) => (
                        <TableRow key={t.id} className="text-xs">
                          {/* Nama Tempat Cuci */}
                          <TableCell>
                            <div>
                              <span className="text-foreground block text-sm font-bold">
                                {t.name}
                              </span>
                              <span className="text-muted-foreground block text-[11px]">
                                {t.address}
                              </span>
                              <span className="text-muted-foreground/70 font-mono text-[10px]">
                                slug: {t.slug}
                              </span>
                            </div>
                          </TableCell>

                          {/* Pemilik & Kontak */}
                          <TableCell>
                            <span className="text-foreground block font-bold">
                              {t.ownerName}
                            </span>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-muted-foreground text-[11px]">
                                {t.phone}
                              </span>
                              {t.phone && (
                                <a
                                  href={`https://wa.me/${t.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat WhatsApp Owner"
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <span className="text-muted-foreground/70 text-[10px]">
                              {t.ownerEmail}
                            </span>
                          </TableCell>

                          {/* Status Lisensi */}
                          <TableCell>
                            {!t.isActive ? (
                              <Badge
                                variant="destructive"
                                className="gap-1 font-bold"
                              >
                                <Power className="h-3 w-3" />
                                <span>Lisensi Mati</span>
                              </Badge>
                            ) : t.subscriptionStatus === "ACTIVE" ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300"
                              >
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                <span>Aktif</span>
                              </Badge>
                            ) : t.subscriptionStatus === "GRACE_PERIOD" ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/40 bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300"
                              >
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                <span>Masa Tenggang</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="gap-1 font-bold"
                              >
                                <Lock className="h-3 w-3" />
                                <span>Kedaluwarsa</span>
                              </Badge>
                            )}
                          </TableCell>

                          {/* Masa Berlaku */}
                          <TableCell className="whitespace-nowrap">
                            <span className="text-foreground block font-bold">
                              Sisa {t.daysRemaining} Hari
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {t.subscriptionExpiresAt
                                ? formatTanggalIndo(t.subscriptionExpiresAt)
                                : "Belum Diatur"}
                            </span>
                          </TableCell>

                          {/* Aktivitas Tiket Cuci */}
                          <TableCell className="whitespace-nowrap">
                            <span className="text-foreground block font-bold">
                              {t.totalTickets} Tiket Cuci
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {t.totalPaymentsApproved}x Bayar Sewa
                            </span>
                          </TableCell>

                          {/* Saklar Darurat Lisensi (Task 7.3) */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Tombol Dispensasi +30 Hari Cepat */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleToggleLicense(t.id, "EXTEND_30_DAYS")
                                }
                                disabled={actionLoadingId === t.id}
                                className="h-7 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                                title="Beri dispensasi +30 hari langsung"
                              >
                                <span>+30 Hari</span>
                              </Button>

                              {/* Saklar Darurat Toggle Active */}
                              <Button
                                size="sm"
                                variant={t.isActive ? "destructive" : "default"}
                                onClick={() =>
                                  handleToggleLicense(t.id, "TOGGLE_ACTIVE", {
                                    isActive: !t.isActive,
                                  })
                                }
                                disabled={actionLoadingId === t.id}
                                className="h-7 gap-1 text-[11px] font-bold"
                              >
                                <Power className="h-3 w-3" />
                                <span>
                                  {t.isActive ? "Matikan" : "Aktifkan"}
                                </span>
                              </Button>

                              {/* Dropdown Aksi Lainnya */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="text-xs"
                                >
                                  <DropdownMenuLabel>
                                    Otoritas Lisensi Cabang
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleLicense(t.id, "SET_STATUS", {
                                        newStatus: SubscriptionStatus.ACTIVE,
                                      })
                                    }
                                  >
                                    Paksa Status: AKTIF (Active)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleLicense(t.id, "SET_STATUS", {
                                        newStatus:
                                          SubscriptionStatus.GRACE_PERIOD,
                                      })
                                    }
                                  >
                                    Paksa Status: MASA TENGGANG
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleLicense(t.id, "SET_STATUS", {
                                        newStatus: SubscriptionStatus.EXPIRED,
                                      })
                                    }
                                    className="text-destructive font-semibold"
                                  >
                                    Paksa Status: KEDALUWARSA (Kunci POS)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Riwayat Seluruh Approval & Log Keuangan */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border shadow-xs">
            <CardHeader className="bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Riwayat Pembayaran Sewa Platform
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Catatan audit lengkap seluruh transaksi sewa lisensi flat Rp
                    50.000/bulan dari semua cabang tempat cuci.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {historyItems.length} Catatan Transaksi
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {historyItems.length === 0 ? (
                <div className="text-muted-foreground p-8 text-center text-xs">
                  Belum ada catatan transaksi sewa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-bold">
                          Tanggal
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Nama Outlet
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Nominal
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Durasi
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Metode
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Bukti Bayar
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Status Verifikasi
                        </TableHead>
                        <TableHead className="text-xs font-bold">
                          Petugas & Catatan
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyItems.map((h) => (
                        <TableRow key={h.id} className="text-xs">
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatTanggalIndo(h.createdAt)}
                          </TableCell>
                          <TableCell className="text-foreground font-bold">
                            {h.outletName}
                          </TableCell>
                          <TableCell className="text-foreground font-black">
                            {formatRupiah(h.amount)}
                          </TableCell>
                          <TableCell>
                            {h.periodMonths} Bulan (+{h.periodMonths * 30} Hari)
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {h.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProofUrl(h.paymentProofUrl);
                                setSelectedProofTitle(
                                  `Bukti Transfer - ${h.outletName}`
                                );
                              }}
                              className="h-6 gap-1 px-2 text-[10px] font-semibold"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Lihat</span>
                            </Button>
                          </TableCell>
                          <TableCell>
                            {h.status === "APPROVED" ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-emerald-500/40 bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Disetujui</span>
                              </Badge>
                            ) : h.status === "REJECTED" ? (
                              <Badge
                                variant="destructive"
                                className="gap-1 text-[10px] font-bold"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Ditolak</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/40 bg-amber-500/15 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                              >
                                <Clock className="h-3 w-3" />
                                <span>Pending</span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate text-[11px]">
                            {h.verifiedBy ? (
                              <span>
                                Oleh: <strong>{h.verifiedBy}</strong>
                              </span>
                            ) : null}
                            {h.rejectionReason && (
                              <span className="text-destructive block">
                                Alasan: {h.rejectionReason}
                              </span>
                            )}
                            {h.notes && (
                              <span className="block truncate italic">
                                Ket: {h.notes}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 4. Modal Dialog Pembesaran Bukti Bayar (Task 7.2) */}
      <Dialog
        open={!!selectedProofUrl}
        onOpenChange={(open) => !open && setSelectedProofUrl(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {selectedProofTitle || "Pratinjau Bukti Transfer"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pastikan nama pengirim, nominal transfer, dan waktu transaksi
              sesuai dengan mutasi bank.
            </DialogDescription>
          </DialogHeader>

          {selectedProofUrl && (
            <div className="space-y-4">
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border bg-black/5 dark:bg-white/5">
                <Image
                  src={selectedProofUrl}
                  alt="Bukti Transfer Asli"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs font-semibold"
                >
                  <a
                    href={selectedProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Buka Resolusi Penuh</span>
                  </a>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedProofUrl(null)}
                  className="text-xs font-semibold"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. Modal Dialog Input Alasan Penolakan (Reject) */}
      <Dialog
        open={!!rejectingItem}
        onOpenChange={(open) => !open && setRejectingItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleConfirmReject}>
            <DialogHeader>
              <DialogTitle className="text-destructive text-base font-bold">
                Tolak Pengajuan Pembayaran Sewa
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cabang: <strong>{rejectingItem?.outletName}</strong> • Nominal:{" "}
                <strong>{formatRupiah(rejectingItem?.amount)}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Label
                htmlFor="rejection-reason"
                className="text-xs font-semibold"
              >
                Alasan Penolakan (Akan tampil pada dasbor pemilik outlet) *
              </Label>
              <Textarea
                id="rejection-reason"
                required
                placeholder="Contoh: Bukti transfer buram / nominal tidak sesuai / dana belum masuk ke mutasi rekening."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectingItem(null)}
                disabled={isRejecting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isRejecting || !rejectionReason.trim()}
                className="gap-1.5 text-xs font-bold"
              >
                {isRejecting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Tolak Pembayaran</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
