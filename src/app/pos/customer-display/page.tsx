import { Metadata } from "next";

import { CustomerDisplayView } from "@/components/pos/customer-display/customer-display-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Customer Facing Display (CDS) | Kinclongin POS",
  description:
    "Layar kedua hadap tamu untuk memantau keranjang belanja dan QRIS pembayaran secara real-time.",
};

interface CustomerDisplayPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CustomerDisplayPage({
  searchParams,
}: CustomerDisplayPageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();

  const queryOutletId =
    typeof query.outletId === "string" ? query.outletId : undefined;
  const targetOutletId = queryOutletId || user?.outletId;

  const outlet = targetOutletId
    ? await prisma.outlet.findUnique({
        where: { id: targetOutletId },
        select: {
          id: true,
          name: true,
          slogan: true,
          logoUrl: true,
          address: true,
          phone: true,
        },
      })
    : await prisma.outlet.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slogan: true,
          logoUrl: true,
          address: true,
          phone: true,
        },
      });

  if (!outlet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-sm text-slate-400">
        Cabang outlet aktif tidak ditemukan. Pastikan parameter ?outletId=xyz
        telah diisi atau login terlebih dahulu.
      </div>
    );
  }

  return <CustomerDisplayView outlet={outlet} />;
}

