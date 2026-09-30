"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Tablet,
  Users,
} from "lucide-react";

import { CreateMemberDialog } from "@/components/dashboard/create-member-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  outletName = "Kinclongin Cabang Pusat",
  userRole = "OWNER",
}: {
  outletName?: string;
  userRole?: string;
}) {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/dashboard",
      label: "Ringkasan",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/pelanggan",
      label: "Member & Loyalitas",
      icon: Sparkles,
      active: pathname.startsWith("/dashboard/pelanggan"),
    },
    {
      href: "/dashboard/stok",
      label: "Stok Bahan & Barang",
      icon: Boxes,
      active: pathname.startsWith("/dashboard/stok"),
    },
    {
      href: "/dashboard/komisi",
      label: "Gaji & Komisi",
      icon: Users,
      active: pathname.startsWith("/dashboard/komisi"),
    },
    {
      href: "/dashboard/pengaturan/langganan",
      label: "Langganan Cabang",
      icon: CreditCard,
      active: pathname.startsWith("/dashboard/pengaturan/langganan"),
    },
    ...(userRole === "OWNER"
      ? [
          {
            href: "/dashboard/admin/subscriptions",
            label: "Verifikasi Admin",
            icon: ShieldCheck,
            active: pathname.startsWith("/dashboard/admin/subscriptions"),
          },
        ]
      : []),
  ];

  return (
    <header className="bg-card/90 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Brand & Organization Switcher */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-black tracking-tight">
                KINCLONGIN
              </span>
              <span className="bg-primary/10 text-primary ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold">
                DASBOR
              </span>
            </div>
          </Link>

          <div className="bg-border hidden h-5 w-px sm:block" />

          {/* Clerk Organization Switcher */}
          <div className="flex items-center">
            <OrganizationSwitcher
              hidePersonal
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
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden items-center gap-1 text-xs font-bold md:flex">
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
        <div className="flex items-center gap-2">
          {/* Direct Staff Addition Dialog */}
          <CreateMemberDialog />

          {/* Quick links to POS & Layar Cuci */}
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

          <div className="bg-border mx-1 h-5 w-px" />

          <ThemeToggle />
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "h-9 w-9 rounded-xl border-2 border-primary/20",
              },
            }}
          />
        </div>
      </div>

      {/* Mobile Nav Subheader */}
      <div className="flex scrollbar-none items-center gap-1 overflow-x-auto border-t px-4 py-2 text-xs md:hidden">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold whitespace-nowrap ${
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
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
