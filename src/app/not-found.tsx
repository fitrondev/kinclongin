import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  Car,
  Compass,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Search,
  Sparkles,
  Tablet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Background Glow Effect */}
      <div className="bg-primary/10 pointer-events-none absolute -top-40 left-1/2 h-125 w-125 -translate-x-1/2 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-100 w-100 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-xl text-center">
        {/* Animated Badge & Icon */}
        <div className="border-primary/20 bg-primary/10 mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border shadow-2xl backdrop-blur-xl">
          <Compass className="text-primary h-12 w-12 animate-[spin_12s_linear_infinite]" />
        </div>

        <div className="border-primary/30 bg-primary/5 text-primary mb-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold">
          <Image
            src="/logoipsum.svg"
            alt="Kinclongin Logo"
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
          />
          <span>Kinclongin • Error 404</span>
        </div>

        <h1 className="text-foreground text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
          Tersesat di Area Cuci?
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          Halaman atau rute yang Anda tuju tidak tersedia, telah dipindahkan,
          atau alamat URL salah ketik.
        </p>

        {/* Quick Nav Cards */}
        <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <Link
            href="/pos/antrean"
            className="group border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card flex items-center gap-3.5 rounded-2xl border p-3.5 backdrop-blur-md transition-all hover:shadow-lg"
          >
            <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground group-hover:text-primary text-sm font-bold transition-colors">
                Papan Antrean POS
              </div>
              <p className="text-muted-foreground text-[11px]">
                Pantau antrean kendaraan & kasir
              </p>
            </div>
          </Link>

          <Link
            href="/pos/daftar-baru"
            className="group border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card flex items-center gap-3.5 rounded-2xl border p-3.5 backdrop-blur-md transition-all hover:shadow-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground text-sm font-bold transition-colors group-hover:text-emerald-600">
                Daftar Cuci Baru
              </div>
              <p className="text-muted-foreground text-[11px]">
                Input tiket walk-in kendaraan
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card flex items-center gap-3.5 rounded-2xl border p-3.5 backdrop-blur-md transition-all hover:shadow-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-transform group-hover:scale-110">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground text-sm font-bold transition-colors group-hover:text-blue-600">
                Dasbor Manajemen
              </div>
              <p className="text-muted-foreground text-[11px]">
                Analitik omset, staf & komisi
              </p>
            </div>
          </Link>

          <Link
            href="/layar-cuci"
            className="group border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card flex items-center gap-3.5 rounded-2xl border p-3.5 backdrop-blur-md transition-all hover:shadow-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition-transform group-hover:scale-110">
              <Tablet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-foreground text-sm font-bold transition-colors group-hover:text-purple-600">
                Layar Cuci Kiosk
              </div>
              <p className="text-muted-foreground text-[11px]">
                Tablet klaim tiket tukang cuci
              </p>
            </div>
          </Link>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 w-full gap-2 px-6 font-bold shadow-md sm:w-auto"
          >
            <Link href="/pos/antrean">
              <Home className="h-4 w-4" />
              <span>Kembali ke Beranda POS</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
