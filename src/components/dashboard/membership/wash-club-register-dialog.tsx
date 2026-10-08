"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  Car,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { subscribeWashClubAction } from "@/actions/wash-club";
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
import { PaymentMethod, VehicleCategory } from "@/generated/prisma/enums";
import { formatLicensePlate, formatRupiah } from "@/lib/formatters";

interface WashClubRegisterDialogProps {
  outletId?: string;
  trigger?: React.ReactNode;
  buttonText?: string;
  className?: string;
}

const DEFAULT_PLANS: Array<{
  name: string;
  category: VehicleCategory;
  price: number;
  label: string;
}> = [
  {
    name: "Unlimited Car Wash Club",
    category: VehicleCategory.MOBIL_SEDANG,
    price: 350000,
    label: "Mobil (Rp 350.000/bln)",
  },
  {
    name: "Unlimited Motor Clean Club",
    category: VehicleCategory.MOTOR_BESAR,
    price: 150000,
    label: "Motor (Rp 150.000/bln)",
  },
  {
    name: "VIP Premium Detailing Club",
    category: VehicleCategory.MOBIL_BESAR,
    price: 600000,
    label: "VIP SUV / Besar (Rp 600.000/bln)",
  },
];

export function WashClubRegisterDialog({
  outletId,
  trigger,
  buttonText = "+ Daftar Unlimited Wash Club",
  className,
}: WashClubRegisterDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [licensePlate, setLicensePlate] = useState("");
  const [category, setCategory] = useState<VehicleCategory>(
    VehicleCategory.MOBIL_SEDANG
  );
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [planName, setPlanName] = useState("Unlimited Car Wash Club");
  const [priceMonthly, setPriceMonthly] = useState(350000);
  const [durationMonths, setDurationMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH
  );
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");

  const handleSelectPreset = (preset: (typeof DEFAULT_PLANS)[number]) => {
    setPlanName(preset.name);
    setCategory(preset.category);
    setPriceMonthly(preset.price);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!licensePlate || licensePlate.trim().length < 3) {
      toast.error("Nomor plat kendaraan wajib diisi.");
      return;
    }
    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 8) {
      toast.error("Nomor WhatsApp pelanggan minimal 8 digit.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await subscribeWashClubAction({
        outletId,
        licensePlate,
        vehicleCategory: category,
        brand: brand || undefined,
        model: model || undefined,
        color: color || undefined,
        customerPhone,
        customerName,
        planName,
        priceMonthly,
        durationMonths,
        paymentMethod,
        paymentRef: paymentRef || undefined,
        notes: notes || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mendaftarkan paket Wash Club.");
        return;
      }

      toast.success(
        `Berhasil mendaftarkan ${res.data.vehicle.licensePlate} ke ${res.data.planName}! Kartu Digital Pass terkirim ke WhatsApp.`
      );
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            className={
              className ||
              "h-10 gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 font-bold text-black shadow-xs hover:from-yellow-400 hover:to-amber-500"
            }
          >
            <Crown className="h-4 w-4" />
            <span>{buttonText}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold sm:text-lg">
                Daftar Unlimited Wash Club Bulanan
              </DialogTitle>
              <DialogDescription className="text-xs">
                Model langganan cuci rutin tanpa batas kuota terkunci pada plat
                kendaraan pelanggan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Preset Paket */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs font-bold uppercase">
              Pilihan Paket Langganan
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DEFAULT_PLANS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left text-xs transition-all ${
                    planName === preset.name
                      ? "border-yellow-500 bg-yellow-500/10 font-bold ring-2 ring-yellow-500/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="text-foreground truncate">
                    {preset.name}
                  </span>
                  <span className="mt-0.5 text-[11px] text-yellow-700 dark:text-yellow-400">
                    {formatRupiah(preset.price)}/bln
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Detail Kendaraan */}
          <div className="border-border bg-muted/20 space-y-3 rounded-xl border p-3.5">
            <span className="text-foreground flex items-center gap-1.5 text-xs font-bold uppercase">
              <Car className="text-primary h-4 w-4" />
              1. Identitas Kendaraan (Terkunci Plat)
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Plat Nomor <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="Misal: B 1234 ABC"
                  value={licensePlate}
                  onChange={(e) =>
                    setLicensePlate(formatLicensePlate(e.target.value))
                  }
                  className="font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Kategori Kendaraan</Label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as VehicleCategory)
                  }
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-xs"
                >
                  <option value={VehicleCategory.MOBIL_SEDANG}>
                    Mobil Sedang (Avanza/Xpander)
                  </option>
                  <option value={VehicleCategory.MOBIL_KECIL}>
                    Mobil Kecil (Brio/Agya)
                  </option>
                  <option value={VehicleCategory.MOBIL_BESAR}>
                    Mobil Besar (Fortuner/Pajero)
                  </option>
                  <option value={VehicleCategory.MOTOR_KECIL}>
                    Motor Kecil (Beat/Mio)
                  </option>
                  <option value={VehicleCategory.MOTOR_BESAR}>
                    Motor Besar (NMax/PCX)
                  </option>
                  <option value={VehicleCategory.MOTOR_MOGE}>
                    Motor Moge (250cc+)
                  </option>
                  <option value={VehicleCategory.KENDARAAN_LAIN}>
                    Niaga / Box
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Merk & Model</Label>
                <Input
                  placeholder="Toyota Avanza"
                  value={brand ? `${brand} ${model}`.trim() : ""}
                  onChange={(e) => {
                    const parts = e.target.value.split(" ");
                    setBrand(parts[0] || "");
                    setModel(parts.slice(1).join(" ") || "");
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Warna</Label>
                <Input
                  placeholder="Hitam Metalik"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Pelanggan */}
          <div className="border-border bg-muted/20 space-y-3 rounded-xl border p-3.5">
            <span className="text-foreground text-xs font-bold uppercase">
              2. Data Pemilik Kendaraan
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Nomor WhatsApp <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="081234567890"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <p className="text-muted-foreground text-[10px]">
                  Kartu Digital Pass akan otomatis dikirim ke nomor ini.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="Budi Santoso"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Pembayaran & Durasi */}
          <div className="border-border bg-muted/20 space-y-3 rounded-xl border p-3.5">
            <span className="text-foreground text-xs font-bold uppercase">
              3. Biaya & Pembayaran Iuran
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Tarif Bulanan</Label>
                <Input
                  type="number"
                  min={0}
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Durasi Langganan</Label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-xs"
                >
                  <option value={1}>1 Bulan (30 Hari)</option>
                  <option value={3}>3 Bulan (90 Hari)</option>
                  <option value={6}>6 Bulan (180 Hari)</option>
                  <option value={12}>1 Tahun (360 Hari)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Metode Bayar</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-xs"
                >
                  <option value={PaymentMethod.CASH}>Tunai (Cash)</option>
                  <option value={PaymentMethod.QRIS}>QRIS Usaha</option>
                  <option value={PaymentMethod.BANK_TRANSFER}>
                    Transfer Bank
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs font-bold">
              <span className="text-muted-foreground">
                Total Tagihan Kasir:
              </span>
              <span className="text-base text-yellow-600 dark:text-yellow-400">
                {formatRupiah(priceMonthly * durationMonths)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 font-bold text-black hover:from-yellow-400 hover:to-amber-500"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4" />
                  <span>Aktifkan Unlimited Wash Club</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
