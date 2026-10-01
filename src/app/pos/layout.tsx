import { redirect } from "next/navigation";

import { POSHeader } from "@/components/pos/header";
import { OfflineIndicator } from "@/components/pos/offline-indicator";
import { TicketStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <POSHeader
        outletId={outlet?.id}
        outletName={outlet?.name || "Kinclongin Cabang Utama"}
        cashierName={user.fullName}
        userRole={user.role}
        stats={stats}
      />
      <OfflineIndicator />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
