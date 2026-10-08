import { Car, QrCode, Receipt, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";

export interface CashierDrawerCardsProps {
  openingCashFloat?: number;
  todayCashInDrawer: number;
  todayNonCash: number;
  todayQris: number;
  todayTransfer: number;
  todayTotalAmount: number;
  todayTransactionsCount: number;
  todayCreatedTicketsCount: number;
  todayMembershipsCount: number;
  onOpenReconciliation?: () => void;
  onOpenEditFloat?: () => void;
}

export function CashierDrawerCards({
  openingCashFloat = 0,
  todayCashInDrawer,
  todayNonCash,
  todayQris,
  todayTransfer,
  todayTotalAmount,
  todayTransactionsCount,
  todayCreatedTicketsCount,
  todayMembershipsCount,
  onOpenReconciliation,
  onOpenEditFloat,
}: CashierDrawerCardsProps) {
  const totalPhysicalExpected = openingCashFloat + todayCashInDrawer;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Uang Tunai di Laci Kasir */}
      <Card className="min-w-0 border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-bold text-emerald-700 uppercase dark:text-emerald-400">
            Kas Fisik di Laci (Seharusnya)
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="truncate text-xl font-black tracking-tight text-emerald-600 sm:text-2xl dark:text-emerald-400">
            {formatRupiah(totalPhysicalExpected)}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <span className="text-muted-foreground truncate">
              Modal:{" "}
              <strong className="text-foreground">
                {formatRupiah(openingCashFloat)}
              </strong>{" "}
              • Tunai:{" "}
              <strong className="text-foreground">
                {formatRupiah(todayCashInDrawer)}
              </strong>
            </span>
            {onOpenEditFloat && (
              <button
                type="button"
                onClick={onOpenEditFloat}
                className="text-primary font-bold hover:underline"
              >
                Set Modal
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Pembayaran Non-Tunai (QRIS & Transfer) */}
      <Card className="min-w-0 border-blue-500/30 bg-blue-500/5 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-bold text-blue-700 uppercase dark:text-blue-400">
            Penerimaan Non-Tunai
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <QrCode className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="truncate text-xl font-black tracking-tight text-blue-600 sm:text-2xl dark:text-blue-400">
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
      <Card className="min-w-0 border-purple-500/30 bg-purple-500/5 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-bold text-purple-700 uppercase dark:text-purple-400">
            Transaksi Pembayaran
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
            <Receipt className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="truncate text-xl font-black tracking-tight text-purple-600 sm:text-2xl dark:text-purple-400">
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
      <Card className="min-w-0 border-amber-500/30 bg-amber-500/5 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-bold text-amber-700 uppercase dark:text-amber-400">
            Pendaftaran Masuk
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Car className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="truncate text-xl font-black tracking-tight text-amber-600 sm:text-2xl dark:text-amber-400">
            {todayCreatedTicketsCount} Kendaraan
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">
            +{todayMembershipsCount} member baru didaftarkan hari ini
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
