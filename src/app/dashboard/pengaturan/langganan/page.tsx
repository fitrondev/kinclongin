import { Metadata } from "next";

import {
  type SubscriptionStatusInfo,
  getSubscriptionStatusAction,
} from "@/actions/subscription";
import { SubscriptionView } from "@/components/dashboard/subscription-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Pengaturan Langganan Cabang (Rp 50rb/Bln) | Kinclongin",
  description:
    "Kelola masa aktif langganan platform POS Kinclongin flat Rp 50.000 / bulan.",
};

export default async function DashboardLanggananPage() {
  const user = await getCurrentUser();
  const outlet = user?.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Data cabang outlet tidak ditemukan.
      </div>
    );
  }

  const res = await getSubscriptionStatusAction(outlet.id);
  const rawStatus =
    outlet.subscriptionStatus as SubscriptionStatusInfo["status"];
  const fallbackStatus: SubscriptionStatusInfo["status"] =
    rawStatus === "TRIAL" ||
    rawStatus === "ACTIVE" ||
    rawStatus === "PENDING_VERIFICATION" ||
    rawStatus === "EXPIRED"
      ? rawStatus
      : "ACTIVE";

  const statusInfo = res.data || {
    outletId: outlet.id,
    outletName: outlet.name,
    status: fallbackStatus,
    expiresAt: outlet.subscriptionExpiresAt,
    daysRemaining: 30,
    isGracePeriod: false,
    graceDaysRemaining: 0,
    isHardLocked: false,
  };

  return <SubscriptionView statusInfo={statusInfo} />;
}
