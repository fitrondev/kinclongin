import { Metadata } from "next";

import { getSuperadminOverviewAction } from "@/actions/superadmin";
import { SuperadminOverviewView } from "@/components/dashboard/superadmin/superadmin-overview-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Pusat Kendali Superadmin Platform | Kinclongin POS",
  description:
    "Ikhtisar eksekutif platform B2B Kinclongin: Metrik MRR, volume cabang nasional, GMV ekosistem, dan pemantauan lisensi sewa flat Rp 50.000/bulan.",
};

export default async function DashboardAdminPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getSuperadminOverviewAction();

  const defaultMetrics = {
    totalOutlets: 0,
    activeOutlets: 0,
    gracePeriodOutlets: 0,
    expiredOutlets: 0,
    pendingApprovals: 0,
    estimatedMRR: 0,
    estimatedARR: 0,
    totalPlatformRevenue: 0,
    totalWashTicketsAllTime: 0,
    totalPlatformGmv: 0,
    totalUsersCount: 0,
    usersByRole: {
      superadmins: 0,
      owners: 0,
      managers: 0,
      cashiers: 0,
      washers: 0,
    },
    recentActivities: [],
    monthlyOutletGrowth: [],
  };

  return (
    <div className="flex-1 space-y-6">
      <SuperadminOverviewView metrics={res.data ?? defaultMetrics} />
    </div>
  );
}
