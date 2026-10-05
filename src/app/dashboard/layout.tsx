import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CreditCard,
  Crown,
  LayoutGrid,
  PlusCircle,
  Tablet,
} from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MembershipDialog } from "@/components/pos/membership-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Ambil outlet cabang aktif pengguna
  let outlet = user.outletId
    ? await prisma.outlet.findUnique({
        where: { id: user.outletId },
      })
    : null;

  if (!outlet) {
    outlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  const isWasher = user.role === "WASHER";
  const isCashier = user.role === "CASHIER";

  return (
    <SidebarProvider defaultOpen>
      <div className="bg-background flex min-h-screen w-full">
        {/* Sidebar Navigasi Penuh Fitur Kinclongin */}
        <DashboardSidebar
          outletName={outlet?.name || "Kinclongin Cabang Pusat"}
          userRole={user.role}
          userFullName={user.fullName}
          userEmail={user.email}
        />

        {/* Area Konten Utama Dasbor */}
        <SidebarInset className="flex flex-1 flex-col overflow-x-hidden">
          {/* Top Bar Akses Cepat */}
          <header className="bg-card/80 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-3 backdrop-blur-md sm:px-4">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <SidebarTrigger className="-ml-1 shrink-0" />
              <Separator
                orientation="vertical"
                className="mr-1 h-4 shrink-0 sm:mr-2"
              />
              <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs font-semibold sm:gap-2">
                <span className="text-foreground max-w-30 truncate font-bold sm:max-w-45 md:max-w-55 xl:max-w-xs">
                  {outlet?.name || "Kinclongin Cabang Pusat"}
                </span>
                <span className="text-muted-foreground/60 hidden md:inline">
                  •
                </span>
                <span className="hidden truncate md:inline">
                  {isWasher
                    ? "Panel Pekerja Cuci"
                    : isCashier
                      ? "Loket Kasir & POS"
                      : "Panel Manajemen & POS"}
                </span>
              </div>
            </div>

            {/* Fast Action Shortcuts (4 Tombol Responsif: Ikon di Mobile & Tablet, Teks di Desktop XL) */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {isWasher ? (
                <>
                  <Button
                    asChild
                    size="sm"
                    className="h-8 w-8 shrink-0 bg-cyan-600 p-0 text-xs font-bold text-white shadow-xs hover:bg-cyan-700 xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Buka Tablet Kiosk Layar Cuci"
                  >
                    <Link href="/layar-cuci">
                      <Tablet className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">
                        Layar Cuci (Kiosk)
                      </span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Buka Papan Antrean"
                  >
                    <Link href="/pos/antrean">
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">Papan Antrean</span>
                    </Link>
                  </Button>
                </>
              ) : isCashier ? (
                <>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Daftar Cuci Kendaraan Baru"
                  >
                    <Link href="/pos/daftar-baru">
                      <PlusCircle className="text-primary h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">+ Daftar Cuci</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Buka Kasir POS"
                  >
                    <Link href="/pos">
                      <CreditCard className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">Kasir POS</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Buka Papan Antrean"
                  >
                    <Link href="/pos/antrean">
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">Papan Antrean</span>
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <MembershipDialog
                    outletId={outlet?.id}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 shrink-0 border-amber-500/30 bg-amber-500/10 p-0 font-bold text-amber-700 shadow-xs hover:bg-amber-500/20 xl:w-auto xl:gap-1.5 xl:px-2.5 dark:text-amber-300"
                        title="Daftar Member Baru"
                      >
                        <Crown className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="hidden xl:inline">
                          + Daftar Member
                        </span>
                      </Button>
                    }
                  />
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Daftar Cuci Kendaraan Baru"
                  >
                    <Link href="/pos/daftar-baru">
                      <PlusCircle className="text-primary h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">+ Daftar Cuci</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Buka Layar Cuci (Kiosk Tablet)"
                  >
                    <Link href="/layar-cuci">
                      <Tablet className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                      <span className="hidden xl:inline">Layar Cuci</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 shrink-0 p-0 text-xs font-bold shadow-xs xl:w-auto xl:gap-1.5 xl:px-2.5"
                    title="Buka Papan Antrean"
                  >
                    <Link href="/pos/antrean">
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xl:inline">Papan Antrean</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </header>

          <main className="w-full flex-1 p-3 sm:p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
