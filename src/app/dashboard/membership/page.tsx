import { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  CheckCircle2,
  Clock,
  Crown,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatRupiah } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Langganan Member Pelanggan | Kinclongin POS",
  description:
    "Kelola paket langganan cuci bulanan member, pantau sisa kuota cuci pelanggan, dan riwayat pendapatan membership.",
};

export default async function DashboardMembershipPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const outletId = user.outletId;

  const now = new Date();

  // Ambil semua data CustomerMembership
  const memberships = await prisma.customerMembership.findMany({
    where: outletId ? { outletId } : {},
    include: {
      customer: true,
      cashier: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Metrik agregat
  const activeMemberships = memberships.filter(
    (m) => m.status === "ACTIVE" && new Date(m.endDate) >= now
  );
  const totalRevenue = memberships.reduce((acc, m) => acc + Number(m.price), 0);
  const totalQuotaIssued = memberships.reduce(
    (acc, m) => acc + (m.totalQuota === 999 ? 0 : m.totalQuota),
    0
  );
  const totalQuotaRemaining = activeMemberships.reduce(
    (acc, m) => acc + (m.remainingQuota === 999 ? 0 : m.remainingQuota),
    0
  );

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl">
            <Crown className="h-6 w-6 text-amber-500" />
            <span>Keanggotaan & Loyalitas Member Pelanggan</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pendaftaran member flat Rp 50.000 via Nomor WhatsApp: Poin
            akumulatif tiap transaksi dan validasi promo terprogram Cuci 10x
            Gratis 1x.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-500/20 bg-amber-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-amber-700 uppercase dark:text-amber-300">
              Member Aktif
            </CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">
              {activeMemberships.length}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                pelanggan
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Total terdaftar: {memberships.length} langganan
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-emerald-700 uppercase dark:text-emerald-300">
              Pendapatan Membership
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalRevenue)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Diterima tunai, QRIS & transfer di kasir
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-blue-700 uppercase dark:text-blue-300">
              Sisa Kuota Cuci Member
            </CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">
              {totalQuotaRemaining}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                kali cuci
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Dari total {totalQuotaIssued} kuota diterbitkan
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-primary text-xs font-bold uppercase">
              Penambahan Cabang
            </CardTitle>
            <CheckCircle2 className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">
              100% Gratis
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Buka cabang baru tanpa biaya langganan SaaS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Riwayat & Status Langganan Member Pelanggan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base font-extrabold">
            <span>Daftar Langganan Member Pelanggan</span>
            <Badge variant="outline" className="font-bold">
              {memberships.length} Transaksi Langganan
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <div className="py-12 text-center">
              <Crown className="text-muted-foreground/30 mx-auto mb-3 h-12 w-12" />
              <h3 className="text-foreground text-base font-bold">
                Belum Ada Pelanggan yang Berlangganan
              </h3>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
                Kasir dapat mendaftarkan langganan member langsung melalui menu
                POS kasir dengan tombol &quot;Langganan Member&quot;.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b font-bold">
                  <tr>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Paket Langganan</th>
                    <th className="p-3">Harga</th>
                    <th className="p-3">Masa Berlaku</th>
                    <th className="p-3 text-center">Sisa Kuota</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Metode Bayar</th>
                    <th className="p-3">Kasir</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {memberships.map((m) => {
                    const isExpired =
                      new Date(m.endDate) < now || m.status === "EXPIRED";
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3">
                          <div className="text-foreground font-bold">
                            {m.customer.fullName}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            {m.customer.phone}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-foreground font-semibold">
                            {m.planName}
                          </span>
                          {m.discountPercent > 0 && (
                            <span className="block text-[10px] font-bold text-emerald-600">
                              + Diskon Ritel {m.discountPercent}%
                            </span>
                          )}
                        </td>
                        <td className="text-foreground p-3 font-bold">
                          {formatRupiah(Number(m.price))}
                        </td>
                        <td className="p-3">
                          <div className="text-[11px]">
                            s/d{" "}
                            {new Date(m.endDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {m.totalQuota === 999 ? (
                            <Badge className="bg-amber-500 text-[10px] font-black text-black">
                              UNLIMITED
                            </Badge>
                          ) : (
                            <span className="text-foreground font-bold">
                              {m.remainingQuota} / {m.totalQuota}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isExpired ? (
                            <Badge
                              variant="outline"
                              className="border-destructive/30 text-destructive text-[10px]"
                            >
                              Kadaluarsa
                            </Badge>
                          ) : (
                            <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              Aktif
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          <Badge variant="secondary" className="text-[10px]">
                            {m.paymentMethod}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground p-3">
                          {m.cashier?.fullName || "Kasir"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
