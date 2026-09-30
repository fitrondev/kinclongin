import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPendingSubscriptionsAction } from "@/actions/subscription";
import { SuperadminSubscriptionsView } from "@/components/dashboard/superadmin-subscriptions-view";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/clerk-sync";

export const metadata: Metadata = {
  title: "Verifikasi Pembayaran Langganan Superadmin | Kinclongin",
  description:
    "Tinjau dan setujui bukti transfer langganan cabang flat Rp 50.000/bulan.",
};

export default async function AdminSubscriptionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.OWNER) {
    redirect("/dashboard");
  }

  const res = await getPendingSubscriptionsAction();
  const payments = res.data || [];

  return <SuperadminSubscriptionsView initialPayments={payments} />;
}
