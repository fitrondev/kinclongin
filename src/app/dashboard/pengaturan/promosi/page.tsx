import { Metadata } from "next";
import { redirect } from "next/navigation";

import { PromotionsView } from "@/components/dashboard/promotions/promotions-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Mesin Diskon & Happy Hour | Kinclongin POS",
  description: "Kelola promosi diskon otomatis jam sepi dan voucher promosi.",
};

export default async function PromotionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Owner, Manager, atau Superadmin
  if (
    user.role !== "OWNER" &&
    user.role !== "MANAGER" &&
    user.role !== "SUPERADMIN"
  ) {
    redirect("/dashboard");
  }

  const outletId = user.outletId || user.ownedOutlets?.[0]?.id;
  if (!outletId) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Cabang outlet aktif tidak ditemukan.
      </div>
    );
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true },
  });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Cabang tidak ditemukan.
      </div>
    );
  }

  const promotions = await prisma.promotionRule.findMany({
    where: { outletId },
    orderBy: { createdAt: "desc" },
  });

  const mapped = promotions.map((p) => ({
    id: p.id,
    outletId: p.outletId,
    name: p.name,
    code: p.code,
    discountType: p.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: Number(p.discountValue),
    minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
    daysOfWeek: p.daysOfWeek as string[] | null,
    startHour: p.startHour,
    endHour: p.endHour,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    isActive: p.isActive,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PromotionsView
        outletId={outlet.id}
        outletName={outlet.name}
        promotions={mapped}
      />
    </div>
  );
}
