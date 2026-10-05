import { AlertCircle, Loader2, Trash2 } from "lucide-react";

import type { UserAccountItem } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DeleteUserDialogProps {
  deleteModalUser: UserAccountItem | null;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirmDelete: () => void;
}

export function DeleteUserDialog({
  deleteModalUser,
  onOpenChange,
  isPending,
  onConfirmDelete,
}: DeleteUserDialogProps) {
  return (
    <Dialog
      open={Boolean(deleteModalUser)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-base font-black uppercase sm:text-lg">
            <Trash2 className="h-5 w-5 shrink-0" />
            <span>Hapus Akun Pengguna</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Apakah Anda yakin ingin menghapus akun{" "}
            <strong className="text-foreground">
              {deleteModalUser?.fullName}
            </strong>{" "}
            ({deleteModalUser?.email})?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 text-destructive border-destructive/20 flex items-start gap-2.5 rounded-xl border p-3 text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Tindakan ini tidak dapat dibatalkan. Jika pengguna ini telah
            memproses transaksi, sistem akan otomatis mengubah status menjadi
            Nonaktif demi menjaga integritas jejak audit dan riwayat finansial.
          </span>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirmDelete}
            disabled={isPending}
            className="font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              "Ya, Hapus Akun"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
