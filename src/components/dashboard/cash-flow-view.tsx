"use client";

import { useState } from "react";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import type { CashFlowSummary } from "@/actions/owner";
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
import { formatRupiah } from "@/lib/formatters";

interface CashFlowViewProps {
  initialData: CashFlowSummary;
  outletName: string;
}

export function CashFlowView({ initialData, outletName }: CashFlowViewProps) {
  const [data, setData] = useState<CashFlowSummary>(initialData);
  const [filterType, setFilterType] = useState<"ALL" | "INFLOW" | "OUTFLOW">(
    "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = data.transactions.filter((t) => {
    if (filterType !== "ALL" && t.type !== filterType) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = [
      "ID",
      "Tanggal",
      "Tipe",
      "Kategori",
      "Deskripsi",
      "Metode",
      "Nominal",
    ];
    const rows = filteredTransactions.map((t) => [
      t.id,
      new Date(t.date).toLocaleDateString("id-ID"),
      t.type,
      `"${t.category}"`,
      `"${t.description}"`,
      t.paymentMethod,
      t.amount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `laporan-arus-kas-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan arus kas berhasil diekspor ke CSV!");
  };

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Laporan Arus Kas (Cash Flow)
            </h1>
            <Badge
              variant="outline"
              className="shrink-0 items-center gap-1 border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600"
            >
              <Crown className="h-3 w-3 text-amber-600" />
              <span>Khusus Owner</span>
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pantau pergerakan kas masuk dari pembayaran kasir dan kas keluar
            untuk belanja bahan serta komisi di {outletName}.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            onClick={exportCSV}
            variant="outline"
            className="h-10 w-full justify-center gap-2 rounded-xl text-xs font-bold shadow-xs sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* 4 Kartu KPI Arus Kas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Kas Masuk */}
        <Card className="min-w-0 border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-emerald-700 uppercase dark:text-emerald-300">
              Total Kas Masuk
            </CardTitle>
            <div className="shrink-0 rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
              <ArrowDownCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="truncate text-xl font-black tracking-tight text-emerald-700 sm:text-2xl dark:text-emerald-300">
              {formatRupiah(data.totalInflow)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Tunai, QRIS, & Transfer Kasir
            </p>
          </CardContent>
        </Card>

        {/* Total Kas Keluar */}
        <Card className="border-destructive/20 bg-destructive/5 min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-destructive text-xs font-bold uppercase">
              Total Kas Keluar
            </CardTitle>
            <div className="bg-destructive/10 text-destructive shrink-0 rounded-xl p-2">
              <ArrowUpCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-destructive truncate text-xl font-black tracking-tight sm:text-2xl">
              {formatRupiah(data.totalOutflow)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Bahan Cuci & Komisi Terbayar
            </p>
          </CardContent>
        </Card>

        {/* Arus Kas Bersih (Net Cash Flow) */}
        <Card
          className={`min-w-0 shadow-xs ${
            data.netCashFlow >= 0
              ? "border-blue-500/20 bg-blue-500/5"
              : "border-destructive/30 bg-destructive/10"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-blue-700 uppercase dark:text-blue-300">
              Arus Kas Bersih (Net)
            </CardTitle>
            <div className="shrink-0 rounded-xl bg-blue-500/10 p-2 text-blue-600">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`truncate text-xl font-black tracking-tight sm:text-2xl ${
                data.netCashFlow >= 0
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-destructive"
              }`}
            >
              {formatRupiah(data.netCashFlow)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              {data.netCashFlow >= 0 ? "Surplus Kas Positif" : "Defisit Kas"}
            </p>
          </CardContent>
        </Card>

        {/* Kas Tunai Fisik */}
        <Card className="border-border bg-card min-w-0 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-foreground text-xs font-bold uppercase">
              Uang Tunai di Laci Kas
            </CardTitle>
            <div className="bg-muted text-muted-foreground shrink-0 rounded-xl p-2">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground truncate text-xl font-black tracking-tight sm:text-2xl">
              {formatRupiah(data.cashBreakdown.cashIn)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Non-Tunai:{" "}
              {formatRupiah(
                data.cashBreakdown.qrisIn + data.cashBreakdown.bankTransferIn
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Laporan Laba Rugi Cabang (Branch P&L Statement) */}
      {data.pnl ? (
        <Card className="border-border bg-card overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary rounded-lg p-1.5">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">
                    Laporan Laba Rugi Cabang (P&L Income Statement)
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Kalkulasi margin kotor dan laba bersih operasional berdasarkan
                  HPP resep bahan kimia & kas keluar 30 hari terakhir.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary text-xs font-bold"
                >
                  Gross Margin: {data.pnl.grossMarginPercent}%
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    data.pnl.netOperatingProfit >= 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  Net Margin: {data.pnl.netMarginPercent}% (
                  {data.pnl.netOperatingProfit >= 0
                    ? "Surplus Profit"
                    : "Defisit"}
                  )
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-4 sm:p-6">
            {/* 4 Mini Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border-border bg-muted/20 rounded-xl border p-3">
                <p className="text-muted-foreground text-[11px] font-bold uppercase">
                  1. Total Pendapatan
                </p>
                <p className="text-foreground mt-1 truncate text-base font-black tracking-tight sm:text-lg">
                  {formatRupiah(data.pnl.totalRevenue)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  Cuci + Ritel
                </p>
              </div>

              <div className="border-border bg-muted/20 rounded-xl border p-3">
                <p className="text-muted-foreground text-[11px] font-bold uppercase">
                  2. Total HPP (COGS)
                </p>
                <p className="mt-1 truncate text-base font-black tracking-tight text-amber-600 sm:text-lg">
                  {formatRupiah(data.pnl.totalCogs)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  Bahan Kimia + Modal Ritel
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-[11px] font-bold text-blue-700 uppercase dark:text-blue-300">
                  3. Laba Kotor
                </p>
                <p className="mt-1 truncate text-base font-black tracking-tight text-blue-700 sm:text-lg dark:text-blue-300">
                  {formatRupiah(data.pnl.grossProfit)}
                </p>
                <p className="mt-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                  Margin: {data.pnl.grossMarginPercent}%
                </p>
              </div>

              <div
                className={`rounded-xl border p-3 ${
                  data.pnl.netOperatingProfit >= 0
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <p
                  className={`text-[11px] font-bold uppercase ${
                    data.pnl.netOperatingProfit >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-destructive"
                  }`}
                >
                  4. Laba Bersih (EBITDA)
                </p>
                <p
                  className={`mt-1 truncate text-base font-black tracking-tight sm:text-lg ${
                    data.pnl.netOperatingProfit >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-destructive"
                  }`}
                >
                  {formatRupiah(data.pnl.netOperatingProfit)}
                </p>
                <p
                  className={`mt-0.5 text-[10px] ${
                    data.pnl.netOperatingProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  Net Margin: {data.pnl.netMarginPercent}%
                </p>
              </div>
            </div>

            {/* Rincian Struktur P&L */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Kolom Kiri: Pendapatan & HPP */}
              <div className="border-border bg-card space-y-4 rounded-xl border p-4">
                <div>
                  <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    A. Pendapatan Usaha (Revenue)
                  </h4>
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        (+) Penjualan Jasa Cuci & Detailing
                      </span>
                      <span className="text-foreground font-semibold">
                        {formatRupiah(data.pnl.washRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        (+) Penjualan Produk Ritel / Aksesoris
                      </span>
                      <span className="text-foreground font-semibold">
                        {formatRupiah(data.pnl.retailRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-xs font-bold">
                      <span className="text-foreground">
                        Total Pendapatan Usaha
                      </span>
                      <span className="text-emerald-600">
                        {formatRupiah(data.pnl.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                    <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
                    B. Harga Pokok Penjualan (COGS / HPP)
                  </h4>
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        (-) Bahan Kimia Cuci (Resep Takaran)
                      </span>
                      <span className="font-semibold text-amber-600">
                        - {formatRupiah(data.pnl.cogsChemicals)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        (-) Modal Produk Ritel (Cost Price)
                      </span>
                      <span className="font-semibold text-amber-600">
                        - {formatRupiah(data.pnl.cogsRetail)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-xs font-bold">
                      <span className="text-foreground">
                        Total HPP (Beban Bahan)
                      </span>
                      <span className="text-amber-600">
                        - {formatRupiah(data.pnl.totalCogs)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 flex items-center justify-between rounded-lg border-t p-3 pt-3">
                  <div>
                    <span className="text-foreground text-xs font-bold">
                      Laba Kotor (Gross Profit)
                    </span>
                    <p className="text-muted-foreground text-[10px]">
                      Pendapatan dikurangi HPP
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-blue-600">
                      {formatRupiah(data.pnl.grossProfit)}
                    </div>
                    <span className="text-[10px] font-bold text-blue-600">
                      Margin {data.pnl.grossMarginPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Beban Operasional & Laba Bersih */}
              <div className="border-border bg-card space-y-4 rounded-xl border p-4">
                <div>
                  <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                    <Receipt className="text-destructive h-3.5 w-3.5" />
                    C. Beban Operasional Cabang (OPEX)
                  </h4>
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        (-) Komisi Teknisi / Tukang Cuci
                      </span>
                      <span className="text-destructive font-semibold">
                        - {formatRupiah(data.pnl.washerCommissions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        (-) Biaya Kas Kecil (Petty Cash Operasional)
                      </span>
                      <span className="text-destructive font-semibold">
                        - {formatRupiah(data.pnl.pettyCashExpenses)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-xs font-bold">
                      <span className="text-foreground">
                        Total Beban Operasional
                      </span>
                      <span className="text-destructive">
                        -{" "}
                        {formatRupiah(
                          data.pnl.washerCommissions +
                            data.pnl.pettyCashExpenses
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 rounded-lg border-t p-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-foreground flex items-center gap-1 text-xs font-bold">
                        <Calculator className="text-primary h-3.5 w-3.5" />
                        Laba Bersih Operasional (EBITDA)
                      </span>
                      <p className="text-muted-foreground text-[10px]">
                        Laba Kotor dikurangi Beban Operasional
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-base font-black ${
                          data.pnl.netOperatingProfit >= 0
                            ? "text-emerald-600"
                            : "text-destructive"
                        }`}
                      >
                        {formatRupiah(data.pnl.netOperatingProfit)}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          data.pnl.netOperatingProfit >= 0
                            ? "text-emerald-600"
                            : "text-destructive"
                        }`}
                      >
                        Net Margin {data.pnl.netMarginPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-border text-muted-foreground rounded-lg border border-dashed p-3 text-[11px]">
                  <p className="text-foreground mb-1 font-semibold">
                    Catatan Finansial Cabang:
                  </p>
                  <p>
                    HPP bahan kimia dihitung otomatis dari dosis takaran resep
                    setiap tiket cuci yang telah selesai. Biaya operasional
                    mencakup komisi tukang cuci dan voucher pengeluaran kas
                    kecil (petty cash) kasir.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Rincian Komposisi Arus Kas */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-bold">
              Rincian Sumber Pemasukan
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi metode pembayaran dari pelanggan cuci & ritel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Coins className="h-4 w-4 shrink-0 text-emerald-500" />
                Uang Tunai (Cash)
              </span>
              <span className="font-bold whitespace-nowrap text-emerald-600">
                {formatRupiah(data.cashBreakdown.cashIn)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0 text-blue-500" />
                Scan QRIS Dinamis
              </span>
              <span className="font-bold whitespace-nowrap text-blue-600">
                {formatRupiah(data.cashBreakdown.qrisIn)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 shrink-0 text-purple-500" />
                Transfer Bank Langsung
              </span>
              <span className="font-bold whitespace-nowrap text-purple-600">
                {formatRupiah(data.cashBreakdown.bankTransferIn)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-bold">
              Rincian Alokasi Pengeluaran
            </CardTitle>
            <CardDescription className="text-xs">
              Beban biaya belanja bahan dan komisi yang dibayarkan ke staf
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Receipt className="text-destructive h-4 w-4 shrink-0" />
                Pencairan Komisi Pekerja Cuci
              </span>
              <span className="text-destructive font-bold whitespace-nowrap">
                {formatRupiah(data.outflowBreakdown.commissionsPaid)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 shrink-0 text-amber-500" />
                Belanja Stok & Bahan Operasional
              </span>
              <span className="font-bold whitespace-nowrap text-amber-600">
                {formatRupiah(data.outflowBreakdown.materialExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Jurnal Mutasi Arus Kas */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-foreground text-base font-bold">
              Jurnal Arus Kas Terakhir
            </CardTitle>
            <CardDescription className="text-xs">
              Catatan mutasi kas masuk dan keluar secara kronologis
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              placeholder="Cari deskripsi / kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl text-xs sm:w-64"
            />

            <div className="flex flex-wrap items-center gap-1 rounded-xl border p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  filterType === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType("INFLOW")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  filterType === "INFLOW"
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Kas Masuk
              </button>
              <button
                type="button"
                onClick={() => setFilterType("OUTFLOW")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  filterType === "OUTFLOW"
                    ? "bg-destructive text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Kas Keluar
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-xs">
              Tidak ada data transaksi arus kas yang sesuai filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-160">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 text-xs font-bold whitespace-nowrap">
                      Waktu
                    </TableHead>
                    <TableHead className="w-28 text-xs font-bold whitespace-nowrap">
                      Tipe
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Kategori
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Deskripsi
                    </TableHead>
                    <TableHead className="text-xs font-bold whitespace-nowrap">
                      Metode
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold whitespace-nowrap">
                      Nominal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {t.type === "INFLOW" ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-600"
                          >
                            + Masuk
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-destructive/30 bg-destructive/10 text-destructive text-[11px] font-bold"
                          >
                            - Keluar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground text-xs font-semibold whitespace-nowrap">
                        {t.category}
                      </TableCell>
                      <TableCell className="text-muted-foreground min-w-45 text-xs">
                        {t.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px] whitespace-nowrap uppercase">
                        {t.paymentMethod}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-black whitespace-nowrap ${
                          t.type === "INFLOW"
                            ? "text-emerald-600"
                            : "text-destructive"
                        }`}
                      >
                        {t.type === "INFLOW" ? "+" : "-"}
                        {formatRupiah(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
