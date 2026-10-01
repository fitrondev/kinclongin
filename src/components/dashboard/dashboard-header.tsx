"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Boxes,
  ChevronRight,
  Crown,
  LayoutDashboard,
  Menu,
  PlusCircle,
  Sparkles,
  Tablet,
  Users,
} from "lucide-react";

import { OutletSwitcher } from "@/components/auth/outlet-switcher";
import { UserButton } from "@/components/auth/user-button";
import { CreateMemberDialog } from "@/components/dashboard/create-member-dialog";
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

export function DashboardHeader({
  outletName = "Kinclongin Cabang Pusat",
  userRole = "OWNER",
}: {
  outletName?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isOwner = userRole === "OWNER";
  const isManager = userRole === "MANAGER";
  const canManageStaff = isOwner || isManager;
  const canViewPayroll = isOwner || isManager;

  const allNavLinks = [
    {
      href: "/dashboard",
      label: "Ringkasan",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      allowed: true,
    },
    {
      href: "/dashboard/pelanggan",
      label: "Member & Loyalitas",
      icon: Sparkles,
      active: pathname.startsWith("/dashboard/pelanggan"),
      allowed: true,
    },
    {
      href: "/dashboard/stok",
      label: "Stok Bahan & Barang",
      icon: Boxes,
      active: pathname.startsWith("/dashboard/stok"),
      allowed: true,
    },
    {
      href: "/dashboard/komisi",
      label: "Gaji & Komisi",
      icon: Users,
      active: pathname.startsWith("/dashboard/komisi"),
      allowed: canViewPayroll,
    },
    {
      href: "/dashboard/membership",
      label: "Langganan Member",
      icon: Crown,
      active: pathname.startsWith("/dashboard/membership"),
      allowed: true,
    },
  ];

  const navLinks = allNavLinks.filter((item) => item.allowed);

  return (
    <header className="bg-card/90 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Brand & Organization Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl p-1 shadow-xs">
              <Image
                src="/logoipsum.svg"
                alt="Kinclongin Logo"
                width={28}
                height={28}
                className="h-6 w-6 object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-black tracking-tight uppercase">
                KINCLONGIN
              </span>
              <span className="bg-primary/10 text-primary hidden rounded px-1.5 py-0.5 text-[10px] font-bold sm:inline">
                DASBOR
              </span>
            </div>
          </Link>

          {isOwner && (
            <>
              <div className="bg-border hidden h-5 w-px sm:block" />

              {/* Outlet Switcher (Desktop Luas - Khusus Owner) */}
              <div className="hidden items-center lg:flex">
                <OutletSwitcher
                  afterSelectOrganizationUrl="/dashboard"
                  afterCreateOrganizationUrl="/dashboard"
                  appearance={{
                    elements: {
                      rootBox: "flex items-center text-xs font-semibold",
                      organizationSwitcherTrigger:
                        "py-1.5 px-3 rounded-xl border bg-muted/40 hover:bg-muted text-xs font-semibold gap-2",
                    },
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Navigation Tabs (Desktop Luas: xl 1280px+) */}
        <nav className="hidden items-center gap-1 text-xs font-bold xl:flex">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                asChild
                variant={item.active ? "secondary" : "ghost"}
                size="sm"
                className={`h-9 gap-1.5 ${item.active ? "text-primary font-extrabold" : "text-muted-foreground"}`}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Direct Staff Addition Dialog (Hanya untuk Owner & Manajer) */}
          {canManageStaff && <CreateMemberDialog />}

          {/* Quick links to POS */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden h-9 gap-1.5 text-xs font-bold lg:flex"
          >
            <Link href="/pos/antrean">
              <span>Ke Kasir POS</span>
            </Link>
          </Button>

          {/* Quick link to Layar Cuci */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 rounded-xl sm:flex"
            title="Buka Layar Cuci"
          >
            <Link href="/layar-cuci">
              <Tablet className="h-4 w-4" />
            </Link>
          </Button>

          <div className="bg-border mx-1 hidden h-5 w-px sm:block" />

          <ThemeToggle />
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "h-9 w-9 rounded-xl border-2 border-primary/20",
              },
            }}
          />

          {/* Hamburger Drawer Menu (<xl: Mobile, Tablet Portrait, Tablet Landscape) */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer rounded-xl xl:hidden"
                aria-label="Buka Menu Navigasi Dasbor"
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
                      Kinclongin Dasbor
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
                      afterSelectOrganizationUrl="/dashboard"
                      afterCreateOrganizationUrl="/dashboard"
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

              {/* Menu Navigasi Dasbor di Drawer */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="space-y-1">
                  <span className="text-muted-foreground mb-2 block px-2 text-[11px] font-bold uppercase">
                    Modul Dasbor
                  </span>
                  {navLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition-colors ${
                          item.active
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                      </Link>
                    );
                  })}
                </div>

                {/* Akses Cepat Lapangan */}
                <div className="space-y-2 border-t pt-2">
                  <span className="text-muted-foreground mb-1 block px-2 text-[11px] font-bold uppercase">
                    Akses Lapangan
                  </span>
                  <Link
                    href="/pos/antrean"
                    onClick={() => setDrawerOpen(false)}
                    className="bg-muted/20 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="text-primary h-4 w-4" />
                      <span>Buka Kasir POS & Antrean</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>

                  <Link
                    href="/layar-cuci"
                    onClick={() => setDrawerOpen(false)}
                    className="bg-muted/20 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Tablet className="h-4 w-4 text-cyan-500" />
                      <span>Buka Layar Cuci Kiosk</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Subheader Navigasi Cepat untuk Mobile, Tablet Portrait & Landscape (<xl) */}
      <div className="bg-card/60 flex scrollbar-none items-center gap-1.5 overflow-x-auto border-t px-3 py-2 text-xs xl:hidden">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold whitespace-nowrap transition-colors ${
                item.active
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
