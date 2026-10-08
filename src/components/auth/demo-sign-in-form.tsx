"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  Droplets,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

interface DemoRole {
  name: string;
  badge: string;
  badgeClass: string;
  email: string;
  pass: string;
  targetUrl: string;
  desc: string;
  icon: typeof Crown;
  pinCode?: string;
}

const DEMO_ROLES: DemoRole[] = [
  {
    name: "Superadmin Platform",
    badge: "Platform Provider",
    badgeClass:
      "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    email: "superadmin@kinclongin.com",
    pass: "123456",
    targetUrl: "/dashboard/admin/subscriptions",
    desc: "Approval langganan Rp 50k, kelola seluruh tenant & katalog",
    icon: Sparkles,
  },
  {
    name: "Owner 1 (H. Ridwan)",
    badge: "Multi-Cabang",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    email: "ridwan.owner@autoclean.com",
    pass: "123456",
    targetUrl: "/dashboard",
    desc: "AutoClean Group (2 Cabang Aktif), omset & laba rugi",
    icon: Crown,
  },
  {
    name: "Manajer Cabang",
    badge: "Supervisor",
    badgeClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    email: "danu.manager@autoclean.com",
    pass: "123456",
    targetUrl: "/dashboard",
    desc: "Buka/tutup shift kasir, petty cash & otorisasi PIN void",
    icon: Briefcase,
  },
  {
    name: "Kasir Loket POS",
    badge: "Front-Desk",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    email: "siti.kasir@autoclean.com",
    pass: "123456",
    targetUrl: "/pos/antrean",
    desc: "Input walk-in, antrean live SSE, checkout struk thermal",
    icon: CreditCard,
  },
  {
    name: "Washer (Agus)",
    badge: "Tablet Kiosk",
    badgeClass:
      "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    email: "agus.washer@autoclean.com",
    pass: "123456",
    targetUrl: "/layar-cuci",
    desc: "Layar sentuh basah, klaim cuci via PIN: 1234, rekap komisi",
    icon: Droplets,
    pinCode: "1234",
  },
  {
    name: "Owner 2 (Dewi A.)",
    badge: "Tenant Terpisah",
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    email: "dewi.owner@kilapglossy.com",
    pass: "123456",
    targetUrl: "/dashboard",
    desc: "Kilap Glossy Mataram (Uji isolasi data B2B antar owner)",
    icon: Users,
  },
];

export function DemoSignInForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);

  const handle1ClickLogin = async (role: DemoRole) => {
    setEmail(role.email);
    setPassword(role.pass);
    setIsLoading(true);
    setLoggingInRole(role.name);

    try {
      const res = await signIn("credentials", {
        email: role.email.trim().toLowerCase(),
        password: role.pass,
        redirect: false,
      });

      if (res?.error) {
        toast.error(`Gagal masuk sebagai ${role.name}.`);
      } else {
        toast.success(`Berhasil masuk sebagai ${role.name}!`);
        router.push(role.targetUrl);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kendala sistem saat mencoba login demo.");
    } finally {
      setIsLoading(false);
      setLoggingInRole(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(
        "Pilih salah satu tombol demo atau masukkan email dan password."
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Kredensial tidak valid.");
      } else {
        toast.success("Berhasil masuk!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan saat masuk.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/95 w-full rounded-2xl shadow-xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 py-0.5 text-[10px] font-bold text-white">
              MODE DEMO
            </Badge>
            <span className="text-muted-foreground font-mono text-[11px]">
              Password semua akun: <strong>123456</strong>
            </span>
          </div>
        </div>
        <CardTitle className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
          Masuk Akun Demo (1-Klik)
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
          Pilih salah satu peran di bawah ini untuk langsung menjelajahi sistem
          tanpa registrasi.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-0">
        {/* Tombol 1-Klik Peran Demo */}
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Pilih Peran Demo untuk Masuk Instan:</span>
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ROLES.map((role) => {
              const Icon = role.icon;
              const isLoggingThis = loggingInRole === role.name;

              return (
                <button
                  key={role.name}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handle1ClickLogin(role)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-left transition-all hover:shadow-xs disabled:opacity-50 ${
                    role.name === "Superadmin Platform"
                      ? "border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 sm:col-span-2"
                      : role.name.includes("Washer")
                        ? "border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 sm:col-span-2"
                        : "border-border/70 bg-muted/40 hover:bg-muted/70"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className="text-foreground h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground truncate text-xs font-bold">
                        {role.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`py-0 text-[9px] font-bold ${role.badgeClass}`}
                      >
                        {role.badge}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                      {role.desc}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center">
                    {isLoggingThis ? (
                      <Loader2 className="text-primary h-4 w-4 animate-spin" />
                    ) : (
                      <div className="bg-background/80 text-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-xs">
                        <Play className="ml-0.5 h-3 w-3 fill-current" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulir Manual Sederhana (Jika pengguna ingin memeriksa input) */}
        <div className="border-border/60 space-y-2.5 border-t pt-3">
          <p className="text-muted-foreground text-[11px] font-bold">
            Atau uji coba ketik kredensial secara manual:
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                <Input
                  type="text"
                  placeholder="Email demo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-9 rounded-xl pl-8 font-mono text-xs"
                />
              </div>

              <div className="relative">
                <Lock className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-9 rounded-xl pr-8 pl-8 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5 h-4 w-4"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="outline"
              className="h-9 w-full gap-1.5 rounded-xl text-xs font-bold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk dengan Kredensial di Atas</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </CardContent>

      <CardFooter className="border-border/50 flex flex-col gap-2 border-t pt-1">
        <div className="text-muted-foreground flex flex-col items-center gap-1.5 text-center text-xs">
          <p>
            Sudah memiliki akun resmi usaha Anda?{" "}
            <Link
              href="/sign-in"
              className="text-primary hover:text-primary/80 font-bold underline underline-offset-4"
            >
              Masuk
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
