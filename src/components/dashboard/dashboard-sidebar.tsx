"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Boxes,
  CreditCard,
  Droplets,
  ExternalLink,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  PlusCircle,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Tablet,
  Users,
} from "lucide-react";

import { CreateMemberDialog } from "@/components/dashboard/create-member-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  outletName?: string;
  userRole?: string;
  userFullName?: string;
  userEmail?: string;
}

export function DashboardSidebar({
  outletName = "Kinclongin Cabang Pusat",
  userRole = "OWNER",
  userFullName = "Pengguna",
  userEmail = "",
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isOwner = userRole === "OWNER";

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* 1. Header: Branding & Multi-Tenant Organization Switcher */}
      <SidebarHeader className="border-b p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground shadow-primary/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-black tracking-tight uppercase">
                Kinclongin
              </span>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 px-1.5 py-0 text-[10px] font-bold"
              >
                POS
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-xs font-semibold">
              {outletName}
            </p>
          </div>
        </div>

        {/* Organization Switcher */}
        <div className="mt-2 group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
            afterCreateOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full justify-between py-1.5 px-2.5 rounded-lg border bg-muted/40 hover:bg-muted text-xs font-semibold gap-2",
              },
            }}
          />
        </div>
      </SidebarHeader>

      {/* 2. Content: Semua Fitur Lengkap Kinclongin */}
      <SidebarContent>
        {/* GRUP 1: POS & Operasional Lapangan */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
            Operasional Cuci
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Antrean Cuci Real-time */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/pos/antrean"}
                  tooltip="Papan Antrean Cuci"
                  className={
                    pathname === "/pos/antrean"
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/pos/antrean">
                    <LayoutGrid className="h-4 w-4" />
                    <span>Papan Antrean Cuci</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-600">
                  Live
                </SidebarMenuBadge>
              </SidebarMenuItem>

              {/* Input Pendaftaran Cuci Baru */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/pos/daftar-baru"}
                  tooltip="Daftar Kendaraan Baru"
                  className={
                    pathname === "/pos/daftar-baru"
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/pos/daftar-baru">
                    <PlusCircle className="h-4 w-4" />
                    <span>Daftar Cuci Baru (&lt;15s)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Front Desk Kasir & Transaksi */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/pos"}
                  tooltip="Kasir & Transaksi Pembayaran"
                  className={
                    pathname === "/pos"
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/pos">
                    <CreditCard className="h-4 w-4" />
                    <span>Kasir & Pembayaran</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Layar Cuci PIN (Area Hidrolik) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname.startsWith("/layar-cuci") ||
                    pathname.startsWith("/panel-cuci")
                  }
                  tooltip="Layar Cuci (Area Hidrolik)"
                  className={
                    pathname.startsWith("/layar-cuci") ||
                    pathname.startsWith("/panel-cuci")
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/layar-cuci">
                    <Tablet className="h-4 w-4" />
                    <span>Layar Cuci (Area Hidrolik)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Modul Keanggotaan & Loyalitas Pelanggan (B2C) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/pelanggan")}
                  tooltip="Keanggotaan & Loyalitas Pelanggan"
                  className={
                    pathname.startsWith("/dashboard/pelanggan")
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/dashboard/pelanggan">
                    <Gift className="h-4 w-4 text-amber-500" />
                    <span>Member & Loyalitas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* GRUP 2: Manajemen Bisnis & Analitik */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
            Manajemen & Analitik
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Ringkasan Dasbor Utama */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  tooltip="Ringkasan Dasbor"
                  className={
                    pathname === "/dashboard"
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Ringkasan Dasbor</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Inventori Stok & Bahan Operasional */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/stok")}
                  tooltip="Manajemen Stok & Bahan Cuci"
                  className={
                    pathname.startsWith("/dashboard/stok")
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/dashboard/stok">
                    <Boxes className="h-4 w-4" />
                    <span>Stok Bahan & Barang</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Penggajian & Komisi Washer */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/komisi")}
                  tooltip="Gaji & Komisi Pekerja Cuci"
                  className={
                    pathname.startsWith("/dashboard/komisi")
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/dashboard/komisi">
                    <Users className="h-4 w-4" />
                    <span>Gaji & Komisi Pekerja</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* GRUP 3: Langganan SaaS & Pengaturan */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
            Langganan & Multi-Outlet
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Langganan Cabang Rp 50.000 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(
                    "/dashboard/pengaturan/langganan"
                  )}
                  tooltip="Status Langganan Cabang"
                  className={
                    pathname.startsWith("/dashboard/pengaturan/langganan")
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                      : ""
                  }
                >
                  <Link href="/dashboard/pengaturan/langganan">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Langganan Cabang (Rp 50rb)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Superadmin Verification */}
              {isOwner && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(
                      "/dashboard/admin/subscriptions"
                    )}
                    tooltip="Verifikasi Pembayaran Superadmin"
                    className={
                      pathname.startsWith("/dashboard/admin/subscriptions")
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                        : ""
                    }
                  >
                    <Link href="/dashboard/admin/subscriptions">
                      <Receipt className="h-4 w-4" />
                      <span>Approval Superadmin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>

            {/* Quick Action: Tambah Staf Baru Langsung */}
            <div className="mt-3 px-2 group-data-[collapsible=icon]:hidden">
              <CreateMemberDialog />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 3. Footer: User Profile, Theme & Collapse */}
      <SidebarFooter className="border-t p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "h-8 w-8 rounded-lg border border-primary/30",
                },
              }}
            />
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs leading-tight font-bold">
                {userFullName}
              </span>
              <span className="text-muted-foreground truncate text-[10px] font-medium">
                {userRole}
              </span>
            </div>
          </div>

          <div className="flex items-center group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
