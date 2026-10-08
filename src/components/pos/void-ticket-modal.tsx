"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  Ban,
  KeyRound,
  Loader2,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { type VoidTicketResult, voidWashTicketAction } from "@/actions/pos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/formatters";
import { buildVoidReceipt } from "@/lib/printer/escpos";

interface VoidTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticketNumber: string;
    licensePlate: string;
    serviceName: string;
    totalAmount: number;
    status: string;
  };
  onSuccess?: () => void;
}

const VOID_REASONS = [
  { id: "HUJAN_DERAS", label: "Hujan Deras Tiba-tiba (Pelanggan Pulang)" },
  {
    id: "ANTREAN_TERLALU_LAMA",
    label: "Antrean Terlalu Lama (Pelanggan Batal)",
  },
  { id: "SALAH_INPUT_KASIR", label: "Koreksi / Salah Pilih Paket Kasir" },
  { id: "KENDARAAN_BERMASALAH", label: "Kendaraan Bermasalah / Baret Parah" },
  { id: "KOMPLAIN_PELANGGAN", label: "Komplain Ketidakpuasan Pelanggan" },
  { id: "LAINNYA", label: "Alasan Lainnya" },
];

export function VoidTicketModal({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: VoidTicketModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [managerPin, setManagerPin] = useState<string>("");
  const [voidResult, setVoidResult] = useState<VoidTicketResult | null>(null);

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      toast.error("Pilih alasan pembatalan tiket.");
      return;
    }

    if (!managerPin || managerPin.length < 4) {
      toast.error("Masukkan 4-digit PIN Supervisor / Manajer.");
      return;
    }

    startTransition(async () => {
      const res = await voidWashTicketAction({
        ticketId: ticket.id,
        managerPin,
        voidReason: selectedReason,
        notes: notes || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal membatalkan tiket.");
        return;
      }

      setVoidResult(res.data);
      toast.success(
        `Tiket ${ticket.ticketNumber} (${ticket.licensePlate}) berhasil dibatalkan (VOID)!`
      );
      onSuccess?.();
      router.refresh();
    });
  };

  const handlePrintVoidReceipt = () => {
    if (!voidResult) return;

    const receiptText = buildVoidReceipt({
      outletName: voidResult.outletName,
      ticketNumber: voidResult.ticketNumber,
      licensePlate: voidResult.licensePlate,
      serviceName: voidResult.serviceName,
      totalAmount: voidResult.totalAmount,
      cashierName: voidResult.cashierName,
      managerName: voidResult.managerName,
      voidReason: voidResult.voidReason,
      voidedAt: voidResult.voidedAt,
    });

    const printWin = window.open("", "_blank");
    if (!printWin) {
      toast.error("Pop-up browser terblokir.");
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk VOID - ${voidResult.ticketNumber}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              width: 58mm;
              margin: 0;
              padding: 6px;
              white-space: pre-wrap;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>${receiptText}</body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 250);
  };

  const handleClose = () => {
    setVoidResult(null);
    setSelectedReason("");
    setNotes("");
    setManagerPin("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-destructive text-destructive-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-xs">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-destructive text-base font-black">
                Otorisasi Pembatalan Tiket (VOID)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Membatalkan pengerjaan antrean dan komisi pekerja cuci.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {voidResult ? (
          // Layar Konfirmasi Sukses Cetak
          <div className="space-y-4 py-2">
            <div className="border-destructive/20 bg-destructive/10 rounded-xl border p-4 text-center">
              <ShieldAlert className="text-destructive mx-auto h-8 w-8" />
              <h4 className="text-foreground mt-2 text-sm font-black">
                Tiket {voidResult.ticketNumber} Telah Dibatalkan
              </h4>
              <p className="text-muted-foreground mt-1 text-xs">
                Disetujui oleh: <strong>{voidResult.managerName}</strong>
              </p>
              <div className="bg-card mt-3 rounded-lg border p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plat Nomor:</span>
                  <span className="font-mono font-bold">
                    {voidResult.licensePlate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Void:</span>
                  <span className="text-destructive font-mono font-bold">
                    {formatRupiah(voidResult.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alasan:</span>
                  <span className="font-semibold">{voidResult.voidReason}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full font-bold"
                onClick={handlePrintVoidReceipt}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Cetak Struk Void
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-foreground text-background w-full font-bold"
                onClick={handleClose}
              >
                Selesai
              </Button>
            </div>
          </div>
        ) : (
          // Form Otorisasi PIN & Alasan
          <form onSubmit={handleVoidSubmit} className="space-y-4 py-2">
            {/* Info Tiket yang akan di-void */}
            <div className="bg-muted/30 rounded-xl border p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-mono font-bold">
                  {ticket.ticketNumber}
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] font-bold"
                >
                  {ticket.licensePlate}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-1 flex items-center justify-between">
                <span>{ticket.serviceName}</span>
                <span className="text-foreground font-mono font-black">
                  {formatRupiah(ticket.totalAmount)}
                </span>
              </div>
            </div>

            {/* Pilihan Alasan Void */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Alasan Pembatalan (Wajib)
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                {VOID_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.label)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                      selectedReason === r.label
                        ? "border-destructive bg-destructive/10 text-destructive font-bold"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div className="space-y-1.5">
              <Label htmlFor="void-notes" className="text-xs font-bold">
                Keterangan Tambahan (Opsional)
              </Label>
              <Textarea
                id="void-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan klarifikasi pelanggan atau kondisi lapangan..."
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            {/* Otorisasi PIN Supervisor */}
            <div className="border-destructive/20 bg-destructive/5 space-y-2 rounded-xl border p-3">
              <div className="text-destructive flex items-center gap-1.5 text-xs font-bold">
                <KeyRound className="h-4 w-4" />
                <span>Otorisasi PIN Manajer / Owner</span>
              </div>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Masukkan 4-digit PIN Supervisor"
                className="text-center font-mono text-lg font-black tracking-widest"
                required
              />
              <p className="text-muted-foreground text-center text-[10px]">
                Memerlukan otorisasi peran Manager atau Owner cabang ini.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !selectedReason || managerPin.length < 4}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Memverifikasi PIN...
                  </>
                ) : (
                  <>Setujui Pembatalan (VOID)</>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
