import { Metadata } from "next";

import { getNationalTransactionsAction } from "@/actions/superadmin";
import { SuperadminTransactionsView } from "@/components/dashboard/superadmin/superadmin-transactions-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Monitoring Transaksi Cuci Nasional | Superadmin Kinclongin",
  description:
    "Pantau arus transaksi tiket cuci seluruh mitra se-Indonesia secara langsung, audit kecurangan, dan pantau GMV platform.",
};

export default async function DashboardAdminTransactionsPage() {
  await requireSuperadminAuth("/dashboard");

  const [res, outlets] = await Promise.all([
    getNationalTransactionsAction({ limit: 80 }),
    prisma.outlet.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const defaultSummary = {
    totalTickets: 0,
    totalGmv: 0,
    queuedCount: 0,
    washingCount: 0,
    readyCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    paidCount: 0,
    unpaidCount: 0,
  };

  return (
    <div className="flex-1 space-y-6">
      <SuperadminTransactionsView
        initialItems={res.data?.items ?? []}
        summary={res.data?.summary ?? defaultSummary}
        outlets={outlets}
      />
    </div>
  );
}

