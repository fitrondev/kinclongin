"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CheckCircle,
  Clock,
  Droplets,
  Filter,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Wind,
} from "lucide-react";

import { KanbanTicket, TicketCard } from "@/components/pos/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDb } from "@/lib/offline/db";

interface KanbanBoardProps {
  initialTickets: KanbanTicket[];
  outletId: string;
}

export function KanbanBoard({ initialTickets, outletId }: KanbanBoardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offlineTickets, setOfflineTickets] = useState<KanbanTicket[]>([]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Muat dan perbarui tiket luring dari IndexedDB secara berkala
  useEffect(() => {
    const loadOfflineTickets = async () => {
      try {
        const pending = await localDb.tickets
          .filter(
            (t) =>
              t.syncStatus !== "SYNCED" &&
              (!outletId || t.outletId === outletId)
          )
          .toArray();

        const mapped: KanbanTicket[] = pending.map((t) => ({
          id: t.localId,
          ticketNumber: t.ticketNumber,
          licensePlate: t.licensePlate,
          vehicleCategory: t.vehicleCategory,
          servicePackage: {
            id: t.servicePackageId,
            name: t.servicePackageName,
            estimatedMinutes: 30,
            price: t.servicePrice,
          },
          customer: t.customerName
            ? {
                fullName: t.customerName,
                phone: t.customerPhone || "-",
              }
            : null,
          vehicle: {
            brand: t.brand,
            model: t.model,
            color: t.color,
          },
          status: t.status,
          initialNotes: t.initialNotes,
          inspectionPhotos: t.inspectionPhotos,
          queuedAt: new Date(t.createdAt),
          isOffline: true,
        }));

        setOfflineTickets(mapped);
      } catch (err) {
        console.error("Gagal membaca tiket offline:", err);
      }
    };

    loadOfflineTickets();
    const interval = setInterval(loadOfflineTickets, 4000);
    return () => clearInterval(interval);
  }, [outletId]);

  // Gabungkan tiket offline yang belum tersinkron dengan tiket online
  const allTickets = useMemo(() => {
    const existingServerNumbers = new Set(
      initialTickets.map((t) => t.ticketNumber)
    );
    const pendingUnique = offlineTickets.filter(
      (ot) => !existingServerNumbers.has(ot.ticketNumber)
    );
    return [...pendingUnique, ...initialTickets];
  }, [initialTickets, offlineTickets]);

  // Filter tiket sesuai search query plat / tiket
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return allTickets;
    const q = searchQuery.toLowerCase().replace(/\s+/g, "");
    return allTickets.filter((t) => {
      const plate = t.licensePlate.toLowerCase().replace(/\s+/g, "");
      const num = t.ticketNumber.toLowerCase();
      const customer = t.customer?.fullName.toLowerCase() || "";
      return plate.includes(q) || num.includes(q) || customer.includes(q);
    });
  }, [allTickets, searchQuery]);

  // Kelompokkan tiket per kolom antrean
  const queuedTickets = filteredTickets.filter((t) => t.status === "QUEUED");
  const washingTickets = filteredTickets.filter((t) => t.status === "WASHING");
  const dryingTickets = filteredTickets.filter((t) => t.status === "DRYING");
  const readyTickets = filteredTickets.filter((t) => t.status === "READY");

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-card flex flex-col items-stretch justify-between gap-3 rounded-2xl border p-3 shadow-xs sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Cari plat nomor, nomor tiket, atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9.5 text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </Button>

          <Button asChild size="sm" className="h-10 gap-1.5 text-xs font-bold">
            <Link href="/pos/daftar-baru">
              <PlusCircle className="h-4 w-4" />
              <span>+ Daftar Cuci Baru</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Kolom Kanban */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Kolom 1: QUEUED (Menunggu Slot) */}
        <div className="bg-muted/40 flex flex-col overflow-hidden rounded-2xl border shadow-xs">
          <div className="bg-card flex items-center justify-between border-b p-3.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <h3 className="text-foreground text-sm font-extrabold tracking-tight">
                Menunggu Slot
              </h3>
            </div>
            <Badge
              variant="outline"
              className="h-5 border-amber-500/30 bg-amber-500/10 px-2 font-bold text-amber-600"
            >
              {queuedTickets.length}
            </Badge>
          </div>

          <div className="min-h-87.5 space-y-3 p-3">
            {queuedTickets.length === 0 ? (
              <div className="text-muted-foreground flex h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs">
                <Clock className="text-muted-foreground/40 mb-1 h-6 w-6" />
                <p className="font-medium">Tidak ada kendaraan menunggu</p>
              </div>
            ) : (
              queuedTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  onStatusChanged={() => router.refresh()}
                />
              ))
            )}
          </div>
        </div>

        {/* Kolom 2: WASHING (Sedang Dicuci) */}
        <div className="bg-muted/40 flex flex-col overflow-hidden rounded-2xl border shadow-xs">
          <div className="bg-card flex items-center justify-between border-b p-3.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <h3 className="text-foreground text-sm font-extrabold tracking-tight">
                Sedang Dicuci (Basah)
              </h3>
            </div>
            <Badge
              variant="outline"
              className="h-5 border-blue-500/30 bg-blue-500/10 px-2 font-bold text-blue-600"
            >
              {washingTickets.length}
            </Badge>
          </div>

          <div className="min-h-87.5 space-y-3 p-3">
            {washingTickets.length === 0 ? (
              <div className="text-muted-foreground flex h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs">
                <Droplets className="text-muted-foreground/40 mb-1 h-6 w-6" />
                <p className="font-medium">Tidak ada pencucian aktif</p>
              </div>
            ) : (
              washingTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  onStatusChanged={() => router.refresh()}
                />
              ))
            )}
          </div>
        </div>

        {/* Kolom 3: DRYING (Pengeringan & Lap) */}
        <div className="bg-muted/40 flex flex-col overflow-hidden rounded-2xl border shadow-xs">
          <div className="bg-card flex items-center justify-between border-b p-3.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              <h3 className="text-foreground text-sm font-extrabold tracking-tight">
                Pengeringan & Lap
              </h3>
            </div>
            <Badge
              variant="outline"
              className="h-5 border-purple-500/30 bg-purple-500/10 px-2 font-bold text-purple-600"
            >
              {dryingTickets.length}
            </Badge>
          </div>

          <div className="min-h-87.5 space-y-3 p-3">
            {dryingTickets.length === 0 ? (
              <div className="text-muted-foreground flex h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs">
                <Wind className="text-muted-foreground/40 mb-1 h-6 w-6" />
                <p className="font-medium">Tidak ada tahap lap</p>
              </div>
            ) : (
              dryingTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  onStatusChanged={() => router.refresh()}
                />
              ))
            )}
          </div>
        </div>

        {/* Kolom 4: READY (Siap Diambil / Kasir) */}
        <div className="bg-muted/40 flex flex-col overflow-hidden rounded-2xl border shadow-xs">
          <div className="bg-card flex items-center justify-between border-b p-3.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-foreground text-sm font-extrabold tracking-tight">
                Siap Diambil / Kasir
              </h3>
            </div>
            <Badge
              variant="outline"
              className="h-5 border-emerald-500/30 bg-emerald-500/10 px-2 font-bold text-emerald-600"
            >
              {readyTickets.length}
            </Badge>
          </div>

          <div className="min-h-87.5 space-y-3 p-3">
            {readyTickets.length === 0 ? (
              <div className="text-muted-foreground flex h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs">
                <CheckCircle className="text-muted-foreground/40 mb-1 h-6 w-6" />
                <p className="font-medium">Semua kendaraan telah keluar</p>
              </div>
            ) : (
              readyTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  onStatusChanged={() => router.refresh()}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
