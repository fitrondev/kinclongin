"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Car,
  ChevronRight,
  Clock,
  Droplets,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  PlusCircle,
  Sparkles,
  Tablet,
  Wind,
} from "lucide-react";

import { OutletSwitcher } from "@/components/auth/outlet-switcher";
import { UserButton } from "@/components/auth/user-button";
import { MembershipDialog } from "@/components/pos/membership-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface POSHeaderProps {
  outletId?: string;
  outletName?: string;
  cashierName?: string;
  userRole?: string;
  stats?: {
    queued: number;
    washing: number;
    drying: number;
    ready: number;
  };
}

export function POSHeader({
  outletId = "",
  outletName = "Kinclongin Cabang Pusat",
  cashierName = "Kasir",
  userRole = "OWNER",
  stats = { queued: 0, washing: 0, drying: 0, ready: 0 },
}: POSHeaderProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isOwner = userRole === "OWNER";
  const totalActive = stats.queued + stats.washing + stats.drying + stats.ready;

  const isDaftarBaruActive =
    pathname.includes("/daftar-baru") || pathname.includes("/new");
  const isAntreanActive =
    pathname.includes("/antrean") || pathname.includes("/queue");

  return (
    <header className="bg-card/95 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Sisi Kiri: Brand & Nama Cabang Outlet */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/pos/antrean"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1.5 shadow-xs">
              <Image
                src="/logoipsum.svg"
                alt="Kinclongin Logo"
                width={32}
                height={32}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-black tracking-tight uppercase sm:text-base">
                  KINCLONGIN
                </span>
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-mono text-[10px] font-bold">
                  POS
                </span>
              </div>
              <p className="text-muted-foreground max-w-28 truncate text-[11px] font-medium sm:max-w-44 lg:max-w-60">
                {outletName}
              </p>
            </div>
          </Link>

          {/* Outlet Switcher (Khusus Layar Desktop Luas - Khusus Owner) */}
          {isOwner && (
            <div className="hidden xl:block">
              <OutletSwitcher
                afterSelectOrganizationUrl="/pos/antrean"
                appearance={{
                  elements: {
                    organizationSwitcherTrigger:
                      "py-1 px-2.5 rounded-lg border bg-muted/40 hover:bg-muted text-[11px] font-semibold gap-1.5",
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Sisi Tengah: Indikator Metrik Antrean Adaptif */}
        {/* 1. Versi Tablet (md - xl): Ringkasan Metrik Kompak */}
        <div className="hidden items-center gap-2 md:flex xl:hidden">
          <div className="bg-muted/50 flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
            <div className="text-foreground flex items-center gap-1.5">
              <Car className="text-primary h-3.5 w-3.5" />
              <span>{totalActive} Aktif</span>
            </div>
            <span className="bg-border h-3 w-px" />
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {stats.queued}
              </span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {stats.washing}
              </span>
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                {stats.drying}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {stats.ready}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Versi Desktop Luas (xl+): Metrik Lengkap Berwarna */}
        <div className="hidden items-center gap-2 xl:flex">
          <div className="bg-muted/60 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
            <Car className="text-primary h-3.5 w-3.5" />
            <span>Aktif:</span>
            <Badge variant="default" className="h-4 px-1.5 text-[10px]">
              {totalActive}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600">
              Antri: {stats.queued}
            </span>
            <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-600">
              Cuci: {stats.washing}
            </span>
            <span className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-semibold text-purple-600">
              Lap: {stats.drying}
            </span>
            <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600">
              Siap: {stats.ready}
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Action Buttons & Navigasi */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Tombol Utama: Daftar Cuci Baru (Selalu Terlihat, Ukuran Adaptif) */}
          <Button
            asChild
            variant={isDaftarBaruActive ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 px-2.5 font-bold shadow-xs sm:h-10 sm:px-3"
          >
            <Link href="/pos/daftar-baru">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Daftar Cuci Baru</span>
              <span className="text-xs sm:hidden">+ Baru</span>
            </Link>
          </Button>

          {/* Tombol Papan Antrean (Desktop & Tablet Landscape) */}
          <Button
            asChild
            variant={isAntreanActive ? "default" : "outline"}
            size="sm"
            className="hidden h-10 gap-1.5 font-semibold lg:inline-flex"
          >
            <Link href="/pos/antrean">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden xl:inline">Papan Antrean</span>
              <span className="xl:hidden">Antrean</span>
            </Link>
          </Button>

          {/* Tombol Membership Langganan (Desktop Luas) */}
          {outletId && (
            <div className="hidden xl:block">
              <MembershipDialog outletId={outletId} />
            </div>
          )}

          {/* Navigasi Layar Cuci & Dasbor (Layar Desktop Besar) */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hidden h-10 gap-1.5 font-semibold xl:inline-flex"
            title="Buka Tablet Kiosk Layar Cuci"
          >
            <Link href="/layar-cuci">
              <Tablet className="h-4 w-4" />
              <span>Layar Cuci</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hidden h-10 gap-1.5 font-semibold xl:inline-flex"
            title="Buka Dasbor Manajerial"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dasbor</span>
            </Link>
          </Button>

          <div className="bg-border hidden h-5 w-px sm:block" />

          {/* Theme Toggle & User Button */}
          <ThemeToggle />

          <div className="flex items-center gap-2 pl-0.5">
            <UserButton />
            <div className="hidden text-left text-xs leading-none 2xl:block">
              <p className="max-w-24 truncate font-semibold">{cashierName}</p>
              <p className="text-muted-foreground text-[10px]">Kasir Shift</p>
            </div>
          </div>

          {/* Hamburger Menu Drawer Trigger (Mobile, Tablet Portrait & Tablet Landscape) */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer rounded-xl xl:hidden"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-80 flex-col p-0 sm:w-96"
            >
              <SheetHeader className="border-b p-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1.5 shadow-xs">
                    <Image
                      src="/logoipsum.svg"
                      alt="Kinclongin Logo"
                      width={32}
                      height={32}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div>
                    <SheetTitle className="font-mono text-base font-black tracking-tight uppercase">
                      Kinclongin POS
                    </SheetTitle>
                    <p className="text-muted-foreground max-w-56 truncate text-xs font-medium">
                      {outletName}
                    </p>
                  </div>
                </div>

                {/* Outlet Switcher di dalam Drawer (Khusus Owner) */}
                {isOwner && (
                  <div className="mt-3 border-t pt-2">
                    <span className="text-muted-foreground mb-1.5 block text-[11px] font-bold uppercase">
                      Ganti Cabang Outlet
                    </span>
                    <OutletSwitcher
                      afterSelectOrganizationUrl="/pos/antrean"
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          organizationSwitcherTrigger:
                            "w-full justify-between py-2 px-3 rounded-xl border bg-muted/40 hover:bg-muted text-xs font-semibold gap-2",
                        },
                      }}
                    />
                  </div>
                )}
              </SheetHeader>

              {/* Isi Drawer Menu */}
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Rekap Antrean Cuci Hari Ini */}
                <div className="bg-muted/30 space-y-3 rounded-2xl border p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground flex items-center gap-1.5 text-xs font-black uppercase">
                      <Car className="text-primary h-3.5 w-3.5" />
                      Status Antrean Aktif
                    </span>
                    <Badge variant="default" className="px-2 text-xs font-bold">
                      {totalActive} Total
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Link
                      href="/pos/antrean?tab=QUEUED"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 font-bold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Antrean
                      </span>
                      <span>{stats.queued}</span>
                    </Link>

                    <Link
                      href="/pos/antrean?tab=WASHING"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 font-bold text-blue-700 transition-colors hover:bg-blue-500/20 dark:text-blue-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Droplets className="h-3.5 w-3.5" /> Cuci
                      </span>
                      <span>{stats.washing}</span>
                    </Link>

                    <Link
                      href="/pos/antrean?tab=DRYING"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 font-bold text-purple-700 transition-colors hover:bg-purple-500/20 dark:text-purple-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wind className="h-3.5 w-3.5" /> Lap / Wax
                      </span>
                      <span>{stats.drying}</span>
                    </Link>

                    <Link
                      href="/pos/antrean?tab=READY"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Siap Kasir
                      </span>
                      <span>{stats.ready}</span>
                    </Link>
                  </div>
                </div>

                {/* Navigasi Utama */}
                <div className="space-y-1">
                  <span className="text-muted-foreground mb-2 block px-2 text-[11px] font-bold uppercase">
                    Modul POS & Operasional
                  </span>

                  <Link
                    href="/pos/daftar-baru"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between rounded-xl p-3 text-sm font-bold transition-colors ${
                      isDaftarBaruActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="h-4 w-4" />
                      <span>Daftar Cuci Baru</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>

                  <Link
                    href="/pos/antrean"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between rounded-xl p-3 text-sm font-bold transition-colors ${
                      isAntreanActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <LayoutGrid className="h-4 w-4" />
                      <span>Papan Antrean Kanban</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>

                  <Link
                    href="/layar-cuci"
                    onClick={() => setDrawerOpen(false)}
                    className="hover:bg-muted text-foreground flex items-center justify-between rounded-xl p-3 text-sm font-bold transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Tablet className="h-4 w-4 text-purple-600" />
                      <span>Layar Cuci (Tablet Washer)</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>

                  <Link
                    href="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    className="hover:bg-muted text-foreground flex items-center justify-between rounded-xl p-3 text-sm font-bold transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="h-4 w-4 text-blue-600" />
                      <span>Dasbor & Analitik</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>
                </div>

                {/* Dialog Membership Member di Mobile/Tablet */}
                {outletId && (
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground mb-2 block px-2 text-[11px] font-bold uppercase">
                      Program Loyalitas
                    </span>
                    <div onClick={() => setDrawerOpen(false)}>
                      <MembershipDialog outletId={outletId} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Drawer */}
              <div className="bg-muted/20 flex items-center justify-between border-t p-4">
                <div className="text-xs">
                  <p className="text-foreground font-bold">{cashierName}</p>
                  <p className="text-muted-foreground text-[10px]">
                    Kasir Bertugas
                  </p>
                </div>
                <UserButton />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
