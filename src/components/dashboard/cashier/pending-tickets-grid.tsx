import Link from "next/link";

import { ArrowRight, Car } from "lucide-react";

import { WashStatusBadge } from "@/components/shared/wash-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLicensePlate, formatRupiah } from "@/lib/formatters";

export interface PendingTicketItem {
  id: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  serviceName: string;
  customerName: string | null;
  totalAmount: number;
  status: string;
  queuedAt: Date | string;
}

export interface PendingTicketsGridProps {
  pendingTickets: PendingTicketItem[];
}

export function PendingTicketsGrid({
  pendingTickets,
}: PendingTicketsGridProps) {
  if (pendingTickets.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5 shadow-2xs">
      <CardHeader className="p-4 pb-3 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
              <Car className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-amber-900 uppercase dark:text-amber-200">
                Kendaraan Belum Dibayar ({pendingTickets.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Kendaraan dalam proses atau siap diambil yang menunggu
                penyelesaian pembayaran di kasir
              </CardDescription>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="h-8 w-full justify-center gap-1 text-xs font-bold sm:w-auto"
          >
            <Link href="/pos">
              <span>Buka Kasir</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {pendingTickets.slice(0, 6).map((ticket) => (
            <div
              key={ticket.id}
              className="bg-card flex items-center justify-between gap-3 rounded-xl border p-3 shadow-2xs transition-all hover:border-amber-500/50"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-mono text-xs font-black tracking-wider uppercase sm:text-sm">
                    {formatLicensePlate(ticket.licensePlate)}
                  </span>
                  <WashStatusBadge status={ticket.status} />
                </div>
                <span className="text-muted-foreground truncate text-xs">
                  {ticket.serviceName}
                </span>
                {ticket.customerName ? (
                  <span className="text-muted-foreground truncate text-[11px]">
                    Pelanggan: {ticket.customerName}
                  </span>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-primary font-mono text-xs font-black whitespace-nowrap sm:text-sm">
                  {formatRupiah(ticket.totalAmount)}
                </span>
                <div className="mt-1">
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="h-6 px-2.5 text-[10px] font-bold"
                  >
                    <Link href="/pos">Bayar</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
