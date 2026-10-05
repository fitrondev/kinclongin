import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  QrCode,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";

export interface PaymentMethodSelectorProps {
  paymentMethod: "CASH" | "QRIS" | "BANK_TRANSFER" | "SPLIT";
  setPaymentMethod: (val: "CASH" | "QRIS" | "BANK_TRANSFER" | "SPLIT") => void;
  cashGiven: number;
  setCashGiven: (val: number) => void;
  referenceNumber: string;
  setReferenceNumber: (val: string) => void;
  grandTotal: number;
  changeGiven: number;
  isPending: boolean;
  onProcessCheckout: () => void;
}

export function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
  cashGiven,
  setCashGiven,
  referenceNumber,
  setReferenceNumber,
  grandTotal,
  changeGiven,
  isPending,
  onProcessCheckout,
}: PaymentMethodSelectorProps) {
  const handleQuickCash = (amount: number) => {
    setCashGiven(amount);
  };

  return (
    <div className="space-y-4">
      {/* Pilihan Metode Bayar */}
      <div className="space-y-2">
        <label className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
          Metode Pembayaran
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "CASH", label: "Tunai (Cash)", icon: Wallet },
              { id: "QRIS", label: "QRIS", icon: QrCode },
              {
                id: "BANK_TRANSFER",
                label: "Transfer",
                icon: Building2,
              },
              { id: "SPLIT", label: "Split Pay", icon: CreditCard },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Opsi Khusus TUNAI (Quick Cash Pills & Kembalian) */}
      {paymentMethod === "CASH" ? (
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
              Uang Tunai Diterima (Rp)
            </label>
            <Input
              type="number"
              placeholder="Contoh: 100000"
              value={cashGiven || ""}
              onChange={(e) => setCashGiven(Number(e.target.value))}
              className="h-12 font-mono text-xl font-bold"
            />
          </div>

          {/* Quick cash pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickCash(grandTotal)}
              className="bg-muted hover:bg-muted/80 text-foreground rounded-lg px-2.5 py-1 text-[11px] font-bold"
            >
              Uang Pas
            </button>
            {[50000, 100000, 150000, 200000].map((amt) => {
              if (amt < grandTotal) return null;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickCash(amt)}
                  className="bg-muted hover:bg-muted/80 text-foreground rounded-lg px-2.5 py-1 text-[11px] font-bold"
                >
                  {formatRupiah(amt)}
                </button>
              );
            })}
          </div>

          {/* Kembalian Text Kontras Tinggi */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
            <span className="text-xs font-extrabold text-emerald-800 uppercase dark:text-emerald-300">
              KEMBALIAN
            </span>
            <span className="font-mono text-xl font-black text-emerald-600 sm:text-2xl dark:text-emerald-400">
              {formatRupiah(changeGiven)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Opsi Khusus QRIS */}
      {paymentMethod === "QRIS" ? (
        <div className="bg-muted/30 space-y-2 rounded-xl border p-4 text-center">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl border bg-white p-2 shadow-xs">
            <QrCode className="h-36 w-36 text-black" />
          </div>
          <p className="text-foreground text-xs font-bold">
            Scan QRIS Usaha Kinclongin
          </p>
          <p className="text-muted-foreground text-[10px]">
            Dukung GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, dll.
          </p>
        </div>
      ) : null}

      {/* Opsi Khusus TRANSFER */}
      {paymentMethod === "BANK_TRANSFER" ? (
        <div className="space-y-2 pt-1 text-xs">
          <div className="bg-muted/50 space-y-1 rounded-xl border p-3">
            <p className="text-foreground font-bold">BCA: 056-123-4567</p>
            <p className="text-muted-foreground">
              a.n. PT Kinclongin Indonesia
            </p>
          </div>
          <Input
            type="text"
            placeholder="Nomor referensi / 4 digit akhir rekening"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="h-10 text-xs"
          />
        </div>
      ) : null}

      {/* Tombol Eksekusi Bayar Besar */}
      <Button
        type="button"
        disabled={
          isPending || (paymentMethod === "CASH" && cashGiven < grandTotal)
        }
        onClick={onProcessCheckout}
        className="bg-primary text-primary-foreground h-16 w-full gap-2 text-base font-black shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] sm:text-lg"
      >
        {isPending ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Menyelesaikan Transaksi...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-6 w-6" />
            <span>Bayar & Cetak Struk ({formatRupiah(grandTotal)})</span>
          </>
        )}
      </Button>
    </div>
  );
}
