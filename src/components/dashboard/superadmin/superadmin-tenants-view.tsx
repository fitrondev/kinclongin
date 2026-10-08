"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MoreVertical,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  type TenantDirectoryItem,
  toggleOutletLicenseAction,
} from "@/actions/subscription";
import { setSuperadminActiveOutletAction } from "@/actions/superadmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionStatus } from "@/generated/prisma/enums";

interface SuperadminTenantsViewProps {
  initialTenants: TenantDirectoryItem[];
}

export function SuperadminTenantsView({
  initialTenants,
}: SuperadminTenantsViewProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantDirectoryItem[]>(initialTenants);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Modal dialog ubah status kustom
  const [selectedTenant, setSelectedTenant] =
    useState<TenantDirectoryItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>("ACTIVE");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.toLowerCase().includes(search.toLowerCase()) ||
        t.address.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" || t.subscriptionStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [tenants, search, statusFilter]);

  const handleQuickExtend30Days = async (tenantId: string, name: string) => {
    setIsLoading(true);
    try {
      const res = await toggleOutletLicenseAction({
        outletId: tenantId,
        action: "EXTEND_30_DAYS",
      });

      if (res.success) {
        toast.success(
          res.data?.message || `Lisensi ${name} berhasil diperpanjang +30 hari.`
        );
        router.refresh();
      } else {
        toast.error(res.error || "Gagal memperpanjang lisensi cabang.");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memperpanjang lisensi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (
    tenantId: string,
    currentActive: boolean,
    name: string
  ) => {
    setIsLoading(true);
    try {
      const res = await toggleOutletLicenseAction({
        outletId: tenantId,
        action: "TOGGLE_ACTIVE",
        isActive: !currentActive,
      });

      if (res.success) {
        toast.success(
          res.data?.message || `Status aktif ${name} berhasil diubah.`
        );
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, isActive: !currentActive } : t
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengubah status cabang.");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomStatus = async () => {
    if (!selectedTenant) return;
    setIsUpdatingStatus(true);
    try {
      const res = await toggleOutletLicenseAction({
        outletId: selectedTenant.id,
        action: "SET_STATUS",
        newStatus: newStatus as "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "TRIAL",
      });

      if (res.success) {
        toast.success(
          res.data?.message || "Status lisensi berhasil diperbarui."
        );
        setTenants((prev) =>
          prev.map((t) =>
            t.id === selectedTenant.id
              ? {
                  ...t,
                  subscriptionStatus: newStatus as SubscriptionStatus,
                }
              : t
          )
        );
        setSelectedTenant(null);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengubah status lisensi.");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat menyimpan status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleInspectOutlet = async (outletId: string, outletName: string) => {
    setIsLoading(true);
    try {
      const res = await setSuperadminActiveOutletAction(outletId);
      if (res.success) {
        toast.success(`Mode supervisi aktif: Menginspeksi ${outletName}`);
        router.push("/pos/antrean");
      } else {
        toast.error(res.error || "Gagal beralih ke cabang.");
      }
    } catch {
      toast.error("Terjadi kendala saat beralih cabang.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
            Direktori Tenant & Kontrol Cabang
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Daftar seluruh tempat cuci mobil/motor terdaftar di Kinclongin
            beserta masa berlaku lisensi sewa flat Rp 50.000/bulan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="font-bold shadow-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            <span>Segarkan</span>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-purple-600 font-bold text-white shadow-xs hover:bg-purple-700"
          >
            <Link href="/dashboard/admin/subscriptions">
              <ShieldAlert className="mr-1.5 h-4 w-4" />
              <span>Approval Pembayaran 50k</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Filter & Pencarian */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                placeholder="Cari nama cabang, nama owner, telepon, atau kota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 text-xs font-semibold">
                  <SelectValue placeholder="Status Lisensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif (Berlangganan)</SelectItem>
                  <SelectItem value="GRACE_PERIOD">
                    Masa Tenggang (Grace Period)
                  </SelectItem>
                  <SelectItem value="EXPIRED">Kedaluwarsa (Expired)</SelectItem>
                  <SelectItem value="TRIAL">Masa Uji Coba (Trial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Tabel Direktori Tenant */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            Daftar Cabang Outlet ({filteredTenants.length} dari {tenants.length}
            )
          </CardTitle>
          <CardDescription className="text-xs">
            Kelola izin akses, masa aktif lisensi, dan kontak pemilik cabang.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* 1. Mobile & Tablet Portrait Card List (Khusus < md) */}
          <div className="divide-border/60 divide-y md:hidden">
            {filteredTenants.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center text-xs">
                Tidak ada cabang outlet yang cocok dengan kriteria pencarian.
              </div>
            ) : (
              filteredTenants.map((t) => (
                <div key={t.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-foreground text-sm font-bold">
                          {t.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] font-bold ${
                            t.subscriptionStatus === "ACTIVE"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                              : t.subscriptionStatus === "GRACE_PERIOD"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                : t.subscriptionStatus === "EXPIRED"
                                  ? "border-destructive/20 bg-destructive/10 text-destructive"
                                  : "border-blue-500/20 bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {t.subscriptionStatus}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {t.address}
                      </p>
                      <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400">
                        /{t.slug}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={isLoading}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 text-xs">
                        <DropdownMenuItem
                          onClick={() => handleInspectOutlet(t.id, t.name)}
                          className="font-bold text-cyan-600 dark:text-cyan-400"
                        >
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          <span>Inspeksi Cabang (Buka POS)</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleQuickExtend30Days(t.id, t.name)}
                          className="font-semibold text-purple-600 dark:text-purple-400"
                        >
                          <Sparkles className="mr-2 h-3.5 w-3.5" />
                          <span>Beri +30 Hari Gratis</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTenant(t);
                            setNewStatus(t.subscriptionStatus);
                          }}
                        >
                          <Calendar className="mr-2 h-3.5 w-3.5" />
                          <span>Ubah Status Lisensi</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleActive(t.id, t.isActive, t.name)
                          }
                          className={
                            t.isActive ? "text-destructive" : "text-emerald-600"
                          }
                        >
                          {t.isActive ? (
                            <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                          )}
                          <span>
                            {t.isActive ? "Suspend Cabang" : "Aktifkan Kembali"}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="bg-muted/30 grid grid-cols-2 gap-2 rounded-lg p-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        Pemilik:
                      </span>
                      <span className="font-semibold">{t.ownerName}</span>
                      <span className="text-muted-foreground block font-mono text-[10px]">
                        {t.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        Masa Aktif:
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          t.daysRemaining <= 3
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {t.daysRemaining} hari lagi
                      </span>
                      <span className="text-muted-foreground block text-[10px]">
                        {t.totalTickets} tiket cuci
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Desktop & Tablet Landscape Table (Khusus >= md) */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">
                    Nama Cabang
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Pemilik (Owner)
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Status Lisensi
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Sisa Waktu
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Aktivitas Cuci
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Status Operasi
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center text-xs"
                    >
                      Tidak ada cabang outlet yang cocok dengan kriteria
                      pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((t) => (
                    <TableRow key={t.id}>
                      {/* Nama Cabang */}
                      <TableCell className="py-3">
                        <div className="space-y-0.5">
                          <span className="font-bold">{t.name}</span>
                          <div className="text-muted-foreground line-clamp-1 max-w-xs text-[11px]">
                            {t.address}
                          </div>
                          <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400">
                            /{t.slug}
                          </span>
                        </div>
                      </TableCell>

                      {/* Pemilik (Owner) */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="font-semibold">{t.ownerName}</div>
                          <div className="text-muted-foreground text-[11px]">
                            {t.ownerEmail}
                          </div>
                          <div className="text-muted-foreground font-mono text-[11px]">
                            {t.phone}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status Lisensi */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            t.subscriptionStatus === "ACTIVE"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                              : t.subscriptionStatus === "GRACE_PERIOD"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                : t.subscriptionStatus === "EXPIRED"
                                  ? "border-destructive/20 bg-destructive/10 text-destructive"
                                  : "border-blue-500/20 bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {t.subscriptionStatus}
                        </Badge>
                      </TableCell>

                      {/* Sisa Waktu */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <span
                            className={`font-mono font-bold ${
                              t.daysRemaining <= 3
                                ? "text-destructive"
                                : "text-foreground"
                            }`}
                          >
                            {t.daysRemaining} hari lagi
                          </span>
                          <div className="text-muted-foreground text-[10px]">
                            s/d{" "}
                            {t.subscriptionExpiresAt
                              ? new Date(
                                  t.subscriptionExpiresAt
                                ).toLocaleDateString("id-ID")
                              : "-"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Aktivitas Cuci */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <span className="font-mono font-bold">
                            {t.totalTickets} tiket cuci
                          </span>
                          <div className="text-muted-foreground text-[10px]">
                            {t.totalPaymentsApproved}x bayar sewa
                          </div>
                        </div>
                      </TableCell>

                      {/* Status Operasi */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.isActive
                              ? "border-emerald-500/30 text-emerald-600"
                              : "border-destructive/30 text-destructive"
                          }
                        >
                          {t.isActive ? "Operasional Aktif" : "Dinonaktifkan"}
                        </Badge>
                      </TableCell>

                      {/* Aksi Superadmin */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isLoading}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-52 text-xs"
                          >
                            <DropdownMenuItem
                              onClick={() => handleInspectOutlet(t.id, t.name)}
                              className="font-bold text-cyan-600 dark:text-cyan-400"
                            >
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              <span>Inspeksi Cabang (Buka POS)</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickExtend30Days(t.id, t.name)
                              }
                              className="font-semibold text-purple-600 dark:text-purple-400"
                            >
                              <Sparkles className="mr-2 h-3.5 w-3.5" />
                              <span>Beri +30 Hari Gratis</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTenant(t);
                                setNewStatus(t.subscriptionStatus);
                              }}
                            >
                              <Calendar className="mr-2 h-3.5 w-3.5" />
                              <span>Ubah Status Lisensi</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleActive(t.id, t.isActive, t.name)
                              }
                              className={
                                t.isActive
                                  ? "text-destructive font-semibold"
                                  : ""
                              }
                            >
                              <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                              <span>
                                {t.isActive
                                  ? "Kunci / Matikan Akses"
                                  : "Buka Kunci Akses"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Modal Dialog: Ubah Status Lisensi Kustom */}
      <Dialog
        open={Boolean(selectedTenant)}
        onOpenChange={(open) => !open && setSelectedTenant(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Ubah Status Lisensi: {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah status langganan cabang ini secara manual. Pengubahan status
              akan langsung berdampak pada akses loket POS dan antrean cabang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Pilih Status Lisensi Baru:
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE (Layanan Penuh)</SelectItem>
                  <SelectItem value="GRACE_PERIOD">
                    GRACE_PERIOD (Masa Tenggang 3 Hari)
                  </SelectItem>
                  <SelectItem value="EXPIRED">
                    EXPIRED (Kunci Input Tiket Baru)
                  </SelectItem>
                  <SelectItem value="TRIAL">TRIAL (Uji Coba)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTenant(null)}
              disabled={isUpdatingStatus}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 font-bold text-white hover:bg-purple-700"
              onClick={handleSaveCustomStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Menyimpan..." : "Simpan Status Baru"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
