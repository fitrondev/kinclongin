import type { WorkShiftItem } from "@/actions/shifts";
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
import { Textarea } from "@/components/ui/textarea";

export interface ShiftTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShift: WorkShiftItem | null;
  shiftName: string;
  setShiftName: (val: string) => void;
  shiftStartTime: string;
  setShiftStartTime: (val: string) => void;
  shiftEndTime: string;
  setShiftEndTime: (val: string) => void;
  shiftDesc: string;
  setShiftDesc: (val: string) => void;
  shiftColor: "emerald" | "blue" | "amber" | "purple" | "rose";
  setShiftColor: (
    val: "emerald" | "blue" | "amber" | "purple" | "rose"
  ) => void;
  isPending: boolean;
  onSaveShiftTemplate: () => void;
}

export function ShiftTemplateDialog({
  open,
  onOpenChange,
  editingShift,
  shiftName,
  setShiftName,
  shiftStartTime,
  setShiftStartTime,
  shiftEndTime,
  setShiftEndTime,
  shiftDesc,
  setShiftDesc,
  shiftColor,
  setShiftColor,
  isPending,
  onSaveShiftTemplate,
}: ShiftTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-black">
            {editingShift
              ? "Edit Template Shift"
              : "Tambah Template Shift Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Atur nama shift, rentang jam kerja operasional, dan tema warna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Nama Shift *</Label>
            <Input
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Contoh: Shift Pagi (Buka), Shift Malam"
              className="text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Jam Mulai (HH:mm) *</Label>
              <Input
                type="text"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                placeholder="07:30"
                className="font-mono text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Jam Selesai (HH:mm) *</Label>
              <Input
                type="text"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                placeholder="15:30"
                className="font-mono text-xs font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Warna Tema Badge</Label>
            <Select
              value={shiftColor}
              onValueChange={(val) =>
                setShiftColor(
                  val as "emerald" | "blue" | "amber" | "purple" | "rose"
                )
              }
            >
              <SelectTrigger className="text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emerald" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>Hijau Emerald (Pagi / Buka)</span>
                  </span>
                </SelectItem>
                <SelectItem value="blue" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <span>Biru Modern (Siang / Peak)</span>
                  </span>
                </SelectItem>
                <SelectItem value="amber" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>Oranye Amber (Sore / Tutup)</span>
                  </span>
                </SelectItem>
                <SelectItem value="purple" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                    <span>Ungu Eksklusif</span>
                  </span>
                </SelectItem>
                <SelectItem value="rose" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <span>Merah Rose (Khusus / Lembur)</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">
              Deskripsi Shift (Opsional)
            </Label>
            <Textarea
              value={shiftDesc}
              onChange={(e) => setShiftDesc(e.target.value)}
              placeholder="Deskripsi tugas umum shift..."
              rows={2}
              className="text-xs"
            />
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
            onClick={onSaveShiftTemplate}
            disabled={isPending}
            className="text-xs font-bold"
          >
            {isPending ? "Menyimpan..." : "Simpan Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
