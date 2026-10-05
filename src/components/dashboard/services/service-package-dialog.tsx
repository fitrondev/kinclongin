import { Coins } from "lucide-react";

import type { ServicePackageItem } from "@/actions/services";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CommissionType, VehicleCategory } from "@/generated/prisma/enums";

import { CATEGORY_INFO } from "./service-constants";

export interface ServicePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPackage: ServicePackageItem | null;
  formName: string;
  setFormName: (val: string) => void;
  formDescription: string;
  setFormDescription: (val: string) => void;
  formCategory: VehicleCategory;
  setFormCategory: (val: VehicleCategory) => void;
  formPrice: number;
  setFormPrice: (val: number) => void;
  formMinutes: number;
  setFormMinutes: (val: number) => void;
  formCommissionType: CommissionType;
  setFormCommissionType: (val: CommissionType) => void;
  formCommissionRate: number;
  setFormCommissionRate: (val: number) => void;
  formIsActive: boolean;
  setFormIsActive: (val: boolean) => void;
  isPending: boolean;
  onSave: () => void;
}

export function ServicePackageDialog({
  open,
  onOpenChange,
  editingPackage,
  formName,
  setFormName,
  formDescription,
  setFormDescription,
  formCategory,
  setFormCategory,
  formPrice,
  setFormPrice,
  formMinutes,
  setFormMinutes,
  formCommissionType,
  setFormCommissionType,
  formCommissionRate,
  setFormCommissionRate,
  formIsActive,
  setFormIsActive,
  isPending,
  onSave,
}: ServicePackageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            {editingPackage
              ? "Edit Paket Layanan Cuci"
              : "Tambah Paket Layanan Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Tentukan nama paket, kategori kendaraan, tarif pelanggan, SLA menit,
            dan komisi pekerja cuci.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nama Layanan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Nama Paket Layanan *</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: Cuci Salju + Hidrolik + Semir Ban"
              className="text-xs font-semibold"
            />
          </div>

          {/* Kategori Kendaraan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Kategori Kendaraan *</Label>
            <Select
              value={formCategory}
              onValueChange={(val) => setFormCategory(val as VehicleCategory)}
            >
              <SelectTrigger className="text-xs font-semibold">
                <SelectValue placeholder="Pilih kategori kendaraan" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                  const Icon = info.icon;
                  return (
                    <SelectItem key={key} value={key} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Icon className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="font-bold">{info.label}</span>
                        <span className="text-muted-foreground text-[11px]">
                          ({info.sub})
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Harga & SLA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tarif Harga (Rp) *</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                className="font-mono text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Estimasi SLA (Menit) *
              </Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={formMinutes}
                onChange={(e) => setFormMinutes(Number(e.target.value))}
                className="font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* Skema Komisi Pekerja */}
          <div className="bg-muted/30 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-bold">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span>Skema Komisi Tukang Cuci</span>
              </Label>

              <div className="flex items-center gap-2 text-xs">
                <span
                  onClick={() =>
                    setFormCommissionType(CommissionType.FIXED_NOMINAL)
                  }
                  className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-bold ${
                    formCommissionType === CommissionType.FIXED_NOMINAL
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Nominal (Rp)
                </span>
                <span
                  onClick={() =>
                    setFormCommissionType(CommissionType.PERCENTAGE)
                  }
                  className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-bold ${
                    formCommissionType === CommissionType.PERCENTAGE
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Persentase (%)
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px] font-medium">
                {formCommissionType === CommissionType.PERCENTAGE
                  ? "Nilai Persentase Komisi (%)"
                  : "Nominal Rupiah per Unit (Rp)"}
              </Label>
              <Input
                type="number"
                min={0}
                value={formCommissionRate}
                onChange={(e) => setFormCommissionRate(Number(e.target.value))}
                className="font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">
              Deskripsi Layanan (Opsional)
            </Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Rincian bagian pengerjaan: bodi luar, kolong hidrolik, vakum interior, semir ban..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Status Aktif */}
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold">Status Paket Aktif</Label>
              <p className="text-muted-foreground text-[11px]">
                Paket aktif dapat langsung dipilih oleh kasir saat pendaftaran
                tiket.
              </p>
            </div>
            <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending}
            className="text-xs font-bold"
          >
            {isPending ? "Menyimpan..." : "Simpan Paket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
