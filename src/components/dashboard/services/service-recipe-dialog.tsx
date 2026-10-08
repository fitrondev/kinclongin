"use client";

import { useEffect, useState } from "react";

import { Beaker, Calculator, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  getServiceRecipesAction,
  getSuppliesForRecipeAction,
  saveServiceRecipesAction,
} from "@/actions/recipes";
import type { ServicePackageItem } from "@/actions/services";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/formatters";

interface SupplyOption {
  id: string;
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
}

interface LocalRecipeRow {
  operationalSupplyId: string;
  volumeUsage: number;
  unit: string;
}

interface ServiceRecipeDialogProps {
  pkg: ServicePackageItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceRecipeDialog({
  pkg,
  isOpen,
  onClose,
}: ServiceRecipeDialogProps) {
  const [supplies, setSupplies] = useState<SupplyOption[]>([]);
  const [rows, setRows] = useState<LocalRecipeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !pkg) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [suppliesRes, recipesRes] = await Promise.all([
          getSuppliesForRecipeAction(pkg!.outletId),
          getServiceRecipesAction(pkg!.id),
        ]);

        if (suppliesRes.success && suppliesRes.data) {
          setSupplies(suppliesRes.data);
        }

        if (
          recipesRes.success &&
          recipesRes.data &&
          recipesRes.data.length > 0
        ) {
          setRows(
            recipesRes.data.map((r) => ({
              operationalSupplyId: r.operationalSupplyId,
              volumeUsage: r.volumeUsage,
              unit: r.unit,
            }))
          );
        } else {
          // Default empty or 1 placeholder row
          setRows([]);
        }
      } catch {
        toast.error("Gagal memuat data resep.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen, pkg]);

  const handleAddRow = () => {
    if (supplies.length === 0) {
      toast.error("Belum ada data bahan operasional di cabang ini.");
      return;
    }
    const firstSupply = supplies[0];
    setRows((prev) => [
      ...prev,
      {
        operationalSupplyId: firstSupply.id,
        volumeUsage: 0.1,
        unit: firstSupply.unit,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSupplyChange = (idx: number, supplyId: string) => {
    const found = supplies.find((s) => s.id === supplyId);
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              operationalSupplyId: supplyId,
              unit: found ? found.unit : r.unit,
            }
          : r
      )
    );
  };

  const handleVolumeChange = (idx: number, val: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, volumeUsage: val } : r))
    );
  };

  // Hitung total estimasi HPP bahan kimia
  const totalHpp = rows.reduce((acc, row) => {
    const supply = supplies.find((s) => s.id === row.operationalSupplyId);
    if (!supply) return acc;
    return acc + row.volumeUsage * supply.costPerUnit;
  }, 0);

  const price = pkg ? pkg.price : 0;
  const commission = pkg ? pkg.defaultCommission : 0;
  const grossProfit = price - commission - totalHpp;
  const grossMarginPercent =
    price > 0 ? Math.round((grossProfit / price) * 100) : 0;

  const handleSave = async () => {
    if (!pkg) return;
    setIsSaving(true);
    try {
      const res = await saveServiceRecipesAction({
        servicePackageId: pkg.id,
        items: rows.filter((r) => r.volumeUsage > 0),
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan resep.");
      } else {
        toast.success(
          `Resep bahan disimpan! Estimasi HPP bahan: ${formatRupiah(
            res.data?.totalEstimatedHpp || 0
          )} per cuci.`
        );
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!pkg) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Atur Resep Bahan Kimia & HPP (COGS)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Paket: <strong className="text-foreground">{pkg.name}</strong> (
                {formatRupiah(pkg.price)})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-xs">
            Memuat konfigurasi resep...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-xs font-bold">
                Daftar Bahan Digunakan per 1x Cuci
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Bahan</span>
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-xs">
                Belum ada resep takaran bahan kimia untuk paket ini.
                <br />
                Klik <strong>+ Tambah Bahan</strong> untuk menentukan takaran
                shampoo salju / semir ban.
              </div>
            ) : (
              <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                {rows.map((row, idx) => {
                  const supply = supplies.find(
                    (s) => s.id === row.operationalSupplyId
                  );
                  const costPerUnit = supply ? supply.costPerUnit : 0;
                  const rowCost = Math.round(row.volumeUsage * costPerUnit);

                  return (
                    <div
                      key={idx}
                      className="bg-muted/30 flex items-center gap-2 rounded-xl border p-2.5"
                    >
                      <div className="flex-1 space-y-1">
                        <Select
                          value={row.operationalSupplyId}
                          onValueChange={(val) => handleSupplyChange(idx, val)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Pilih bahan" />
                          </SelectTrigger>
                          <SelectContent>
                            {supplies.map((s) => (
                              <SelectItem
                                key={s.id}
                                value={s.id}
                                className="text-xs"
                              >
                                {s.name} ({formatRupiah(s.costPerUnit)}/{s.unit}
                                )
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.001"
                          value={row.volumeUsage}
                          onChange={(e) =>
                            handleVolumeChange(
                              idx,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-xs"
                          placeholder="Takaran"
                        />
                      </div>

                      <span className="text-muted-foreground w-12 text-xs font-semibold">
                        {row.unit}
                      </span>

                      <div className="w-20 text-right">
                        <span className="text-foreground font-mono text-xs font-bold">
                          {formatRupiah(rowCost)}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rekap Simulasi Margin Laba Kotor */}
            <div className="bg-card space-y-2 rounded-xl border p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tarif Pelanggan:</span>
                <span className="text-foreground font-semibold">
                  {formatRupiah(price)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Estimasi Komisi Pekerja:
                </span>
                <span className="font-semibold text-amber-600">
                  -{formatRupiah(commission)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Total HPP Bahan Kimia (COGS):
                </span>
                <span className="font-semibold text-cyan-600">
                  -{formatRupiah(Math.round(totalHpp))}
                </span>
              </div>

              <div className="flex items-center justify-between border-t pt-2">
                <div className="flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-emerald-500" />
                  <span className="text-foreground text-xs font-extrabold">
                    Estimasi Margin Laba Kotor:
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(Math.max(0, Math.round(grossProfit)))}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-2 border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
                  >
                    {grossMarginPercent}% Margin
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-1.5 font-bold"
          >
            <Check className="h-4 w-4" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Resep"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
