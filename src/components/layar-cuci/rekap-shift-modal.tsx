"use client";

import { useState, useTransition } from "react";

import { AlertCircle, Car, Coins, Delete, Trophy } from "lucide-react";

import {
  getWasherShiftSummaryAction,
  verifyWasherPinAction,
} from "@/actions/layar-cuci";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/formatters";

interface RekapShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
}

export function RekapShiftModal({
  open,
  onOpenChange,
  outletId,
}: RekapShiftModalProps) {
  const [isPending, startTransition] = useTransition();
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    fullName: string;
    totalWashedToday: number;
    estimatedCommissionToday: number;
  } | null>(null);

  const resetAll = () => {
    setPin("");
    setErrorMsg(null);
    setSummary(null);
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Abaikan
      }
    }
  };

  const handleDigitClick = (digit: string) => {
    triggerHaptic();
    if (pin.length >= 4) return;
    setErrorMsg(null);
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      triggerLookup(newPin);
    }
  };

  const triggerLookup = (code: string) => {
    startTransition(async () => {
      // 1. Verifikasi PIN
      const verifyRes = await verifyWasherPinAction({
        outletId,
        pinCode: code,
      });

      if (!verifyRes.success || !verifyRes.data) {
        setErrorMsg(verifyRes.error || "PIN tidak valid.");
        setPin("");
        return;
      }

      // 2. Ambil ringkasan komisi hari ini
      const summaryRes = await getWasherShiftSummaryAction(
        verifyRes.data.employeeId
      );

      if (!summaryRes.success || !summaryRes.data) {
        setErrorMsg(summaryRes.error || "Gagal mengambil data komisi.");
        setPin("");
        return;
      }

      setSummary(summaryRes.data);
      setPin("");
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        onOpenChange(v);
      }}
    >
      <DialogContent className="p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-amber-500" />
            <span>Rekapitulasi Komisi Shift Hari Ini</span>
          </DialogTitle>
        </DialogHeader>

        {summary ? (
          /* Tampilan Hasil Rekapitulasi Komisi */
          <div className="space-y-5 py-4 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-foreground text-xl font-black">
                  {summary.fullName}
                </h3>
                <p className="text-muted-foreground text-xs">
                  Shift Operasional Hari Ini
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-muted/60 space-y-1 rounded-2xl border p-4">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
                  <Car className="text-primary h-4 w-4" />
                  <span>Dikerjakan</span>
                </div>
                <p className="text-foreground text-2xl font-black sm:text-3xl">
                  {summary.totalWashedToday}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    Unit
                  </span>
                </p>
              </div>

              <div className="space-y-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase dark:text-emerald-300">
                  <Coins className="h-4 w-4" />
                  <span>Estimasi Komisi</span>
                </div>
                <p className="truncate text-xl font-black text-emerald-600 sm:text-2xl dark:text-emerald-400">
                  {formatRupiah(summary.estimatedCommissionToday)}
                </p>
              </div>
            </div>

            <div className="bg-card text-muted-foreground rounded-xl border p-3.5 text-xs leading-relaxed">
              Semangat terus! Komisi Anda otomatis terkunci di sistem dan akan
              dibayarkan pada saat pencairan gaji & komisi.
            </div>

            <Button
              type="button"
              onClick={resetAll}
              className="h-14 w-full rounded-2xl text-base font-bold"
            >
              Tutup & Selesai
            </Button>
          </div>
        ) : (
          /* Tampilan Input PIN untuk Membuka Rekap */
          <div className="space-y-4 py-2">
            <div className="space-y-1 text-center">
              <p className="text-muted-foreground text-xs font-semibold">
                Masukkan 4-digit PIN Anda untuk melihat hasil kerja hari ini:
              </p>

              <div className="flex items-center justify-center gap-4 pt-3 pb-1">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full transition-all ${
                        isFilled
                          ? "scale-125 bg-amber-500 shadow-sm"
                          : "bg-muted border-border border-2"
                      }`}
                    />
                  );
                })}
              </div>

              {errorMsg && (
                <div className="text-destructive animate-shake flex items-center justify-center gap-1.5 pt-1 text-xs font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Numpad Masif */}
            <div className="mx-auto grid max-w-85 grid-cols-3 gap-2.5 pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDigitClick(num)}
                  className="bg-card border-border text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border-2 text-2xl font-black shadow-xs transition-all select-none hover:border-amber-500 hover:bg-amber-500/5 active:scale-95 sm:h-20 sm:text-3xl"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  triggerHaptic();
                  setErrorMsg(null);
                  setPin("");
                }}
                className="bg-muted/60 hover:bg-muted text-muted-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border text-xs font-bold transition-all select-none sm:h-20 sm:text-sm"
              >
                Hapus
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDigitClick("0")}
                className="bg-card border-border text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border-2 text-2xl font-black shadow-xs transition-all select-none hover:border-amber-500 hover:bg-amber-500/5 active:scale-95 sm:h-20 sm:text-3xl"
              >
                0
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  triggerHaptic();
                  setErrorMsg(null);
                  setPin((prev) => prev.slice(0, -1));
                }}
                className="bg-muted/60 hover:bg-muted text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border transition-all select-none sm:h-20"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
