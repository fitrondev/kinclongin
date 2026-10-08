import { Metadata } from "next";

import { getPlatformStorageStatsAction } from "@/actions/superadmin";
import { SuperadminMediaView } from "@/components/dashboard/superadmin/superadmin-media-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Inspektur Media & Cloud Storage S3 | Superadmin Kinclongin",
  description:
    "Pantau penggunaan penyimpanan SumoPod Object Storage, galeri foto inspeksi kendaraan, bukti transfer sewa, dan logo tenant.",
};

export default async function DashboardAdminMediaPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getPlatformStorageStatsAction();

  const defaultStats = {
    totalOutletsWithLogo: 0,
    totalSubscriptionProofs: 0,
    totalInspectionPhotosEstimate: 0,
    totalCashierPaymentProofs: 0,
    estimatedStorageMb: 0,
    recentMediaUploads: [],
  };

  return (
    <div className="flex-1 space-y-6">
      <SuperadminMediaView stats={res.data ?? defaultStats} />
    </div>
  );
}
