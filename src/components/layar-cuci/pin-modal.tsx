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

  // Pin state
  const [currentPin, setCurrentPin] = useState("");
  const [washer1, setWasher1] = useState<VerifiedWasher | null>(null);
  const [washer2, setWasher2] = useState<VerifiedWasher | null>(null);
  const [isAddingSecondWasher, setIsAddingSecondWasher] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetAll = () => {
    setCurrentPin("");
    setWasher1(null);
    setWasher2(null);
    setIsAddingSecondWasher(false);
    setErrorMsg(null);
  };

  const handleDigitClick = (digit: string) => {
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
    setErrorMsg(null);
    setCurrentPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
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

      // Jika sedang memasukkan washer kedua
      if (isAddingSecondWasher) {
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
        setIsAddingSecondWasher(false);
        toast.success(`Pekerja 2 diverifikasi: ${res.data.fullName}`);
      } else {
        // Washer pertama
        setWasher1({
          employeeId: res.data.employeeId,
          fullName: res.data.fullName,
        });
        setCurrentPin("");
        toast.success(`Halo, ${res.data.fullName}!`);
      }
    });
  };

  const handleClaimTicket = () => {
    if (!washer1) {
      setErrorMsg("Masukkan PIN Anda terlebih dahulu.");
      return;
    }

    const washerIds = [washer1.employeeId];
    if (washer2) {
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
        `Tiket ${licensePlate} berhasil diklaim oleh ${washer1.fullName}${
          washer2 ? ` & ${washer2.fullName}` : ""
        }!`
      );
      resetAll();
      onOpenChange(false);
      onSuccess?.();
    });
  };

  // Kalkulasi komisi bagi hasil
  const activeWasherCount = (washer1 ? 1 : 0) + (washer2 ? 1 : 0);
  const commissionPerPerson =
    activeWasherCount === 2
      ? Math.floor(defaultCommission / 2)
      : defaultCommission;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        onOpenChange(v);
      }}
    >
      <DialogContent className="overflow-hidden p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
            <div>
              <span className="text-primary font-mono text-xl font-black tracking-wider">
                {licensePlate}
              </span>
              <p className="text-muted-foreground text-xs font-normal">
                #{ticketNumber} • {packageName}
              </p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-xs">
                Komisi Paket
              </span>
              <span className="text-foreground text-sm font-bold">
                {formatRupiah(defaultCommission)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Status Pekerja Terverifikasi */}
          <div className="space-y-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
              <span>Pekerja Bertugas</span>
              {washer1 && !washer2 && !isAddingSecondWasher && (
                <button
                  type="button"
                  onClick={() => setIsAddingSecondWasher(true)}
                  className="text-primary flex items-center gap-1 font-bold normal-case hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />+ Tambah Rekan (Bagi
                  50-50)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Slot Pekerja 1 */}
              <div
                className={`flex items-center gap-2.5 rounded-xl border p-3 transition-colors ${
                  washer1
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : !isAddingSecondWasher
                      ? "border-primary bg-primary/5 text-primary animate-pulse"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <UserCheck className="h-5 w-5 shrink-0" />
                <div className="truncate text-xs">
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                    Pekerja 1
                  </span>
                  <span className="block truncate font-bold">
                    {washer1 ? washer1.fullName : "Ketik PIN..."}
                  </span>
                </div>
              </div>

              {/* Slot Pekerja 2 */}
              <div
                className={`flex items-center gap-2.5 rounded-xl border p-3 transition-colors ${
                  washer2
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : isAddingSecondWasher
                      ? "border-primary bg-primary/5 text-primary animate-pulse"
                      : "bg-muted/50 text-muted-foreground border-dashed"
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                <div className="truncate text-xs">
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                    Pekerja 2 (Opsional)
                  </span>
                  <span className="block truncate font-medium">
                    {washer2 ? (
                      <span className="font-bold">{washer2.fullName}</span>
                    ) : isAddingSecondWasher ? (
                      "Ketik PIN..."
                    ) : (
                      "Mandiri (100%)"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner Estimasi Komisi */}
            {washer1 && (
              <div className="bg-muted flex items-center justify-between rounded-lg px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Komisi masing-masing:
                </span>
                <span className="text-primary text-sm font-extrabold">
                  {formatRupiah(commissionPerPerson)}
                  {washer2 ? " (50%)" : " (100%)"}
                </span>
              </div>
            )}
          </div>

          {/* Indikator PIN Masking 4 Digit */}
          <div className="flex flex-col items-center justify-center pt-1">
            <span className="text-muted-foreground mb-2 text-xs">
              {isAddingSecondWasher
                ? "Masukkan 4-digit PIN Pekerja Kedua:"
                : !washer1
                  ? "Masukkan 4-digit PIN Anda:"
                  : "PIN Terverifikasi. Tekan tombol Konfirmasi di bawah."}
            </span>

            {(!washer1 || isAddingSecondWasher) && (
              <div className="flex items-center gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = currentPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full transition-all ${
                        isFilled
                          ? "bg-primary scale-125 shadow-sm"
                          : "bg-muted border-border border"
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {errorMsg && (
              <div className="text-destructive mt-2.5 flex items-center gap-1.5 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Numpad Besar Ergonomis (h-16 w-16 s.d. h-20 w-20 untuk tangan basah) */}
          {(!washer1 || isAddingSecondWasher) && (
            <div className="mx-auto grid max-w-[320px] grid-cols-3 gap-2.5 pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDigitClick(num)}
                  className="bg-card border-border hover:border-primary hover:bg-primary/5 text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border-2 text-2xl font-black shadow-xs transition-all select-none active:scale-95"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={isPending}
                onClick={handleClear}
                className="bg-muted/60 hover:bg-muted text-muted-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl text-xs font-bold transition-all select-none"
              >
                Hapus
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDigitClick("0")}
                className="bg-card border-border hover:border-primary hover:bg-primary/5 text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl border-2 text-2xl font-black shadow-xs transition-all select-none active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleBackspace}
                className="bg-muted/60 hover:bg-muted text-foreground flex h-16 w-full cursor-pointer items-center justify-center rounded-2xl transition-all select-none"
                title="Backspace"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>
          )}

          {/* Tombol Konfirmasi Klaim */}
          {washer1 && !isAddingSecondWasher && (
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleClaimTicket}
                disabled={isPending}
                className="bg-primary text-primary-foreground h-16 w-full gap-2 text-lg font-bold shadow-md transition-transform hover:scale-[1.01]"
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
