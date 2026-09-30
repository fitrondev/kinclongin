import { prisma } from "@/lib/db/prisma";

export interface StorageAuthUser {
  id: string;
  clerkId: string;
  role: string;
}

/**
 * Memverifikasi apakah pengguna memiliki otorisasi sah untuk mengakses berkas privat di SumoPod Storage (SEC-02).
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

  // Berkas non-privat (public) dapat diakses bebas
  if (prefix !== "resumes" && prefix !== "verifications") {
    return true;
  }

  // Superadmin memiliki hak akses menyeluruh untuk moderasi & audit
  if (user.role === "SUPERADMIN") {
    return true;
  }

  // 1. Dokumen CV / Resume privat
  if (prefix === "resumes") {
    // Pemilik langsung dokumen CV
    if (user.id === ownerId || user.clerkId === ownerId) {
      return true;
    }

    // Cek apakah user memiliki record Resume dengan file ini
    const ownResume = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        fileUrl: { contains: cleanKey },
      },
      select: { id: true },
    });
    if (ownResume) {
      return true;
    }

    // Cek apakah user adalah Employer yang menerima lamaran kerja dari pelamar ini
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { userId: ownerId },
          { user: { clerkId: ownerId } },
          { customResumeUrl: { contains: cleanKey } },
          { resume: { fileUrl: { contains: cleanKey } } },
        ],
        job: {
          company: {
            userId: user.id,
          },
        },
      },
      select: { id: true },
    });

    return !!application;
  }

  // 2. Dokumen NIB / Legalitas Perusahaan privat
  if (prefix === "verifications") {
    // Cek apakah user adalah pemilik perusahaan bersangkutan
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { id: ownerId },
          { verification: { documentUrl: { contains: cleanKey } } },
        ],
        userId: user.id,
      },
      select: { id: true },
    });

    return !!company;
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

  if (user.role === "SUPERADMIN") {
    return true;
  }

  if (prefix === "resumes" || prefix === "avatars") {
    return user.id === ownerId || user.clerkId === ownerId;
  }

  if (prefix === "verifications" || prefix === "logos") {
    const company = await prisma.company.findFirst({
      where: {
        id: ownerId,
        userId: user.id,
      },
      select: { id: true },
    });
    return !!company;
  }

  return false;
}
