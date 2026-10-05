import { Edit2, KeyRound, Mail, Phone, User } from "lucide-react";

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
import { UserRole } from "@/generated/prisma/enums";

export interface EditUserDialogProps {
  editModalUser: UserAccountItem | null;
  onOpenChange: (open: boolean) => void;
  editFullName: string;
  setEditFullName: (val: string) => void;
  editEmail: string;
  setEditEmail: (val: string) => void;
  editPhone: string;
  setEditPhone: (val: string) => void;
  editPinCode: string;
  setEditPinCode: (val: string) => void;
  editCommissionRate: string;
  setEditCommissionRate: (val: string) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditUserDialog({
  editModalUser,
  onOpenChange,
  editFullName,
  setEditFullName,
  editEmail,
  setEditEmail,
  editPhone,
  setEditPhone,
  editPinCode,
  setEditPinCode,
  editCommissionRate,
  setEditCommissionRate,
  isPending,
  onSubmit,
}: EditUserDialogProps) {
  return (
    <Dialog
      open={Boolean(editModalUser)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="max-h-[90dvh] w-[95vw] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black uppercase sm:text-lg">
            <Edit2 className="text-primary h-5 w-5 shrink-0" />
            <span>Edit Data Staf & PIN</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Perbarui data profil, kontak, serta pengaturan PIN Kiosk untuk staf{" "}
            <strong className="text-foreground">
              {editModalUser?.fullName}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Nama Lengkap */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="h-10 pl-9 text-sm font-semibold"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Email Akun
            </label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10 pl-9 text-sm"
                required
              />
            </div>
          </div>

          {/* Telepon */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Nomor WhatsApp / HP
            </label>
            <div className="relative">
              <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="tel"
                placeholder="08123456789"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Form Khusus Washer: PIN Kiosk & Komisi */}
          {editModalUser?.role === UserRole.WASHER ? (
            <div className="bg-muted/40 space-y-3 rounded-xl border p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <KeyRound className="h-4 w-4" />
                <span>Pengaturan Tablet Kiosk & Komisi</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    PIN Kiosk 4 Digit
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="Contoh: 1234"
                    value={editPinCode}
                    onChange={(e) => setEditPinCode(e.target.value)}
                    className="text-center font-mono text-sm font-bold tracking-widest"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                    Komisi per Cuci (Rp)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={editCommissionRate}
                    onChange={(e) => setEditCommissionRate(e.target.value)}
                    className="font-mono text-sm font-bold"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
