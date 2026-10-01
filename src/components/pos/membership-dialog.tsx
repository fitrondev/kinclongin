"use client";

import { useState, useTransition } from "react";

import {
  CheckCircle2,
  Coins,
  Crown,
  Gift,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { registerCustomerMembershipAction } from "@/actions/customer-membership";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/formatters";

interface MembershipDialogProps {
  outletId: string;
}

const MEMBERSHIP_FEE = 50000; // Flat Rp 50.000 biaya pendaftaran member

export function MembershipDialog({ outletId }: MembershipDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "QRIS" | "BANK_TRANSFER"
  >("CASH");
  const [paymentRef, setPaymentRef] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 8) {
      toast.error("Nomor WhatsApp pelanggan wajib diisi minimal 8 digit.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await registerCustomerMembershipAction({
        outletId,
        customerPhone,
        customerName,
        licensePlate: licensePlate || undefined,
        planName: "Member Loyalitas Kinclongin",
        price: MEMBERSHIP_FEE,
        durationDays: 365, // 1 Tahun
        totalQuota: 999, // Akses poin akumulatif & promo 10x gratis 1x
        discountPercent: 0,
        paymentMethod,
        paymentRef: paymentRef || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mengaktifkan keanggotaan member.");
        return;
      }

      toast.success(
        `👑 Pendaftaran Member ${res.data.customerName} berhasil diaktifkan!`
      );
      setOpen(false);
      setCustomerPhone("");
      setCustomerName("");
      setLicensePlate("");
      setPaymentRef("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 border-amber-500/30 bg-amber-500/10 font-bold text-amber-700 shadow-xs hover:bg-amber-500/20 dark:text-amber-300"
        >
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Daftar Member (Rp 50rb)</span>
          <span className="sm:hidden">Member (50k)</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-md">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black">
                  Pendaftaran Member Pelanggan
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Biaya registrasi member flat Rp 50.000 via Nomor WhatsApp.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Benefit Card */}
          <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wide text-amber-900 uppercase dark:text-amber-200">
                Keuntungan Member Kinclongin
              </span>
              <Badge className="bg-amber-500 text-[10px] font-black text-black">
                {formatRupiah(MEMBERSHIP_FEE)}
              </Badge>
            </div>
            <ul className="text-muted-foreground space-y-1.5 text-[11px]">
              <li className="text-foreground flex items-center gap-2 font-medium">
                <Coins className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>Poin Akumulatif:</strong> Dapat poin setiap transaksi
                  cuci & ritel.
                </span>
              </li>
              <li className="text-foreground flex items-center gap-2 font-medium">
                <Gift className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>Promo Terprogram:</strong> Cuci 10x Gratis 1x otomatis
                  per plat nomor.
                </span>
              </li>
              <li className="text-foreground flex items-center gap-2 font-medium">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>Bonus Selamat Datang:</strong> Langsung dapat bonus 50
                  poin saat daftar.
                </span>
              </li>
            </ul>
          </div>

          {/* Form Pelanggan */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="memPhone" className="text-xs font-bold">
                Nomor WhatsApp Pelanggan{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="memPhone"
                type="tel"
                placeholder="Contoh: 081234567890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="h-10 text-sm"
              />
              <p className="text-muted-foreground text-[10px]">
                Digunakan sebagai ID member untuk lacak poin & klaim reward
                otomatis.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="memName" className="text-xs font-bold">
                Nama Lengkap Pelanggan{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="memName"
                type="text"
                placeholder="Nama Pelanggan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="memPlate" className="text-xs font-bold">
                Nomor Plat Kendaraan Utama (Opsional)
              </Label>
              <Input
                id="memPlate"
                type="text"
                placeholder="Contoh: DR 1234 AB"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="h-10 text-sm uppercase"
              />
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">
              Metode Pembayaran (Rp 50.000)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "CASH", label: "💵 Tunai" },
                  { id: "QRIS", label: "📱 QRIS" },
                  { id: "BANK_TRANSFER", label: "🏦 Transfer" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`rounded-xl border py-2.5 text-center text-xs font-bold transition-all ${
                    paymentMethod === m.id
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMethod !== "CASH" && (
              <Input
                type="text"
                placeholder="Nomor Referensi Transaksi (Opsional)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="h-9 text-xs"
              />
            )}
          </div>

          {/* Total Tagihan */}
          <div className="bg-muted/40 flex items-center justify-between rounded-xl border p-3.5">
            <span className="text-muted-foreground text-xs font-medium">
              Total Biaya Member:
            </span>
            <span className="text-primary text-lg font-black">
              {formatRupiah(MEMBERSHIP_FEE)}
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-1.5 bg-amber-600 font-bold text-white hover:bg-amber-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Terima Rp 50.000 & Aktifkan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
