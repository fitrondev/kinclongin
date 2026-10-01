import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPayrollSummaryAction } from "@/actions/payroll";
import { PayrollView } from "@/components/dashboard/payroll-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Gaji & Komisi Pekerja Cuci | Kinclongin",
  description:
    "Laporan bagi hasil komisi cuci mandiri dan tandem berbasis PIN pekerja.",
};

export default async function DashboardKomisiPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus OWNER & MANAGER: Kasir atau staf lain tidak boleh melihat rekap gaji/komisi
  if (user.role !== "OWNER" && user.role !== "MANAGER") {
    redirect(user.role === "CASHIER" ? "/pos/antrean" : "/dashboard");
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Outlet cabang tidak ditemukan.
      </div>
    );
  }

  const res = await getPayrollSummaryAction(outlet.id);
  const data = res.data || {
    totalUnpaid: 0,
    totalPaid: 0,
    totalVehicles: 0,
    washers: [],
  };

  return <PayrollView initialSummary={data} outletName={outlet.name} />;
}
