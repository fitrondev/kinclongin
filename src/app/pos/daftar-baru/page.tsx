import { Metadata } from "next";
import { redirect } from "next/navigation";

import { WalkInForm } from "@/components/pos/walk-in-form";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getActiveServicePackages, getActiveWashers } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Daftar Cuci Baru (<15 Detik) | Kinclongin POS",
  description: "Input kilat nomor plat kendaraan dan paket layanan cuci.",
};

export default async function POSDaftarBaruPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Kasir, Manajer & Owner: Washer tidak berwenang mendaftarkan kendaraan baru
  if (user.role === "WASHER") {
    redirect("/pos/antrean");
  }

  let outletId = user.outletId;
  if (!outletId) {
    const defaultOutlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    outletId = defaultOutlet?.id || null;
  }

  if (!outletId) {
    return (
      <div className="text-muted-foreground p-8 text-center">
        Belum ada outlet cabang aktif yang terdaftar.
      </div>
    );
  }

  const [rawPackages, activeWashers] = await Promise.all([
    getActiveServicePackages(outletId),
    getActiveWashers(outletId),
  ]);

  const servicePackages = rawPackages.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    vehicleCategory: p.vehicleCategory,
    price: Number(p.price),
    estimatedMinutes: p.estimatedMinutes,
  }));

  const washers = activeWashers.map((w) => ({
    id: w.id,
    fullName: w.fullName,
    role: w.role,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-foreground text-2xl font-black tracking-tight">
          Daftar Kendaraan Cuci Baru
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Proses kilat di bawah 15 detik dengan deteksi plat nomor dan member
          otomatis.
        </p>
      </div>

      <WalkInForm
        outletId={outletId}
        servicePackages={servicePackages}
        washers={washers}
      />
    </div>
  );
}
