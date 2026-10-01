"use client";

import { useState } from "react";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { registerOwnerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [outletName, setOutletName] = useState("");
  const [outletAddress, setOutletAddress] = useState("");
  const [outletPhone, setOutletPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !fullName ||
      !email ||
      !password ||
      !outletName ||
      !outletAddress ||
      !outletPhone
    ) {
      toast.error("Mohon lengkapi seluruh kolom formulir.");
      return;
    }

    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerOwnerAction({
        fullName,
        email,
        password,
        outletName,
        outletAddress,
        outletPhone,
      });

      if (!res.success) {
        toast.error(res.error || "Pendaftaran gagal. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      toast.success("Pendaftaran berhasil! Sedang masuk ke sistem...");

      // Otomatis masuk setelah pendaftaran berhasil
      const loginRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        toast.info("Akun terdaftar. Silakan masuk manual.");
        router.push("/sign-in");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kendala jaringan saat pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/95 w-full rounded-2xl shadow-xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
            Daftar Akun Cabang Baru
          </CardTitle>
          <Sparkles className="text-primary h-5 w-5" />
        </div>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
          Mulai kelola operasional cuci kendaraan Anda dengan uji coba gratis 14
          hari.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5">
          {/* Bagian 1: Data Pemilik */}
          <div className="space-y-2">
            <span className="text-primary text-[11px] font-extrabold tracking-wider uppercase">
              1. Identitas Pemilik (Owner)
            </span>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs font-semibold">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="fullName"
                    placeholder="Budi Santoso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email Login
                </Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="budi@usaha.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold">
                Kata Sandi (Minimal 6 Karakter)
              </Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 rounded-xl pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Bagian 2: Data Cabang */}
          <div className="border-border/60 space-y-2 border-t pt-1">
            <span className="text-primary text-[11px] font-extrabold tracking-wider uppercase">
              2. Data Cabang Pertama
            </span>

            <div className="space-y-1">
              <Label htmlFor="outletName" className="text-xs font-semibold">
                Nama Usaha / Cabang Cuci
              </Label>
              <div className="relative">
                <Building2 className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  id="outletName"
                  placeholder="Kinclongin Cabang Mataram"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 rounded-xl pl-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="outletAddress"
                  className="text-xs font-semibold"
                >
                  Alamat Cabang
                </Label>
                <div className="relative">
                  <MapPin className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="outletAddress"
                    placeholder="Jl. Merdeka No. 10"
                    value={outletAddress}
                    onChange={(e) => setOutletAddress(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="outletPhone" className="text-xs font-semibold">
                  Nomor WhatsApp Cabang
                </Label>
                <div className="relative">
                  <Phone className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="outletPhone"
                    placeholder="081234567890"
                    value={outletPhone}
                    onChange={(e) => setOutletPhone(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Termasuk <strong>Uji Coba 14 Hari Gratis</strong> akses penuh
              seluruh fitur.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-md transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mendaftarkan Cabang...</span>
              </>
            ) : (
              <>
                <span>Daftar & Mulai Uji Coba</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
