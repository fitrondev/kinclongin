import type { ShiftEmployeeItem, WorkShiftItem } from "@/actions/shifts";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserRole } from "@/generated/prisma/enums";

export interface ShiftAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: string;
  employees: ShiftEmployeeItem[];
  shifts: WorkShiftItem[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (val: string) => void;
  selectedShiftId: string;
  setSelectedShiftId: (val: string) => void;
  assignNotes: string;
  setAssignNotes: (val: string) => void;
  isPending: boolean;
  onSaveAssignment: () => void;
}

export function ShiftAssignmentDialog({
  open,
  onOpenChange,
  currentDate,
  employees,
  shifts,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedShiftId,
  setSelectedShiftId,
  assignNotes,
  setAssignNotes,
  isPending,
  onSaveAssignment,
}: ShiftAssignmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-black">
            Tugaskan Staf ke Shift
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih karyawan dan shift kerja yang akan dijalankan pada tanggal{" "}
            <span className="text-foreground font-bold">{currentDate}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pilih Karyawan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Karyawan *</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="text-xs font-semibold">
                <SelectValue placeholder="Pilih staf karyawan" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{emp.fullName}</span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-bold"
                      >
                        {emp.role === UserRole.WASHER ? "Washer" : "Kasir"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pilih Shift */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Pilih Shift Kerja *</Label>
            <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
              <SelectTrigger className="text-xs font-semibold">
                <SelectValue placeholder="Pilih shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{s.name}</span>
                      <span className="text-muted-foreground text-[11px]">
                        ({s.startTime} - {s.endTime})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catatan Tugas Khusus */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">
              Catatan Tugas (Opsional)
            </Label>
            <Textarea
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Contoh: Pegang area hidrolik 1, atau buka laci kasir pagi..."
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
            onClick={onSaveAssignment}
            disabled={isPending}
            className="text-xs font-bold"
          >
            {isPending ? "Menugaskan..." : "Simpan Penugasan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
