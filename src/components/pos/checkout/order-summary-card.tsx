import { Coins, Crown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";

export interface OrderSummaryCardProps {
  servicePrice: number;
  retailTotal: number;
  registerMembershipNow: boolean;
  effectiveDiscount: number;
  grandTotal: number;
  hasCustomer: boolean;
}

export function OrderSummaryCard({
  servicePrice,
  retailTotal,
  registerMembershipNow,
  effectiveDiscount,
  grandTotal,
  hasCustomer,
}: OrderSummaryCardProps) {
  return (
    <Card className="border-primary/20 border-2 shadow-md">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base font-black">
          Ringkasan Pembayaran
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {/* Rincian Angka */}
        <div className="text-muted-foreground space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span>Jasa Cuci Kendaraan</span>
            <span className="text-foreground font-semibold">
              {formatRupiah(servicePrice)}
            </span>
          </div>
          {retailTotal > 0 ? (
            <div className="flex justify-between">
              <span>Produk Ritel Tambahan</span>
              <span className="text-foreground font-semibold">
                {formatRupiah(retailTotal)}
              </span>
            </div>
          ) : null}
          {registerMembershipNow ? (
            <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Crown className="h-3.5 w-3.5" /> Pendaftaran Member (1 Thn)
              </span>
              <span>+{formatRupiah(50000)}</span>
            </div>
          ) : null}
          {effectiveDiscount > 0 ? (
            <div className="flex justify-between font-semibold text-emerald-600">
              <span>Potongan Diskon / Poin</span>
              <span>-{formatRupiah(effectiveDiscount)}</span>
            </div>
          ) : null}
        </div>

        {/* Total Tagihan Besar */}
        <div className="bg-muted/50 flex items-center justify-between rounded-2xl border p-3.5">
          <span className="text-muted-foreground text-xs font-extrabold uppercase">
            TOTAL TAGIHAN
          </span>
          <span className="text-primary text-2xl font-black sm:text-3xl">
            {formatRupiah(grandTotal)}
          </span>
        </div>

        {/* Akumulasi Poin Badge */}
        {hasCustomer ? (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />{" "}
              Poin diperoleh transaksi ini:
            </span>
            <strong className="font-bold">
              +
              {Math.floor((servicePrice + retailTotal) / 1000) +
                (registerMembershipNow ? 50 : 0)}{" "}
              Poin
            </strong>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
