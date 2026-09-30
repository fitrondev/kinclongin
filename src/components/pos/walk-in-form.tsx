"use client";

import { useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Phone,
  Search,
  Sparkles,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { createWashTicketAction } from "@/actions/pos";
import { InspectionCamera } from "@/components/pos/inspection-camera";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VehicleCategory } from "@/generated/prisma/enums";
import {
  VEHICLE_CATEGORY_LABELS,
  formatLicensePlate,
  formatRupiah,
} from "@/lib/formatters";
import { cacheMasterData, saveOfflineTicket } from "@/lib/offline/sync-manager";

interface ServicePackageItem {
  id: string;
  name: string;
  description: string | null;
  vehicleCategory: string;
  price: number | { toNumber?: () => number };
  estimatedMinutes: number;
}

interface WalkInFormProps {
  outletId: string;
  servicePackages: ServicePackageItem[];
}

const CATEGORY_OPTIONS: Array<{
  id: VehicleCategory;
  label: string;
  sub: string;
  icon: typeof Bike;
}> = [
  {
    id: "MOTOR_KECIL",
    label: "Motor Kecil",
    sub: "Beat, Mio, Vario",
    icon: Bike,
  },
  {
    id: "MOTOR_BESAR",
    label: "Motor Besar",
    sub: "NMax, PCX, Vespa",
    icon: Bike,
  },
  {
    id: "MOTOR_MOGE",
    label: "Moge (250cc+)",
    sub: "Ninja, Harley",
    icon: Bike,
  },
  {
    id: "MOBIL_KECIL",
    label: "Mobil Kecil",
    sub: "Brio, Agya, Yaris",
    icon: Car,
  },
  {
    id: "MOBIL_SEDANG",
    label: "Mobil Sedang",
    sub: "Avanza, Xpander",
    icon: Car,
  },
  {
    id: "MOBIL_BESAR",
    label: "Mobil Besar",
    sub: "Fortuner, Pajero",
    icon: Car,
  },
  {
    id: "KENDARAAN_LAIN",
    label: "Niaga / Box",
    sub: "Pick-up, Truk",
    icon: Truck,
  },
];

export function WalkInForm({ outletId, servicePackages }: WalkInFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [licensePlate, setLicensePlate] = useState("");
  const [category, setCategory] = useState<VehicleCategory>("MOBIL_SEDANG");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>([]);

  // Lookup state
  const [isSearchingPlate, setIsSearchingPlate] = useState(false);
  const [recognizedCustomer, setRecognizedCustomer] = useState<{
    fullName: string;
    totalVisits: number;
    loyaltyPoints: number;
    vehicleTotalVisits: number;
    isRewardEligible: boolean;
    visitsToReward: number;
    lastServicePackageName?: string;
  } | null>(null);

  // Simpan master data layanan ke IndexedDB untuk cadangan offline
  useEffect(() => {
    if (servicePackages && servicePackages.length > 0) {
      cacheMasterData("servicePackages", servicePackages);
    }
  }, [servicePackages]);

  // Filter paket layanan sesuai kategori kendaraan terpilih
  const filteredServices = servicePackages.filter(
    (s) => s.vehicleCategory === category
  );

  // Turunkan paket layanan aktif yang valid secara murni tanpa efek samping
  const activeServiceId = filteredServices.some(
    (s) => s.id === selectedServiceId
  )
    ? selectedServiceId
    : filteredServices[0]?.id || "";

  // Debounce lookup plat nomor
  useEffect(() => {
    const clean = licensePlate.replace(/\s+/g, "").trim();
    if (clean.length < 4) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPlate(true);
        const res = await fetch(
          `/api/pos/lookup-plate?plate=${encodeURIComponent(clean)}`
        );
        const data = await res.json();

        if (data.found && data.vehicle) {
          if (data.vehicle.category) {
            setCategory(data.vehicle.category as VehicleCategory);
          }
          if (data.vehicle.brand) setBrand(data.vehicle.brand);
          if (data.vehicle.model) setModel(data.vehicle.model);
          if (data.vehicle.color) setColor(data.vehicle.color);

          if (data.customer) {
            setCustomerPhone(data.customer.phone || "");
            setCustomerName(data.customer.fullName || "");
            setRecognizedCustomer({
              fullName: data.customer.fullName,
              totalVisits: data.customer.totalVisits,
              loyaltyPoints: data.customer.loyaltyPoints,
              vehicleTotalVisits: data.vehicle.totalVisits || 0,
              isRewardEligible: !!data.vehicle.isRewardEligible,
              visitsToReward: data.vehicle.visitsToReward ?? 0,
              lastServicePackageName: data.lastService?.servicePackageName,
            });
            toast.info(
              `Kendaraan dikenali: ${data.vehicle.brand || ""} ${data.vehicle.model || ""}`
            );
          }
        } else {
          setRecognizedCustomer(null);
        }
      } catch {
        // Silently ignore lookup error
      } finally {
        setIsSearchingPlate(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [licensePlate]);

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicensePlate(e.target.value);
    setLicensePlate(formatted);
    if (formatted.replace(/\s+/g, "").trim().length < 4) {
      setRecognizedCustomer(null);
    }
  };

  const handleOfflineSave = async () => {
    const selectedService = servicePackages.find(
      (s) => s.id === activeServiceId
    );
    const priceNum =
      typeof selectedService?.price === "object" &&
      selectedService?.price &&
      "toNumber" in selectedService.price
        ? (selectedService.price as { toNumber: () => number }).toNumber()
        : Number(selectedService?.price || 0);

    const offlineTicket = await saveOfflineTicket({
      outletId,
      licensePlate,
      vehicleCategory: category,
      servicePackageId: activeServiceId,
      servicePackageName: selectedService?.name || "Cuci Kendaraan",
      servicePrice: priceNum,
      customerPhone: customerPhone || undefined,
      customerName: customerName || undefined,
      initialNotes: initialNotes || undefined,
      inspectionPhotos:
        inspectionPhotos.length > 0 ? inspectionPhotos : undefined,
      brand: brand || undefined,
      model: model || undefined,
      color: color || undefined,
    });

    toast.warning(
      `[Mode Luring] Tiket #${offlineTicket.ticketNumber} tersimpan lokal! Akan otomatis disinkronkan saat terhubung kembali.`
    );
    router.push("/pos/antrean");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!licensePlate || licensePlate.trim().length < 3) {
      toast.error("Nomor plat kendaraan wajib diisi.");
      return;
    }

    if (!activeServiceId) {
      toast.error("Pilih salah satu paket layanan cuci.");
      return;
    }

    startTransition(async () => {
      // Cek koneksi browser secara langsung
      if (typeof window !== "undefined" && !navigator.onLine) {
        await handleOfflineSave();
        return;
      }

      try {
        const res = await createWashTicketAction({
          outletId,
          licensePlate,
          vehicleCategory: category,
          servicePackageId: activeServiceId,
          customerPhone: customerPhone || undefined,
          customerName: customerName || undefined,
          initialNotes: initialNotes || undefined,
          inspectionPhotos:
            inspectionPhotos.length > 0 ? inspectionPhotos : undefined,
          brand: brand || undefined,
          model: model || undefined,
          color: color || undefined,
        });

        if (!res.success || !res.data) {
          toast.error(res.error || "Gagal membuat tiket antrean.");
          return;
        }

        toast.success(`Tiket #${res.data.ticketNumber} berhasil didaftarkan!`);
        router.push("/pos/antrean");
      } catch {
        // Fallback simpan lokal jika koneksi terputus saat request
        await handleOfflineSave();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Header Input Plat Nomor Cerdas */}
      <Card className="border-primary/20 shadow-xs">
        <CardContent className="space-y-4 pt-6 pb-6">
          <div>
            <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase">
              Nomor Plat Kendaraan (Wajib)
            </label>
            <div className="relative">
              <Input
                type="text"
                autoFocus
                placeholder="Contoh: DR 1234 AB"
                value={licensePlate}
                onChange={handlePlateChange}
                className="border-primary/40 focus:border-primary text-foreground h-16 border-2 pr-12 pl-4 text-2xl font-extrabold tracking-wider uppercase sm:text-3xl"
              />
              <div className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2">
                {isSearchingPlate ? (
                  <Loader2 className="text-primary h-6 w-6 animate-spin" />
                ) : (
                  <Search className="h-6 w-6" />
                )}
              </div>
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Ketik huruf & angka tanpa spasi (otomatis dirapikan oleh sistem).
            </p>
          </div>

          {/* Banner Pelanggan & Kendaraan Terdaftar Otomatis */}
          {recognizedCustomer && (
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-950 sm:flex-row sm:items-start sm:justify-between dark:text-emerald-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs leading-relaxed">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {recognizedCustomer.fullName}
                    </p>
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                      Plat {licensePlate} (Kunjungan ke-
                      {recognizedCustomer.vehicleTotalVisits + 1})
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Saldo Loyalty Akun:{" "}
                    <strong className="text-foreground font-semibold">
                      {recognizedCustomer.loyaltyPoints} Poin
                    </strong>
                    {recognizedCustomer.lastServicePackageName && (
                      <>
                        {" "}
                        • Layanan terakhir:{" "}
                        <em className="text-foreground">
                          {recognizedCustomer.lastServicePackageName}
                        </em>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Status Promo Cuci 10x Gratis 1x Plat Ini */}
              <div className="sm:text-right">
                {recognizedCustomer.isRewardEligible ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                    Kunjungan ke-10: Berhak Cuci Gratis!
                  </span>
                ) : (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                    Sisa{" "}
                    <strong className="text-foreground font-bold">
                      {recognizedCustomer.visitsToReward} kunjungan
                    </strong>{" "}
                    menuju Promo Cuci Gratis
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Pemilihan Kategori Kendaraan */}
      <div className="space-y-2">
        <label className="text-muted-foreground block text-xs font-bold tracking-wider uppercase">
          Pilih Kategori Kendaraan
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = category === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategory(opt.id)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground ring-primary/20 shadow-sm ring-2"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`mb-1.5 h-6 w-6 ${isSelected ? "text-primary-foreground" : "text-primary"}`}
                />
                <span className="text-xs leading-tight font-bold">
                  {opt.label}
                </span>
                <span
                  className={`mt-0.5 text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Paket Layanan Cuci Tersedia */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Pilih Paket Layanan ({VEHICLE_CATEGORY_LABELS[category] || category}
            )
          </label>
          <span className="text-muted-foreground text-xs">
            {filteredServices.length} Paket Tersedia
          </span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center">
            <HelpCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm font-semibold">
              Tidak ada paket layanan untuk kategori ini.
            </p>
            <p className="mt-1 text-xs">
              Tambahkan paket cuci di menu Master Layanan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((pkg) => {
              const isSelected = activeServiceId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedServiceId(pkg.id)}
                  className={`relative flex cursor-pointer flex-col justify-between rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div>
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <h4 className="text-foreground text-sm leading-snug font-extrabold">
                        {pkg.name}
                      </h4>
                      {isSelected && (
                        <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-muted-foreground mb-3 line-clamp-2 text-xs">
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 text-xs">
                    <span className="text-primary text-base font-black">
                      {formatRupiah(pkg.price)}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {pkg.estimatedMinutes} Menit
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Dokumentasi Inspeksi & Catatan Fisik */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <InspectionCamera
            outletId={outletId}
            photos={inspectionPhotos}
            onChange={setInspectionPhotos}
          />

          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-semibold tracking-wider uppercase">
              Catatan Kondisi Awal Kendaraan
            </label>
            <Input
              type="text"
              placeholder="Contoh: Baret halus di spion kanan, velg minta dipoles ekstra..."
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              className="h-11 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Informasi Pelanggan & WhatsApp (Opsional untuk Struk WA) */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
              <Phone className="h-3.5 w-3.5" />
              <span>Kontak Pelanggan (Untuk Struk WA & Loyalty)</span>
            </label>
            <span className="text-muted-foreground text-[11px]">Opsional</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                type="tel"
                placeholder="Nomor WhatsApp (Contoh: 081234567890)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-11 text-sm"
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Nama Pelanggan (Contoh: Pak Hendra)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-11 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Tombol Submit Besar Ergonomis */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending || !licensePlate || !activeServiceId}
          className="h-16 w-full gap-2 text-lg font-bold shadow-md transition-transform hover:scale-[1.005] active:scale-[0.995]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Mendaftarkan Tiket Cuci...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-6 w-6" />
              <span>Daftarkan Antrean & Cetak Tiket</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
