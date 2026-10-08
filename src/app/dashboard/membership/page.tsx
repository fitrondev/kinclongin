import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  Gift,
  Info,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { WashClubRegisterDialog } from "@/components/dashboard/membership/wash-club-register-dialog";
import { WashClubTable } from "@/components/dashboard/membership/wash-club-table";
import { MembershipDialog } from "@/components/pos/membership-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatRupiah } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Loyalty & Keanggotaan Pelanggan | Kinclongin POS",
  description:
    "Kelola paket kuota cuci berkala, diskon detailing, dan program loyalitas pelanggan tempat cuci Anda.",
};

export default async function DashboardMembershipPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "WASHER") {
    redirect("/dashboard");
  }
  if (user.role === "CASHIER") {
    redirect("/pos/antrean");
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

  // Ambil semua data WashClubSubscription
  const washClubList = await prisma.washClubSubscription.findMany({
    where: outletId ? { outletId } : {},
    include: {
      vehicle: true,
      customer: true,
    },
    orderBy: { expiresAt: "desc" },
  });

  const formattedWashClub = washClubList.map((s) => ({
    id: s.id,
    outletId: s.outletId,
    planName: s.planName,
    priceMonthly: Number(s.priceMonthly),
    startDate: s.startDate.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    isActive: s.isActive,
    qrPassCode: s.qrPassCode,
    notes: s.notes,
    daysRemaining: Math.max(
      0,
      Math.ceil((s.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    ),
    isExpired: s.expiresAt < now,
    vehicle: {
      id: s.vehicle.id,
      licensePlate: s.vehicle.licensePlate,
      category: s.vehicle.category,
      brand: s.vehicle.brand,
      model: s.vehicle.model,
      color: s.vehicle.color,
      totalVisits: s.vehicle.totalVisits,
    },
    customer: {
      id: s.customer.id,
      fullName: s.customer.fullName,
      phone: s.customer.phone,
    },
  }));

  const activeWashClubCount = formattedWashClub.filter(
    (w) => w.isActive && !w.isExpired
  ).length;

  // Metrik agregat
  const activeMemberships = memberships.filter(
    (m) => m.status === "ACTIVE" && new Date(m.endDate) >= now
  );
  const totalRevenue =
    memberships.reduce((acc, m) => acc + Number(m.price), 0) +
    washClubList.reduce((acc, w) => acc + Number(w.priceMonthly), 0);
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
      {/* Notice Pemisahan: Loyalty Pelanggan vs Sewa Lisensi */}
      <aside
        aria-label="Informasi sewa sistem platform"
        className="flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between dark:text-blue-200"
      >
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Halaman ini khusus mengelola{" "}
            <strong>Loyalty & Kuota Cuci Pelanggan</strong>. Untuk pembayaran
            sewa software POS cabang Rp 50.000/bulan ke platform Kinclongin,
            silakan buka menu <strong>Tagihan & Lisensi Cabang</strong>.
          </span>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="bg-background h-7 shrink-0 gap-1 text-xs font-bold"
        >
          <Link href="/dashboard/pengaturan/langganan">
            <span>Buka Lisensi Cabang</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </aside>

      {/* Page Title & Action */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground flex flex-wrap items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl">
            <Crown className="h-5 w-5 shrink-0 text-yellow-500 sm:h-6 sm:w-6" />
            <span>Keanggotaan & Loyalitas Pelanggan Cuci</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Program retensi pelanggan: Model langganan Unlimited Wash Club,
            paket kuota cuci berkala, dan apresiasi pelanggan setia.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <WashClubRegisterDialog
            outletId={outletId || undefined}
            buttonText="+ Daftar Unlimited Wash Club"
            className="h-10 w-full px-4 text-xs font-bold sm:w-auto"
          />
          <MembershipDialog
            outletId={outletId || undefined}
            buttonText="+ Paket Kuota Cuci"
            className="h-10 w-full px-4 text-xs font-bold sm:w-auto"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-yellow-500/20 bg-yellow-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-yellow-700 uppercase dark:text-yellow-300">
              Unlimited Wash Club
            </CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">
              {activeWashClubCount}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                kendaraan aktif
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Total terdaftar: {formattedWashClub.length} kendaraan
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-blue-700 uppercase dark:text-blue-300">
              Paket Kuota Cuci
            </CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">
              {activeMemberships.length}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                member aktif
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

        <Card className="border-purple-500/20 bg-purple-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-purple-700 uppercase dark:text-purple-300">
              Program Loyalitas
            </CardTitle>
            <Gift className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-black">
              Diskon & Kuota
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Tingkatkan repeat order cuci mobil & motor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Pilihan: Unlimited Wash Club vs Paket Kuota Cuci */}
      <Tabs defaultValue="wash-club" className="w-full space-y-4">
        <TabsList className="bg-muted rounded-xl p-1">
          <TabsTrigger
            value="wash-club"
            className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-bold data-[state=active]:shadow-xs"
          >
            <Crown className="h-3.5 w-3.5 text-yellow-500" />
            <span>Unlimited Wash Club ({formattedWashClub.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="quota"
            className="data-[state=active]:bg-background gap-1.5 rounded-lg text-xs font-bold data-[state=active]:shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>Paket Kuota Cuci ({memberships.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wash-club" className="space-y-4">
          <WashClubTable
            initialSubscriptions={formattedWashClub}
            outletId={outletId || ""}
          />
        </TabsContent>

        <TabsContent value="quota" className="space-y-4">
          {/* Tabel Riwayat & Status Langganan Member Pelanggan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base font-extrabold">
                <span>Daftar Langganan Paket Kuota Pelanggan</span>
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
                    Kasir dapat mendaftarkan langganan member langsung melalui
                    menu POS kasir dengan tombol &quot;Langganan Member&quot;.
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
                                {new Date(m.endDate).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
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
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
