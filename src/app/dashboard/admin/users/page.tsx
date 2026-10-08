import { Metadata } from "next";

import { getAllPlatformUsersAction } from "@/actions/superadmin";
import { SuperadminUsersView } from "@/components/dashboard/superadmin/superadmin-users-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Manajemen Pengguna Global Platform | Superadmin Kinclongin",
  description:
    "Kelola seluruh akun pengguna di ekosistem platform: Superadmin, Owner, Manajer, Kasir, dan Washer.",
};

export default async function DashboardAdminUsersPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getAllPlatformUsersAction();

  return (
    <div className="flex-1 space-y-6">
      <SuperadminUsersView initialUsers={res.data ?? []} />
    </div>
  );
}
