"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Bluetooth,
  Calculator,
  CheckCircle2,
  Coins,
  FileText,
  Layers,
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
import {
  type ShiftXReportData,
  type ShiftZReportData,
  buildXReportReceipt,
  buildZReportReceipt,
  printRawTextViaBluetooth,
} from "@/lib/printer/escpos";

interface CashierReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  outletName: string;
  cashierName: string;
  shiftName: string;
  openingCashFloat: number;
  cashCollected: number;
  todayPaidIn?: number;
  todayPaidOut?: number;
  qrisCollected: number;
  transferCollected: number;
  transactionsCount: number;
  onOpeningFloatUpdated?: (newFloat: number) => void;
}

interface DenominationItem {
  key: string;
  label: string;
  nominal: number;
  color: string;
}

const INDO_DENOMINATIONS: DenominationItem[] = [
  {
    key: "100k",
    label: "Rp 100.000",
    nominal: 100000,
    color: "text-rose-600 bg-rose-500/10 border-rose-500/20",
  },
  {
    key: "50k",
    label: "Rp 50.000",
    nominal: 50000,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "20k",
    label: "Rp 20.000",
    nominal: 20000,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "10k",
    label: "Rp 10.000",
    nominal: 10000,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "5k",
    label: "Rp 5.000",
    nominal: 5000,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "2k",
    label: "Rp 2.000",
    nominal: 2000,
    color: "text-slate-600 bg-slate-500/10 border-slate-500/20",
  },
  {
    key: "1k",
    label: "Rp 1.000",
    nominal: 1000,
    color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    key: "coin",
    label: "Koin / Receh",
    nominal: 1000,
    color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20",
  },
];

export function CashierReconciliationDialog({
  open,
  onOpenChange,
  outletId,
  outletName,
  cashierName,
  shiftName,
  openingCashFloat,
  cashCollected,
  todayPaidIn = 0,
  todayPaidOut = 0,
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

  // States modal awal & input fisik
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(
    openingCashFloat || 0
  );
  const [closingNotes, setClosingNotes] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [finalReport, setFinalReport] =
    useState<ShiftReconciliationReport | null>(null);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [isPrintingBt, setIsPrintingBt] = useState(false);

  // Denominasi Lembaran
  const [useDenominations, setUseDenominations] = useState<boolean>(true);
  const [denominationCounts, setDenominationCounts] = useState<
    Record<string, number>
  >({
    "100k": 0,
    "50k": 0,
    "20k": 0,
    "10k": 0,
    "5k": 0,
    "2k": 0,
    "1k": 0,
    coin: 0,
  });
  const [manualCashInput, setManualCashInput] = useState<string>(
    String(openingCashFloat + cashCollected + todayPaidIn - todayPaidOut)
  );

  const nonCashCollected = qrisCollected + transferCollected;
  const totalOmzet = cashCollected + nonCashCollected;
  const currentFloat = openingCashFloat || openingFloatInput || 0;
  const expectedCashInDrawer =
    currentFloat + cashCollected + todayPaidIn - todayPaidOut;

  // Total uang dari pecahan lembaran
  const totalFromDenominations = useMemo(() => {
    return INDO_DENOMINATIONS.reduce((sum, item) => {
      const count = denominationCounts[item.key] || 0;
      return sum + count * item.nominal;
    }, 0);
  }, [denominationCounts]);

  const physicalCashNumber = useMemo(() => {
    if (useDenominations) return totalFromDenominations;
    const parsed = Number(manualCashInput.replace(/[^0-9]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }, [useDenominations, totalFromDenominations, manualCashInput]);

  const discrepancy = physicalCashNumber - expectedCashInDrawer;

  const handleUpdateDenomination = (key: string, count: number) => {
    const val = Math.max(0, isNaN(count) ? 0 : count);
    setDenominationCounts((prev) => ({ ...prev, [key]: val }));
  };

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
      setManualCashInput(
        String(openingFloatInput + cashCollected + todayPaidIn - todayPaidOut)
      );
      setMode("RECONCILE");
      router.refresh();
    });
  };

  // Handle Tutup Shift & Rekonsiliasi Kasir
  const handleCloseShift = () => {
    if (discrepancy !== 0 && !discrepancyReason.trim()) {
      toast.error(
        `Terdapat selisih kas sebesar ${formatRupiah(Math.abs(discrepancy))}. Harap isi alasan selisih kas fisik sebelum menutup shift.`
      );
      return;
    }

    startTransition(async () => {
      const res = await closeCashierShiftAction({
        outletId,
        openingAmount: currentFloat,
        physicalCashCounted: physicalCashNumber,
        notes: closingNotes || undefined,
        denominations: useDenominations ? denominationCounts : undefined,
        discrepancyReason:
          discrepancy !== 0 ? discrepancyReason.trim() : undefined,
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

  // Cetak X-Report Interim (Sementara di tengah hari tanpa menutup shift)
  const handlePrintXReport = () => {
    const xData: ShiftXReportData = {
      outletName,
      cashierName,
      shiftName,
      printedAt: new Date().toISOString(),
      transactionsCount,
      openingAmount: currentFloat,
      cashPayments: cashCollected,
      paidInAmount: todayPaidIn,
      paidOutAmount: todayPaidOut,
      expectedDrawerCash: expectedCashInDrawer,
      qrisPayments: qrisCollected,
      transferPayments: transferCollected,
      nonCashPayments: nonCashCollected,
      totalRevenue: totalOmzet,
    };
    const col = paperWidth === "58mm" ? 32 : 48;
    const text = buildXReportReceipt(xData, col);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up browser terblokir. Izinkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>X-Report Audit Kasir - ${cashierName}</title>
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

  // Generate plain text report Z-Report untuk struk thermal
  const zReportReceiptText = useMemo(() => {
    if (!finalReport) return "";
    const col = paperWidth === "58mm" ? 32 : 48;
    const zData: ShiftZReportData = {
      outletName,
      cashierName: finalReport.cashierName,
      shiftName,
      closedAt: finalReport.closedAt,
      transactionsCount: finalReport.transactionsCount,
      openingAmount: finalReport.openingAmount,
      cashPayments: finalReport.cashPayments,
      paidInAmount: finalReport.paidInAmount,
      paidOutAmount: finalReport.paidOutAmount,
      expectedDrawerCash: finalReport.expectedDrawerCash,
      physicalCashCounted: finalReport.physicalCashCounted,
      discrepancy: finalReport.discrepancy,
      discrepancyStatus: finalReport.discrepancyStatus,
      discrepancyReason: finalReport.discrepancyReason,
      qrisPayments: finalReport.qrisPayments,
      transferPayments: finalReport.transferPayments,
      nonCashPayments: finalReport.nonCashPayments,
      totalRevenue: finalReport.totalRevenue,
      denominations: finalReport.denominations,
    };
    return buildZReportReceipt(zData, col);
  }, [finalReport, outletName, shiftName, paperWidth]);

  const handlePrintReport = () => {
    if (!zReportReceiptText) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up browser terblokir. Izinkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z-Report Tutup Shift - ${finalReport?.cashierName}</title>
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
        <body>${zReportReceiptText}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleBluetoothPrint = async () => {
    if (!zReportReceiptText) return;
    setIsPrintingBt(true);
    const res = await printRawTextViaBluetooth(zReportReceiptText, false);
    setIsPrintingBt(false);

    if (res.success) {
      toast.success(
        `Z-Report ${paperWidth} berhasil dikirim ke printer Bluetooth!`
      );
    } else {
      toast.error(res.error || "Gagal mencetak via Bluetooth.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black sm:text-lg">
                {mode === "EDIT_FLOAT"
                  ? "Pencatatan Modal Awal Kasir"
                  : mode === "REPORT_VIEW"
                    ? "Laporan Z-Report Rekonsiliasi Kasir"
                    : "Rekonsiliasi Laci Kas & Tutup Shift (Z-Report)"}
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
            {/* Kartu Ringkasan Posisi Kas & Petty Cash */}
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

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Petty Cash
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  +{formatRupiah(todayPaidIn)}
                </span>
                <span className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  -{formatRupiah(todayPaidOut)}
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
                  QRIS: {formatRupiah(qrisCollected)}
                </span>
              </div>
            </div>

            {/* Kotak Perhitungan Kas Fisik Laci */}
            <div className="bg-card space-y-3 rounded-2xl border-2 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="text-foreground text-xs font-black uppercase">
                    Target Kas Fisik di Laci (Seharusnya)
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Modal ({formatRupiah(currentFloat)}) + Tunai (
                    {formatRupiah(cashCollected)}) + In (
                    {formatRupiah(todayPaidIn)}) - Out (
                    {formatRupiah(todayPaidOut)})
                  </p>
                </div>
                <span className="text-foreground text-base font-black">
                  {formatRupiah(expectedCashInDrawer)}
                </span>
              </div>

              {/* Toggle Opsi: Kalkulator Pecahan vs Input Manual */}
              <div className="flex items-center justify-between">
                <span className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                  <Coins className="text-primary h-4 w-4" />
                  <span>Kalkulasi Uang Fisik di Laci</span>
                </span>
                <div className="bg-muted/30 flex rounded-lg border p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUseDenominations(true)}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      useDenominations
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Pecahan Lembaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseDenominations(false)}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      !useDenominations
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Input Total Saja
                  </button>
                </div>
              </div>

              {/* 1. Grid Kalkulator Denominasi Pecahan Uang Lembaran */}
              {useDenominations ? (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {INDO_DENOMINATIONS.map((d) => {
                      const count = denominationCounts[d.key] || 0;
                      const subtotal = count * d.nominal;
                      return (
                        <div
                          key={d.key}
                          className="bg-muted/20 focus-within:border-primary rounded-xl border p-2 text-xs transition-colors"
                        >
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-[11px] font-bold">
                              {d.label}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {count > 0 ? `${count} lbr` : "0"}
                            </span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={count || ""}
                            onChange={(e) =>
                              handleUpdateDenomination(
                                d.key,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="h-8 font-mono text-xs font-bold"
                          />
                          <span className="text-muted-foreground mt-1 block text-right font-mono text-[10px] font-semibold">
                            {formatRupiah(subtotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-muted/50 flex items-center justify-between rounded-xl px-3 py-2 text-xs">
                    <span className="text-muted-foreground font-bold">
                      Total Hasil Hitung Pecahan:
                    </span>
                    <span className="text-foreground font-mono text-base font-black">
                      {formatRupiah(totalFromDenominations)}
                    </span>
                  </div>
                </div>
              ) : (
                /* 2. Input Manual Total Langsung */
                <div className="space-y-1.5 pt-1">
                  <label className="text-foreground flex items-center justify-between text-xs font-bold">
                    <span>Total Fisik Kas di Laci (Rp)</span>
                    <span className="text-muted-foreground text-[11px] font-normal">
                      Hitung manual keseluruhan kas
                    </span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={manualCashInput}
                      onChange={(e) => setManualCashInput(e.target.value)}
                      className="h-12 pr-10 text-xl font-black tracking-wide"
                    />
                    <Wallet className="text-muted-foreground absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2" />
                  </div>
                </div>
              )}

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

              {/* Field Wajib: Alasan Selisih bila Kas Tidak Seimbang */}
              {discrepancy !== 0 && (
                <div className="border-destructive/30 bg-destructive/5 space-y-1.5 rounded-xl border p-3">
                  <label className="text-destructive flex items-center gap-1.5 text-xs font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Alasan Selisih Kas (Wajib Diisi)*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder={
                      discrepancy > 0
                        ? "Contoh: Ada tip pelanggan tidak tercatat / kelebihan uang masuk"
                        : "Contoh: Salah kembalian struk #005 / selisih receh koin"
                    }
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    className="border-destructive/40 h-9 text-xs font-medium"
                  />
                </div>
              )}
            </div>

            {/* Catatan Penutupan */}
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs font-semibold">
                Catatan Serah Terima / Closing Shift (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Contoh: Diserahkan ke kasir shift sore, printer siap..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="h-10 text-xs"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintXReport}
                className="h-11 gap-1.5 border-amber-500/30 bg-amber-500/5 text-xs font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak X-Report (Cek Sementara)</span>
              </Button>

              <div className="flex flex-1 gap-2">
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
                    "Tutup Shift & Z-Report"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODE 3: PRATINJAU STRUK REKONSILIASI ----------------- */}
        {mode === "REPORT_VIEW" && finalReport && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <p className="font-bold">
                  Shift Berhasil Ditutup & Z-Report Terbit!
                </p>
                <p className="text-[11px] opacity-90">
                  Data rekonsiliasi dan rincian pecahan fisik telah dicatat ke
                  audit log platform.
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
              {zReportReceiptText}
            </div>

            {/* Tombol Cetak & Selesai */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReport}
                className="h-11 gap-2 text-xs font-bold"
              >
                <Printer className="text-primary h-4 w-4" />
                <span>Cetak USB / PC</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isPrintingBt}
                onClick={handleBluetoothPrint}
                className="h-11 gap-2 text-xs font-bold"
              >
                <Bluetooth className="h-4 w-4 text-blue-500" />
                <span>{isPrintingBt ? "Koneksi..." : "Thermal Bluetooth"}</span>
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
