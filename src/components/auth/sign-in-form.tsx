"use client";

import { useState } from "react";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Silakan masukkan email atau username dan kata sandi.");
      return;
    }

    setIsLoading(true);

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      cleanEmail = `${cleanEmail}@kinclongin.com`;
    }

    try {
      const res = await signIn("credentials", {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Email/username atau kata sandi tidak valid.");
      } else {
        const isSuperAdminEmail =
          cleanEmail.startsWith("superadmin") ||
          cleanEmail === "admin@kinclongin.com";
        const destination =
          cleanEmail.startsWith("kasir") && callbackUrl === "/dashboard"
            ? "/pos/antrean"
            : isSuperAdminEmail && callbackUrl === "/dashboard"
              ? "/dashboard/admin"
              : callbackUrl;
        router.push(destination);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat mencoba masuk.");
    } finally {
      setIsLoading(false);
    }
  };

  const authError = searchParams.get("error");

  return (
    <Card className="border-border/70 bg-card/95 w-full rounded-2xl shadow-xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-3">
        <CardTitle className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
          Masuk ke Akun Usaha
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
          Akses dasbor kasir POS & operasional cabang terdaftar Anda.
        </CardDescription>
      </CardHeader>

      {/* Banner Menuju Demo Sign In */}
      <div className="mx-6 mb-2 flex items-center justify-between gap-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div className="min-w-0">
            <span className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Mencari Akun Demo untuk Uji Coba?
            </span>
            <span className="text-muted-foreground block truncate text-[11px]">
              Akses cepat seluruh peran kasir, washer & owner 1-klik.
            </span>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="h-8 shrink-0 rounded-lg bg-indigo-600 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-700"
        >
          <Link href="/demo/sign-in">
            <span>Demo Login</span>
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="mb-4 space-y-4">
          {authError && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold">
              <span>
                {authError === "CredentialsSignin"
                  ? "Email/username atau kata sandi tidak cocok. Silakan coba lagi."
                  : "Terjadi kesalahan saat masuk. Silakan coba lagi."}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-foreground text-xs font-bold"
            >
              Email atau Username
            </Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="email"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="nama@usaha.com atau username kasir"
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
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary h-11 rounded-xl pr-10 pl-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex h-5 w-5 cursor-pointer items-center justify-center"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
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

          <div className="text-muted-foreground flex flex-col items-center gap-1.5 pt-1 text-center text-xs">
            <p>
              Belum mendaftarkan usaha Anda?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:text-primary/80 font-bold underline underline-offset-4"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
