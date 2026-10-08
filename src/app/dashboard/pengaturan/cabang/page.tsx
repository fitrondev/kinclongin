import { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  OutletDetailItem,
  OutletManagementView,
} from "@/components/dashboard/outlet-management-view";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Pengelolaan Cabang & Ekspansi | Kinclongin POS",
  description:
    "Kelola profil cabang aktif dan pembukaan cabang baru untuk ekspansi usaha cuci.",
};

export default async function OutletManagementPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Peran OWNER Bisnis
  if (user.role !== UserRole.OWNER) {
    redirect("/dashboard");
  }

  const currentOutlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!currentOutlet) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Cabang outlet aktif tidak ditemukan.
      </div>
    );
  }

  // Ambil semua outlet milik Owner
  const rawOutlets = await prisma.outlet.findMany({
    where: {
      OR: [{ ownerId: user.id }, { id: currentOutlet.id }],
      isActive: true,
    },
    include: {
      _count: {
        select: {
          employees: true,
          washTickets: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Ambil tiket bulan ini per outlet
  const outlets: OutletDetailItem[] = await Promise.all(
    rawOutlets.map(async (o) => {
      const ticketsCount = await prisma.washTicket.count({
        where: {
          outletId: o.id,
          createdAt: { gte: startOfMonth },
        },
      });

      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        address: o.address,
        phone: o.phone,
        logoUrl: o.logoUrl,
        slogan: o.slogan,
        receiptHeader: o.receiptHeader,
        receiptFooter: o.receiptFooter,
        contactPhone: o.contactPhone,
        isActive: o.isActive,
        isCurrent: o.id === currentOutlet.id,
        totalEmployees: o._count.employees,
        totalTicketsThisMonth: ticketsCount,
        taxEnabled: o.taxEnabled,
        taxRate: Number(o.taxRate),
        taxType: o.taxType,
        taxLabel: o.taxLabel,
        qrisSurchargeBearer: o.qrisSurchargeBearer,
        qrisSurchargeRate: Number(o.qrisSurchargeRate),
      };
    })
  );

  const currentDetail: OutletDetailItem = outlets.find(
    (o) => o.id === currentOutlet.id
  ) || {
    id: currentOutlet.id,
    name: currentOutlet.name,
    slug: currentOutlet.slug,
    address: currentOutlet.address,
    phone: currentOutlet.phone,
    logoUrl: currentOutlet.logoUrl,
    slogan: currentOutlet.slogan,
    receiptHeader: currentOutlet.receiptHeader,
    receiptFooter: currentOutlet.receiptFooter,
    contactPhone: currentOutlet.contactPhone,
    isActive: currentOutlet.isActive,
    isCurrent: true,
    totalEmployees: 0,
    totalTicketsThisMonth: 0,
    taxEnabled: currentOutlet.taxEnabled,
    taxRate: Number(currentOutlet.taxRate),
    taxType: currentOutlet.taxType,
    taxLabel: currentOutlet.taxLabel,
    qrisSurchargeBearer: currentOutlet.qrisSurchargeBearer,
    qrisSurchargeRate: Number(currentOutlet.qrisSurchargeRate),
  };

  return (
    <OutletManagementView currentOutlet={currentDetail} allOutlets={outlets} />
  );
}
