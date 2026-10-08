import { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getSubscriptionHistoryAction,
  getSubscriptionStatusAction,
} from "@/actions/subscription";
import { SubscriptionView } from "@/components/dashboard/subscription-view";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Tagihan & Lisensi Cabang | Kinclongin POS",
  description:
    "Kelola tagihan sewa platform Rp 50.000/bulan per cabang outlet, perpanjang masa aktif, dan unggah bukti transfer pembayaran.",
};

export default async function DashboardSubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Peran OWNER & MANAGER yang memiliki wewenang billing
  if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
    redirect("/dashboard");
  }

  // Ambil data outlet aktif
  const outlet = user.outletId
    ? await prisma.outlet.findUnique({
        where: { id: user.outletId },
      })
    : await prisma.outlet.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });

  if (!outlet) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center text-sm">
        Cabang outlet aktif tidak ditemukan. Silakan hubungi tim dukungan.
      </div>
    );
  }

  // Ambil status dan riwayat pembayaran sewa cabang
  const [statusRes, historyRes] = await Promise.all([
    getSubscriptionStatusAction(outlet.id),
    getSubscriptionHistoryAction(outlet.id),
  ]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <SubscriptionView
        outletId={outlet.id}
        outletName={outlet.name}
        initialStatus={statusRes.data}
        initialHistory={historyRes.data ?? []}
      />
    </div>
  );
}
