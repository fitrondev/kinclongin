import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServicePackagesAction } from "@/actions/services";
import { ServicesManagementView } from "@/components/dashboard/services-management-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Paket & Tarif Layanan Cuci | Kinclongin",
  description:
    "Pengaturan katalog paket cuci, tarif per kategori kendaraan, estimasi durasi (SLA), dan skema komisi tukang cuci cabang.",
};

export default async function DashboardLayananPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus OWNER & MANAGER
  if (user.role !== "OWNER" && user.role !== "MANAGER") {
    redirect(user.role === "CASHIER" ? "/pos/antrean" : "/layar-cuci");
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Cabang outlet aktif tidak ditemukan. Silakan hubungi administrator.
      </div>
    );
  }

  const res = await getServicePackagesAction(outlet.id);
  const initialData = res.data || {
    packages: [],
    stats: {
      totalPackages: 0,
      activePackages: 0,
      totalCategoriesCovered: 0,
      averagePrice: 0,
      averageMinutes: 0,
      averageCommission: 0,
    },
  };

  return (
    <ServicesManagementView
      initialData={initialData}
      outletName={outlet.name}
      userRole={user.role}
    />
  );
}
