import { Metadata } from "next";
import { redirect } from "next/navigation";

import { CalendarClock, Gift, Sparkles, Users } from "lucide-react";

import { getReengagementVehiclesAction } from "@/actions/crm-reminder";
import { CrmReengagementView } from "@/components/dashboard/crm-reengagement-view";
import {
  CustomerLoyaltyTable,
  CustomerRowData,
} from "@/components/dashboard/customer-loyalty-table";
import { MembershipDialog } from "@/components/pos/membership-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Member & Loyalitas Pelanggan | Kinclongin POS",
  description:
    "Direktori keanggotaan pelanggan cuci mobil, pelacakan promo Cuci 10x Gratis 1x terkunci per plat, dan CRM re-engagement WhatsApp 14 hari.",
};

export default async function DashboardPelangganPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "WASHER") {
    redirect("/dashboard");
  }
  if (user.role === "CASHIER") {
    redirect("/pos/antrean");
  }

  // Cari outlet aktif untuk scoping CRM re-engagement
  let effectiveOutletId = user.outletId;
  if (!effectiveOutletId) {
    const firstOutlet = await prisma.outlet.findFirst({
      where: user.role === "SUPERADMIN" ? {} : { ownerId: user.id },
      select: { id: true },
    });
    effectiveOutletId = firstOutlet?.id || null;
  }

  // Fetch concurrently (Anti-waterfall)
  const [customers, reengagementRes] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { totalVisits: "desc" },
      include: {
        vehicles: {
          orderBy: { totalVisits: "desc" },
        },
        loyaltyLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    effectiveOutletId
      ? getReengagementVehiclesAction(effectiveOutletId)
      : Promise.resolve({ success: true, data: [] }),
  ]);

  const reengagementVehicles =
    reengagementRes.success && reengagementRes.data ? reengagementRes.data : [];

  const readyToRemindCount = reengagementVehicles.filter(
    (v) => !v.alreadyRemindedThisMonth
  ).length;

  // Hitung metrik agregat loyalitas
  let totalEligibleVehicles = 0;
  for (const c of customers) {
    for (const v of c.vehicles) {
      if (v.totalVisits > 0 && v.totalVisits % 10 === 0) {
        totalEligibleVehicles += 1;
      }
    }
  }
  const totalPointsCirculating = customers.reduce(
    (acc, c) => acc + c.loyaltyPoints,
    0
  );

  const initialCustomers: CustomerRowData[] = customers.map((c) => {
    const formattedVehicles = c.vehicles.map((v) => {
      const isPromoEligible = v.totalVisits > 0 && v.totalVisits % 10 === 0;
      const visitsToNextPromo =
        v.totalVisits % 10 === 0 ? 10 : 10 - (v.totalVisits % 10);

      return {
        id: v.id,
        licensePlate: v.licensePlate,
        category: v.category,
        brand: v.brand,
        model: v.model,
        color: v.color,
        totalVisits: v.totalVisits,
        isPromoEligible,
        visitsToNextPromo,
      };
    });

    return {
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      totalVisits: c.totalVisits,
      loyaltyPoints: c.loyaltyPoints,
      createdAt: c.createdAt.toISOString(),
      vehicles: formattedVehicles,
      recentLogs: c.loyaltyLogs.map((log) => ({
        id: log.id,
        pointsChanged: log.pointsChanged,
        balanceAfter: log.balanceAfter,
        description: log.description,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground flex flex-wrap items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl">
            <Gift className="h-5 w-5 shrink-0 text-amber-500 sm:h-6 sm:w-6" />
            <span>Pelanggan & CRM Re-Engagement (B2C)</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Program loyalitas Cuci 10x Gratis 1x terkunci per plat kendaraan dan
            CRM pengingat WhatsApp otomatis untuk kendaraan yang belum cuci &gt;
            14 hari.
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          <MembershipDialog
            outletId={effectiveOutletId || undefined}
            buttonText="+ Daftarkan Member Baru"
            className="h-10 w-full px-4 text-xs font-bold sm:w-auto"
          />
        </div>
      </div>

      {/* Tabs Navigasi: Loyalitas vs CRM Re-engagement */}
      <Tabs defaultValue="loyalty" className="w-full space-y-4">
        <TabsList className="bg-muted rounded-xl p-1">
          <TabsTrigger
            value="loyalty"
            className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-bold data-[state=active]:shadow-xs"
          >
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span>
              Direktori Member & Loyalitas ({initialCustomers.length})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reengagement"
            className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-bold data-[state=active]:shadow-xs"
          >
            <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
            <span>Siap Cuci Kembali &gt; 14 Hari ({readyToRemindCount})</span>
            {readyToRemindCount > 0 ? (
              <Badge className="ml-1 h-4 bg-amber-500 px-1.5 py-0 text-[10px] font-black text-white hover:bg-amber-600">
                {readyToRemindCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loyalty" className="space-y-4">
          <CustomerLoyaltyTable
            initialCustomers={initialCustomers}
            totalEligibleVehicles={totalEligibleVehicles}
            totalPointsCirculating={totalPointsCirculating}
          />
        </TabsContent>

        <TabsContent value="reengagement" className="space-y-4">
          <CrmReengagementView
            outletId={effectiveOutletId || ""}
            initialVehicles={reengagementVehicles}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
