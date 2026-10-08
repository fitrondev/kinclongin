"use client";

import { useMemo, useState, useTransition } from "react";

import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  type ReengagementVehicleItem,
  batchSendReengagementRemindersAction,
  sendReengagementReminderAction,
} from "@/actions/crm-reminder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLicensePlate } from "@/lib/formatters";

interface CrmReengagementViewProps {
  outletId: string;
  initialVehicles: ReengagementVehicleItem[];
}

export function CrmReengagementView({
  outletId,
  initialVehicles,
}: CrmReengagementViewProps) {
  const [vehicles, setVehicles] =
    useState<ReengagementVehicleItem[]>(initialVehicles);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "READY" | "REMINDED">(
    "READY"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [promoOffer, setPromoOffer] = useState(
    "Diskon 10% atau Gratis Semir Ban Premium"
  );
  const [isPending, startTransition] = useTransition();

  // Filter kendaraan
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        v.licensePlate.toLowerCase().includes(q) ||
        v.customerName.toLowerCase().includes(q) ||
        v.customerPhone.includes(q);

      if (!matchQuery) return false;

      if (filterType === "READY") {
        return !v.alreadyRemindedThisMonth;
      }
      if (filterType === "REMINDED") {
        return v.alreadyRemindedThisMonth;
      }
      return true;
    });
  }, [vehicles, searchQuery, filterType]);

  // Statistik Agregat
  const totalDue = vehicles.length;
  const criticalCount = vehicles.filter(
    (v) => v.daysSinceLastVisit >= 30
  ).length;
  const alreadyRemindedCount = vehicles.filter(
    (v) => v.alreadyRemindedThisMonth
  ).length;
  const readyToSendCount = totalDue - alreadyRemindedCount;

  // Toggle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const available = filteredVehicles
        .filter((v) => !v.alreadyRemindedThisMonth)
        .map((v) => v.vehicleId);
      setSelectedIds(available);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleOne = (vehicleId: string) => {
    setSelectedIds((prev) =>
      prev.includes(vehicleId)
        ? prev.filter((id) => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  // Kirim reminder 1 kendaraan
  const handleSendSingle = (vehicle: ReengagementVehicleItem) => {
    startTransition(async () => {
      const res = await sendReengagementReminderAction({
        outletId,
        vehicleId: vehicle.vehicleId,
        promoOffer,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mengirim pengingat.");
        return;
      }

      toast.success(
        `Pengingat WhatsApp berhasil dikirim ke ${vehicle.customerName} (${vehicle.licensePlate})!`
      );

      // Tandai lokal
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === vehicle.vehicleId
            ? {
                ...v,
                alreadyRemindedThisMonth: true,
                lastRemindedAt: new Date().toISOString(),
              }
            : v
        )
      );
      setSelectedIds((prev) => prev.filter((id) => id !== vehicle.vehicleId));
    });
  };

  // Kirim reminder batch
  const handleBatchSend = () => {
    if (selectedIds.length === 0) {
      toast.warning("Silakan pilih minimal 1 kendaraan yang siap dikirimi.");
      return;
    }

    startTransition(async () => {
      const res = await batchSendReengagementRemindersAction({
        outletId,
        vehicleIds: selectedIds,
        promoOffer,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mengirim batch reminder.");
        return;
      }

      toast.success(
        `Berhasil memproses pengingat WhatsApp ke ${res.data.countSent} pelanggan!`
      );

      // Tandai lokal
      setVehicles((prev) =>
        prev.map((v) =>
          selectedIds.includes(v.vehicleId)
            ? {
                ...v,
                alreadyRemindedThisMonth: true,
                lastRemindedAt: new Date().toISOString(),
              }
            : v
        )
      );
      setSelectedIds([]);
    });
  };

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Belum Cuci &gt; 14 Hari
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-500">
              {readyToSendCount}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                kendaraan siap dihubungi
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Dari total {totalDue} kendaraan yang tercatat tidak berkunjung
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Kritis (&gt; 30 Hari)
            </CardTitle>
            <AlertCircle className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-black">
              {criticalCount}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                kendaraan
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Sangat berisiko berpindah ke tempat cuci kompetitor lain
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Sudah Dikirimi Bulan Ini
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-500">
              {alreadyRemindedCount}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                kendaraan
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Dibatasi 1x/bulan per nomor WA untuk menjaga reputasi anti-spam
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Konfigurasi Penawaran & Batch Bar */}
      <Card className="border shadow-xs">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-1">
              <label className="text-foreground flex items-center gap-1.5 text-xs font-bold uppercase">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Isi Penawaran Promo Voucher (Opsional)</span>
              </label>
              <Input
                value={promoOffer}
                onChange={(e) => setPromoOffer(e.target.value)}
                placeholder="Contoh: Diskon 10% atau Gratis Semir Ban Premium"
                className="max-w-xl text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 lg:pt-0">
              <Button
                onClick={handleBatchSend}
                disabled={isPending || selectedIds.length === 0}
                className="h-10 bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Kirim WA ke ({selectedIds.length}) Kendaraan Terpilih
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel CRM Pelanggan */}
      <Card className="border shadow-xs">
        <CardHeader className="border-b p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold">
                Daftar Kendaraan Belum Cuci
              </CardTitle>
              <CardDescription className="text-xs">
                Sistem otomatis memfilter kendaraan yang tidak berkunjung lebih
                dari 14 hari.
              </CardDescription>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Cari plat / pelanggan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>

              <div className="bg-muted/40 flex items-center rounded-lg border p-0.5 text-xs">
                <Button
                  variant={filterType === "READY" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("READY")}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  Siap Dikirimi ({readyToSendCount})
                </Button>
                <Button
                  variant={filterType === "REMINDED" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("REMINDED")}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  Sudah ({alreadyRemindedCount})
                </Button>
                <Button
                  variant={filterType === "ALL" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("ALL")}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  Semua ({totalDue})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={
                        filteredVehicles.length > 0 &&
                        selectedIds.length ===
                          filteredVehicles.filter(
                            (v) => !v.alreadyRemindedThisMonth
                          ).length
                      }
                      onCheckedChange={(checked) =>
                        handleSelectAll(Boolean(checked))
                      }
                      aria-label="Pilih Semua"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Plat & Tipe Kendaraan
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Pemilik / WhatsApp
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Kunjungan Terakhir
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Status Pengingat
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-32 text-center text-xs"
                    >
                      Tidak ada data kendaraan yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const isSelected = selectedIds.includes(vehicle.vehicleId);
                    const isCritical = vehicle.daysSinceLastVisit >= 30;

                    const formattedDate = new Date(
                      vehicle.lastVisitAt
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <TableRow
                        key={vehicle.vehicleId}
                        className={isSelected ? "bg-primary/5" : undefined}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            disabled={vehicle.alreadyRemindedThisMonth}
                            onCheckedChange={() =>
                              handleToggleOne(vehicle.vehicleId)
                            }
                            aria-label={`Pilih ${vehicle.licensePlate}`}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black">
                              {formatLicensePlate(vehicle.licensePlate)}
                            </span>
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] font-bold"
                            >
                              {vehicle.vehicleCategory === "CAR"
                                ? "Mobil"
                                : "Motor"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            {[vehicle.brand, vehicle.model, vehicle.color]
                              .filter(Boolean)
                              .join(" ") || "Tanpa rincian"}
                          </p>
                        </TableCell>

                        <TableCell>
                          <div className="text-foreground text-xs font-bold">
                            {vehicle.customerName}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                            <MessageSquare className="h-3 w-3 text-emerald-500" />
                            <span>{vehicle.customerPhone}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-[10px] font-black ${
                                isCritical
                                  ? "bg-destructive text-destructive-foreground"
                                  : "border-amber-500/30 bg-amber-500/20 text-amber-600"
                              }`}
                            >
                              {vehicle.daysSinceLastVisit} Hari Lalu
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-[11px]">
                            {formattedDate} •{" "}
                            {vehicle.lastServiceName || "Cuci Reguler"}
                          </p>
                        </TableCell>

                        <TableCell>
                          {vehicle.alreadyRemindedThisMonth ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Terkirim Bulan Ini
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-slate-300 bg-slate-100 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              Belum Dihubungi
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              isPending || vehicle.alreadyRemindedThisMonth
                            }
                            onClick={() => handleSendSingle(vehicle)}
                            className="h-8 border-emerald-500/40 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                          >
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            Kirim WA
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
