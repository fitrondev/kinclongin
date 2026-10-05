import { KeyRound, Lock } from "lucide-react";

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
import { Input } from "@/components/ui/input";

export interface ResetPasswordDialogProps {
  resetModalUser: UserAccountItem | null;
  onOpenChange: (open: boolean) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResetPasswordDialog({
  resetModalUser,
  onOpenChange,
  newPassword,
  setNewPassword,
  isPending,
  onSubmit,
}: ResetPasswordDialogProps) {
  return (
    <Dialog
      open={Boolean(resetModalUser)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black uppercase sm:text-lg">
            <KeyRound className="text-primary h-5 w-5 shrink-0" />
            <span>Reset Kata Sandi</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Masukkan kata sandi baru untuk akun staf{" "}
            <strong className="text-foreground">
              {resetModalUser?.fullName}
            </strong>{" "}
            ({resetModalUser?.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Kata Sandi Baru (Min. 6 Karakter)
            </label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="password"
                placeholder="Masukkan password baru..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 pl-9 text-sm"
                required
              />
            </div>
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
              type="submit"
              disabled={isPending}
              className="bg-amber-600 font-bold hover:bg-amber-700"
            >
              {isPending ? "Menyimpan..." : "Reset Kata Sandi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
