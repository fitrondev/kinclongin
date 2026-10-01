"use client";

import { useState } from "react";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Silakan masukkan email dan password.");
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
        toast.error("Email atau kata sandi tidak valid.");
      } else {
        toast.success("Berhasil masuk!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat mencoba masuk.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (
    demoEmail: string,
    demoPass: string,
    roleName: string,
    targetUrl: string
  ) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    setLoggingInRole(roleName);

    try {
      const res = await signIn("credentials", {
        email: demoEmail.trim().toLowerCase(),
        password: demoPass,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Gagal masuk dengan akun demo.");
      } else {
        toast.success(`Berhasil masuk sebagai ${roleName}!`);
        router.push(targetUrl);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat mencoba masuk.");
    } finally {
      setIsLoading(false);
      setLoggingInRole(null);
    }
  };

  return (
    <Card className="border-border/70 bg-card/95 w-full rounded-2xl shadow-xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
          Masuk ke Kinclongin
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
          Akses dasbor manajemen kasir & operasional cabang Anda.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-foreground text-xs font-bold"
            >
              Email Pengguna
            </Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="nama@kinclongin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary h-11 rounded-xl pl-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-foreground text-xs font-bold"
              >
                Kata Sandi
              </Label>
            </div>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary h-11 rounded-xl pl-9 text-sm"
              />
            </div>
          </div>

          {/* Quick Demo Credential Section with 1-Click Login */}
          <div
            className="border-border/50 bg-muted/40 space-y-2.5 rounded-xl border p-3.5"
            suppressHydrationWarning
          >
            <div className="flex items-center justify-between">
              <p
                className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold"
                suppressHydrationWarning
              >
                <ShieldCheck className="text-primary h-4 w-4" />
                Masuk Cepat 1-Klik Akun Demo:
              </p>
              <span className="text-muted-foreground font-mono text-[10px]">
                Pass: 123456
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2" suppressHydrationWarning>
              {/* 1. Owner */}
              <button
                type="button"
                disabled={isLoading}
                suppressHydrationWarning
                onClick={() =>
                  handleDemoLogin(
                    "owner@kinclongin.com",
                    "123456",
                    "Owner",
                    "/dashboard"
                  )
                }
                className="flex cursor-pointer items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-left transition-all hover:bg-amber-500/20 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    👑 Owner
                  </p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    Pak H. Ridwan
                  </p>
                </div>
                {loggingInRole === "Owner" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-amber-600/70" />
                )}
              </button>

              {/* 2. Manajer */}
              <button
                type="button"
                disabled={isLoading}
                suppressHydrationWarning
                onClick={() =>
                  handleDemoLogin(
                    "danu.operasional@kinclongin.com",
                    "123456",
                    "Manajer",
                    "/dashboard"
                  )
                }
                className="flex cursor-pointer items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-left transition-all hover:bg-blue-500/20 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    👔 Manajer
                  </p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    Danu Prakoso
                  </p>
                </div>
                {loggingInRole === "Manajer" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-blue-600/70" />
                )}
              </button>

              {/* 3. Kasir */}
              <button
                type="button"
                disabled={isLoading}
                suppressHydrationWarning
                onClick={() =>
                  handleDemoLogin(
                    "kasir.mataram@kinclongin.com",
                    "123456",
                    "Kasir",
                    "/pos/antrean"
                  )
                }
                className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-left transition-all hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    💳 Kasir
                  </p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    Siti Rahma
                  </p>
                </div>
                {loggingInRole === "Kasir" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-600/70" />
                )}
              </button>

              {/* 4. Washer (Agus) -> Langsung Masuk ke Dashboard Washer */}
              <button
                type="button"
                disabled={isLoading}
                suppressHydrationWarning
                onClick={() =>
                  handleDemoLogin(
                    "agus.washer@kinclongin.com",
                    "123456",
                    "Washer (Agus)",
                    "/dashboard"
                  )
                }
                className="ring-primary/40 flex cursor-pointer items-center justify-between rounded-xl border border-purple-500/40 bg-purple-500/15 p-2.5 text-left shadow-xs ring-1 transition-all hover:bg-purple-500/25 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                    🧽 Washer (Agus)
                  </p>
                  <p className="truncate text-[10px] font-medium text-purple-600/90 dark:text-purple-300/90">
                    PIN: 1234 • Ke Dasbor
                  </p>
                </div>
                {loggingInRole === "Washer (Agus)" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-purple-600" />
                )}
              </button>
            </div>
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
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
