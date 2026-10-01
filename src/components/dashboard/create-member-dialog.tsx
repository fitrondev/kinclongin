"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Shield,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  type CreateBranchMemberInput,
  createBranchMemberAction,
} from "@/actions/org";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CreateMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"CASHIER" | "MANAGER" | "WASHER">("CASHIER");
  const [pinCode, setPinCode] = useState("");
  const [commissionRate, setCommissionRate] = useState("10000");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      toast.error("Nama lengkap, email, dan kata sandi sementara wajib diisi.");
      return;
    }

    if (role === "WASHER" && pinCode && !/^\d{4}$/.test(pinCode)) {
      toast.error("PIN Pekerja harus tepat 4 angka.");
      return;
    }

    startTransition(async () => {
      const res = await createBranchMemberAction({
        fullName,
        email,
        password,
        role,
        phone: phone || undefined,
        pinCode: pinCode || undefined,
        commissionRate: role === "WASHER" ? Number(commissionRate) : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mendaftarkan staf baru.");
        return;
      }

      toast.success(
        `Staf ${fullName} (${role}) berhasil didaftarkan ke cabang!`
      );
      setOpen(false);
      // Reset form
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setPinCode("");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-9 gap-1.5 px-2.5 font-bold shadow-xs sm:px-3"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Staf</span>
          <span className="text-xs sm:hidden">Staf</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <UserPlus className="text-primary h-5 w-5" />
            <span>Pendaftaran Staf Cabang Langsung</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Daftarkan kasir, manajer, atau tukang cuci langsung ke cabang tanpa
            alur undangan email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Pilihan Role */}
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-bold uppercase">
              Peran Staf (Role)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["CASHIER", "WASHER", "MANAGER"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary ring-primary/20 ring-2"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {r === "CASHIER"
                    ? "Kasir"
                    : r === "WASHER"
                      ? "Tukang Cuci"
                      : "Manajer"}
                </button>
              ))}
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 pl-9 text-sm"
                required
              />
            </div>
          </div>

          {/* Email & No Telepon */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Email Akun
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="staf@kinclongin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                No. WhatsApp (Opsional)
              </label>
              <div className="relative">
                <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="tel"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Password Sementara */}
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
              Password Sementara
            </label>
            <div className="relative">
              <KeyRound className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pl-9 text-sm"
                required
              />
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Staf dapat mengganti password setelah berhasil masuk pertama kali.
            </p>
          </div>

          {/* Khusus Washer: PIN 4 Digit Layar Cuci & Komisi */}
          {role === "WASHER" && (
            <div className="bg-muted/40 space-y-3 rounded-xl border border-dashed p-3">
              <div className="text-primary flex items-center gap-1.5 text-xs font-bold">
                <Shield className="h-3.5 w-3.5" />
                <span>Pengaturan Layar Cuci & Komisi</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground mb-1 block text-[11px] font-bold uppercase">
                    PIN Tablet (4 Digit)
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="Contoh: 1234"
                    value={pinCode}
                    onChange={(e) =>
                      setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="h-9 text-center font-mono text-base font-bold tracking-widest"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground mb-1 block text-[11px] font-bold uppercase">
                    Komisi Flat / Cuci
                  </label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                "Simpan & Aktifkan Staf"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
