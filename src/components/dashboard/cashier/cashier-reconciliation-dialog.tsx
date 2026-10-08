"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Coins,
  FileText,
  Loader2,
  Printer,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  type ShiftReconciliationReport,
  closeCashierShiftAction,
  recordOpeningDrawerFloatAction,
} from "@/actions/pos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";

interface CashierReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  outletName: string;
  cashierName: string;
  shiftName: string;
  openingCashFloat: number;
  cashCollected: number;
  qrisCollected: number;
  transferCollected: number;
  transactionsCount: number;
  onOpeningFloatUpdated?: (newFloat: number) => void;
}

export function CashierReconciliationDialog({
  open,
  onOpenChange,
  outletId,
  outletName,
  cashierName,
  shiftName,
  openingCashFloat,
  cashCollected,
  qrisCollected,
  transferCollected,
  transactionsCount,
  onOpeningFloatUpdated,
}: CashierReconciliationDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mode: "RECONCILE" (Tutup shift) | "EDIT_FLOAT" (Set modal awal) | "REPORT_VIEW" (Hasil tutup shift)
  const [mode, setMode] = useState<"RECONCILE" | "EDIT_FLOAT" | "REPORT_VIEW">(
    "RECONCILE"
  );

  // States
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(
    openingCashFloat || 0
  );
  const [physicalCashInput, setPhysicalCashInput] = useState<string>(
    String(openingCashFloat + cashCollected)
  );
  const [closingNotes, setClosingNotes] = useState("");
  const [finalReport, setFinalReport] =
    useState<ShiftReconciliationReport | null>(null);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");

  const nonCashCollected = qrisCollected + transferCollected;
  const totalOmzet = cashCollected + nonCashCollected;
  const currentFloat = openingCashFloat || openingFloatInput || 0;
  const expectedCashInDrawer = currentFloat + cashCollected;

  const physicalCashNumber = useMemo(() => {
    const parsed = Number(physicalCashInput.replace(/[^0-9]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }, [physicalCashInput]);

  const discrepancy = physicalCashNumber - expectedCashInDrawer;

  // Handle Simpan / Ubah Modal Awal
  const handleSaveOpeningFloat = () => {
    if (openingFloatInput < 0) {
      toast.error("Modal awal tidak boleh bernilai negatif.");
      return;
    }

    startTransition(async () => {
      const res = await recordOpeningDrawerFloatAction({
        outletId,
        openingAmount: openingFloatInput,
        notes: `Modal awal kasir shift ${shiftName}`,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal menyimpan modal awal.");
        return;
      }

      toast.success(
        `Modal awal kasir sebesar ${formatRupiah(openingFloatInput)} berhasil dicatat!`
      );
      onOpeningFloatUpdated?.(openingFloatInput);
      setPhysicalCashInput(String(openingFloatInput + cashCollected));
      setMode("RECONCILE");
      router.refresh();
    });
  };

  // Handle Tutup Shift & Rekonsiliasi Kasir
  const handleCloseShift = () => {
    startTransition(async () => {
      const res = await closeCashierShiftAction({
        outletId,
        openingAmount: currentFloat,
        physicalCashCounted: physicalCashNumber,
        notes: closingNotes || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal memproses penutupan shift kasir.");
        return;
      }

      setFinalReport(res.data);
      setMode("REPORT_VIEW");
      toast.success("Shift kasir berhasil ditutup & rekonsiliasi tersimpan!");
      router.refresh();
    });
  };

  // Generate plain text report untuk cetak struk thermal
  const generateReceiptText = (report: ShiftReconciliationReport) => {
    const col = paperWidth === "58mm" ? 32 : 48;
    const divider = "-".repeat(col);
    const doubleDivider = "=".repeat(col);

    const padRow = (left: string, right: string) => {
      const spaces = Math.max(1, col - left.length - right.length);
      return left + " ".repeat(spaces) + right;
    };

    const dateStr = new Date(report.closedAt).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const lines: string[] = [
      doubleDivider,
      outletName.toUpperCase().slice(0, col),
      "LAPORAN REKONSILIASI SHIFT KASIR",
      doubleDivider,
      padRow("Kasir", report.cashierName),
      padRow("Shift", shiftName),
      padRow("Waktu Tutup", dateStr),
      padRow("Total Transaksi", `${report.transactionsCount} Struk`),
      divider,
      padRow("1. Modal Awal Laci", formatRupiah(report.openingAmount)),
      padRow("2. Penerimaan Tunai", formatRupiah(report.cashPayments)),
      padRow(
        "   Kas Fisik Seharusnya",
        formatRupiah(report.expectedDrawerCash)
      ),
      padRow(
        "3. Kas Fisik Terhitung",
        formatRupiah(report.physicalCashCounted)
      ),
      divider,
      padRow(
        "STATUS SELISIH FISIK",
        report.discrepancy === 0
          ? "SEIMBANG (0)"
          : report.discrepancy > 0
            ? `LEBIH (+${formatRupiah(report.discrepancy)})`
            : `KURANG (${formatRupiah(report.discrepancy)})`
      ),
      divider,
      padRow("Penerimaan QRIS", formatRupiah(report.qrisPayments)),
      padRow("Penerimaan Transfer", formatRupiah(report.transferPayments)),
      padRow("Total Non-Tunai", formatRupiah(report.nonCashPayments)),
      doubleDivider,
      padRow("TOTAL OMSET SHIFT", formatRupiah(report.totalRevenue)),
      doubleDivider,
      "",
      padRow("Kasir Bertugas", "Supervisor/Owner"),
      "",
      "",
      padRow(`(${report.cashierName})`, "(..................)"),
      doubleDivider,
    ];

    return lines.join("\n");
  };

  const handlePrintReport = () => {
    if (!finalReport) return;
    const text = generateReceiptText(finalReport);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up browser terblokir. Izinkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rekonsiliasi Kasir - ${finalReport.cashierName}</title>
          <style>
            @page { size: ${paperWidth} auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === "58mm" ? "11px" : "13px"};
              width: ${paperWidth};
              margin: 0;
              padding: 8px;
              white-space: pre-wrap;
              line-height: 1.25;
            }
          </style>
        </head>
        <body>${text}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-4 sm:max-w-xl sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black sm:text-lg">
                {mode === "EDIT_FLOAT"
                  ? "Pencatatan Modal Awal Kasir"
                  : mode === "REPORT_VIEW"
                    ? "Laporan Rekonsiliasi Selesai"
                    : "Rekonsiliasi Laci Kas & Tutup Shift"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {outletName} • {shiftName} • {cashierName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ----------------- MODE 1: EDIT MODAL AWAL ----------------- */}
        {mode === "EDIT_FLOAT" && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
              <p className="font-semibold">
                Modal Awal (*Cash in Drawer Float*):
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">
                Uang receh pecahan kecil yang disiapkan di awal shift kerja
                sebagai uang kembalian pelanggan.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Nominal Modal Awal (Rp)
              </label>
              <Input
                type="number"
                min="0"
                step="5000"
                value={openingFloatInput}
                onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                className="h-12 text-lg font-black"
                placeholder="Contoh: 150000"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[50000, 100000, 150000, 200000, 300000].map((nominal) => (
                  <Button
                    key={nominal}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpeningFloatInput(nominal)}
                    className="h-7 text-[11px] font-semibold"
                  >
                    {formatRupiah(nominal)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("RECONCILE")}
                className="h-11 flex-1 text-xs font-semibold"
              >
                Kembali
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleSaveOpeningFloat}
                className="h-11 flex-1 text-xs font-bold"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Simpan Modal Awal"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ----------------- MODE 2: REKONSILIASI KASIR ----------------- */}
        {mode === "RECONCILE" && (
          <div className="space-y-4 py-2">
            {/* Kartu Ringkasan Posisi Kas */}
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="bg-muted/40 rounded-xl border p-2.5">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Modal Awal
                </span>
                <span className="text-foreground text-sm font-black">
                  {formatRupiah(currentFloat)}
                </span>
                <button
                  type="button"
                  onClick={() => setMode("EDIT_FLOAT")}
                  className="text-primary mt-1 block text-[10px] font-bold hover:underline"
                >
                  Ubah Modal
                </button>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Tunai Masuk
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(cashCollected)}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  {transactionsCount} Transaksi
                </span>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Non-Tunai
                </span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                  {formatRupiah(nonCashCollected)}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  QRIS + Transfer
                </span>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Total Omset
                </span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                  {formatRupiah(totalOmzet)}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  Shift Ini
                </span>
              </div>
            </div>

            {/* Kotak Perhitungan Kas Fisik Laci */}
            <div className="bg-card space-y-3 rounded-2xl border-2 p-3.5">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="text-foreground text-xs font-black uppercase">
                    Target Kas Fisik di Laci
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Modal Awal ({formatRupiah(currentFloat)}) + Penerimaan Tunai
                    ({formatRupiah(cashCollected)})
                  </p>
                </div>
                <span className="text-foreground text-base font-black">
                  {formatRupiah(expectedCashInDrawer)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-foreground flex items-center justify-between text-xs font-bold">
                  <span>Hitungan Fisik Uang di Laci Saat Ini (Rp)</span>
                  <span className="text-muted-foreground text-[11px] font-normal">
                    Hitung manual uang kertas & koin
                  </span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={physicalCashInput}
                    onChange={(e) => setPhysicalCashInput(e.target.value)}
                    className="h-13 pr-10 text-xl font-black tracking-wide"
                  />
                  <Wallet className="text-muted-foreground absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2" />
                </div>
              </div>

              {/* Status Selisih (Discrepancy) Real-time */}
              <div
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  discrepancy === 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : discrepancy > 0
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                <div className="flex items-center gap-2">
                  {discrepancy === 0 ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-black uppercase">
                      {discrepancy === 0
                        ? "Kas Klop / Seimbang"
                        : discrepancy > 0
                          ? "Surplus Kas (Uang Lebih)"
                          : "Defisit Kas (Uang Kurang)"}
                    </span>
                    <p className="text-[11px] opacity-90">
                      {discrepancy === 0
                        ? "Jumlah fisik laci cocok persis dengan rekapan sistem."
                        : discrepancy > 0
                          ? "Ada kelebihan fisik uang di laci kasir."
                          : "Ada kekurangan fisik uang di laci kasir."}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black">
                  {discrepancy === 0
                    ? "Rp 0"
                    : discrepancy > 0
                      ? `+${formatRupiah(discrepancy)}`
                      : formatRupiah(discrepancy)}
                </span>
              </div>
            </div>

            {/* Catatan Penutupan */}
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs font-semibold">
                Catatan Serah Terima / Closing Shift (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Contoh: Diserahkan ke kasir shift siang, ada uang receh pecahan 2rb..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="h-10 text-xs"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleCloseShift}
                className="bg-primary text-primary-foreground h-11 flex-1 text-xs font-extrabold shadow-md"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Tutup Shift & Rekonsiliasi"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ----------------- MODE 3: PRATINJAU STRUK REKONSILIASI ----------------- */}
        {mode === "REPORT_VIEW" && finalReport && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <p className="font-bold">Shift Berhasil Ditutup!</p>
                <p className="text-[11px] opacity-90">
                  Data rekonsiliasi telah tercatat ke audit trail platform
                  Kinclongin.
                </p>
              </div>
            </div>

            {/* Pilihan Lebar Kertas Struk 58mm / 80mm */}
            <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-1.5 text-xs font-semibold">
              <span className="text-muted-foreground pl-2 text-[11px]">
                Format Cetak:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    paperWidth === "58mm"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  58 mm (Standar)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    paperWidth === "80mm"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  80 mm (Lebar)
                </button>
              </div>
            </div>

            {/* Preview Struk Rekonsiliasi Monospace */}
            <div className="bg-muted/40 text-foreground max-h-72 overflow-x-auto overflow-y-auto rounded-xl border p-3.5 font-mono text-[11px] leading-tight whitespace-pre shadow-inner select-all">
              {generateReceiptText(finalReport)}
            </div>

            {/* Tombol Cetak & Selesai */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReport}
                className="h-11 gap-2 text-xs font-bold"
              >
                <Printer className="text-primary h-4 w-4" />
                <span>Cetak Struk Rekonsiliasi</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setMode("RECONCILE");
                }}
                className="h-11 text-xs font-extrabold"
              >
                <span>Selesai & Keluar</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
