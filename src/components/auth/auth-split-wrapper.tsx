"use client";

import Image from "next/image";
import Link from "next/link";

import {
  CheckCircle2,
  Droplets,
  Layers,
  Receipt,
  ShieldCheck,
  Sparkles,
  Tablet,
  WifiOff,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";

interface AuthSplitWrapperProps {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
}

export function AuthSplitWrapper({ children, mode }: AuthSplitWrapperProps) {
  return (
    <div className="bg-background relative flex min-h-screen w-full flex-col lg:flex-row">
      {/* Kolom Kiri: Visual Car Wash Studio & Branding */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white lg:flex lg:w-1/2 lg:p-12 xl:p-16">
        {/* Background Image Hero */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/auth-hero.jpg"
            alt="Kinclongin Car Wash Studio"
            fill
            priority
            className="scale-105 object-cover object-center brightness-[0.65] contrast-[1.08] transition-transform duration-1000 ease-out hover:scale-100"
          />
          {/* Gradients Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/50 to-slate-950/30" />
          <div className="absolute inset-0 bg-radial from-transparent via-slate-950/20 to-slate-950/80" />
        </div>

        {/* Top Header Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 p-2 shadow-lg ring-2 ring-white/20 backdrop-blur-md">
              <Image
                src="/logoipsum.svg"
                alt="Kinclongin Logo"
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <span className="font-mono text-2xl font-black tracking-tight text-white uppercase">
                Kinclongin
              </span>
              <span className="text-primary-foreground/90 ml-2 rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold">
                POS v1.0
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-white/20 bg-white/10 text-xs font-semibold text-white backdrop-blur-md"
            >
              <Droplets className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
              Cuci Mobil & Motor
            </Badge>
            <Badge
              variant="outline"
              className="border-white/20 bg-white/10 text-xs font-semibold text-white backdrop-blur-md"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
              Multi-Tenant B2B
            </Badge>
            <Badge
              variant="outline"
              className="border-white/20 bg-white/10 text-xs font-semibold text-white backdrop-blur-md"
            >
              <WifiOff className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
              Offline-First PWA
            </Badge>
          </div>
        </div>

        {/* Center Content / Tagline */}
        <div className="relative z-10 my-auto max-w-lg space-y-4 py-8">
          <h1 className="text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl xl:text-5xl">
            Sistem Operasional & POS Cuci Modern
          </h1>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Tingkatkan efisiensi bay cuci mobil & motor Anda. Dilengkapi antrean
            Kanban visual, klaim pengerjaan pekerja berbasis PIN tablet, struk
            digital WhatsApp, dan ketahanan luring area basah.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="text-primary h-4 w-4" />
                <span>Antrean Kanban Live</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Pantau antrean dari cuci hingga semir tanpa antrean manual.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Tablet className="h-4 w-4 text-cyan-400" />
                <span>Layar Cuci (PIN Pekerja)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Pekerja klaim unit cuci dengan PIN cepat & komisi otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Testimonial / Footnote */}
        <div className="relative z-10 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Biaya Flat Rp 50.000 / bulan per cabang</span>
            </div>
            <span>© {new Date().getFullYear()} Kinclongin POS</span>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Auth.js Form */}
      <div className="bg-background flex w-full flex-col justify-between p-6 sm:p-10 lg:w-1/2 lg:p-12 xl:p-16">
        {/* Top Header Bar with Theme Toggle & Mobile Logo */}
        <div className="flex items-center justify-between">
          {/* Logo khusus tampilan mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg p-1.5 shadow-sm">
              <Image
                src="/logoipsum.svg"
                alt="Kinclongin Logo"
                width={28}
                height={28}
                className="h-6 w-6 object-contain"
              />
            </div>
            <span className="text-foreground font-mono text-xl font-black tracking-tight uppercase">
              Kinclongin
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs font-medium sm:inline">
              {mode === "sign-in" ? "Belum punya akun?" : "Sudah punya akun?"}
            </span>
            <Link
              href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
              className="text-primary hover:text-primary/80 text-xs font-bold transition-colors"
            >
              {mode === "sign-in" ? "Daftar Cabang" : "Masuk"}
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Center Container for Auth Form */}
        <div className="my-auto flex w-full flex-col items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Bottom Help Note */}
        <div className="text-muted-foreground text-center text-xs">
          Butuh bantuan aktivasi cabang?{" "}
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20Kinclongin,%20saya%20butuh%20bantuan%20aktivasi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline"
          >
            Hubungi WhatsApp Support
          </a>
        </div>
      </div>
    </div>
  );
}
