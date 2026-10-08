import { Metadata } from "next";

import { getPlatformWhatsAppLogsAction } from "@/actions/superadmin";
import { SuperadminWhatsAppView } from "@/components/dashboard/superadmin/superadmin-whatsapp-view";
import { requireSuperadminAuth } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Log WhatsApp Gateway Platform | Superadmin Kinclongin",
  description:
    "Pantau status pengiriman struk digital dan notifikasi cuci pelanggan seluruh mitra melalui Fonnte WhatsApp Gateway.",
};

export default async function DashboardAdminWhatsAppPage() {
  await requireSuperadminAuth("/dashboard");

  const res = await getPlatformWhatsAppLogsAction({ limit: 80 });

  const defaultStats = {
    totalLogs: 0,
    delivered: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  };

  return (
    <div className="flex-1 space-y-6">
      <SuperadminWhatsAppView
        initialLogs={res.data?.logs ?? []}
        stats={res.data?.stats ?? defaultStats}
      />
    </div>
  );
}

