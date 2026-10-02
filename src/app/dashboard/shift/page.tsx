import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDailyRosterAction } from "@/actions/shifts";
import { ShiftManagementView } from "@/components/dashboard/shift-management-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Jadwal & Shift Kerja Staf | Kinclongin",
  description:
    "Pengaturan template shift kerja, penugasan harian tukang cuci dan kasir, serta pemantauan roster staf aktif cabang.",
};

export default async function DashboardShiftPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus OWNER & MANAGER
  if (user.role !== "OWNER" && user.role !== "MANAGER") {
    redirect(user.role === "CASHIER" ? "/pos/antrean" : "/layar-cuci");
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Cabang outlet aktif tidak ditemukan. Silakan hubungi administrator.
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const res = await getDailyRosterAction(todayStr, outlet.id);
  const initialRoster = res.data || {
    date: todayStr,
    shifts: [],
    employees: [],
    assignments: [],
    stats: {
      totalAssigned: 0,
      washersOnDuty: 0,
      cashiersOnDuty: 0,
      unassignedStaff: 0,
    },
  };

  return (
    <ShiftManagementView
      initialRoster={initialRoster}
      outletName={outlet.name}
      userRole={user.role}
    />
  );
}
