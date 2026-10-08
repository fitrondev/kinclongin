import { Metadata } from "next";

import {
  getAllSubscriptionPaymentsAction,
  getAllTenantsAction,
  getPendingSubscriptionsAction,
  getPlatformMetricsAction,
} from "@/actions/subscription";
import { SuperadminSubscriptionsView } from "@/components/dashboard/superadmin-subscriptions-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Portal Superadmin Platform | Kinclongin POS",
  description:
    "Portal kontrol Superadmin platform provider Kinclongin: Approval sewa flat Rp 50.000/bulan, metrik MRR, dan manajemen lisensi tenant.",
};

export default async function DashboardAdminSubscriptionsPage() {
  // Proteksi rute: Hanya dapat diakses oleh Superadmin platform atau master admin email
  await requireSuperadminAuth("/dashboard");

  // Fetch data awal secara paralel untuk mengeliminasi waterfall
  const [metricsRes, pendingRes, tenantsRes, historyRes] = await Promise.all([
    getPlatformMetricsAction(),
    getPendingSubscriptionsAction(),
    getAllTenantsAction(),
    getAllSubscriptionPaymentsAction(),
  ]);

  const defaultMetrics = {
    totalOutlets: 0,
    activeOutlets: 0,
    gracePeriodOutlets: 0,
    expiredOutlets: 0,
    pendingApprovals: 0,
    estimatedMRR: 0,
    totalRevenueAllTime: 0,
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <SuperadminSubscriptionsView
        initialMetrics={metricsRes.data ?? defaultMetrics}
        initialPending={pendingRes.data ?? []}
        initialTenants={tenantsRes.data ?? []}
        initialHistory={historyRes.data ?? []}
      />
    </div>
  );
}
