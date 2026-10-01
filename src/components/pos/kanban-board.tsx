"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Car,
  CheckCircle,
  Clock,
  Droplets,
  PlusCircle,
  RefreshCw,
  Search,
  Wind,
  X,
} from "lucide-react";

import { KanbanTicket, TicketCard } from "@/components/pos/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localDb } from "@/lib/offline/db";

export type KanbanTab = "ALL" | "QUEUED" | "WASHING" | "DRYING" | "READY";

interface KanbanBoardProps {
  initialTickets: KanbanTicket[];
  outletId: string;
  initialTab?: string;
}

export function KanbanBoard({
  initialTickets,
  outletId,
  initialTab,
}: KanbanBoardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offlineTickets, setOfflineTickets] = useState<KanbanTicket[]>([]);

  // Derivasi tab aktif dari prop URL (hanya dijalankan saat mount awal)
  // Untuk sinkronisasi URL -> tab: gunakan key prop di level parent agar komponen re-mount
  const derivedInitialTab = useMemo<KanbanTab>(() => {
    if (
      initialTab &&
      ["ALL", "QUEUED", "WASHING", "DRYING", "READY"].includes(initialTab)
    ) {
      return initialTab as KanbanTab;
    }
    return "ALL";
  }, []);

  const [activeTab, setActiveTab] = useState<KanbanTab>(derivedInitialTab);

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

  // Komponen Helper untuk render kartu kolom
  const renderColumnContent = (
    tickets: KanbanTicket[],
    emptyIcon: React.ReactNode,
    emptyText: string,
    isExpandedGrid: boolean
  ) => {
    if (tickets.length === 0) {
      return (
        <div className="text-muted-foreground flex h-36 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs">
          <div className="text-muted-foreground/40 mb-1.5">{emptyIcon}</div>
          <p className="font-medium">{emptyText}</p>
          {searchQuery && (
            <p className="text-muted-foreground/70 mt-0.5 text-[11px]">
              Tidak cocok dengan pencarian &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        className={
          isExpandedGrid
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
            : "space-y-3"
        }
      >
        {tickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            onStatusChanged={() => router.refresh()}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar (Responsif di Semua Ukuran Layar) */}
      <div className="bg-card flex flex-col items-stretch justify-between gap-2.5 rounded-2xl border p-2.5 shadow-xs sm:flex-row sm:items-center sm:p-3">
        {/* Kolom Pencarian Cepat */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Cari nomor plat, nomor tiket, atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pr-9 pl-9.5 text-xs font-medium sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 p-1"
              title="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Segarkan & Tambah Antrean Baru */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 flex-1 gap-1.5 text-xs font-semibold sm:flex-none"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-10 flex-1 gap-1.5 text-xs font-bold shadow-xs sm:flex-none"
          >
            <Link href="/pos/daftar-baru">
              <PlusCircle className="h-4 w-4" />
              <span className="xs:inline hidden sm:inline">
                + Daftar Cuci Baru
              </span>
              <span className="xs:hidden sm:hidden">+ Baru</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Filter untuk Layar Mobile & Tablet Portrait (<lg: 0px - 1023px) */}
      <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
            activeTab === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-card hover:bg-muted text-muted-foreground border"
          }`}
        >
          <Car className="h-3.5 w-3.5" />
          <span>Semua (Geser)</span>
          <Badge
            variant="secondary"
            className={`h-4.5 px-1.5 text-[10px] font-bold ${
              activeTab === "ALL"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {filteredTickets.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("QUEUED")}
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
            activeTab === "QUEUED"
              ? "bg-amber-500 font-black text-amber-950 shadow-xs dark:text-amber-950"
              : "bg-card hover:bg-muted text-muted-foreground border"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Menunggu</span>
          <Badge
            variant="outline"
            className={`h-4.5 px-1.5 text-[10px] font-bold ${
              activeTab === "QUEUED"
                ? "border-amber-950/30 bg-amber-950/20 text-amber-950"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600"
            }`}
          >
            {queuedTickets.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("WASHING")}
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
            activeTab === "WASHING"
              ? "bg-blue-600 font-black text-white shadow-xs"
              : "bg-card hover:bg-muted text-muted-foreground border"
          }`}
        >
          <Droplets className="h-3.5 w-3.5 text-blue-500" />
          <span>Cuci</span>
          <Badge
            variant="outline"
            className={`h-4.5 px-1.5 text-[10px] font-bold ${
              activeTab === "WASHING"
                ? "border-white/30 bg-white/20 text-white"
                : "border-blue-500/30 bg-blue-500/10 text-blue-600"
            }`}
          >
            {washingTickets.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DRYING")}
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
            activeTab === "DRYING"
              ? "bg-purple-600 font-black text-white shadow-xs"
              : "bg-card hover:bg-muted text-muted-foreground border"
          }`}
        >
          <Wind className="h-3.5 w-3.5 text-purple-500" />
          <span>Lap</span>
          <Badge
            variant="outline"
            className={`h-4.5 px-1.5 text-[10px] font-bold ${
              activeTab === "DRYING"
                ? "border-white/30 bg-white/20 text-white"
                : "border-purple-500/30 bg-purple-500/10 text-purple-600"
            }`}
          >
            {dryingTickets.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("READY")}
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
            activeTab === "READY"
              ? "bg-emerald-600 font-black text-white shadow-xs"
              : "bg-card hover:bg-muted text-muted-foreground border"
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span>Siap Kasir</span>
          <Badge
            variant="outline"
            className={`h-4.5 px-1.5 text-[10px] font-bold ${
              activeTab === "READY"
                ? "border-white/30 bg-white/20 text-white"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {readyTickets.length}
          </Badge>
        </button>
      </div>

      {/* TAMPILAN KANBAN UTAMA */}
      {/* 
        A. Desktop & Tablet Landscape (lg: 1024px+): Grid 4 Kolom Berjejer Lega
        B. Mobile & Tablet Portrait (<lg) jika activeTab === "ALL": Horizontal Swipe Container (snap-x)
        C. Mobile & Tablet Portrait (<lg) jika activeTab !== "ALL": Single Column Full Width (Fokus)
      */}
      {activeTab === "ALL" ? (
        <div className="flex snap-x snap-mandatory scrollbar-thin gap-3.5 overflow-x-auto pt-1 pb-4 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0 xl:gap-4">
          {/* Kolom 1: QUEUED (Menunggu Slot) */}
          <div className="bg-muted/40 flex w-[84vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border shadow-xs sm:w-82.5 lg:w-auto lg:shrink">
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
            <div className="min-h-87.5 p-3">
              {renderColumnContent(
                queuedTickets,
                <Clock className="h-6 w-6" />,
                "Tidak ada kendaraan menunggu",
                false
              )}
            </div>
          </div>

          {/* Kolom 2: WASHING (Sedang Dicuci) */}
          <div className="bg-muted/40 flex w-[84vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border shadow-xs sm:w-82.5 lg:w-auto lg:shrink">
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
            <div className="min-h-87.5 p-3">
              {renderColumnContent(
                washingTickets,
                <Droplets className="h-6 w-6" />,
                "Tidak ada pencucian aktif",
                false
              )}
            </div>
          </div>

          {/* Kolom 3: DRYING (Pengeringan & Lap) */}
          <div className="bg-muted/40 flex w-[84vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border shadow-xs sm:w-82.5 lg:w-auto lg:shrink">
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
            <div className="min-h-87.5 p-3">
              {renderColumnContent(
                dryingTickets,
                <Wind className="h-6 w-6" />,
                "Tidak ada tahap lap",
                false
              )}
            </div>
          </div>

          {/* Kolom 4: READY (Siap Diambil / Kasir) */}
          <div className="bg-muted/40 flex w-[84vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border shadow-xs sm:w-82.5 lg:w-auto lg:shrink">
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
            <div className="min-h-87.5 p-3">
              {renderColumnContent(
                readyTickets,
                <CheckCircle className="h-6 w-6" />,
                "Semua kendaraan telah keluar",
                false
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Single Column Fokus Mode (Saat Tab dipilih di Mobile/Tablet) */
        <div className="bg-muted/40 flex flex-col overflow-hidden rounded-2xl border shadow-xs">
          <div className="bg-card flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-3 w-3 rounded-full ${
                  activeTab === "QUEUED"
                    ? "bg-amber-500"
                    : activeTab === "WASHING"
                      ? "bg-blue-500"
                      : activeTab === "DRYING"
                        ? "bg-purple-500"
                        : "bg-emerald-500"
                }`}
              />
              <div>
                <h3 className="text-foreground text-base font-black tracking-tight">
                  {activeTab === "QUEUED" && "Tahap: Menunggu Slot Antrean"}
                  {activeTab === "WASHING" && "Tahap: Sedang Dicuci (Basah)"}
                  {activeTab === "DRYING" && "Tahap: Pengeringan & Lap"}
                  {activeTab === "READY" &&
                    "Tahap: Siap Diambil / Kasir Pembayaran"}
                </h3>
                <p className="text-muted-foreground text-xs font-medium">
                  {activeTab === "QUEUED" &&
                    "Kendaraan menunggu ketersediaan hidrolik/stall cuci"}
                  {activeTab === "WASHING" &&
                    "Pekerja cuci sedang menyemprot & menyabuni kendaraan"}
                  {activeTab === "DRYING" &&
                    "Pengeringan bodi, kaca, dan vakum interior"}
                  {activeTab === "READY" &&
                    "Kendaraan selesai dan siap bayar di kasir"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("ALL")}
              className="h-9 gap-1.5 text-xs font-bold"
            >
              <span>Lihat 4 Kolom</span>
            </Button>
          </div>

          <div className="min-h-96 p-3 sm:p-4">
            {activeTab === "QUEUED" &&
              renderColumnContent(
                queuedTickets,
                <Clock className="h-8 w-8" />,
                "Tidak ada antrean kendaraan di tahap ini",
                true
              )}
            {activeTab === "WASHING" &&
              renderColumnContent(
                washingTickets,
                <Droplets className="h-8 w-8" />,
                "Tidak ada pencucian aktif di tahap ini",
                true
              )}
            {activeTab === "DRYING" &&
              renderColumnContent(
                dryingTickets,
                <Wind className="h-8 w-8" />,
                "Tidak ada kendaraan di tahap lap & pengeringan",
                true
              )}
            {activeTab === "READY" &&
              renderColumnContent(
                readyTickets,
                <CheckCircle className="h-8 w-8" />,
                "Belum ada kendaraan yang selesai siap diambil",
                true
              )}
          </div>
        </div>
      )}
    </div>
  );
}
