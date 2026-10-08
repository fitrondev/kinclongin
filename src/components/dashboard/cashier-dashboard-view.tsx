"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Calculator,
  CreditCard,
  Droplets,
  LayoutGrid,
  PlusCircle,
  Sparkles,
  Wallet,
} from "lucide-react";

import { CashMovementDialog } from "@/components/pos/cash-movement-dialog";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ReceiptData } from "@/lib/printer/escpos";

import { CashierDrawerCards } from "./cashier/cashier-drawer-cards";
import { CashierReconciliationDialog } from "./cashier/cashier-reconciliation-dialog";
import {
  type CashierPaymentItem,
  PaymentHistoryTable,
} from "./cashier/payment-history-table";
import {
  type PendingTicketItem,
  PendingTicketsGrid,
} from "./cashier/pending-tickets-grid";

export type { CashierPaymentItem, PendingTicketItem };

export interface CashierDashboardViewProps {
  cashierName: string;
  cashierEmail: string;
  outletName: string;
  outletAddress: string;
  outletPhone: string;
  outletSlogan?: string | null;
  outletReceiptHeader?: string | null;
  outletReceiptFooter?: string | null;
  outletContactPhone?: string | null;
  outletId: string;
  shiftName: string;
  openingCashFloat?: number;
  todayCashInDrawer: number;
  todayPaidIn?: number;
  todayPaidOut?: number;
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
  outletName,
  outletAddress,
  outletPhone,
  outletSlogan,
  outletReceiptHeader,
  outletReceiptFooter,
  outletContactPhone,
  outletId,
  shiftName,
  openingCashFloat = 0,
  todayCashInDrawer,
  todayPaidIn = 0,
  todayPaidOut = 0,
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
  const router = useRouter();

  // Search & Filter state for recent transactions
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] =
    useState<string>("ALL");

  // State Rekonsiliasi, Modal Awal & Petty Cash
  const [openingFloat, setOpeningFloat] = useState(openingCashFloat);
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false);
  const [cashMovementModalOpen, setCashMovementModalOpen] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<
    "PAID_IN" | "PAID_OUT"
  >("PAID_OUT");
  const [paidInState, setPaidInState] = useState(todayPaidIn);
  const [paidOutState, setPaidOutState] = useState(todayPaidOut);

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
      slogan: outletSlogan,
      receiptHeader: outletReceiptHeader,
      receiptFooter: outletReceiptFooter,
      contactPhone: outletContactPhone,
      ticketNumber: payment.ticketNumber,
      dateStr: new Date(payment.paidAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      cashierName,
      licensePlate: payment.licensePlate,
      vehicleModel: payment.vehicleCategory,
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

  return (
    <div className="space-y-6">
      {/* 1. Header Ringkasan Shift Kasir */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight uppercase sm:text-2xl md:text-3xl">
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            onClick={() => setReconciliationModalOpen(true)}
            size="lg"
            variant="outline"
            className="h-10 w-full justify-center gap-2 border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-700 shadow-xs hover:bg-emerald-500/20 sm:h-11 sm:w-auto dark:text-emerald-300"
          >
            <Calculator className="h-4 w-4" />
            <span>Tutup Shift & Rekonsiliasi</span>
          </Button>

          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full justify-center gap-2 font-bold shadow-md sm:h-11 sm:w-auto"
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
            className="h-10 w-full justify-center gap-2 font-bold shadow-xs sm:h-11 sm:w-auto"
          >
            <Link href="/pos/daftar-baru">
              <PlusCircle className="text-primary h-4 w-4" />
              <span>Daftar Cuci</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. 4 Stat Cards: Kas di Laci & Kinerja Shift Hari Ini */}
      <CashierDrawerCards
        openingCashFloat={openingFloat}
        todayCashInDrawer={todayCashInDrawer}
        todayPaidIn={paidInState}
        todayPaidOut={paidOutState}
        todayNonCash={todayNonCash}
        todayQris={todayQris}
        todayTransfer={todayTransfer}
        todayTotalAmount={todayTotalAmount}
        todayTransactionsCount={todayTransactionsCount}
        todayCreatedTicketsCount={todayCreatedTicketsCount}
        todayMembershipsCount={todayMembershipsCount}
        onOpenReconciliation={() => setReconciliationModalOpen(true)}
        onOpenEditFloat={() => setReconciliationModalOpen(true)}
        onOpenCashMovement={(type) => {
          setCashMovementType(type);
          setCashMovementModalOpen(true);
        }}
      />

      {/* 3. Action Hub Bar */}
      <Card className="bg-muted/40 border-border/70 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5 shrink-0" />
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center gap-1.5 text-xs font-bold sm:w-auto"
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
              className="h-9 w-full justify-center gap-1.5 text-xs font-bold sm:w-auto"
            >
              <Link href="/layar-cuci">
                <Droplets className="h-4 w-4 text-cyan-500" />
                <span>Layar Cuci (Area Hidrolik)</span>
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Kendaraan Siap Bayar / Antrean Aktif yang Belum Lunas */}
      <PendingTicketsGrid pendingTickets={pendingPaymentTickets} />

      {/* 5. Tabel Transaksi Pembayaran Kasir Terakhir Hari Ini */}
      <PaymentHistoryTable
        cashierName={cashierName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedMethodFilter={selectedMethodFilter}
        setSelectedMethodFilter={setSelectedMethodFilter}
        filteredPayments={filteredPayments}
        onOpenReceipt={handleOpenReceipt}
      />

      {/* 6. Dialog Cetak Struk */}
      {selectedReceiptData ? (
        <ReceiptDialog
          open={receiptModalOpen}
          onOpenChange={setReceiptModalOpen}
          receiptData={selectedReceiptData}
          customerPhone={selectedCustomerPhone}
          ticketId={selectedTicketId}
        />
      ) : null}

      {/* 7. Dialog Rekonsiliasi Shift & Modal Kasir */}
      <CashierReconciliationDialog
        open={reconciliationModalOpen}
        onOpenChange={setReconciliationModalOpen}
        outletId={outletId}
        outletName={outletName}
        cashierName={cashierName}
        shiftName={shiftName}
        openingCashFloat={openingFloat}
        cashCollected={todayCashInDrawer}
        todayPaidIn={paidInState}
        todayPaidOut={paidOutState}
        qrisCollected={todayQris}
        transferCollected={todayTransfer}
        transactionsCount={todayTransactionsCount}
        onOpeningFloatUpdated={(val) => setOpeningFloat(val)}
      />

      {/* 8. Dialog Pencatatan Kas Masuk / Kas Keluar (Petty Cash) */}
      <CashMovementDialog
        open={cashMovementModalOpen}
        onOpenChange={setCashMovementModalOpen}
        outletId={outletId}
        defaultType={cashMovementType}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
