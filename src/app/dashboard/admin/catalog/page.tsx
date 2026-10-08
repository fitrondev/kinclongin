import { Metadata } from "next";

import { getPlatformCatalogTemplateAction } from "@/actions/superadmin";
import { SuperadminCatalogView } from "@/components/dashboard/superadmin/superadmin-catalog-view";
import { VehicleCategory } from "@/generated/prisma/enums";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Master Template Layanan Cuci Nasional | Superadmin Kinclongin",
  description:
    "Katalog acuan master paket layanan cuci kendaraan bermotor, tarif standar, dan komisi washer seluruh ekosistem platform.",
};

export default async function DashboardAdminCatalogPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getPlatformCatalogTemplateAction();

  const defaultTemplates = [
    {
      name: "Cuci Body Standar Mobil",
      category: VehicleCategory.MOBIL_KECIL,
      defaultPrice: 35000,
      commissionWasher: 8000,
      description: "Cuci sampo salju pH balance, semir ban, & vacuum interior ringan.",
      recommendedDurationMinutes: 25,
    },
  ];

  return (
    <div className="flex-1 space-y-6">
      <SuperadminCatalogView
        templates={res.data?.templates ?? defaultTemplates}
        totalOutletServicesCount={res.data?.totalOutletServicesCount ?? 0}
        popularServicesAcrossTenants={
          res.data?.popularServicesAcrossTenants ?? []
        }
      />
    </div>
  );
}

