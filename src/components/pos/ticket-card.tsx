"use client";

import { useEffect, useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle,
  Clock,
  CreditCard,
  Droplets,
  Eye,
  Loader2,
  Sparkles,
  UserCheck,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

import { advanceTicketStatusAction } from "@/actions/pos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TicketStatus } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

export interface KanbanTicket {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  servicePackage: {
    id: string;
    name: string;
    estimatedMinutes: number;
    price: number | { toNumber?: () => number };
  };
  customer?: {
    fullName: string;
    phone: string;
  } | null;
  vehicle?: {
    brand?: string | null;
    model?: string | null;
    color?: string | null;
  } | null;
  status: TicketStatus;
  initialNotes?: string | null;
  inspectionPhotos?: unknown;
  queuedAt: string | Date;
  washingStartedAt?: string | Date | null;
  dryingStartedAt?: string | Date | null;
  readyAt?: string | Date | null;
  washers?: {
    washer: {
      fullName: string;
    };
  }[];
  isOffline?: boolean;
}

interface TicketCardProps {
  ticket: KanbanTicket;
  onStatusChanged?: () => void;
}

export function TicketCard({ ticket, onStatusChanged }: TicketCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Parse inspection photos JSON safely
  let photos: string[] = [];
  if (Array.isArray(ticket.inspectionPhotos)) {
    photos = ticket.inspectionPhotos as string[];
  } else if (typeof ticket.inspectionPhotos === "string") {
    try {
      photos = JSON.parse(ticket.inspectionPhotos);
    } catch {
      photos = [];
    }
  }

  // Menghitung live elapsed time berdasarkan waktu masuk tahap ini
  useEffect(() => {
    const getStageStartTime = () => {
      if (ticket.status === "READY" && ticket.readyAt)
        return new Date(ticket.readyAt);
      if (ticket.status === "DRYING" && ticket.dryingStartedAt)
        return new Date(ticket.dryingStartedAt);
      if (ticket.status === "WASHING" && ticket.washingStartedAt)
        return new Date(ticket.washingStartedAt);
      return new Date(ticket.queuedAt);
    };

    const calculate = () => {
      const start = getStageStartTime();
      const diffMs = Date.now() - start.getTime();
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    };

    calculate();
    const interval = setInterval(calculate, 30000); // Update setiap 30 detik
    return () => clearInterval(interval);
  }, [ticket]);

  // Penentuan warna timer dinamis
  const getTimerColorClass = () => {
    if (elapsedMinutes >= 35) {
      return "bg-destructive/10 text-destructive border-destructive/30 font-bold animate-pulse";
    }
    if (elapsedMinutes >= 20) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold";
    }
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium";
  };

  const handleAdvance = (nextStatus: "WASHING" | "DRYING" | "READY") => {
    startTransition(async () => {
      const res = await advanceTicketStatusAction({
        ticketId: ticket.id,
        nextStatus,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memajukan status antrean.");
        return;
      }

      toast.success(
        `Tiket #${ticket.ticketNumber} dipindahkan ke ${nextStatus}!`
      );
      onStatusChanged?.();
    });
  };

  const vehicleSubtitle = [
    ticket.vehicle?.brand,
    ticket.vehicle?.model,
    ticket.vehicle?.color,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
      <Card className="group bg-card relative overflow-hidden border shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        {/* Top bar indicator */}
        <div className="flex items-center justify-between border-b px-3.5 pt-3 pb-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-mono font-bold">
              #{ticket.ticketNumber}
            </span>
            {ticket.isOffline && (
              <Badge
                variant="outline"
                className="h-4 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-bold text-amber-600 dark:text-amber-400"
              >
                Luring
              </Badge>
            )}
          </div>
          <div
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${getTimerColorClass()}`}
          >
            <Clock className="h-3 w-3" />
            <span>{elapsedMinutes} Menit</span>
          </div>
        </div>

        <CardHeader className="space-y-1 p-3.5 pb-2">
          {/* Nomor Plat Besar & Tegas */}
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-foreground font-mono text-xl font-black tracking-wider">
              {ticket.licensePlate}
            </h3>
            <button
              type="button"
              onClick={() => setShowDetailDialog(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1 transition-colors"
              title="Lihat detail tiket"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {vehicleSubtitle && (
            <p className="text-muted-foreground truncate text-xs font-medium">
              {vehicleSubtitle}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-2 p-3.5 pt-0 pb-3">
          {/* Paket Layanan Badge */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground max-w-45 truncate font-semibold">
              {ticket.servicePackage.name}
            </span>
            <span className="text-primary shrink-0 font-bold">
              {formatRupiah(ticket.servicePackage.price)}
            </span>
          </div>

          {/* Staf Washer / Petugas */}
          {ticket.washers && ticket.washers.length > 0 && (
            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <UserCheck className="text-primary h-3.5 w-3.5" />
              <span className="truncate">
                {ticket.washers.map((w) => w.washer.fullName).join(", ")}
              </span>
            </div>
          )}

          {/* Catatan / Baret preview */}
          {ticket.initialNotes && (
            <div className="bg-muted/60 text-muted-foreground line-clamp-1 rounded p-1.5 text-[11px] italic">
              &quot;{ticket.initialNotes}&quot;
            </div>
          )}
        </CardContent>

        {/* Action Button sesuai kolom */}
        <CardFooter className="bg-muted/20 border-t p-3.5 pt-2">
          {ticket.status === "QUEUED" && (
            <Button
              onClick={() => handleAdvance("WASHING")}
              disabled={isPending}
              size="sm"
              className="h-10 w-full gap-1.5 bg-blue-600 font-bold text-white hover:bg-blue-700"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Droplets className="h-4 w-4" />
                  <span>Mulai Cuci</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}

          {ticket.status === "WASHING" && (
            <Button
              onClick={() => handleAdvance("DRYING")}
              disabled={isPending}
              size="sm"
              className="h-10 w-full gap-1.5 bg-purple-600 font-bold text-white hover:bg-purple-700"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Wind className="h-4 w-4" />
                  <span>Pindah ke Lap</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}

          {ticket.status === "DRYING" && (
            <Button
              onClick={() => handleAdvance("READY")}
              disabled={isPending}
              size="sm"
              className="h-10 w-full gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>QC Selesai (Siap)</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}

          {ticket.status === "READY" && (
            <Button
              asChild
              size="sm"
              className="bg-primary text-primary-foreground h-10 w-full gap-1.5 font-bold"
            >
              <Link href={`/pos/bayar/${ticket.id}`}>
                <CreditCard className="h-4 w-4" />
                <span>Kasir & Bayar</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </Link>
            </Button>
          )}

          {ticket.status === "COMPLETED" && (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span>Selesai & Lunas</span>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs font-semibold"
              >
                <Link href={`/pos/bayar/${ticket.id}`}>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Struk</span>
                </Link>
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Modal Detail Tiket & Foto Inspeksi */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="font-mono font-black">
                {ticket.licensePlate}
              </span>
              <Badge variant="outline" className="text-xs">
                #{ticket.ticketNumber}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted rounded-lg p-2.5">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
                  Paket Layanan
                </span>
                <span className="text-foreground font-bold">
                  {ticket.servicePackage.name}
                </span>
              </div>
              <div className="bg-muted rounded-lg p-2.5">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
                  Tarif
                </span>
                <span className="text-primary font-black">
                  {formatRupiah(ticket.servicePackage.price)}
                </span>
              </div>
            </div>

            {ticket.customer && (
              <div className="space-y-1 rounded-lg border p-3 text-xs">
                <p className="text-foreground font-bold">
                  {ticket.customer.fullName}
                </p>
                <p className="text-muted-foreground font-mono">
                  {ticket.customer.phone}
                </p>
              </div>
            )}

            {ticket.initialNotes && (
              <div>
                <span className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wider uppercase">
                  Catatan Kondisi Awal
                </span>
                <p className="bg-muted/60 text-foreground rounded p-2.5 text-xs">
                  {ticket.initialNotes}
                </p>
              </div>
            )}

            {photos.length > 0 && (
              <div>
                <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
                  Foto Inspeksi Fisik ({photos.length})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((pUrl, i) => (
                    <a
                      key={pUrl + i}
                      href={pUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted relative aspect-video overflow-hidden rounded-lg border"
                    >
                      <Image
                        src={pUrl}
                        alt={`Inspeksi ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
