import { Metadata } from "next";
import { redirect } from "next/navigation";

import { type CashFlowSummary, getCashFlowAction } from "@/actions/owner";
import { CashFlowView } from "@/components/dashboard/cash-flow-view";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Laporan Arus Kas (Cash Flow) | Kinclongin POS",
  description:
    "Pantau arus kas masuk dan kas keluar operasional cabang secara transparan.",
};

export default async function CashFlowPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Peran OWNER Bisnis
  if (user.role !== UserRole.OWNER) {
    redirect("/dashboard");
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Cabang outlet aktif tidak ditemukan.
      </div>
    );
  }

  const res = await getCashFlowAction({ rangeDays: 30 });
  const initialData: CashFlowSummary =
    res.success && res.data
      ? res.data
      : {
          totalInflow: 0,
          totalOutflow: 0,
          netCashFlow: 0,
          cashBreakdown: { cashIn: 0, qrisIn: 0, bankTransferIn: 0 },
          outflowBreakdown: {
            materialExpenses: 0,
            commissionsPaid: 0,
            pettyCashExpenses: 0,
          },
          pnl: {
            washRevenue: 0,
            retailRevenue: 0,
            totalRevenue: 0,
            cogsChemicals: 0,
            cogsRetail: 0,
            totalCogs: 0,
            washerCommissions: 0,
            pettyCashExpenses: 0,
            grossProfit: 0,
            grossMarginPercent: 0,
            netOperatingProfit: 0,
            netMarginPercent: 0,
          },
          transactions: [],
        };

  return <CashFlowView initialData={initialData} outletName={outlet.name} />;
}
