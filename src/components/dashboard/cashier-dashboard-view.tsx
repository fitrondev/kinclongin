"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Droplets,
  HelpCircle,
  LayoutGrid,
  PlusCircle,
  Printer,
  QrCode,
  Receipt,
  Search,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { MembershipDialog } from "@/components/pos/membership-dialog";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
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
import { PaymentMethod } from "@/generated/prisma/enums";
import { formatLicensePlate, formatRupiah } from "@/lib/formatters";
import type { ReceiptData } from "@/lib/printer/escpos";

export interface CashierPaymentItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  serviceName: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  method: PaymentMethod;
  cashGiven: number | null;
  changeGiven: number | null;
  paidAt: Date | string;
  referenceNumber: string | null;
}

export interface PendingTicketItem {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  serviceName: string;
  customerName: string | null;
  totalAmount: number;
  status: string;
  queuedAt: Date | string;
}

export interface CashierDashboardViewProps {
  cashierName: string;
  cashierEmail: string;
  outletName: string;
  outletAddress: string;
  outletPhone: string;
  outletId: string;
  shiftName: string;
  todayCashInDrawer: number;
  todayNonCash: number;
  todayQris: number;
  todayTransfer: number;
  todayTotalAmount: number;
  todayTransactionsCount: number;
  todayCreatedTicketsCount: number;
  todayMembershipsCount: number;
  recentPayments: CashierPaymentItem[];
  pendingPaymentTickets: PendingTicketItem[];
}

export function CashierDashboardView({
  cashierName,
  cashierEmail,
  outletName,
  outletAddress,
  outletPhone,
  outletId,
  shiftName,
  todayCashInDrawer,
  todayNonCash,
  todayQris,
  todayTransfer,
  todayTotalAmount,
  todayTransactionsCount,
  todayCreatedTicketsCount,
  todayMembershipsCount,
  recentPayments,
  pendingPaymentTickets,
}: CashierDashboardViewProps) {
  // Search & Filter state for recent transactions
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] =
    useState<string>("ALL");

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] =
    useState<ReceiptData | null>(null);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<
    string | null
  >(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");

  const filteredPayments = useMemo(() => {
    return recentPayments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.licensePlate.toLowerCase().includes(q) ||
        p.ticketNumber.toLowerCase().includes(q) ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        p.serviceName.toLowerCase().includes(q);

      const matchMethod =
        selectedMethodFilter === "ALL" || p.method === selectedMethodFilter;

      return matchQuery && matchMethod;
    });
  }, [recentPayments, searchQuery, selectedMethodFilter]);

  const handleOpenReceipt = (payment: CashierPaymentItem) => {
    const data: ReceiptData = {
      outletName,
      outletAddress: outletAddress || "Alamat Cabang Kinclongin",
      outletPhone: outletPhone || "081234567890",
      ticketNumber: payment.ticketNumber,
      dateStr: new Date(payment.paidAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      cashierName,
      licensePlate: formatLicensePlate(payment.licensePlate),
      serviceName: payment.serviceName,
      servicePrice: payment.totalAmount,
      subtotal: payment.totalAmount,
      discount: 0,
      total: payment.totalAmount,
      paymentMethod:
        payment.method === "CASH"
          ? "TUNAI (CASH)"
          : payment.method === "QRIS"
            ? "QRIS DINAMIS"
            : payment.method === "BANK_TRANSFER"
              ? "TRANSFER BANK"
              : payment.method,
      cashGiven: payment.cashGiven ?? undefined,
      changeGiven: payment.changeGiven ?? undefined,
      customerName: payment.customerName || undefined,
    };

    setSelectedReceiptData(data);
    setSelectedCustomerPhone(payment.customerPhone);
    setSelectedTicketId(payment.ticketId);
    setReceiptModalOpen(true);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-600"
          >
            💵 Tunai
          </Badge>
        );
      case "QRIS":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 font-bold text-blue-600"
          >
            📱 QRIS
          </Badge>
        );
      case "BANK_TRANSFER":
        return (
          <Badge
            variant="outline"
            className="border-purple-500/30 bg-purple-500/10 font-bold text-purple-600"
          >
            🏦 Transfer
          </Badge>
        );
      case "SPLIT":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 font-bold text-amber-600"
          >
            🔄 Split
          </Badge>
        );
      case "LOYALTY_POINTS":
        return (
          <Badge
            variant="outline"
            className="border-pink-500/30 bg-pink-500/10 font-bold text-pink-600"
          >
            🎁 Poin
          </Badge>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 font-bold text-amber-600"
          >
            Antre
          </Badge>
        );
      case "WASHING":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 font-bold text-blue-600"
          >
            Dicuci
          </Badge>
        );
      case "DRYING":
        return (
          <Badge
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 font-bold text-cyan-600"
          >
            Finishing
          </Badge>
        );
      case "READY":
      case "WASHED":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-600"
          >
            Siap Diambil
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. Header Ringkasan Shift Kasir */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight uppercase sm:text-3xl">
              Dasbor Shift Kasir
            </h1>
            <Badge className="bg-primary text-primary-foreground font-bold">
              {shiftName}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Selamat bertugas,{" "}
            <span className="text-foreground font-bold">{cashierName}</span>.
            Pantau kas di laci kasir, transaksi hari ini, dan proses pembayaran
            dengan cepat.
          </p>
        </div>

        {/* Quick Actions Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 gap-2 font-bold shadow-md"
          >
            <Link href="/pos">
              <CreditCard className="h-4 w-4" />
              <span>Buka Kasir POS</span>
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 gap-2 font-bold shadow-xs"
          >
            <Link href="/pos/daftar-baru">
              <PlusCircle className="text-primary h-4 w-4" />
              <span>Daftar Cuci</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. 4 Stat Cards: Kas di Laci & Kinerja Shift Hari Ini */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Uang Tunai di Laci Kasir */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase dark:text-emerald-400">
              Kas Tunai di Laci (Fisik)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatRupiah(todayCashInDrawer)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Wajib cocok dengan fisik laci saat closing/handover shift
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Pembayaran Non-Tunai (QRIS & Transfer) */}
        <Card className="border-blue-500/30 bg-blue-500/5 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-blue-700 uppercase dark:text-blue-400">
              Penerimaan Non-Tunai
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <QrCode className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
              {formatRupiah(todayNonCash)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              QRIS:{" "}
              <span className="text-foreground font-semibold">
                {formatRupiah(todayQris)}
              </span>{" "}
              • Transfer:{" "}
              <span className="text-foreground font-semibold">
                {formatRupiah(todayTransfer)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Transaksi Selesai */}
        <Card className="border-purple-500/30 bg-purple-500/5 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-purple-700 uppercase dark:text-purple-400">
              Transaksi Pembayaran
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
              {todayTransactionsCount} Transaksi
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Total omzet kasir:{" "}
              <span className="text-foreground font-semibold">
                {formatRupiah(todayTotalAmount)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Tiket Didaftarkan Hari Ini */}
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-amber-700 uppercase dark:text-amber-400">
              Pendaftaran Masuk
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Car className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {todayCreatedTicketsCount} Kendaraan
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              +{todayMembershipsCount} member baru didaftarkan hari ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Action Hub Bar */}
      <Card className="bg-muted/40 border-border/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" />
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase">
                Akses Cepat Meja Kasir & Operasional
              </h2>
              <p className="text-muted-foreground text-xs">
                Gunakan tombol cepat di bawah untuk navigasi instan tanpa
                meninggalkan alur kerja kasir
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold"
            >
              <Link href="/pos/antrean">
                <LayoutGrid className="h-4 w-4 text-amber-500" />
                <span>Papan Antrean (Live Kanban)</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold"
            >
              <Link href="/layar-cuci">
                <Droplets className="h-4 w-4 text-cyan-500" />
                <span>Layar Cuci (Area Hidrolik)</span>
              </Link>
            </Button>
            <MembershipDialog
              outletId={outletId}
              buttonText="+ Daftar Member Baru"
              className="h-9 text-xs font-bold"
            />
          </div>
        </div>
      </Card>

      {/* 4. Kendaraan Siap Bayar / Antrean Aktif yang Belum Lunas */}
      {pendingPaymentTickets.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black text-amber-900 uppercase dark:text-amber-200">
                    Kendaraan Belum Dibayar ({pendingPaymentTickets.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kendaraan dalam proses atau siap diambil yang menunggu
                    penyelesaian pembayaran di kasir
                  </CardDescription>
                </div>
              </div>
              <Button asChild size="sm" className="h-8 gap-1 text-xs font-bold">
                <Link href="/pos">
                  <span>Buka Kasir</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPaymentTickets.slice(0, 6).map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-card flex items-center justify-between rounded-xl border p-3 shadow-2xs transition-all hover:border-amber-500/50"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black tracking-wider uppercase">
                        {formatLicensePlate(ticket.licensePlate)}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {ticket.serviceName}
                    </span>
                    {ticket.customerName && (
                      <span className="text-muted-foreground text-[11px]">
                        Pelanggan: {ticket.customerName}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-mono text-sm font-black">
                      {formatRupiah(ticket.totalAmount)}
                    </span>
                    <div className="mt-1">
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2 text-[10px] font-bold"
                      >
                        <Link href="/pos">Bayar</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Tabel Transaksi Pembayaran Kasir Terakhir Hari Ini */}
      <Card className="bg-card border-border/80 shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase">
                <Receipt className="text-primary h-5 w-5" />
                <span>Riwayat Pembayaran Kasir Hari Ini</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar transaksi pembayaran yang diproses langsung oleh{" "}
                {cashierName} hari ini
              </CardDescription>
            </div>

            {/* Filter Metode Bayar */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "Semua" },
                { id: "CASH", label: "Tunai" },
                { id: "QRIS", label: "QRIS" },
                { id: "TRANSFER", label: "Transfer" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSelectedMethodFilter(btn.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    selectedMethodFilter === btn.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari berdasarkan nomor tiket, plat kendaraan, atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background h-9 pl-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredPayments.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-10 w-10 opacity-30" />
              <p className="mt-2 text-sm font-semibold">
                {searchQuery
                  ? "Tidak ada transaksi yang cocok dengan kata kunci pencarian."
                  : "Belum ada transaksi pembayaran yang diproses pada shift ini."}
              </p>
              <Button asChild size="sm" className="mt-4 gap-1.5 font-bold">
                <Link href="/pos">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Proses Pembayaran Baru di POS</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-24 text-xs font-bold uppercase">
                      Waktu
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      No. Tiket
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Plat Nomor
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Layanan
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Metode
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase">
                      Total Tagihan
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase">
                      Tunai / Kembali
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase">
                      Cetak Struk
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/30">
                      {/* Waktu */}
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {new Date(payment.paidAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>

                      {/* No. Tiket */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold">
                          {payment.ticketNumber}
                        </span>
                      </TableCell>

                      {/* Plat Nomor & Pelanggan */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black tracking-wider uppercase">
                            {formatLicensePlate(payment.licensePlate)}
                          </span>
                          {payment.customerName && (
                            <span className="text-muted-foreground text-[11px]">
                              {payment.customerName}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Layanan */}
                      <TableCell>
                        <span className="text-xs font-medium">
                          {payment.serviceName}
                        </span>
                      </TableCell>

                      {/* Metode Bayar */}
                      <TableCell>{getMethodBadge(payment.method)}</TableCell>

                      {/* Total Tagihan */}
                      <TableCell className="text-right">
                        <span className="text-primary font-mono text-xs font-black">
                          {formatRupiah(payment.totalAmount)}
                        </span>
                      </TableCell>

                      {/* Uang Diterima & Kembalian (Jika Tunai) */}
                      <TableCell className="text-right text-[11px]">
                        {payment.method === "CASH" && payment.cashGiven ? (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground font-mono">
                              Bayar: {formatRupiah(payment.cashGiven)}
                            </span>
                            {payment.changeGiven && payment.changeGiven > 0 ? (
                              <span className="font-mono font-bold text-emerald-600">
                                Kembali: {formatRupiah(payment.changeGiven)}
                              </span>
                            ) : null}
                          </div>
                        ) : payment.referenceNumber ? (
                          <span className="text-muted-foreground font-mono text-[10px]">
                            Ref: {payment.referenceNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            -
                          </span>
                        )}
                      </TableCell>

                      {/* Aksi Cetak Ulang Struk */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReceipt(payment)}
                          className="hover:bg-primary/10 hover:text-primary h-8 gap-1.5 text-xs font-bold"
                          title="Cetak Struk Thermal atau Kirim via WhatsApp"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Struk</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Dialog Cetak Struk */}
      {selectedReceiptData && (
        <ReceiptDialog
          open={receiptModalOpen}
          onOpenChange={setReceiptModalOpen}
          receiptData={selectedReceiptData}
          customerPhone={selectedCustomerPhone}
          ticketId={selectedTicketId}
        />
      )}
    </div>
  );
}
