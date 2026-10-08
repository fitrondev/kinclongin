"use client";

import { useTransition } from "react";

import {
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  RotateCcw,
  Sparkles,
  Timer,
  UserCheck,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

import { advanceTicketStatusAction } from "@/actions/pos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { TicketStatus } from "@/generated/prisma/enums";
import {
  formatLicensePlate,
  formatRupiah,
  getElapsedMinutes,
} from "@/lib/formatters";

export interface LayarCuciItem {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  status: TicketStatus;
  servicePackage: {
    id: string;
    name: string;
    defaultCommission: number | { toNumber?: () => number };
    estimatedMinutes: number;
  };
  vehicle?: {
    brand?: string | null;
    model?: string | null;
    color?: string | null;
  } | null;
  initialNotes?: string | null;
  queuedAt?: Date | string | null;
  washingStartedAt?: Date | string | null;
  dryingStartedAt?: Date | string | null;
  readyAt?: Date | string | null;
  washers?: {
    washer: {
      id: string;
      fullName: string;
    };
    commissionAmount: number | { toNumber?: () => number };
  }[];
}

interface LayarCuciCardProps {
  ticket: LayarCuciItem;
  onOpenPinModal: (ticket: LayarCuciItem) => void;
  onRefresh?: () => void;
}

export function LayarCuciCard({
  ticket,
  onOpenPinModal,
  onRefresh,
}: LayarCuciCardProps) {
  const [isPending, startTransition] = useTransition();

  const commission = Number(ticket.servicePackage.defaultCommission);
  const vehicleText = [
    ticket.vehicle?.brand,
    ticket.vehicle?.model,
    ticket.vehicle?.color,
  ]
    .filter(Boolean)
    .join(" • ");

  // Hitung durasi proses berdasarkan status saat ini
  const relevantStartTime =
    ticket.status === "WASHING"
      ? ticket.washingStartedAt || ticket.queuedAt
      : ticket.status === "DRYING"
        ? ticket.dryingStartedAt || ticket.washingStartedAt || ticket.queuedAt
        : ticket.status === "READY"
          ? ticket.readyAt
          : ticket.queuedAt;

  const elapsedMinutes = relevantStartTime
    ? getElapsedMinutes(relevantStartTime)
    : 0;

  const handleAdvanceStatus = (nextStatus: "DRYING" | "READY" | "WASHING") => {
    startTransition(async () => {
      const res = await advanceTicketStatusAction({
        ticketId: ticket.id,
        nextStatus,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui status pengerjaan.");
        return;
      }

      toast.success(
        `Kendaraan ${ticket.licensePlate} dipindahkan ke tahap ${nextStatus}!`
      );
      onRefresh?.();
    });
  };

  const isTandem = ticket.washers && ticket.washers.length > 1;

  return (
    <Card className="bg-card flex flex-col justify-between overflow-hidden border-2 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        {/* Header bar: status & komisi */}
        <div className="bg-muted/40 flex items-center justify-between border-b p-3.5 sm:p-4">
          <Badge
            variant="outline"
            className={`px-3 py-1 text-xs font-black tracking-wide uppercase ${
              ticket.status === "QUEUED"
                ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : ticket.status === "WASHING"
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : ticket.status === "DRYING"
                    ? "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {ticket.status === "QUEUED" && "Menunggu Antrean"}
            {ticket.status === "WASHING" && "Sedang Cuci Basah"}
            {ticket.status === "DRYING" && "Pengeringan & Semir"}
            {ticket.status === "READY" && "✓ Siap Diambil"}
          </Badge>

          <div className="text-right">
            <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
              Komisi Unit
            </span>
            <span className="text-primary font-mono text-sm font-black sm:text-base">
              {formatRupiah(commission)}
            </span>
          </div>
        </div>

        {/* Info Plat & Kendaraan */}
        <CardContent className="space-y-3.5 p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-foreground font-mono text-2xl font-black tracking-wider sm:text-3xl md:text-4xl">
                {formatLicensePlate(ticket.licensePlate)}
              </h2>
              {/* Live Elapsed Badge */}
              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                  elapsedMinutes > ticket.servicePackage.estimatedMinutes
                    ? "bg-destructive/15 text-destructive border-destructive/30 border"
                    : "bg-muted text-muted-foreground"
                }`}
                title={`Target estimasi: ${ticket.servicePackage.estimatedMinutes} menit`}
              >
                <Timer className="h-3.5 w-3.5 shrink-0" />
                <span>{elapsedMinutes}m</span>
              </div>
            </div>

            {vehicleText ? (
              <p className="text-muted-foreground mt-1 text-xs font-semibold sm:text-sm">
                {vehicleText}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs">
                #{ticket.ticketNumber}
              </p>
            )}
          </div>

          <div className="bg-muted/50 space-y-1 rounded-xl border p-3 text-xs sm:text-sm">
            <div className="text-foreground flex items-center justify-between font-bold">
              <span>{ticket.servicePackage.name}</span>
              <span className="text-muted-foreground flex items-center gap-1 text-xs font-normal">
                <Clock className="h-3 w-3" />
                Est. {ticket.servicePackage.estimatedMinutes} Mnt
              </span>
            </div>
            {ticket.initialNotes && (
              <p className="text-muted-foreground line-clamp-1 text-xs italic">
                &quot;{ticket.initialNotes}&quot;
              </p>
            )}
          </div>

          {/* Staf Bertugas jika sedang dikerjakan */}
          {ticket.washers && ticket.washers.length > 0 && (
            <div className="bg-primary/10 border-primary/20 text-primary flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs font-semibold">
              <div className="flex min-w-0 items-center gap-2">
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {ticket.washers.map((w) => w.washer.fullName).join(" & ")}
                </span>
              </div>
              <Badge
                variant="outline"
                className="bg-card text-foreground shrink-0 text-[10px] font-bold"
              >
                {isTandem ? "Tandem (50/50)" : "Solo (100%)"}
              </Badge>
            </div>
          )}
        </CardContent>
      </div>

      {/* Action Button Besar (Minimal h-16 s.d. h-20) untuk Layar Sentuh Tablet Area Basah */}
      <CardFooter className="p-4 pt-0">
        {ticket.status === "QUEUED" && (
          <Button
            type="button"
            onClick={() => onOpenPinModal(ticket)}
            className="bg-primary text-primary-foreground h-16 w-full gap-2 rounded-2xl text-base font-black shadow-md transition-transform hover:scale-[1.01] active:scale-[0.98] sm:h-20 sm:text-xl"
          >
            <Sparkles className="h-6 w-6" />
            <span>Klaim & Mulai Cuci (PIN)</span>
          </Button>
        )}

        {ticket.status === "WASHING" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvanceStatus("DRYING")}
            className="h-16 w-full gap-2.5 rounded-2xl bg-purple-600 text-base font-black text-white shadow-md transition-transform hover:bg-purple-700 active:scale-[0.98] sm:h-20 sm:text-xl"
          >
            {isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Wind className="h-6 w-6" />
                <span>Pindah ke Lap / Pengeringan</span>
                <ArrowRight className="ml-auto h-5 w-5" />
              </>
            )}
          </Button>
        )}

        {ticket.status === "DRYING" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvanceStatus("READY")}
            className="h-16 w-full gap-2.5 rounded-2xl bg-emerald-600 text-base font-black text-white shadow-md transition-transform hover:bg-emerald-700 active:scale-[0.98] sm:h-20 sm:text-xl"
          >
            {isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-6 w-6" />
                <span>QC Selesai (Siap Diambil)</span>
                <ArrowRight className="ml-auto h-5 w-5" />
              </>
            )}
          </Button>
        )}

        {ticket.status === "READY" && (
          <div className="flex h-16 w-full items-center justify-between rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 px-4 text-emerald-700 shadow-xs sm:h-20 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <div className="text-left">
                <span className="block text-sm font-black sm:text-base">
                  QC Selesai & Kendaraan Siap
                </span>
                <span className="text-muted-foreground block text-xs">
                  Mobil di area parkir penyerahan
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => handleAdvanceStatus("DRYING")}
              className="text-muted-foreground hover:text-foreground h-9 gap-1 text-xs font-bold"
              title="Kembalikan ke tahap lap jika ada noda tertinggal"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Koreksi QC</span>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
