"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock,
  Droplets,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Wind,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TicketStatus } from "@/generated/prisma/enums";
import { formatLicensePlate } from "@/lib/formatters";

export interface TrackingData {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  status: TicketStatus;
  serviceName: string;
  servicePrice: number;
  customerName?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  initialNotes?: string | null;
  queuedAt: string;
  washingStartedAt?: string | null;
  dryingStartedAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  washers: string[];
  outlet: {
    name: string;
    address: string;
    phone: string;
    logoUrl?: string | null;
    slogan?: string | null;
  };
}

const STAGES = [
  {
    key: "QUEUED",
    label: "Antrean Masuk",
    desc: "Kendaraan telah tercatat dan menunggu giliran masuk area cuci.",
    icon: Clock,
  },
  {
    key: "WASHING",
    label: "Proses Pencucian",
    desc: "Pembersihan aktif dengan busa salju premium & hydro-jet kolong.",
    icon: Droplets,
  },
  {
    key: "DRYING",
    label: "Finishing & Lap Kering",
    desc: "Pengeringan lap microfiber, vakum interior, dan semir ban berkilau.",
    icon: Wind,
  },
  {
    key: "READY",
    label: "Siap Diambil",
    desc: "Kendaraan telah bersih kinclong dan siap diserahterimakan.",
    icon: Sparkles,
  },
  {
    key: "COMPLETED",
    label: "Selesai",
    desc: "Transaksi tuntas dan kendaraan telah keluar dari outlet.",
    icon: CheckCircle2,
  },
];

export function TrackingView({ initialData }: { initialData: TrackingData }) {
  const router = useRouter();
  const data = initialData;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Hitung durasi waktu pengerjaan
  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(data.queuedAt).getTime();
      const end = data.completedAt
        ? new Date(data.completedAt).getTime()
        : Date.now();
      const diff = Math.floor((end - start) / 60000);
      setElapsedMinutes(Math.max(0, diff));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000);
    return () => clearInterval(interval);
  }, [data.queuedAt, data.completedAt]);

  // Polling pembaruan status setiap 12 detik
  useEffect(() => {
    if (data.status === "COMPLETED" || data.status === "CANCELLED") return;

    const pollInterval = setInterval(() => {
      router.refresh();
    }, 12000);

    return () => clearInterval(pollInterval);
  }, [data.status, router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const currentStageIndex = STAGES.findIndex((s) => s.key === data.status);
  const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

  const waOutletUrl = `https://wa.me/${data.outlet.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    `Halo ${data.outlet.name}, saya ingin menanyakan status cuci kendaraan nomor plat ${data.licensePlate} (Tiket #${data.ticketNumber}).`
  )}`;

  return (
    <div className="text-foreground min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-xl space-y-5">
        {/* Header Outlet */}
        <header className="bg-card flex items-center justify-between rounded-2xl border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1 shadow-sm">
              {data.outlet.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.outlet.logoUrl}
                  alt={data.outlet.name}
                  className="h-8 w-8 rounded-md object-contain"
                />
              ) : (
                <Image
                  src="/logoipsum.svg"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="h-7 w-7 object-contain"
                />
              )}
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                {data.outlet.name}
              </h1>
              {data.outlet.slogan ? (
                <p className="text-primary text-[11px] font-medium italic">
                  &ldquo;{data.outlet.slogan}&rdquo;
                </p>
              ) : null}
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {data.outlet.address}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-xl"
            title="Perbarui Status"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </header>

        {/* Hero Card Kendaraan & Status Utama */}
        <Card className="border-primary/20 bg-card overflow-hidden border-2 shadow-md">
          <div className="bg-primary/10 border-primary/15 flex items-center justify-between border-b px-5 py-3 text-xs">
            <span className="text-primary font-mono font-bold">
              #{data.ticketNumber}
            </span>
            <div className="text-muted-foreground flex items-center gap-1.5 font-semibold">
              <Clock className="text-primary h-3.5 w-3.5" />
              <span>Durasi: {elapsedMinutes} Menit</span>
            </div>
          </div>

          <CardContent className="space-y-3 p-6 text-center">
            <div className="inline-block rounded-xl border-2 border-slate-700 bg-slate-900 px-6 py-2.5 font-mono text-3xl font-black tracking-widest text-white shadow-inner sm:text-4xl">
              {formatLicensePlate(data.licensePlate)}
            </div>

            <div className="space-y-1">
              <p className="text-foreground text-base font-bold">
                {data.serviceName}
              </p>
              <p className="text-muted-foreground text-xs">
                {[data.vehicleBrand, data.vehicleModel, data.vehicleColor]
                  .filter(Boolean)
                  .join(" • ") || "Kendaraan Pelanggan"}
              </p>
            </div>

            {/* Status Live Pill */}
            <div className="pt-2">
              {data.status === "QUEUED" && (
                <Badge className="border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  Menunggu Giliran Cuci
                </Badge>
              )}
              {data.status === "WASHING" && (
                <Badge className="animate-pulse border-blue-500/30 bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                  Sedang Dicuci Busa Salju
                </Badge>
              )}
              {data.status === "DRYING" && (
                <Badge className="border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                  Proses Pengeringan & Finishing
                </Badge>
              )}
              {data.status === "READY" && (
                <Badge className="animate-bounce items-center gap-1.5 border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Bersih Kinclong & Siap Diambil!</span>
                </Badge>
              )}
              {data.status === "COMPLETED" && (
                <Badge className="border-slate-500/30 bg-slate-500/15 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Selesai & Keluar
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stepper Progres Alur Cuci (5 Tahap Visual) */}
        <Card className="bg-card border shadow-xs">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <h2 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Alur Pengerjaan Kendaraan
            </h2>

            <div className="border-muted relative ml-3 space-y-6 border-l-2 pl-6">
              {STAGES.map((stage, idx) => {
                const isPassed = idx < activeIndex;
                const isCurrent = idx === activeIndex;
                const StageIcon = stage.icon;

                return (
                  <div key={stage.key} className="relative">
                    {/* Circle Bullet Icon */}
                    <div
                      className={`absolute top-0 -left-8.75 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                        isPassed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isCurrent
                            ? "bg-primary border-primary text-primary-foreground ring-primary/20 animate-pulse shadow-md ring-4"
                            : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      <StageIcon className="h-4 w-4" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-bold ${
                            isCurrent
                              ? "text-primary"
                              : isPassed
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </h3>
                        {isCurrent && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 py-0 text-[10px] font-bold"
                          >
                            Proses Aktif
                          </Badge>
                        )}
                        {isPassed && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Selesai
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Petugas Cuci & Catatan Masuk */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="bg-card border shadow-xs">
            <CardContent className="space-y-1 p-4">
              <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <User className="text-primary h-3 w-3" />
                <span>Petugas Cuci</span>
              </span>
              <p className="text-foreground text-sm font-bold">
                {data.washers.length > 0
                  ? data.washers.join(", ")
                  : "Menunggu penugasan kru"}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Kru spesialis cuci {data.outlet.name}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-xs">
            <CardContent className="space-y-1 p-4">
              <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <ShieldCheck className="text-primary h-3 w-3" />
                <span>Kondisi Awal</span>
              </span>
              <p className="text-foreground line-clamp-2 text-xs font-medium">
                {data.initialNotes ||
                  "Kendaraan tercatat rapi tanpa keluhan khusus"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer Kontak Bantuan & WhatsApp */}
        <div className="bg-card flex flex-col items-center justify-between gap-3 rounded-2xl border p-4 shadow-xs sm:flex-row">
          <div className="text-center text-xs sm:text-left">
            <p className="text-foreground font-bold">
              Butuh Bantuan atau Informasi?
            </p>
            <p className="text-muted-foreground">
              Hubungi kasir & customer service cabang
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="h-9 w-full gap-1.5 bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 sm:w-auto"
          >
            <a href={waOutletUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              <span>Chat WhatsApp Outlet</span>
            </a>
          </Button>
        </div>

        <footer className="text-muted-foreground pb-6 text-center text-[11px]">
          <p>{data.outlet.name} &bull; Lacak Status Cuci Real-Time</p>
        </footer>
      </div>
    </div>
  );
}
