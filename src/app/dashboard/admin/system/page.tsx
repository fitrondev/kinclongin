import { Metadata } from "next";

import { getSystemHealthAction } from "@/actions/superadmin";
import { SuperadminSystemView } from "@/components/dashboard/superadmin/superadmin-system-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Kesehatan Sistem & Infrastruktur | Superadmin Kinclongin",
  description:
    "Status runtime server, latensi koneksi MySQL, SumoPod Object Storage, dan diagnosa platform.",
};

export default async function DashboardAdminSystemPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getSystemHealthAction();

  const defaultHealth = {
    databaseStatus: "HEALTHY" as const,
    dbLatencyMs: 0,
    environment: "production",
    nodeVersion: "v20",
    uptimeSeconds: 0,
    memoryUsageMb: { rss: 0, heapTotal: 0, heapUsed: 0 },
    tableCounts: {
      outlets: 0,
      users: 0,
      employees: 0,
      washTickets: 0,
      payments: 0,
      auditLogs: 0,
      subscriptionPayments: 0,
    },
    storageStatus: {
      provider: "SumoPod S3",
      status: "READY" as const,
      bucket: "kinclongin-storage",
    },
  };

  return (
    <div className="flex-1 space-y-6">
      <SuperadminSystemView health={res.data ?? defaultHealth} />
    </div>
  );
}
