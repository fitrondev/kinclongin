"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Car,
  Clock,
  LayoutDashboard,
  LayoutGrid,
  PlusCircle,
  Sparkles,
  Tablet,
} from "lucide-react";

import { OutletSwitcher } from "@/components/auth/outlet-switcher";
import { UserButton } from "@/components/auth/user-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface POSHeaderProps {
  outletName?: string;
  cashierName?: string;
  stats?: {
    queued: number;
    washing: number;
    drying: number;
    ready: number;
  };
}

export function POSHeader({
  outletName = "Kinclongin Cabang Pusat",
  cashierName = "Kasir",
  stats = { queued: 0, washing: 0, drying: 0, ready: 0 },
}: POSHeaderProps) {
  const pathname = usePathname();

  const totalActive = stats.queued + stats.washing + stats.drying + stats.ready;

  return (
    <header className="bg-card/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Brand & Outlet Identity + Organization Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight">
                KINCLONGIN{" "}
                <span className="text-primary bg-primary/10 rounded px-1.5 py-0.5 text-xs font-normal tracking-wider uppercase">
                  POS
                </span>
              </span>
            </div>
            <p className="text-muted-foreground max-w-35 truncate text-xs sm:max-w-none">
              {outletName}
            </p>
          </div>

          <div className="hidden sm:block">
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
        </div>

        {/* Live Queue Metrics Pills (Desktop & Tablet) */}
        <div className="hidden items-center gap-2 md:flex">
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

        {/* Action Buttons & Navigation */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant={
              pathname.includes("/daftar-baru") || pathname.includes("/new")
                ? "default"
                : "outline"
            }
            size="sm"
            className="h-10 gap-1.5 font-semibold shadow-sm"
          >
            <Link href="/pos/daftar-baru">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Daftar Cuci Baru</span>
              <span className="sm:hidden">+ Baru</span>
            </Link>
          </Button>

          <Button
            asChild
            variant={
              pathname.includes("/antrean") || pathname.includes("/queue")
                ? "default"
                : "outline"
            }
            size="sm"
            className="h-10 gap-1.5 font-semibold"
          >
            <Link href="/pos/antrean">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Papan Antrean</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hidden h-10 gap-1.5 lg:flex"
            title="Buka Layar Cuci"
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
            className="text-muted-foreground hover:text-foreground hidden h-10 gap-1.5 xl:flex"
            title="Buka Dasbor Manajerial"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dasbor</span>
            </Link>
          </Button>

          <div className="bg-border mx-1 h-5 w-px" />

          <ThemeToggle />

          <div className="flex items-center gap-2 pl-1">
            <UserButton />
            <div className="hidden text-left text-xs leading-none xl:block">
              <p className="max-w-25 truncate font-semibold">{cashierName}</p>
              <p className="text-muted-foreground text-[10px]">Kasir Shift</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
