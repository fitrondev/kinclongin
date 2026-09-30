"use client";

import { useTransition } from "react";

import {
  ArrowRight,
  Car,
  CheckCircle,
  Clock,
  Droplets,
  Loader2,
  Sparkles,
  UserCheck,
  Users,
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
import type { TicketStatus } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

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

  const handleAdvanceStatus = (nextStatus: "DRYING" | "READY") => {
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

  return (
    <Card className="bg-card flex flex-col justify-between overflow-hidden border-2 shadow-xs transition-all hover:shadow-md">
      <div>
        {/* Header bar: status & komisi */}
        <div className="bg-muted/40 flex items-center justify-between border-b p-3.5 sm:p-4">
          <Badge
            variant="outline"
            className={`px-2.5 py-0.5 text-xs font-bold uppercase ${
              ticket.status === "QUEUED"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                : ticket.status === "WASHING"
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-600"
            }`}
          >
            {ticket.status === "QUEUED" && "Menunggu Dikerjakan"}
            {ticket.status === "WASHING" && "Sedang Dicuci (Basah)"}
            {ticket.status === "DRYING" && "Pengeringan & Semir"}
          </Badge>

          <div className="text-right">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              Komisi Unit
            </span>
            <span className="text-primary text-sm font-black sm:text-base">
              {formatRupiah(commission)}
            </span>
          </div>
        </div>

        {/* Info Plat & Kendaraan */}
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-foreground font-mono text-2xl font-black tracking-wider sm:text-4xl">
              {ticket.licensePlate}
            </h2>
            {vehicleText ? (
              <p className="text-muted-foreground mt-0.5 text-xs font-semibold sm:text-sm">
                {vehicleText}
              </p>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-xs">
                #{ticket.ticketNumber}
              </p>
            )}
          </div>

          <div className="bg-muted/50 space-y-1 rounded-xl border p-3 text-xs sm:text-sm">
            <div className="text-foreground flex items-center justify-between font-bold">
              <span>{ticket.servicePackage.name}</span>
              <span className="text-muted-foreground flex items-center gap-1 text-xs font-normal">
                <Clock className="h-3 w-3" />
                {ticket.servicePackage.estimatedMinutes} Mnt
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
            <div className="bg-primary/10 border-primary/20 text-primary flex items-center gap-2 rounded-lg border p-2.5 text-xs font-semibold">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Dikerjakan oleh:{" "}
                {ticket.washers.map((w) => w.washer.fullName).join(" & ")}
              </span>
            </div>
          )}
        </CardContent>
      </div>

      {/* Action Button Besar untuk Tablet Sentuh */}
      <CardFooter className="p-4 pt-0">
        {ticket.status === "QUEUED" && (
          <Button
            type="button"
            onClick={() => onOpenPinModal(ticket)}
            className="bg-primary text-primary-foreground h-14 w-full gap-2 text-base font-black shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] sm:h-16 sm:text-lg"
          >
            <Sparkles className="h-5 w-5" />
            <span>Klaim & Mulai Cuci (PIN)</span>
          </Button>
        )}

        {ticket.status === "WASHING" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvanceStatus("DRYING")}
            className="h-14 w-full gap-2 bg-purple-600 text-base font-black text-white shadow-md transition-transform hover:bg-purple-700 active:scale-[0.99] sm:h-16 sm:text-lg"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Wind className="h-5 w-5" />
                <span>Pindah ke Lap / Pengeringan</span>
                <ArrowRight className="ml-auto h-4 w-4" />
              </>
            )}
          </Button>
        )}

        {ticket.status === "DRYING" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvanceStatus("READY")}
            className="h-14 w-full gap-2 bg-emerald-600 text-base font-black text-white shadow-md transition-transform hover:bg-emerald-700 active:scale-[0.99] sm:h-16 sm:text-lg"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>QC Selesai (Siap Diambil)</span>
                <ArrowRight className="ml-auto h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
