import { Metadata } from "next";
import { redirect } from "next/navigation";

import { WhatsAppSettingsView } from "@/components/dashboard/whatsapp-settings-view";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Konfigurasi WhatsApp Gateway | Kinclongin POS",
  description:
    "Pengaturan kunci API WhatsApp Gateway untuk pengiriman struk digital & notifikasi.",
};

export default async function WhatsAppSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Khusus Peran OWNER (Superadmin)
  if (user.role !== UserRole.OWNER) {
    redirect("/dashboard");
  }

  const outlet = user.outletId
    ? await prisma.outlet.findUnique({ where: { id: user.outletId } })
    : await prisma.outlet.findFirst({ where: { isActive: true } });

  if (!outlet) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Cabang outlet aktif tidak ditemukan.
      </div>
    );
  }

  return (
    <WhatsAppSettingsView
      initialApiKey={outlet.waGatewayApiKey}
      initialSenderNumber={outlet.waSenderNumber}
      outletName={outlet.name}
    />
  );
}
