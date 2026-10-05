import { Trash2 } from "lucide-react";

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

export interface DeleteServiceDialogProps {
  deleteTarget: ServicePackageItem | null;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirmDelete: () => void;
}

export function DeleteServiceDialog({
  deleteTarget,
  onOpenChange,
  isPending,
  onConfirmDelete,
}: DeleteServiceDialogProps) {
  return (
    <Dialog
      open={Boolean(deleteTarget)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-base font-black">
            <Trash2 className="h-5 w-5" />
            <span>Hapus Paket Layanan?</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Apakah Anda yakin ingin menghapus paket{" "}
            <span className="text-foreground font-bold">
              &ldquo;{deleteTarget?.name}&rdquo;
            </span>
            ? Jika sudah pernah ada transaksi tiket dengan paket ini, paket akan
            otomatis dinonaktifkan agar rekap data historis tetap aman.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirmDelete}
            disabled={isPending}
            className="text-xs font-bold"
          >
            {isPending ? "Menghapus..." : "Ya, Hapus Paket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
