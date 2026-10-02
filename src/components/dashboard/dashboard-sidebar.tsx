"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Boxes,
  Building2,
  Calendar,
  Clock,
  Coins,
  CreditCard,
  Crown,
  Droplets,
  ExternalLink,
  Gift,
  HelpCircle,
  History,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  PlusCircle,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Tablet,
  Users,
  Wallet,
} from "lucide-react";

import { OutletSwitcher } from "@/components/auth/outlet-switcher";
import { UserButton } from "@/components/auth/user-button";
import { MembershipDialog } from "@/components/pos/membership-dialog";
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
  const isManager = userRole === "MANAGER";
  const isWasher = userRole === "WASHER";
  const isCashier = userRole === "CASHIER";
  const canManageStaff = isOwner || isManager; // Owner & Manajer dapat mengelola akun staf cabang
  const canViewPayroll = isOwner || isManager;
  const canViewAnalytics = isOwner || isManager;

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* 1. Header: Branding & Multi-Tenant Organization Switcher */}
      <SidebarHeader className="border-b p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1.5 shadow-sm">
            <Image
              src="/logoipsum.svg"
              alt="Kinclongin Logo"
              width={32}
              height={32}
              className="h-7 w-7 object-contain"
            />
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

        {/* Outlet Switcher (Khusus Owner yang memiliki hak kelola multi-cabang) */}
        {isOwner && (
          <div className="mt-2 group-data-[collapsible=icon]:hidden">
            <OutletSwitcher
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
        )}
      </SidebarHeader>

      {/* 2. Content: Navigasi Disesuaikan Berdasarkan Role Pengguna */}
      <SidebarContent>
        {isWasher ? (
          /* ============================================================ */
          /* MENU KHUSUS PERAN WASHER (Pekerja Cuci Lapangan)             */
          /* ============================================================ */
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Pengerjaan Lapangan
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Layar Cuci (Area Hidrolik) - Menu Utama Washer */}
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
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold shadow-xs"
                          : ""
                      }
                    >
                      <Link href="/layar-cuci">
                        <Tablet className="h-4 w-4 text-cyan-500" />
                        <span>Layar Cuci (Kiosk PIN)</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-600">
                      Utama
                    </SidebarMenuBadge>
                  </SidebarMenuItem>

                  {/* Papan Antrean Cuci (Live Kanban) */}
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
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Penghasilan & Kinerja
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Dasbor Kinerja & Komisi Personal Washer */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/dashboard"}
                      tooltip="Kinerja & Komisi Saya"
                      className={
                        pathname === "/dashboard"
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                          : ""
                      }
                    >
                      <Link href="/dashboard">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span>Kinerja & Komisi Saya</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          /* ============================================================ */
          /* MENU STANDARD (Owner, Manager, Cashier)                      */
          /* ============================================================ */
          <>
            {/* GRUP 1: POS & Operasional Lapangan */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Operasional Cuci
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Dasbor Shift Kasir (Khusus Kasir) */}
                  {isCashier && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard"}
                        tooltip="Dasbor Shift Kasir"
                        className={
                          pathname === "/dashboard"
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold shadow-xs"
                            : ""
                        }
                      >
                        <Link href="/dashboard">
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Dasbor Shift Kasir</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className="border-primary/30 bg-primary/10 text-primary text-[10px] font-bold">
                        Shift
                      </SidebarMenuBadge>
                    </SidebarMenuItem>
                  )}

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

                  {/* Modul Keanggotaan & Loyalitas Pelanggan (B2C) - Khusus Owner & Manajer */}
                  {canViewAnalytics && (
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
                  )}

                  {/* Pendaftaran Member Baru (Bisa dilakukan Owner, Manajer & Kasir) */}
                  <SidebarMenuItem className="pt-1 group-data-[collapsible=icon]:hidden">
                    <MembershipDialog
                      buttonText="+ Daftar Member Baru"
                      className="h-8 w-full justify-start text-xs font-bold"
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* GRUP 2: Manajemen Bisnis & Analitik (Khusus Owner & Manajer) */}
            {canViewAnalytics && (
              <>
                <SidebarSeparator />
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

                      {/* Penggajian & Komisi Washer (Khusus Owner & Manajer) */}
                      {canViewPayroll && (
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
                      )}

                      {/* Master Paket & Tarif Layanan Cuci */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith("/dashboard/layanan")}
                          tooltip="Paket & Tarif Layanan Cuci"
                          className={
                            pathname.startsWith("/dashboard/layanan")
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/layanan">
                            <Sparkles className="h-4 w-4 text-cyan-500" />
                            <span>Paket & Tarif Layanan</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Penjadwalan & Shift Kerja Staf */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith("/dashboard/shift")}
                          tooltip="Jadwal & Shift Kerja Staf"
                          className={
                            pathname.startsWith("/dashboard/shift")
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/shift">
                            <Clock className="h-4 w-4 text-emerald-500" />
                            <span>Jadwal Shift Kerja</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Manajemen Akun Staf Cabang (Khusus Manajer) */}
                      {isManager && (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(
                              "/dashboard/pengguna"
                            )}
                            tooltip="Kelola Akun & PIN Staf Cabang"
                            className={
                              pathname.startsWith("/dashboard/pengguna")
                                ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                                : ""
                            }
                          >
                            <Link href="/dashboard/pengguna">
                              <ShieldCheck className="h-4 w-4 text-blue-500" />
                              <span>Akun Staf Cabang</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* GRUP 3: Otoritas Khusus Owner (Superadmin) */}
            {isOwner && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    👑 Otoritas Owner
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {/* Laporan Arus Kas */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith("/dashboard/arus-kas")}
                          tooltip="Laporan Arus Kas (Cash Flow)"
                          className={
                            pathname.startsWith("/dashboard/arus-kas")
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/arus-kas">
                            <Wallet className="h-4 w-4 text-emerald-500" />
                            <span>Arus Kas (Cash Flow)</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Manajemen Akun Staf & Role */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith("/dashboard/pengguna")}
                          tooltip="Manajemen Akun & Role"
                          className={
                            pathname.startsWith("/dashboard/pengguna")
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/pengguna">
                            <ShieldCheck className="h-4 w-4 text-blue-500" />
                            <span>Manajemen Akun & Role</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Kelola & Ekspansi Cabang */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(
                            "/dashboard/pengaturan/cabang"
                          )}
                          tooltip="Kelola & Ekspansi Cabang"
                          className={
                            pathname.startsWith("/dashboard/pengaturan/cabang")
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/pengaturan/cabang">
                            <Building2 className="h-4 w-4 text-cyan-500" />
                            <span>Kelola Cabang</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Konfigurasi Webhook & WhatsApp Gateway */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(
                            "/dashboard/pengaturan/whatsapp"
                          )}
                          tooltip="Konfigurasi WhatsApp Gateway"
                          className={
                            pathname.startsWith(
                              "/dashboard/pengaturan/whatsapp"
                            )
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/pengaturan/whatsapp">
                            <MessageSquare className="h-4 w-4 text-emerald-500" />
                            <span>Webhook WhatsApp</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Audit Log Keamanan Sistem */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith("/dashboard/audit")}
                          tooltip="Audit Log Keamanan"
                          className={
                            pathname.startsWith("/dashboard/audit")
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                              : ""
                          }
                        >
                          <Link href="/dashboard/audit">
                            <History className="h-4 w-4 text-amber-500" />
                            <span>Audit Log Sistem</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </>
        )}
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
              <span className="text-muted-foreground flex items-center gap-1.5 truncate text-[10px] font-medium">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isOwner
                      ? "bg-amber-500"
                      : isManager
                        ? "bg-blue-500"
                        : isWasher
                          ? "bg-purple-500"
                          : "bg-emerald-500"
                  }`}
                />
                {isOwner
                  ? "Owner"
                  : isManager
                    ? "Manajer"
                    : isWasher
                      ? "Washer"
                      : "Kasir"}
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
