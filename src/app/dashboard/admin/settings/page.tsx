import { Metadata } from "next";

import { getPlatformSettingsAction } from "@/actions/superadmin";
import { SuperadminSettingsView } from "@/components/dashboard/superadmin/superadmin-settings-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Pengaturan Sewa & Rekening Platform | Superadmin Kinclongin",
  description:
    "Konfigurasi nomor rekening resmi penerima transfer sewa flat Rp 50.000/bulan, masa tenggang grace period, dan hotline platform.",
};

export default async function DashboardAdminSettingsPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getPlatformSettingsAction();

  const defaultSettings = {
    platformName: "Kinclongin POS B2B Platform",
    monthlyRentalPrice: 50000,
    gracePeriodDays: 3,
    supportPhone: "6281234567890",
    supportEmail: "support@kinclongin.com",
    bankAccounts: [
      {
        bankName: "Bank Central Asia (BCA)",
        accountNumber: "8735098123",
        accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
        code: "BCA",
      },
    ],
    qrisImageUrl: null,
    qrisHolderName: "KINCLONGIN DIGITAL NUSANTARA QRIS",
  };

  return (
    <div className="flex-1 space-y-6">
      <SuperadminSettingsView initialSettings={res.data ?? defaultSettings} />
    </div>
  );
}
