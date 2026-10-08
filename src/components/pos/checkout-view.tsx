"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import confetti from "canvas-confetti";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { checkoutTicketAction } from "@/actions/pos";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";
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
      `Reward Cuci 10x Gratis 1x aktif untuk plat ${ticket.licensePlate}! Biaya jasa cuci menjadi Rp 0.`
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

        {/* Kolom Kanan (5 Kolom): Total Tagihan & Opsi Pembayaran */}
        <div className="space-y-5 lg:col-span-5">
          <OrderSummaryCard
            servicePrice={servicePrice}
            retailTotal={retailTotal}
            registerMembershipNow={registerMembershipNow}
            effectiveDiscount={effectiveDiscount}
            grandTotal={grandTotal}
            hasCustomer={Boolean(ticket.customer)}
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
