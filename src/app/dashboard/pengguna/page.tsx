import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUsersAction } from "@/actions/users";
import { UsersManagementView } from "@/components/dashboard/users-management-view";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Manajemen Akun & Role | Kinclongin",
  description:
    "Kelola hak akses pengguna, pembuatan akun kasir, manajer, tukang cuci, dan pengaturan PIN Kiosk cabang.",
};

export default async function DashboardPenggunaPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus OWNER & MANAGER: Kasir atau staf cuci tidak boleh mengakses manajemen akun & role
  if (user.role !== "OWNER" && user.role !== "MANAGER") {
    redirect(user.role === "CASHIER" ? "/dashboard" : "/dashboard");
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

  const res = await getUsersAction(outlet.id);
  const initialUsers = res.data || [];

  return (
    <UsersManagementView
      initialUsers={initialUsers}
      currentUserId={user.id}
      currentUserRole={user.role}
      outletName={outlet.name}
    />
  );
}
