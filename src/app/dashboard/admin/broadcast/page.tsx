import { Metadata } from "next";

import { getBroadcastHistoryAction } from "@/actions/superadmin";
import { SuperadminBroadcastView } from "@/components/dashboard/superadmin/superadmin-broadcast-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Pusat Siaran Pengumuman Platform | Superadmin Kinclongin",
  description:
    "Kirim notifikasi pengumuman pemeliharaan server, promo sewa, dan pembaruan sistem ke seluruh owner cabang.",
};

export default async function DashboardAdminBroadcastPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getBroadcastHistoryAction();

  return (
    <div className="flex-1 space-y-6">
      <SuperadminBroadcastView initialHistory={res.data ?? []} />
    </div>
  );
}
