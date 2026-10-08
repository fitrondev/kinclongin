"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import confetti from "canvas-confetti";
import { ArrowLeft, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";

import {
  broadcastCdsCartAction,
  broadcastCdsIdleAction,
  broadcastCdsPaymentSuccessAction,
  broadcastCdsQrisAction,
} from "@/actions/cds";
import { checkoutTicketAction } from "@/actions/pos";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";
import { calculateDiscounts } from "@/lib/pos/discount-engine";
import type { ReceiptData } from "@/lib/printer/escpos";

import { CheckoutLoyaltyBanner } from "./checkout/checkout-loyalty-banner";
import { CheckoutRetailUpsell } from "./checkout/checkout-retail-upsell";
import { OrderSummaryCard } from "./checkout/order-summary-card";
import { PaymentMethodSelector } from "./checkout/payment-method-selector";

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
    logoUrl?: string | null;
    slogan?: string | null;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    contactPhone?: string | null;
    taxEnabled?: boolean;
    taxRate?: number;
    taxType?: "INCLUSIVE" | "EXCLUSIVE";
    taxLabel?: string;
    qrisSurchargeBearer?: "OUTLET" | "CUSTOMER";
    qrisSurchargeRate?: number;
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
  promotions?: import("@/lib/pos/discount-engine").PromotionRuleItem[];
}

export function CheckoutView({
  ticket,
  retailProducts,
  cashierName,
  promotions = [],
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
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [registerMembershipNow, setRegisterMembershipNow] = useState(false);

  // Kupon & Promosi (Pilar 6)
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

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
    toast.success(
      `Reward Cuci 10x Gratis 1x aktif untuk plat ${ticket.licensePlate}! Biaya jasa cuci menjadi Rp 0.`
    );
  };

  // Evaluasi Diskon Promosi & Happy Hour Otomatis (Pilar 6)
  const promoEvaluation = useMemo(() => {
    return calculateDiscounts(ticket.servicePrice, promotions, {
      couponCode: appliedCoupon || undefined,
      now: new Date(),
    });
  }, [ticket.servicePrice, promotions, appliedCoupon]);

  const activePromoDiscount = isFreeWashClaimed
    ? ticket.servicePrice
    : promoEvaluation.totalDiscount;

  const appliedPromoName = isFreeWashClaimed
    ? "Cuci 10x Gratis 1x"
    : promoEvaluation.applicableDiscounts.map((d) => d.name).join(", ") ||
      undefined;

  const handleApplyCoupon = () => {
    if (!couponCodeInput.trim()) {
      setAppliedCoupon(null);
      return;
    }
    const clean = couponCodeInput.trim().toUpperCase();
    const testResult = calculateDiscounts(ticket.servicePrice, promotions, {
      couponCode: clean,
      now: new Date(),
    });
    const foundCouponPromo = testResult.applicableDiscounts.find(
      (d) => d.code?.toUpperCase() === clean
    );
    if (!foundCouponPromo) {
      toast.error(`Kupon '${clean}' tidak valid atau belum memenuhi syarat.`);
      return;
    }
    setAppliedCoupon(clean);
    toast.success(
      `Kupon '${clean}' aktif! Potongan ${formatRupiah(
        foundCouponPromo.calculatedDiscount
      )} diterapkan.`
    );
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    toast.info("Kupon promosi dilepas.");
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
  const effectiveDiscount = activePromoDiscount + pointsDiscount;
  const membershipFee = registerMembershipNow ? 50000 : 0;
  const baseSubtotal = Math.max(
    0,
    servicePrice + retailTotal + membershipFee - effectiveDiscount
  );

  // Surcharge MDR QRIS (Pilar 7)
  let surchargeAmount = 0;
  if (
    paymentMethod === "QRIS" &&
    ticket.outlet.qrisSurchargeBearer === "CUSTOMER"
  ) {
    const mdrRate = ticket.outlet.qrisSurchargeRate ?? 0.7;
    surchargeAmount = Math.round((baseSubtotal * mdrRate) / 100);
  }

  // Pajak Daerah / PB1 (Pilar 7)
  let taxAmount = 0;
  if (ticket.outlet.taxEnabled) {
    const taxRate = ticket.outlet.taxRate ?? 10;
    if (ticket.outlet.taxType === "EXCLUSIVE") {
      taxAmount = Math.round((baseSubtotal * taxRate) / 100);
    } else {
      taxAmount = Math.round(baseSubtotal - baseSubtotal / (1 + taxRate / 100));
    }
  }

  const grandTotal =
    ticket.outlet.taxEnabled && ticket.outlet.taxType === "EXCLUSIVE"
      ? baseSubtotal + taxAmount + surchargeAmount
      : baseSubtotal + surchargeAmount;

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

  const handleToggleRedeemPoints = (pointsToUse: number) => {
    if (redeemPoints === pointsToUse) {
      setRedeemPoints(0);
    } else {
      setRedeemPoints(pointsToUse);
    }
  };

  // Sinkronisasi Real-Time ke Layar Hadap Tamu (Customer Display Screen)
  useEffect(() => {
    if (paymentMethod === "QRIS") {
      void broadcastCdsQrisAction({
        outletId: ticket.outlet.id,
        ticketNumber: ticket.ticketNumber,
        licensePlate: ticket.licensePlate,
        totalAmount: grandTotal,
      });
      return;
    }

    const liveItems: import("@/lib/realtime/events").CdsCartItem[] = [
      {
        name: ticket.servicePackage.name,
        quantity: 1,
        price: ticket.servicePrice,
      },
    ];

    Object.entries(cart).forEach(([productId, qty]) => {
      const prod = retailProducts.find((p) => p.id === productId);
      if (prod && qty > 0) {
        liveItems.push({
          name: prod.name,
          quantity: qty,
          price: prod.sellingPrice,
        });
      }
    });

    if (registerMembershipNow) {
      liveItems.push({
        name: "Membership Resmi (1 Tahun)",
        quantity: 1,
        price: 50000,
      });
    }

    void broadcastCdsCartAction({
      outletId: ticket.outlet.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      licensePlate: ticket.licensePlate,
      customerName: ticket.customer?.fullName,
      items: liveItems,
      subtotal: baseSubtotal + effectiveDiscount,
      discount: effectiveDiscount,
      tax: taxAmount,
      totalAmount: grandTotal,
      paymentMethod,
    });
  }, [
    ticket.outlet.id,
    ticket.id,
    ticket.ticketNumber,
    ticket.licensePlate,
    ticket.customer?.fullName,
    ticket.servicePackage.name,
    ticket.servicePrice,
    cart,
    retailProducts,
    registerMembershipNow,
    baseSubtotal,
    effectiveDiscount,
    taxAmount,
    grandTotal,
    paymentMethod,
  ]);

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
        discountAmount: activePromoDiscount,
        redeemPoints,
        registerMembership: registerMembershipNow,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal memproses pembayaran kasir.");
        return;
      }

      toast.success("Pembayaran berhasil diselesaikan & struk dicatat!");

      // Broadcast animasi pembayaran sukses ke Customer Display Screen
      void broadcastCdsPaymentSuccessAction({
        outletId: ticket.outlet.id,
        ticketNumber: ticket.ticketNumber,
        licensePlate: ticket.licensePlate,
        totalAmount: grandTotal,
      });

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
        slogan: ticket.outlet.slogan,
        receiptHeader: ticket.outlet.receiptHeader,
        receiptFooter: ticket.outlet.receiptFooter,
        contactPhone: ticket.outlet.contactPhone,
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
        promoName: appliedPromoName,
        taxAmount,
        taxLabel: ticket.outlet.taxLabel || "PB1",
        taxType: ticket.outlet.taxType,
        surchargeAmount,
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
          <Link
            href="/pos/antrean"
            onClick={() => {
              void broadcastCdsIdleAction(ticket.outlet.id);
            }}
          >
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
                  {ticket.customer ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Pelanggan:{" "}
                      <strong className="text-foreground">
                        {ticket.customer.fullName}
                      </strong>{" "}
                      ({ticket.customer.phone})
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="text-primary text-lg font-black">
                    {formatRupiah(ticket.servicePrice)}
                  </span>
                  {ticket.washers && ticket.washers.length > 0 ? (
                    <span className="text-muted-foreground mt-0.5 block text-[11px]">
                      Pekerja Cuci:{" "}
                      {ticket.washers.map((w) => w.washer.fullName).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engine Loyalitas Pelanggan (Cuci 10x Gratis 1x & Redeem Poin) */}
          {ticket.customer || ticket.vehicle ? (
            <CheckoutLoyaltyBanner
              licensePlate={ticket.licensePlate}
              vehicleVisits={vehicleVisits}
              loyaltyPoints={loyaltyPoints}
              hasCustomer={Boolean(ticket.customer)}
              isVehiclePromoEligible={isVehiclePromoEligible}
              isPointsEligible={isPointsEligible}
              isRewardEligible={isRewardEligible}
              isFreeWashClaimed={isFreeWashClaimed}
              onClaimFreeWash={handleClaimFreeWash}
              redeemPoints={redeemPoints}
              onToggleRedeemPoints={handleToggleRedeemPoints}
              registerMembershipNow={registerMembershipNow}
              setRegisterMembershipNow={setRegisterMembershipNow}
              customerPhone={ticket.customer?.phone}
            />
          ) : null}

          {/* Grid Upsell Produk Ritel */}
          <CheckoutRetailUpsell
            retailProducts={retailProducts}
            cart={cart}
            onUpdateQty={handleUpdateQty}
          />
        </div>

        {/* Kolom Kanan (5 Kolom): Total Tagihan, Promosi & Opsi Pembayaran */}
        <div className="space-y-5 lg:col-span-5">
          {/* Card Kupon & Promosi Happy Hour (Pilar 6) */}
          <Card className="border shadow-xs">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                  <Tag className="h-4 w-4 text-amber-500" />
                  <span>Kupon Diskon & Happy Hour</span>
                </span>
                {appliedPromoName ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    Aktif
                  </Badge>
                ) : null}
              </div>

              {/* Banner jika ada promosi otomatis / Happy Hour aktif */}
              {promoEvaluation.applicableDiscounts.map((promo) => (
                <div
                  key={promo.ruleId}
                  className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="font-semibold">{promo.name}</span>
                  </div>
                  <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    -{formatRupiah(promo.calculatedDiscount)}
                  </strong>
                </div>
              ))}

              {/* Input Voucher Manual */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="Kode voucher (misal: KOMUNITAS10K)"
                  value={couponCodeInput}
                  onChange={(e) =>
                    setCouponCodeInput(e.target.value.toUpperCase())
                  }
                  disabled={Boolean(appliedCoupon)}
                  className="h-9 text-xs uppercase"
                />
                {appliedCoupon ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    className="text-destructive hover:bg-destructive/10 h-9 text-xs"
                  >
                    Hapus
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyCoupon}
                    className="h-9 text-xs font-bold"
                  >
                    Terapkan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <OrderSummaryCard
            servicePrice={servicePrice}
            retailTotal={retailTotal}
            registerMembershipNow={registerMembershipNow}
            effectiveDiscount={effectiveDiscount}
            grandTotal={grandTotal}
            hasCustomer={Boolean(ticket.customer)}
            promoName={appliedPromoName}
            taxAmount={taxAmount}
            taxLabel={ticket.outlet.taxLabel || "PB1"}
            taxType={ticket.outlet.taxType}
            surchargeAmount={surchargeAmount}
          />

          <Card className="border shadow-xs">
            <CardContent className="p-5">
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                cashGiven={cashGiven}
                setCashGiven={setCashGiven}
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                grandTotal={grandTotal}
                changeGiven={changeGiven}
                isPending={isPending}
                outletName={ticket.outlet.name}
                onProcessCheckout={handleProcessCheckout}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Preview Struk Cetak */}
      {receiptDialogData ? (
        <ReceiptDialog
          open={Boolean(receiptDialogData)}
          onOpenChange={(v) => {
            if (!v) {
              void broadcastCdsIdleAction(ticket.outlet.id);
              setReceiptDialogData(null);
              router.push("/pos/antrean");
            }
          }}
          receiptData={receiptDialogData}
          customerPhone={ticket.customer?.phone}
          ticketId={ticket.id}
        />
      ) : null}
    </div>
  );
}
