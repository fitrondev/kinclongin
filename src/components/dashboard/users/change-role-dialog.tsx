import { Check, CreditCard, Crown, Droplets, ShieldCheck } from "lucide-react";

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
import { UserRole } from "@/generated/prisma/enums";

export interface ChangeRoleDialogProps {
  roleModalUser: UserAccountItem | null;
  onOpenChange: (open: boolean) => void;
  targetNewRole: UserRole;
  setTargetNewRole: (val: UserRole) => void;
  isOwner: boolean;
  isPending: boolean;
  onConfirmUpdateRole: () => void;
}

export function ChangeRoleDialog({
  roleModalUser,
  onOpenChange,
  targetNewRole,
  setTargetNewRole,
  isOwner,
  isPending,
  onConfirmUpdateRole,
}: ChangeRoleDialogProps) {
  return (
    <Dialog
      open={Boolean(roleModalUser)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="max-h-[90dvh] w-[95vw] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black uppercase sm:text-lg">
            <ShieldCheck className="text-primary h-5 w-5 shrink-0" />
            <span>Ubah Peran Pengguna</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ubah peran dan kewenangan akun{" "}
            <strong className="text-foreground">
              {roleModalUser?.fullName}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-bold uppercase">
              Pilih Peran Baru:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  role: UserRole.CASHIER,
                  label: "Kasir (POS)",
                  icon: CreditCard,
                },
                {
                  role: UserRole.WASHER,
                  label: "Tukang Cuci",
                  icon: Droplets,
                },
                {
                  role: UserRole.MANAGER,
                  label: "Manajer Cabang",
                  icon: ShieldCheck,
                },
                ...(isOwner
                  ? [
                      {
                        role: UserRole.OWNER,
                        label: "Owner (Pemilik)",
                        icon: Crown,
                      },
                    ]
                  : []),
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = targetNewRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setTargetNewRole(item.role)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left font-bold transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-primary/20 ring-2"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-muted/30 text-muted-foreground rounded-xl border p-3 text-xs">
            <span className="text-foreground font-bold">Catatan:</span> Mengubah
            peran akan langsung memperbarui hak akses halaman dasbor, POS, dan
            fitur operasional terkait saat pengguna memuat ulang aplikasi.
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
            onClick={onConfirmUpdateRole}
            disabled={isPending}
            className="font-bold"
          >
            {isPending ? "Menyimpan..." : "Simpan Peran Baru"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
