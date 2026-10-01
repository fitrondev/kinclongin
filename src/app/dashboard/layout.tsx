import Link from "next/link";
import { redirect } from "next/navigation";

import { LayoutGrid, PlusCircle, Tablet } from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
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
          <header className="bg-card/80 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                <span className="text-foreground font-bold">
                  {outlet?.name || "Kinclongin Cabang Pusat"}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Panel Manajemen & POS</span>
              </div>
            </div>

            {/* Fast Action Shortcuts */}
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden h-8 gap-1.5 text-xs font-bold sm:flex"
              >
                <Link href="/pos/daftar-baru">
                  <PlusCircle className="text-primary h-3.5 w-3.5" />
                  <span>+ Daftar Cuci</span>
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden h-8 gap-1.5 text-xs font-bold md:flex"
              >
                <Link href="/layar-cuci">
                  <Tablet className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Layar Cuci</span>
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="h-8 gap-1.5 text-xs font-bold shadow-xs"
              >
                <Link href="/pos/antrean">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Papan Antrean</span>
                  <span className="sm:hidden">Antrean</span>
                </Link>
              </Button>
            </div>
          </header>

          <main className="w-full flex-1 p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
