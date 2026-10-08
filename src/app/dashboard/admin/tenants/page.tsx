import { Metadata } from "next";

import { getAllTenantsAction } from "@/actions/subscription";
import { SuperadminTenantsView } from "@/components/dashboard/superadmin/superadmin-tenants-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Direktori Tenant & Kontrol Cabang | Superadmin Kinclongin",
  description:
    "Manajemen seluruh outlet tempat cuci, perpanjangan masa aktif lisensi, dan saklar kontrol operasional cabang.",
};

export default async function DashboardAdminTenantsPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getAllTenantsAction();

  return (
    <div className="flex-1 space-y-6">
      <SuperadminTenantsView initialTenants={res.data ?? []} />
    </div>
  );
}
