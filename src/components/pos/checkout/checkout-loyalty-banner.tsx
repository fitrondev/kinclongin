import { Coins, Gift, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";

export interface CheckoutLoyaltyBannerProps {
  licensePlate: string;
  vehicleVisits: number;
  loyaltyPoints: number;
  hasCustomer: boolean;
  isVehiclePromoEligible: boolean;
  isPointsEligible: boolean;
  isRewardEligible: boolean;
  isFreeWashClaimed: boolean;
  onClaimFreeWash: () => void;
  redeemPoints: number;
  onToggleRedeemPoints: (pts: number) => void;
  registerMembershipNow: boolean;
  setRegisterMembershipNow: (val: boolean) => void;
  customerPhone?: string;
}

export function CheckoutLoyaltyBanner({
  licensePlate,
  vehicleVisits,
  loyaltyPoints,
  hasCustomer,
  isVehiclePromoEligible,
  isPointsEligible,
  isRewardEligible,
  isFreeWashClaimed,
  onClaimFreeWash,
  redeemPoints,
  onToggleRedeemPoints,
  registerMembershipNow,
  setRegisterMembershipNow,
  customerPhone,
}: CheckoutLoyaltyBannerProps) {
  return (
    <div className="space-y-4">
      {/* Card Engine Loyalitas Pelanggan (Cuci 10x Gratis 1x - Terkunci ke Plat) */}
      <Card
        className={`border transition-all ${
          isRewardEligible
            ? "border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30"
            : "border-primary/20 bg-primary/5"
        }`}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  Loyalitas Plat {licensePlate} &bull; Kunjungan Ke-
                  {vehicleVisits}
                </span>
                {hasCustomer ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                  >
                    {loyaltyPoints} Poin
                  </Badge>
                ) : null}
              </div>

              {isVehiclePromoEligible ? (
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-700 dark:text-amber-300">
                    <Gift className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Selamat! Plat {licensePlate} Berhak Cuci 10x Gratis 1x!
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Mencapai kelipatan 10 kunjungan khusus untuk kendaraan ini.
                    Anda dapat mengklaim diskon 100% jasa cuci sekarang.
                  </p>
                </div>
              ) : isPointsEligible ? (
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-700 dark:text-amber-300">
                    <Coins className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Pelanggan Memiliki {loyaltyPoints} Poin Loyalitas!
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Poin dapat ditukarkan untuk diskon cuci gratis atau potongan
                    harga belanja.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Tersisa{" "}
                  <strong className="text-foreground font-bold">
                    {10 - (vehicleVisits % 10)} kunjungan lagi
                  </strong>{" "}
                  untuk plat {licensePlate} menuju reward Cuci Gratis
                  berikutnya.
                </p>
              )}
            </div>

            {isRewardEligible ? (
              <Button
                type="button"
                variant={isFreeWashClaimed ? "outline" : "default"}
                disabled={isFreeWashClaimed}
                onClick={onClaimFreeWash}
                className={`h-10 shrink-0 gap-1.5 text-xs font-bold shadow-sm ${
                  isFreeWashClaimed
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {isFreeWashClaimed
                    ? "Cuci Gratis Terpasang"
                    : "Klaim Cuci Gratis 10x"}
                </span>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Upsell Pendaftaran Member di Checkout (Rp 50.000) */}
      {hasCustomer && customerPhone ? (
        <Card
          className={`border transition-all ${
            registerMembershipNow
              ? "border-amber-500/50 bg-amber-500/10 shadow-xs"
              : "border-border/80 bg-muted/20"
          }`}
        >
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black shadow-xs">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground text-xs font-black">
                    Daftar Member Kinclongin
                  </span>
                  <Badge className="h-4 bg-amber-500 px-1.5 text-[10px] font-black text-black">
                    Rp 50.000
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  WhatsApp {customerPhone} &bull; Poin akumulatif tiap transaksi
                  &bull; Hak promo Cuci 10x Gratis 1x
                </p>
              </div>
            </div>

            <label className="flex shrink-0 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={registerMembershipNow}
                onChange={(e) => setRegisterMembershipNow(e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 accent-amber-600 focus:ring-amber-500"
              />
              <span className="text-foreground text-xs font-bold">
                {registerMembershipNow
                  ? "Terpilih (+Rp 50rb)"
                  : "Daftar (+Rp 50rb)"}
              </span>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {/* Opsi Redeem Poin Loyalty Pelanggan */}
      {hasCustomer && loyaltyPoints >= 10 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                <span className="text-foreground text-xs font-bold">
                  Tukar Poin Loyalty ({loyaltyPoints} Poin Tersedia)
                </span>
              </div>
              <span className="text-muted-foreground text-[10px]">
                10 Poin = Rp 1.000
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {[10, 20, 50, 100].map((pts) => {
                if (pts > loyaltyPoints) return null;
                const isSelected = redeemPoints === pts;
                return (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => onToggleRedeemPoints(pts)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-amber-500 text-amber-950 shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    Gunakan {pts} Poin (-{formatRupiah(pts * 100)})
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
