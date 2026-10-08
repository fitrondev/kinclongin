import {
  Check,
  CreditCard,
  Droplets,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";

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

export interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletName: string;
  isOwner?: boolean;
  createFullName: string;
  setCreateFullName: (val: string) => void;
  createEmail: string;
  setCreateEmail: (val: string) => void;
  createPassword: string;
  setCreatePassword: (val: string) => void;
  createRole: UserRole;
  setCreateRole: (val: UserRole) => void;
  createPhone: string;
  setCreatePhone: (val: string) => void;
  createPinCode: string;
  setCreatePinCode: (val: string) => void;
  createCommissionRate: string;
  setCreateCommissionRate: (val: string) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  outletName,
  isOwner,
  createFullName,
  setCreateFullName,
  createEmail,
  setCreateEmail,
  createPassword,
  setCreatePassword,
  createRole,
  setCreateRole,
  createPhone,
  setCreatePhone,
  createPinCode,
  setCreatePinCode,
  createCommissionRate,
  setCreateCommissionRate,
  isPending,
  onSubmit,
}: CreateUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[95vw] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black uppercase sm:text-lg">
            <UserPlus className="text-primary h-5 w-5 shrink-0" />
            <span>Pembuatan Akun Staf Baru</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Buat akun langsung untuk staf cabang {outletName} dengan kredensial
            login dan peran yang sesuai.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Pilihan Peran (Role Selector) */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-bold uppercase">
              Peran Pengguna (Role)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                {
                  role: UserRole.CASHIER,
                  label: "Kasir POS",
                  desc: "Front-desk & Kasir",
                  icon: CreditCard,
                },
                {
                  role: UserRole.WASHER,
                  label: "Tukang Cuci",
                  desc: "PIN Tablet Kiosk",
                  icon: Droplets,
                },
                {
                  role: UserRole.MANAGER,
                  label: "Manajer Cabang",
                  desc: "Supervisi & Stok",
                  icon: ShieldCheck,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = createRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setCreateRole(item.role)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-primary/20 ring-2"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className="h-4 w-4" />
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                    <span className="text-foreground mt-1 text-xs font-bold">
                      {item.label}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Contoh: Rian Pratama"
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
                className="h-10 pl-9 text-sm"
                required
              />
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Email Akun (Login)
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="staf@kinclongin.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="h-10 pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Kata Sandi Awal
              </label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="h-10 pl-9 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* No. Telepon */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Nomor WhatsApp / HP (Opsional)
            </label>
            <div className="relative">
              <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="tel"
                placeholder="08123456789"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Form Khusus Tukang Cuci: PIN Tablet Kiosk & Komisi */}
          {createRole === UserRole.WASHER ? (
            <div className="bg-muted/40 space-y-3 rounded-xl border p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <KeyRound className="h-4 w-4" />
                <span>Pengaturan Tablet Layar Cuci (Kiosk)</span>
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
                    value={createPinCode}
                    onChange={(e) => setCreatePinCode(e.target.value)}
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
                    value={createCommissionRate}
                    onChange={(e) => setCreateCommissionRate(e.target.value)}
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
              {isPending ? "Menyimpan..." : "Simpan & Buat Akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
