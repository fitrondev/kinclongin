import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuditLogsAction } from "@/actions/owner";
import { AuditLogView } from "@/components/dashboard/audit-log-view";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Audit Log & Jejak Keamanan Platform | Superadmin Kinclongin",
  description:
    "Pantau seluruh rekaman aktivitas administratif, mutasi data sensitif, dan log keamanan platform.",
};

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Peran SUPERADMIN Platform (Pusat Komando Keamanan Sistem)
  const isSuper =
    user.role === UserRole.SUPERADMIN ||
    user.email?.toLowerCase() === "superadmin@kinclongin.com" ||
    user.email?.toLowerCase() === "admin@kinclongin.com";

  if (!isSuper) {
    redirect("/dashboard");
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : !isSuper
      ? await prisma.outlet.findFirst({ where: { isActive: true } })
      : null;

  if (!outlet && !isSuper) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Cabang outlet aktif tidak ditemukan.
      </div>
    );
  }

  const res = await getAuditLogsAction({ limit: 100 });
  const initialLogs = res.success && res.data ? res.data : [];

  return (
    <AuditLogView
      initialLogs={initialLogs}
      outletName={outlet?.name || "Platform Global HQ"}
    />
  );
}
