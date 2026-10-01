import { prisma } from "@/lib/db/prisma";

export interface StorageAuthUser {
  id: string;
  role: string;
  outletId?: string | null;
}

/**
 * Memverifikasi apakah pengguna memiliki otorisasi sah untuk mengakses berkas di SumoPod Storage (SEC-02).
 */
export async function canAccessStorageFile(
  user: StorageAuthUser,
  storageKey: string
): Promise<boolean> {
  const cleanKey = storageKey.startsWith("/")
    ? storageKey.slice(1)
    : storageKey;
  const segments = cleanKey.split("/").filter(Boolean);

  const prefix = segments[0];
  const ownerId = segments[1];

  // Berkas non-privat (foto inspeksi kendaraan, logo, produk, avatar) dapat diakses
  if (prefix !== "payments") {
    return true;
  }

  // Owner / Admin memiliki hak akses menyeluruh
  if (user.role === "OWNER" || user.role === "SUPERADMIN") {
    return true;
  }

  // Dokumen Bukti Pembayaran (payments)
  if (prefix === "payments") {
    // Pengunggah langsung
    if (user.id === ownerId) {
      return true;
    }

    // Kasir atau staf pada cabang outlet bersangkutan
    if (user.outletId && user.outletId === ownerId) {
      return true;
    }

    // Cek apakah payment record tercatat di DB untuk outlet user
    const payment = await prisma.payment.findFirst({
      where: {
        proofImageUrl: { contains: cleanKey },
        outletId: user.outletId ?? undefined,
      },
      select: { id: true },
    });

    if (payment) {
      return true;
    }

    // Cek bukti transfer langganan SaaS outlet
    const subPayment = await prisma.tenantSubscriptionPayment.findFirst({
      where: {
        proofImageUrl: { contains: cleanKey },
        outletId: user.outletId ?? undefined,
      },
      select: { id: true },
    });

    return !!subPayment;
  }

  return false;
}

/**
 * Memverifikasi apakah pengguna diizinkan memodifikasi atau menghapus berkas di storage (SEC-03).
 */
export async function canModifyStorageFile(
  user: StorageAuthUser,
  storageKey: string
): Promise<boolean> {
  const cleanKey = storageKey.startsWith("/")
    ? storageKey.slice(1)
    : storageKey;
  const segments = cleanKey.split("/").filter(Boolean);

  const prefix = segments[0];
  const ownerId = segments[1];

  if (user.role === "OWNER" || user.role === "SUPERADMIN") {
    return true;
  }

  // Avatar milik sendiri
  if (prefix === "avatars") {
    return user.id === ownerId;
  }

  // Aset outlet (logo, produk, inspeksi)
  if (prefix === "logos" || prefix === "products" || prefix === "inspections") {
    return user.outletId === ownerId;
  }

  return false;
}
