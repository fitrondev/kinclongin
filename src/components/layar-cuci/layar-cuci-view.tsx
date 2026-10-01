"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Clock,
  Droplets,
  Layers,
  RefreshCw,
  Sparkles,
  Wind,
} from "lucide-react";

import {
  LayarCuciCard,
  LayarCuciItem,
} from "@/components/layar-cuci/layar-cuci-card";
import { LayarCuciHeader } from "@/components/layar-cuci/layar-cuci-header";
import { PinModal } from "@/components/layar-cuci/pin-modal";
import { RekapShiftModal } from "@/components/layar-cuci/rekap-shift-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LayarCuciViewProps {
  initialTickets: LayarCuciItem[];
  outletId: string;
  outletName: string;
  userRole?: string | null;
}

export function LayarCuciView({
  initialTickets,
  outletId,
  outletName,
  userRole,
}: LayarCuciViewProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "ALL" | "QUEUED" | "WASHING" | "DRYING"
  >("ALL");
  const [selectedTicketForPin, setSelectedTicketForPin] =
    useState<LayarCuciItem | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto refresh data setiap 15 detik di area basah agar tablet selalu sinkron
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredTickets = initialTickets.filter((t) => {
    if (activeTab === "ALL") return true;
    return t.status === activeTab;
  });

  const queuedCount = initialTickets.filter(
    (t) => t.status === "QUEUED"
  ).length;
  const washingCount = initialTickets.filter(
    (t) => t.status === "WASHING"
  ).length;
  const dryingCount = initialTickets.filter(
    (t) => t.status === "DRYING"
  ).length;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <LayarCuciHeader
        outletName={outletName}
        onOpenShiftSummary={() => setShowShiftModal(true)}
        userRole={userRole}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 sm:p-6">
        {/* Tab Filter & Live Counter */}
        <div className="bg-card flex flex-col items-stretch justify-between gap-3 rounded-2xl border p-3 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Semua ({initialTickets.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("QUEUED")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "QUEUED"
                  ? "bg-amber-500 font-black text-amber-950 shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Menunggu ({queuedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("WASHING")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "WASHING"
                  ? "bg-blue-600 font-black text-white shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Droplets className="h-4 w-4" />
              <span>Sedang Dicuci ({washingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("DRYING")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${
                activeTab === "DRYING"
                  ? "bg-purple-600 font-black text-white shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Wind className="h-4 w-4" />
              <span>Lap & Pengeringan ({dryingCount})</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-11 shrink-0 gap-1.5 px-4 text-xs font-bold"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </Button>
        </div>

        {/* Grid Kartu Kendaraan Layar Cuci */}
        {filteredTickets.length === 0 ? (
          <div className="bg-card flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center sm:h-96">
            <div className="bg-muted text-muted-foreground/50 mb-3 flex h-16 w-16 items-center justify-center rounded-full">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-foreground text-lg font-black">
              Tidak Ada Antrean di Tahap Ini
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Kendaraan baru yang didaftarkan kasir akan otomatis muncul di
              layar ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map((t) => (
              <LayarCuciCard
                key={t.id}
                ticket={t}
                onOpenPinModal={(item) => setSelectedTicketForPin(item)}
                onRefresh={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal Masukkan PIN Klaim */}
      {selectedTicketForPin && (
        <PinModal
          open={!!selectedTicketForPin}
          onOpenChange={(open) => {
            if (!open) setSelectedTicketForPin(null);
          }}
          ticketId={selectedTicketForPin.id}
          ticketNumber={selectedTicketForPin.ticketNumber}
          licensePlate={selectedTicketForPin.licensePlate}
          packageName={selectedTicketForPin.servicePackage.name}
          defaultCommission={Number(
            selectedTicketForPin.servicePackage.defaultCommission
          )}
          outletId={outletId}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Modal Cek Rekap Shift */}
      <RekapShiftModal
        open={showShiftModal}
        onOpenChange={setShowShiftModal}
        outletId={outletId}
      />
    </div>
  );
}
