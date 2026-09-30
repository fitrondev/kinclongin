import { cache } from "react";

import { prisma } from "@/lib/db/prisma";

/**
 * Mengambil data detail lowongan berdasarkan slug.
 * Di-memoize per-request menggunakan React.cache() sehingga panggilan
 * dari generateMetadata() dan Page Component tidak memicu query ganda.
 */
export const getJobBySlug = cache(async (slug: string) => {
  const job = await prisma.job.findUnique({
    where: { slug },
    include: {
      company: {
        include: {
          verification: {
            select: { nib: true, legalName: true, status: true },
          },
        },
      },
      location: true,
      category: true,
      skills: {
        include: {
          skill: true,
        },
      },
    },
  });

  // SEC-08: Masking nomor NIB agar tidak dapat disalin / discrape secara massal oleh kompetitor / bot
  if (job?.company?.verification?.nib) {
    const rawNib = job.company.verification.nib;
    if (rawNib.length > 7) {
      job.company.verification.nib = `${rawNib.slice(0, 4)}******${rawNib.slice(-3)}`;
    }
  }

  return job;
});

/**
 * Mengambil daftar seluruh 10 Kabupaten/Kota NTB.
 * Di-memoize per-request untuk mencegah duplikasi query master data di layout & subkomponen.
 */
export const getLocations = cache(async () => {
  return await prisma.location.findMany({
    orderBy: { orderIndex: "asc" },
  });
});

/**
 * Mengambil daftar kategori pekerjaan aktif di NTB.
 * Di-memoize per-request menggunakan React.cache().
 */
export const getJobCategories = cache(async () => {
  return await prisma.jobCategory.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: "asc" },
  });
});
