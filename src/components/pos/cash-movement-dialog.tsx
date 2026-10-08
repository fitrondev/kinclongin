"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { recordCashMovementAction } from "@/actions/pos";
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

interface CashMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  defaultType?: "PAID_IN" | "PAID_OUT";
  onSuccess?: () => void;
}

const PAID_IN_CATEGORIES = [
  { id: "MODAL_TAMBAHAN", label: "Tambahan Modal / Uang Kembalian" },
  { id: "TITIPAN_OWNER", label: "Setoran Kas Owner" },
  { id: "PENDAPATAN_LAIN", label: "Pendapatan Lain-lain" },
];

const PAID_OUT_CATEGORIES = [
  { id: "BELI_ES_GALON", label: "Beli Es Batu / Galon Air" },
  { id: "BAHAN_BENSIN_GENSET", label: "Bensin Genset / Perlengkapan Cuci" },
  { id: "MAKAN_STAF", label: "Konsumsi / Snack Tamu & Staf" },
  { id: "SETOR_BANK", label: "Setor Kas Tunai ke Bank / Owner" },
  { id: "PENGELUARAN_LAIN", label: "Pengeluaran Operasional Lain" },
];

export function CashMovementDialog({
  open,
  onOpenChange,
  outletId,
  defaultType = "PAID_OUT",
  onSuccess,
}: CashMovementDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<"PAID_IN" | "PAID_OUT">(defaultType);
  const [category, setCategory] = useState<string>("");
  const [amountRaw, setAmountRaw] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const amountNumber = Number(amountRaw.replace(/[^0-9]/g, "")) || 0;
  const categories =
    type === "PAID_IN" ? PAID_IN_CATEGORIES : PAID_OUT_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amountNumber <= 0) {
      toast.error("Nominal uang kas harus lebih besar dari 0.");
      return;
    }

    if (!category) {
      toast.error("Pilih kategori alasan mutasi kas.");
      return;
    }

    if (notes.trim().length < 2) {
      toast.error("Tuliskan keterangan detail alasan mutasi kas.");
      return;
    }

    startTransition(async () => {
      const res = await recordCashMovementAction({
        outletId,
        type,
        category,
        amount: amountNumber,
        notes: notes.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mencatat mutasi uang kas.");
        return;
      }

      const label = type === "PAID_IN" ? "Kas Masuk" : "Kas Keluar";
      toast.success(
        `${label} sebesar ${formatRupiah(amountNumber)} berhasil dicatat di laci kas!`
      );
      setAmountRaw("");
      setNotes("");
      setCategory("");
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs ${
                type === "PAID_IN" ? "bg-emerald-600" : "bg-rose-600"
              }`}
            >
              {type === "PAID_IN" ? (
                <ArrowDownLeft className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-black">
                Catat Mutasi Kas Kecil (Petty Cash)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Uang fisik kas masuk atau keluar dari laci loket kasir.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* 1. Toggle Jenis Mutasi */}
          <div className="bg-muted/60 grid grid-cols-2 gap-2 rounded-xl p-1">
            <button
              type="button"
              onClick={() => {
                setType("PAID_IN");
                setCategory("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition-all ${
                type === "PAID_IN"
                  ? "bg-card text-emerald-600 shadow-xs dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>Kas Masuk (+ In)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("PAID_OUT");
                setCategory("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition-all ${
                type === "PAID_OUT"
                  ? "bg-card text-rose-600 shadow-xs dark:text-rose-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Kas Keluar (- Out)</span>
            </button>
          </div>

          {/* 2. Pilihan Kategori */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Kategori Mutasi</Label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.label)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-all ${
                    category === c.label
                      ? type === "PAID_IN"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Input Nominal Rupiah */}
          <div className="space-y-1.5">
            <Label htmlFor="cash-amount" className="text-xs font-bold">
              Nominal Uang (Rp)
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm font-black">
                Rp
              </span>
              <Input
                id="cash-amount"
                type="text"
                inputMode="numeric"
                value={
                  amountRaw
                    ? Number(amountRaw.replace(/[^0-9]/g, "")).toLocaleString(
                        "id-ID"
                      )
                    : ""
                }
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder="0"
                className="pl-10 font-mono text-lg font-black"
                required
              />
            </div>
            {amountNumber > 0 && (
              <p className="text-muted-foreground text-[11px] font-medium">
                Terbilang:{" "}
                <span className="text-foreground font-bold">
                  {formatRupiah(amountNumber)}
                </span>
              </p>
            )}
          </div>

          {/* 4. Catatan Detail */}
          <div className="space-y-1.5">
            <Label htmlFor="cash-notes" className="text-xs font-bold">
              Keterangan Alasan
            </Label>
            <Textarea
              id="cash-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Beli es batu 2 bal dan galon Aqua untuk ruang tunggu..."
              rows={2}
              className="resize-none text-xs"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || amountNumber <= 0 || !category}
              className={
                type === "PAID_IN"
                  ? "bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                  : "bg-rose-600 font-bold text-white hover:bg-rose-700"
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>Simpan {type === "PAID_IN" ? "Kas Masuk" : "Kas Keluar"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
