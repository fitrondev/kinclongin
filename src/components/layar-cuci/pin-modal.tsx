"use client";

import { useState, useTransition } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Delete,
  Loader2,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { claimTicketAction, verifyWasherPinAction } from "@/actions/layar-cuci";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/formatters";

interface VerifiedWasher {
  employeeId: string;
  fullName: string;
}

interface PinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  licensePlate: string;
  packageName: string;
  defaultCommission: number;
  outletId: string;
  onSuccess?: () => void;
}

export function PinModal({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  licensePlate,
  packageName,
  defaultCommission,
  outletId,
  onSuccess,
}: PinModalProps) {
  const [isPending, startTransition] = useTransition();

  // Mode Pengerjaan: SOLO (1 Washer, 100%) vs TANDEM (2 Washers, 50/50)
  const [mode, setMode] = useState<"SOLO" | "TANDEM">("SOLO");
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  // Pin state
  const [currentPin, setCurrentPin] = useState("");
  const [washer1, setWasher1] = useState<VerifiedWasher | null>(null);
  const [washer2, setWasher2] = useState<VerifiedWasher | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetAll = () => {
    setCurrentPin("");
    setWasher1(null);
    setWasher2(null);
    setActiveSlot(1);
    setMode("SOLO");
    setErrorMsg(null);
  };

  const handleSwitchMode = (newMode: "SOLO" | "TANDEM") => {
    setMode(newMode);
    setCurrentPin("");
    setErrorMsg(null);
    if (newMode === "SOLO") {
      setWasher2(null);
      setActiveSlot(1);
    } else {
      if (!washer1) {
        setActiveSlot(1);
      } else if (!washer2) {
        setActiveSlot(2);
      }
    }
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Abaikan jika tidak didukung browser
      }
    }
  };

  const handleDigitClick = (digit: string) => {
    triggerHaptic();
    if (currentPin.length >= 4) return;
    setErrorMsg(null);
    const newPin = currentPin + digit;
    setCurrentPin(newPin);

    // Auto verify saat digit ke-4 ditekan
    if (newPin.length === 4) {
      triggerVerification(newPin);
    }
  };

  const handleBackspace = () => {
    triggerHaptic();
    setErrorMsg(null);
    setCurrentPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic();
    setErrorMsg(null);
    setCurrentPin("");
  };

  const triggerVerification = async (pin: string) => {
    startTransition(async () => {
      const res = await verifyWasherPinAction({
        outletId,
        pinCode: pin,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "PIN tidak valid.");
        setCurrentPin("");
        return;
      }

      if (mode === "TANDEM" && activeSlot === 2) {
        if (washer1?.employeeId === res.data.employeeId) {
          setErrorMsg("Pekerja kedua tidak boleh sama dengan pekerja pertama.");
          setCurrentPin("");
          return;
        }
        setWasher2({
          employeeId: res.data.employeeId,
          fullName: res.data.fullName,
        });
        setCurrentPin("");
        toast.success(`Pekerja 2 diverifikasi: ${res.data.fullName}`);
      } else {
        // Washer 1
        setWasher1({
          employeeId: res.data.employeeId,
          fullName: res.data.fullName,
        });
        setCurrentPin("");
        toast.success(`Pekerja 1: ${res.data.fullName}!`);

        // Jika Tandem dan belum ada washer 2, pindah slot aktif ke 2
        if (mode === "TANDEM" && !washer2) {
          setActiveSlot(2);
        }
      }
    });
  };

  const handleClaimTicket = () => {
    if (!washer1) {
      setErrorMsg("Ketik PIN Pekerja 1 terlebih dahulu.");
      return;
    }

    if (mode === "TANDEM" && !washer2) {
      setErrorMsg("Ketik PIN Pekerja 2 untuk pengerjaan Tandem.");
      return;
    }

    const washerIds = [washer1.employeeId];
    if (mode === "TANDEM" && washer2) {
      washerIds.push(washer2.employeeId);
    }

    startTransition(async () => {
      const res = await claimTicketAction({
        ticketId,
        washerEmployeeIds: washerIds,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mengklaim pengerjaan tiket.");
        return;
      }

      toast.success(
        `Tiket ${licensePlate} diklaim oleh ${washer1.fullName}${
          washer2 ? ` & ${washer2.fullName}` : ""
        }!`
      );
      resetAll();
      onOpenChange(false);
      onSuccess?.();
    });
  };

  // Kalkulasi komisi bagi hasil
  const isReadyToClaim =
    (mode === "SOLO" && washer1) || (mode === "TANDEM" && washer1 && washer2);

  const commissionPerPerson =
    mode === "TANDEM" ? Math.floor(defaultCommission / 2) : defaultCommission;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        onOpenChange(v);
      }}
    >
      <DialogContent className="overflow-hidden p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
            <div>
              <span className="text-primary font-mono text-xl font-black tracking-wider sm:text-2xl">
                {licensePlate}
              </span>
              <p className="text-muted-foreground text-xs font-normal">
                #{ticketNumber} • {packageName}
              </p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Total Komisi
              </span>
              <span className="text-foreground font-mono text-sm font-black sm:text-base">
                {formatRupiah(defaultCommission)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 1. Mode Pengerjaan: SOLO vs TANDEM Selector */}
          <div className="bg-muted/80 grid grid-cols-2 gap-1.5 rounded-2xl border p-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSwitchMode("SOLO")}
              className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all sm:h-12 sm:text-sm ${
                mode === "SOLO"
                  ? "bg-card text-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Solo (100% Komisi)</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSwitchMode("TANDEM")}
              className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all sm:h-12 sm:text-sm ${
                mode === "TANDEM"
                  ? "bg-card text-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Tandem (Bagi 50/50)</span>
            </button>
          </div>

          {/* 2. Slot Pekerja Terverifikasi */}
          <div className="space-y-2">
            <div
              className={`grid gap-2 ${mode === "TANDEM" ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {/* Slot Pekerja 1 */}
              <div
                onClick={() => {
                  if (mode === "TANDEM") {
                    setActiveSlot(1);
                    setCurrentPin("");
                  }
                }}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-3 transition-all ${
                  washer1
                    ? "text-foreground border-emerald-500/40 bg-emerald-500/10"
                    : activeSlot === 1
                      ? "border-primary bg-primary/10 text-primary ring-primary/20 shadow-xs ring-2"
                      : "bg-muted text-muted-foreground border-transparent"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    washer1
                      ? "bg-emerald-500/20 text-emerald-600"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                      {mode === "SOLO" ? "Pekerja Tunggal" : "Pekerja 1"}
                    </span>
                    {washer1 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : null}
                  </div>
                  <span className="block truncate text-sm font-bold">
                    {washer1
                      ? washer1.fullName
                      : activeSlot === 1
                        ? "Ketik PIN..."
                        : "Belum diisi"}
                  </span>
                </div>
              </div>

              {/* Slot Pekerja 2 (Hanya muncul jika mode TANDEM) */}
              {mode === "TANDEM" ? (
                <div
                  onClick={() => {
                    setActiveSlot(2);
                    setCurrentPin("");
                  }}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-3 transition-all ${
                    washer2
                      ? "text-foreground border-emerald-500/40 bg-emerald-500/10"
                      : activeSlot === 2
                        ? "border-primary bg-primary/10 text-primary ring-primary/20 shadow-xs ring-2"
                        : "bg-muted text-muted-foreground border-transparent"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      washer2
                        ? "bg-emerald-500/20 text-emerald-600"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                        Pekerja 2
                      </span>
                      {washer2 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : null}
                    </div>
                    <span className="block truncate text-sm font-bold">
                      {washer2
                        ? washer2.fullName
                        : activeSlot === 2
                          ? "Ketik PIN..."
                          : "Belum diisi"}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Banner Estimasi Komisi Real-time */}
            <div className="bg-muted/70 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground font-medium">
                Hak komisi per orang:
              </span>
              <span className="text-primary font-mono text-sm font-black sm:text-base">
                {formatRupiah(commissionPerPerson)}
                <span className="text-muted-foreground ml-1 text-xs font-bold">
                  ({mode === "TANDEM" ? "50% bagi rata" : "100% penuh"})
                </span>
              </span>
            </div>
          </div>

          {/* 3. Indikator PIN Masking 4 Digit */}
          {!isReadyToClaim ? (
            <div className="flex flex-col items-center justify-center pt-1">
              <span className="text-muted-foreground mb-2 text-xs font-semibold">
                {mode === "TANDEM"
                  ? `Masukkan PIN 4-digit ${activeSlot === 1 ? "Pekerja 1" : "Pekerja 2"}:`
                  : "Masukkan PIN 4-digit Anda:"}
              </span>

              <div className="flex items-center gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = currentPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full transition-all ${
                        isFilled
                          ? "bg-primary scale-125 shadow-sm"
                          : "bg-muted border-border border-2"
                      }`}
                    />
                  );
                })}
              </div>

              {errorMsg ? (
                <div className="text-destructive animate-shake mt-2.5 flex items-center gap-1.5 text-xs font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <CheckCircle2 className="mx-auto mb-1 h-7 w-7 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Seluruh Pekerja Terverifikasi!
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Tekan tombol besar di bawah untuk mulai mencuci kendaraan.
              </p>
            </div>
          )}

          {/* 4. Numpad Masif Ergonomis (Minimal h-16 s.d. h-20 untuk tangan basah) */}
          {!isReadyToClaim ? (
            <div className="mx-auto grid max-w-85 grid-cols-3 gap-2.5 pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDigitClick(num)}
                  className="bg-card border-border hover:border-primary hover:bg-primary/5 text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border-2 text-2xl font-black shadow-xs transition-all select-none active:scale-95 sm:h-20 sm:text-3xl"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={isPending}
                onClick={handleClear}
                className="bg-muted/60 hover:bg-muted text-muted-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border text-xs font-bold transition-all select-none sm:h-20 sm:text-sm"
              >
                Hapus
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDigitClick("0")}
                className="bg-card border-border hover:border-primary hover:bg-primary/5 text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border-2 text-2xl font-black shadow-xs transition-all select-none active:scale-95 sm:h-20 sm:text-3xl"
              >
                0
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleBackspace}
                className="bg-muted/60 hover:bg-muted text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border transition-all select-none sm:h-20"
                title="Backspace"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>
          ) : null}

          {/* 5. Tombol Konfirmasi Klaim Masif */}
          {isReadyToClaim ? (
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleClaimTicket}
                disabled={isPending}
                className="bg-primary text-primary-foreground h-16 w-full gap-2 rounded-2xl text-base font-black shadow-md transition-transform hover:scale-[1.01] active:scale-[0.98] sm:h-20 sm:text-xl"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Mencatat Pembagian Komisi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6" />
                    <span>Mulai Cuci & Kunci Komisi</span>
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
