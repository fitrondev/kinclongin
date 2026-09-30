import { redirect } from "next/navigation";

import { POSHeader } from "@/components/pos/header";
import { OfflineIndicator } from "@/components/pos/offline-indicator";
import { SubscriptionBanner } from "@/components/pos/subscription-banner";
import { TicketStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

function checkSubscriptionGrace(expiresAt?: Date | null) {
  if (!expiresAt) {
    return { isGracePeriod: false, graceDaysRemaining: 0, isHardLocked: false };
  }
  const diffMs = expiresAt.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    const daysPast = Math.abs(diffDays);
    if (daysPast <= 3) {
      return {
        isGracePeriod: true,
        graceDaysRemaining: 3 - daysPast,
        isHardLocked: false,
      };
    }
    return { isGracePeriod: false, graceDaysRemaining: 0, isHardLocked: true };
  }
  return { isGracePeriod: false, graceDaysRemaining: 0, isHardLocked: false };
}

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Ambil outlet cabang aktif pengguna
  let outlet = user.outletId
    ? await prisma.outlet.findUnique({
        where: { id: user.outletId },
      })
    : null;

  // Fallback ke outlet pertama jika belum terasosiasi di demo
  if (!outlet) {
    outlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  // Hitung jumlah antrean aktif saat ini
  const stats = { queued: 0, washing: 0, drying: 0, ready: 0 };
  if (outlet) {
    const counts = await prisma.washTicket.groupBy({
      by: ["status"],
      where: {
        outletId: outlet.id,
        status: {
          in: [
            TicketStatus.QUEUED,
            TicketStatus.WASHING,
            TicketStatus.DRYING,
            TicketStatus.READY,
          ],
        },
      },
      _count: { id: true },
    });

    counts.forEach((c) => {
      if (c.status === "QUEUED") stats.queued = c._count.id;
      if (c.status === "WASHING") stats.washing = c._count.id;
      if (c.status === "DRYING") stats.drying = c._count.id;
      if (c.status === "READY") stats.ready = c._count.id;
    });
  }

  // Periksa masa aktif langganan & grace period cabang
  const { isGracePeriod, graceDaysRemaining, isHardLocked } =
    checkSubscriptionGrace(outlet?.subscriptionExpiresAt);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <POSHeader
        outletName={outlet?.name || "Kinclongin Cabang Pusat"}
        cashierName={user.fullName}
        stats={stats}
      />
      <SubscriptionBanner
        status={outlet?.subscriptionStatus}
        isGracePeriod={isGracePeriod}
        graceDaysRemaining={graceDaysRemaining}
        isHardLocked={isHardLocked}
      />
      <OfflineIndicator />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
