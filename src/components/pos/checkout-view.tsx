"use client";

import { useMemo, useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import confetti from "canvas-confetti";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Crown,
  Gift,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Receipt,
  ShoppingBag,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { checkoutTicketAction } from "@/actions/pos";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";
import { ReceiptData } from "@/lib/printer/escpos";

export interface CheckoutTicketData {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  servicePrice: number;
  servicePackage: {
    id: string;
    name: string;
  };
  vehicle?: {
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    totalVisits?: number;
  } | null;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    loyaltyPoints: number;
    totalVisits?: number;
  } | null;
  washers?: {
    washer: {
      fullName: string;
    };
  }[];
  outlet: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
}

export interface RetailProductItem {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  sellingPrice: number;
  stock: number;
  imageUrl: string | null;
}

interface CheckoutViewProps {
  ticket: CheckoutTicketData;
  retailProducts: RetailProductItem[];
  cashierName: string;
}

export function CheckoutView({
  ticket,
  retailProducts,
  cashierName,
}: CheckoutViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Keranjang belanja barang ritel: Record<productId, qty>
  const [cart, setCart] = useState<Record<string, number>>({});

  // Metode pembayaran
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "QRIS" | "BANK_TRANSFER" | "SPLIT"
  >("CASH");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [registerMembershipNow, setRegisterMembershipNow] = useState(false);

  // Modal struk setelah sukses bayar
  const [receiptDialogData, setReceiptDialogData] =
    useState<ReceiptData | null>(null);

  // Status Loyalitas Kendaraan (Cuci 10x Gratis 1x - Terkunci ke Plat Kendaraan)
  const vehicleVisits = ticket.vehicle?.totalVisits ?? 0;
  const loyaltyPoints = ticket.customer?.loyaltyPoints ?? 0;
  const isVehiclePromoEligible = vehicleVisits > 0 && vehicleVisits % 10 === 0;
  const isPointsEligible = loyaltyPoints >= 10;
  const isRewardEligible = isVehiclePromoEligible || isPointsEligible;
  const [isFreeWashClaimed, setIsFreeWashClaimed] = useState(false);

  const handleClaimFreeWash = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
    setIsFreeWashClaimed(true);
    setDiscountAmount(ticket.servicePrice);
    toast.success(
      `🎉 Reward Cuci 10x Gratis 1x aktif untuk plat ${ticket.licensePlate}! Biaya jasa cuci menjadi Rp 0.`
    );
  };

  // Kalkulasi Keuangan
  const servicePrice = ticket.servicePrice;

  const retailTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [productId, qty]) => {
      const prod = retailProducts.find((p) => p.id === productId);
      return sum + (prod ? prod.sellingPrice * qty : 0);
    }, 0);
  }, [cart, retailProducts]);

  const pointsDiscount = Math.floor(redeemPoints / 10) * 1000;
  const effectiveDiscount = discountAmount + pointsDiscount;
  const membershipFee = registerMembershipNow ? 50000 : 0;
  const grandTotal = Math.max(
    0,
    servicePrice + retailTotal + membershipFee - effectiveDiscount
  );

  const changeGiven =
    paymentMethod === "CASH" && cashGiven > grandTotal
      ? cashGiven - grandTotal
      : 0;

  // Modifikasi kuantitas keranjang
  const handleUpdateQty = (productId: string, delta: number) => {
    const prod = retailProducts.find((p) => p.id === productId);
    if (!prod) return;

    const currentQty = cart[productId] || 0;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      const copy = { ...cart };
      delete copy[productId];
      setCart(copy);
    } else if (newQty > prod.stock) {
      toast.error(`Stok ${prod.name} hanya tersisa ${prod.stock} unit.`);
    } else {
      setCart({ ...cart, [productId]: newQty });
    }
  };

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount);
  };

  const handleToggleRedeemPoints = (pointsToUse: number) => {
    if (redeemPoints === pointsToUse) {
      setRedeemPoints(0);
    } else {
      setRedeemPoints(pointsToUse);
    }
  };

  const handleProcessCheckout = () => {
    if (paymentMethod === "CASH" && cashGiven < grandTotal) {
      toast.error("Nominal uang tunai kurang dari total tagihan.");
      return;
    }

    startTransition(async () => {
      const itemsPayload = Object.entries(cart).map(([productId, quantity]) => {
        const prod = retailProducts.find((p) => p.id === productId)!;
        return {
          productId,
          quantity,
          unitPrice: prod.sellingPrice,
        };
      });

      const res = await checkoutTicketAction({
        ticketId: ticket.id,
        outletId: ticket.outlet.id,
        paymentMethod,
        cashGiven: paymentMethod === "CASH" ? cashGiven : undefined,
        referenceNumber: referenceNumber || undefined,
        retailItems: itemsPayload,
        discountAmount,
        redeemPoints,
        registerMembership: registerMembershipNow,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal memproses pembayaran kasir.");
        return;
      }

      toast.success("Pembayaran berhasil diselesaikan & struk dicatat!");

      // Siapkan data untuk preview struk cetak
      const itemsForReceipt = Object.entries(cart).map(([productId, qty]) => {
        const prod = retailProducts.find((p) => p.id === productId)!;
        return {
          name: prod.name,
          qty,
          price: prod.sellingPrice,
          subtotal: prod.sellingPrice * qty,
        };
      });

      if (registerMembershipNow) {
        itemsForReceipt.push({
          name: "Pendaftaran Member Resmi (1 Tahun)",
          qty: 1,
          price: 50000,
          subtotal: 50000,
        });
      }

      const washerNames = ticket.washers
        ?.map((w) => w.washer.fullName)
        .join(" & ");
      const vehicleDesc = [
        ticket.vehicle?.brand,
        ticket.vehicle?.model,
        ticket.vehicle?.color,
      ]
        .filter(Boolean)
        .join(" ");

      setReceiptDialogData({
        outletName: ticket.outlet.name,
        outletAddress: ticket.outlet.address,
        outletPhone: ticket.outlet.phone,
        ticketNumber: ticket.ticketNumber,
        dateStr: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        cashierName,
        washerNames,
        licensePlate: ticket.licensePlate,
        vehicleModel: vehicleDesc || undefined,
        serviceName: ticket.servicePackage.name,
        servicePrice: ticket.servicePrice,
        retailItems: itemsForReceipt,
        subtotal: servicePrice + retailTotal,
        discount: effectiveDiscount,
        total: grandTotal,
        paymentMethod,
        cashGiven:
          paymentMethod === "CASH" ? cashGiven || grandTotal : grandTotal,
        changeGiven: res.data.changeGiven,
        customerName: ticket.customer?.fullName,
        loyaltyPoints:
          (ticket.customer?.loyaltyPoints || 0) +
          Math.floor(grandTotal / 10000) -
          redeemPoints,
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
        >
          <Link href="/pos/antrean">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-foreground text-xl font-black sm:text-2xl">
            Kasir & Pembayaran Tiket #{ticket.ticketNumber}
          </h1>
          <p className="text-muted-foreground font-mono text-xs">
            Plat Kendaraan:{" "}
            <strong className="text-foreground">{ticket.licensePlate}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (7 Kolom): Rincian Layanan & Grid Produk Ritel */}
        <div className="space-y-5 lg:col-span-7">
          {/* Card Info Layanan & Washer */}
          <Card className="border shadow-xs">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                    Layanan Utama
                  </span>
                  <h3 className="text-foreground text-base font-black sm:text-lg">
                    {ticket.servicePackage.name}
                  </h3>
                  {ticket.customer && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Pelanggan:{" "}
                      <strong className="text-foreground">
                        {ticket.customer.fullName}
                      </strong>{" "}
                      ({ticket.customer.phone})
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-primary text-lg font-black">
                    {formatRupiah(ticket.servicePrice)}
                  </span>
                  {ticket.washers && ticket.washers.length > 0 && (
                    <span className="text-muted-foreground mt-0.5 block text-[11px]">
                      Pekerja Cuci:{" "}
                      {ticket.washers.map((w) => w.washer.fullName).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Engine Loyalitas Pelanggan (Cuci 10x Gratis 1x - Terkunci ke Plat) */}
          {(ticket.customer || ticket.vehicle) && (
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
                        Loyalitas Plat {ticket.licensePlate} &bull; Kunjungan
                        Ke-
                        {vehicleVisits}
                      </span>
                      {ticket.customer && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                        >
                          {loyaltyPoints} Poin
                        </Badge>
                      )}
                    </div>

                    {isVehiclePromoEligible ? (
                      <div>
                        <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                          🎉 Selamat! Plat {ticket.licensePlate} Berhak Cuci 10x
                          Gratis 1x!
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Mencapai kelipatan 10 kunjungan khusus untuk kendaraan
                          ini. Anda dapat mengklaim diskon 100% jasa cuci
                          sekarang.
                        </p>
                      </div>
                    ) : isPointsEligible ? (
                      <div>
                        <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                          ✨ Pelanggan Memiliki {loyaltyPoints} Poin Loyalitas!
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Poin dapat ditukarkan untuk diskon cuci gratis atau
                          potongan harga belanja.
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Tersisa{" "}
                        <strong className="text-foreground font-bold">
                          {10 - (vehicleVisits % 10)} kunjungan lagi
                        </strong>{" "}
                        untuk plat {ticket.licensePlate} menuju reward Cuci
                        Gratis berikutnya.
                      </p>
                    )}
                  </div>

                  {isRewardEligible && (
                    <Button
                      type="button"
                      variant={isFreeWashClaimed ? "outline" : "default"}
                      disabled={isFreeWashClaimed}
                      onClick={handleClaimFreeWash}
                      className={`h-10 shrink-0 gap-1.5 text-xs font-bold shadow-sm ${
                        isFreeWashClaimed
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {isFreeWashClaimed
                          ? "✓ Cuci Gratis Terpasang"
                          : "Klaim Cuci Gratis 10x"}
                      </span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid Upsell Produk Ritel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Tambah Produk Ritel (Minuman / Parfum / Lap)</span>
              </label>
              <span className="text-muted-foreground text-xs">
                {retailProducts.length} Produk Tersedia
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {retailProducts.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                      qty > 0
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="truncate">
                      <h4 className="text-foreground truncate text-xs font-bold sm:text-sm">
                        {p.name}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="text-primary font-extrabold">
                          {formatRupiah(p.sellingPrice)}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          Stok: {p.stock}
                        </span>
                      </div>
                    </div>

                    {/* Selector Qty */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {qty > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(p.id, -1)}
                            className="bg-muted text-foreground hover:bg-muted/80 flex h-8 w-8 items-center justify-center rounded-lg active:scale-90"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">
                            {qty}
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(p.id, 1)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 w-8 items-center justify-center rounded-lg active:scale-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upsell Pendaftaran Member di Checkout (Rp 50.000) */}
          {ticket.customer && (
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
                    <Crown className="h-5 w-5" />
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
                      WhatsApp {ticket.customer.phone} &bull; Poin akumulatif
                      tiap transaksi &bull; Hak promo Cuci 10x Gratis 1x
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
                      ? "✓ Terpilih (+Rp 50rb)"
                      : "Daftar (+Rp 50rb)"}
                  </span>
                </label>
              </CardContent>
            </Card>
          )}

          {/* Opsi Redeem Poin Loyalty Pelanggan */}
          {ticket.customer && ticket.customer.loyaltyPoints >= 10 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-500" />
                    <span className="text-foreground text-xs font-bold">
                      Tukar Poin Loyalty ({ticket.customer.loyaltyPoints} Poin
                      Tersedia)
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px]">
                    10 Poin = Rp 1.000
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[10, 20, 50, 100].map((pts) => {
                    if (pts > ticket.customer!.loyaltyPoints) return null;
                    const isSelected = redeemPoints === pts;
                    return (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => handleToggleRedeemPoints(pts)}
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
          )}
        </div>

        {/* Kolom Kanan (5 Kolom): Total Tagihan & Opsi Pembayaran */}
        <div className="space-y-5 lg:col-span-5">
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
                {retailTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Produk Ritel Tambahan</span>
                    <span className="text-foreground font-semibold">
                      {formatRupiah(retailTotal)}
                    </span>
                  </div>
                )}
                {registerMembershipNow && (
                  <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1">
                      <Crown className="h-3.5 w-3.5" /> Pendaftaran Member (1
                      Thn)
                    </span>
                    <span>+{formatRupiah(50000)}</span>
                  </div>
                )}
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Potongan Diskon / Poin</span>
                    <span>-{formatRupiah(effectiveDiscount)}</span>
                  </div>
                )}
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
              {ticket.customer && (
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
              )}

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
              {paymentMethod === "CASH" && (
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
              )}

              {/* Opsi Khusus QRIS */}
              {paymentMethod === "QRIS" && (
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
              )}

              {/* Opsi Khusus TRANSFER */}
              {paymentMethod === "BANK_TRANSFER" && (
                <div className="space-y-2 pt-1 text-xs">
                  <div className="bg-muted/50 space-y-1 rounded-xl border p-3">
                    <p className="text-foreground font-bold">
                      BCA: 056-123-4567
                    </p>
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
              )}

              {/* Tombol Eksekusi Bayar Besar */}
              <Button
                type="button"
                disabled={
                  isPending ||
                  (paymentMethod === "CASH" && cashGiven < grandTotal)
                }
                onClick={handleProcessCheckout}
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
                    <span>
                      Bayar & Cetak Struk ({formatRupiah(grandTotal)})
                    </span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Preview Struk Cetak */}
      {receiptDialogData && (
        <ReceiptDialog
          open={!!receiptDialogData}
          onOpenChange={(v) => {
            if (!v) {
              setReceiptDialogData(null);
              router.push("/pos/antrean");
            }
          }}
          receiptData={receiptDialogData}
          customerPhone={ticket.customer?.phone}
          ticketId={ticket.id}
        />
      )}
    </div>
  );
}
