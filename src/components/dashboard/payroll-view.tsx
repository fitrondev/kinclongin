"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Printer,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  type WasherPayrollSummary,
  markCommissionsPaidAction,
} from "@/actions/payroll";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  formatLicensePlate,
  formatRupiah,
  formatTanggalIndo,
} from "@/lib/formatters";

interface PayrollViewProps {
  initialSummary: {
    totalUnpaid: number;
    totalPaid: number;
    totalVehicles: number;
    washers: WasherPayrollSummary[];
  };
  outletName: string;
}

export function PayrollView({ initialSummary, outletName }: PayrollViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedWasherFilter, setSelectedWasherFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [activeWasherDetail, setActiveWasherDetail] =
    useState<WasherPayrollSummary | null>(null);

  // State Dialog Cetak Slip Komisi (Task 6.5)
  const [slipTarget, setSlipTarget] = useState<WasherPayrollSummary | null>(
    null
  );
  const slipPrintRef = useRef<HTMLDivElement>(null);

  // Filter washer
  const filteredWashers = useMemo(() => {
    return initialSummary.washers.filter((w) => {
      const matchFilter =
        selectedWasherFilter === "ALL" || w.washerId === selectedWasherFilter;
      const matchQuery =
        !searchQuery.trim() ||
        w.washerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [initialSummary.washers, selectedWasherFilter, searchQuery]);

  // Cairkan seluruh komisi belum dibayar untuk washer terpilih
  const handlePayWasher = (washer: WasherPayrollSummary) => {
    const unpaidItemIds = washer.items
      .filter((i) => i.paidAt === null)
      .map((i) => i.id);

    if (unpaidItemIds.length === 0) {
      toast.info(`Seluruh komisi ${washer.washerName} sudah lunas dicairkan.`);
      return;
    }

    startTransition(async () => {
      const res = await markCommissionsPaidAction(unpaidItemIds);
      if (!res.success) {
        toast.error(res.error || "Gagal mencairkan komisi.");
        return;
      }

      toast.success(
        `Sukses! Komisi ${washer.washerName} sebesar ${formatRupiah(
          washer.unpaidAmount
        )} (${res.data?.count} tiket) berhasil ditandai telah dibayar!`
      );
      // Buka otomatis slip pencairan komisi untuk dicetak
      setSlipTarget(washer);
      router.refresh();
      if (activeWasherDetail?.washerId === washer.washerId) {
        setActiveWasherDetail(null);
      }
    });
  };

  // Handler cetak slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Ekspor Rekapitulasi ke Excel (.xlsx) dengan dynamic import
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import("xlsx");
      const rows: Array<Record<string, string | number>> = [];
      initialSummary.washers.forEach((w) => {
        w.items.forEach((item) => {
          rows.push({
            "Nama Tukang Cuci": w.washerName,
            "Nomor Tiket": item.ticketNumber,
            "Plat Nomor": item.licensePlate,
            "Paket Layanan": item.serviceName,
            "Skema Pengerjaan": item.isShared
              ? "Berdua (50%)"
              : "Mandiri (100%)",
            "Nominal Komisi": item.commissionAmount,
            "Status Gaji": item.paidAt ? "Sudah Dibayar" : "Belum Dicairkan",
            "Waktu Pengerjaan": new Date(item.createdAt).toLocaleString(
              "id-ID"
            ),
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Komisi Cuci");

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(
        workbook,
        `Rekap_Komisi_${outletName.replace(/\s+/g, "_")}_${dateStr}.xlsx`
      );
      toast.success("Rekapitulasi komisi berhasil diekspor ke Excel!");
    } catch (err) {
      console.error("Gagal export excel:", err);
      toast.error("Gagal mengekspor berkas Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
            Rekapitulasi Gaji & Komisi Tukang Cuci
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Laporan transparansi bagi hasil pengerjaan cuci mandiri dan tandem
            berbasis PIN, pencairan komisi, dan cetak slip tanda terima.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="h-9 w-full justify-center gap-1.5 text-xs font-bold shadow-xs sm:w-auto"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Download className="h-4 w-4 text-emerald-600" />
            )}
            <span>
              {isExporting ? "Mengekspor..." : "Ekspor Excel (.xlsx)"}
            </span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="bg-card min-w-0 border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Komisi Belum Dicairkan
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="truncate text-xl font-black text-amber-600 sm:text-2xl dark:text-amber-400">
              {formatRupiah(initialSummary.totalUnpaid)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Menunggu pembayaran ke pekerja
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card min-w-0 border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Komisi Telah Dibayar
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="truncate text-xl font-black text-emerald-600 sm:text-2xl dark:text-emerald-400">
              {formatRupiah(initialSummary.totalPaid)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Total riwayat komisi terselesaikan
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card min-w-0 border shadow-xs sm:col-span-2 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Total Order Tercatat
            </span>
            <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-foreground truncate text-xl font-black sm:text-2xl">
              {initialSummary.totalVehicles}{" "}
              <span className="text-muted-foreground text-sm font-semibold">
                Pengerjaan
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {initialSummary.washers.length} tukang cuci aktif di cabang
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card flex flex-col items-stretch justify-between gap-3 rounded-2xl border p-3 shadow-xs sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Cari nama pekerja cuci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9.5 text-xs"
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select
            value={selectedWasherFilter}
            onChange={(e) => setSelectedWasherFilter(e.target.value)}
            className="bg-background focus:ring-primary/20 h-10 w-full rounded-xl border px-3 text-xs font-semibold focus:ring-2 focus:outline-none sm:w-auto"
          >
            <option value="ALL">Semua Pekerja Cuci</option>
            {initialSummary.washers.map((w) => (
              <option key={w.washerId} value={w.washerId}>
                {w.washerName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Rincian Komisi per Washer */}
      <Card className="bg-card border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b text-[10px] font-bold uppercase">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">
                    Nama Tukang Cuci
                  </th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">
                    Total Mobil/Motor
                  </th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">
                    Mandiri (100%)
                  </th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">
                    Tandem (50%)
                  </th>
                  <th className="px-5 py-3 whitespace-nowrap">Sudah Dibayar</th>
                  <th className="px-5 py-3 whitespace-nowrap">
                    Belum Dicairkan
                  </th>
                  <th className="px-5 py-3 text-right whitespace-nowrap">
                    Aksi Payroll
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWashers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center"
                    >
                      Tidak ada data komisi yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredWashers.map((w) => (
                    <tr
                      key={w.washerId}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-foreground px-5 py-4 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold">
                            {w.washerName.slice(0, 1)}
                          </div>
                          <span>{w.washerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-bold whitespace-nowrap">
                        {w.totalVehicles} Unit
                      </td>
                      <td className="text-muted-foreground px-5 py-4 text-center whitespace-nowrap">
                        {w.soloCount}
                      </td>
                      <td className="text-muted-foreground px-5 py-4 text-center whitespace-nowrap">
                        {w.tandemCount}
                      </td>
                      <td className="px-5 py-4 font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(w.paidAmount)}
                      </td>
                      <td className="px-5 py-4 font-black whitespace-nowrap text-amber-600 dark:text-amber-400">
                        {formatRupiah(w.unpaidAmount)}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveWasherDetail(w)}
                            className="h-8 gap-1 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Rincian</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSlipTarget(w)}
                            className="h-8 gap-1 text-xs font-semibold"
                            title="Cetak Slip Komisi"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Slip</span>
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPending || w.unpaidAmount === 0}
                            onClick={() => handlePayWasher(w)}
                            className="h-8 gap-1 bg-amber-600 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
                          >
                            {isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Cairkan Gaji</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* MODAL DETAIL TIKET PENGERJAAN PEKERJA */}
      {/* ------------------------------------------------------------- */}
      {activeWasherDetail && (
        <Dialog
          open={!!activeWasherDetail}
          onOpenChange={(open) => !open && setActiveWasherDetail(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex flex-col gap-1 text-base font-black sm:flex-row sm:items-center sm:justify-between">
                <span>Rincian Pengerjaan: {activeWasherDetail.washerName}</span>
                <span className="font-black text-amber-600">
                  Tertunda: {formatRupiah(activeWasherDetail.unpaidAmount)}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Daftar kendaraan dan pembagian komisi yang dikerjakan oleh
                pekerja ini.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-96 divide-y overflow-y-auto rounded-xl border text-xs">
              {activeWasherDetail.items.map((item) => (
                <div
                  key={item.id}
                  className="hover:bg-muted/40 flex items-center justify-between p-3 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-foreground font-mono text-sm font-extrabold">
                        {formatLicensePlate(item.licensePlate)}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        #{item.ticketNumber}
                      </span>
                      <Badge
                        variant={item.isShared ? "outline" : "secondary"}
                        className="h-4 px-1 py-0 text-[10px] font-semibold"
                      >
                        {item.isShared ? "Tandem 50%" : "Mandiri 100%"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {item.serviceName} &bull;{" "}
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-foreground font-bold">
                      {formatRupiah(item.commissionAmount)}
                    </div>
                    <span
                      className={`flex items-center justify-end gap-1 text-[10px] font-bold ${
                        item.paidAt ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {item.paidAt ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>Telah Dicairkan</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>Belum Dibayar</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setActiveWasherDetail(null)}
              >
                Tutup
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSlipTarget(activeWasherDetail);
                    setActiveWasherDetail(null);
                  }}
                  className="gap-1.5 font-bold"
                >
                  <Printer className="h-4 w-4" />
                  <span>Lihat Slip Komisi</span>
                </Button>
                <Button
                  size="sm"
                  disabled={isPending || activeWasherDetail.unpaidAmount === 0}
                  onClick={() => handlePayWasher(activeWasherDetail)}
                  className="w-full gap-1.5 bg-amber-600 font-bold text-white hover:bg-amber-700 sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Cairkan {formatRupiah(activeWasherDetail.unpaidAmount)}{" "}
                    Sekarang
                  </span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL CETAK SLIP KOMISI WASHER (TASK 6.5) */}
      {/* ------------------------------------------------------------- */}
      {slipTarget && (
        <Dialog
          open={!!slipTarget}
          onOpenChange={(open) => !open && setSlipTarget(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black">
                <FileText className="text-primary h-5 w-5" />
                <span>Slip Tanda Terima Komisi Cuci</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Bukti pembayaran gaji dan komisi pengerjaan kendaraan.
              </DialogDescription>
            </DialogHeader>

            {/* Area Printable Slip */}
            <div
              ref={slipPrintRef}
              className="bg-card text-foreground space-y-4 rounded-xl border p-5 font-mono text-xs shadow-inner"
            >
              {/* Header Slip */}
              <div className="border-b pb-3 text-center">
                <h3 className="text-sm font-black tracking-wider uppercase">
                  {outletName}
                </h3>
                <p className="text-muted-foreground text-[10px]">
                  BUKTI PENCAIRAN KOMISI PEKERJA CUCI
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Dicetak: {formatTanggalIndo(new Date())} -{" "}
                  {new Date().toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </p>
              </div>

              {/* Data Pekerja */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    Nama Pekerja:
                  </span>
                  <strong className="text-sm">{slipTarget.washerName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">
                    Total Kendaraan:
                  </span>
                  <strong>{slipTarget.totalVehicles} Unit</strong> (
                  {slipTarget.soloCount} Solo / {slipTarget.tandemCount} Tandem)
                </div>
              </div>

              {/* Rincian Pengerjaan */}
              <div className="max-h-48 divide-y overflow-y-auto border-y py-1 text-[10px]">
                {slipTarget.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div>
                      <span className="font-bold">
                        {formatLicensePlate(it.licensePlate)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        ({it.serviceName})
                      </span>
                      <div className="text-muted-foreground text-[9px]">
                        #{it.ticketNumber} &bull;{" "}
                        {it.isShared ? "Tandem 50%" : "Mandiri 100%"}
                      </div>
                    </div>
                    <div className="font-bold">
                      {formatRupiah(it.commissionAmount)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Komisi */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Telah Dicairkan:
                  </span>
                  <span className="font-bold text-emerald-600">
                    {formatRupiah(slipTarget.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Tertunda / Baru Dicairkan:
                  </span>
                  <span className="font-bold text-amber-600">
                    {formatRupiah(slipTarget.unpaidAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-black">
                  <span>TOTAL KOMISI:</span>
                  <span className="text-primary text-base">
                    {formatRupiah(
                      slipTarget.paidAmount + slipTarget.unpaidAmount
                    )}
                  </span>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-center text-[10px]">
                <div>
                  <p className="text-muted-foreground mb-10">Penerima Komisi</p>
                  <p className="font-bold underline">
                    ({slipTarget.washerName})
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-10">Kasir / Manajer</p>
                  <p className="font-bold underline">
                    (.......................)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSlipTarget(null)}
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={handlePrintSlip}
                className="gap-1.5 font-bold shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Slip (Print)</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
