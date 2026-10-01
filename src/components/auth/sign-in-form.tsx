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

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
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

          {/* Quick Demo Credential Pills */}
          <div className="border-border/50 bg-muted/40 rounded-xl border p-3">
            <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[11px] font-semibold">
              <ShieldCheck className="text-primary h-3.5 w-3.5" />
              Akun Demo Siap Pakai (Password: 123456):
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo("owner@kinclongin.com", "123456")}
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFillDemo("danu.operasional@kinclongin.com", "123456")
                }
                className="border-border bg-background text-foreground hover:bg-muted rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors"
              >
                Manajer
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFillDemo("kasir.mataram@kinclongin.com", "123456")
                }
                className="border-border bg-background text-foreground hover:bg-muted rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors"
              >
                Kasir
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
