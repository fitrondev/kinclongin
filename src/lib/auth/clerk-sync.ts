import { cache } from "react";

import {
  type User as ClerkBackendUser,
  type UserJSON,
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

/**
 * Mengekstrak dan memetakan role dari metadata Clerk ke UserRole Prisma.
 */
export function extractRoleFromMetadata(
  metadata?: Record<string, unknown> | null
): UserRole {
  if (!metadata || typeof metadata !== "object") {
    return UserRole.INDIVIDUAL;
  }

  const roleRaw = metadata.role;
  if (typeof roleRaw !== "string") {
    return UserRole.INDIVIDUAL;
  }

  const normalized = roleRaw.toUpperCase();
  if (normalized === "SUPERADMIN" || normalized === "ADMIN") {
    return UserRole.SUPERADMIN;
  }
  if (normalized === "COMPANY") {
    return UserRole.COMPANY;
  }
  return UserRole.INDIVIDUAL;
}

interface UpsertUserInput {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  role: UserRole;
}

/**
 * Helper sinkronisasi yang aman dari race-condition paralel RSC dan
 * konflik unique constraint (User_clerkId_key & User_email_key).
 */
async function upsertUserSafely(input: UpsertUserInput) {
  const { clerkId, email, fullName, avatarUrl, phone, role } = input;

  // 1. Cek apakah pengguna sudah terdaftar berdasarkan clerkId
  const existingByClerk = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      company: true,
    },
  });

  if (existingByClerk) {
    return await prisma.user.update({
      where: { clerkId },
      data: {
        email,
        role: role ?? existingByClerk.role,
        status: UserStatus.ACTIVE,
        profile: {
          upsert: {
            create: {
              fullName,
              avatarUrl,
              phone,
            },
            update: {
              fullName,
              avatarUrl,
              ...(phone ? { phone } : {}),
            },
          },
        },
      },
      include: {
        profile: true,
        company: true,
      },
    });
  }

  // 2. Cek apakah pengguna sudah ada berdasarkan email (misal dari seed data atau akun sebelumnya)
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
      company: true,
    },
  });

  if (existingByEmail) {
    return await prisma.user.update({
      where: { email },
      data: {
        clerkId, // Hubungkan akun yang ada dengan clerkId yang baru login
        role: role ?? existingByEmail.role,
        status: UserStatus.ACTIVE,
        profile: {
          upsert: {
            create: {
              fullName,
              avatarUrl,
              phone,
            },
            update: {
              fullName,
              avatarUrl,
              ...(phone ? { phone } : {}),
            },
          },
        },
      },
      include: {
        profile: true,
        company: true,
      },
    });
  }

  // 3. Jika belum ada sama sekali, buat entitas user baru (dengan proteksi race-condition)
  try {
    return await prisma.user.create({
      data: {
        clerkId,
        email,
        role: role ?? UserRole.INDIVIDUAL,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            fullName,
            avatarUrl,
            phone,
          },
        },
      },
      include: {
        profile: true,
        company: true,
      },
    });
  } catch (_error: unknown) {
    // Jika eksekusi paralel bersamaan (P2002), ambil data yang baru saja dibuat
    const fallbackUser = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId }, { email }],
      },
      include: {
        profile: true,
        company: true,
      },
    });

    if (fallbackUser) {
      return fallbackUser;
    }

    throw _error;
  }
}

/**
 * Melakukan sinkronisasi data user dari payload webhook Clerk (UserJSON) ke MySQL.
 */
export async function syncClerkUserToDatabase(data: UserJSON) {
  const clerkId = data.id;
  const primaryEmail =
    data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
      ?.email_address ?? data.email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    console.warn(`[Clerk Sync] User ${clerkId} does not have an email address`);
  }

  const email = primaryEmail || `${clerkId}@clerk.local`;

  const nameParts = [data.first_name, data.last_name].filter(Boolean);
  const fullName =
    nameParts.length > 0
      ? nameParts.join(" ")
      : (data.username ?? email.split("@")[0] ?? "Pengguna KerjaNTB");

  const phone =
    data.phone_numbers?.find((p) => p.id === data.primary_phone_number_id)
      ?.phone_number ??
    data.phone_numbers?.[0]?.phone_number ??
    null;

  const avatarUrl = data.image_url ?? null;

  // KEAMANAN (SEC-01): Role HANYA boleh diekstrak dari public_metadata yang terproteksi
  // DILARANG membaca dari unsafe_metadata karena dapat dimanipulasi oleh klien browser pengguna
  const role = extractRoleFromMetadata(
    data.public_metadata as Record<string, unknown> | undefined
  );

  return await upsertUserSafely({
    clerkId,
    email,
    fullName,
    avatarUrl,
    phone,
    role,
  });
}

/**
 * Melakukan sinkronisasi data user dari instance backend Clerk (currentUser) ke MySQL.
 * Digunakan sebagai fallback on-the-fly saat webhook belum tersinkronisasi.
 */
export async function syncClerkBackendUserToDatabase(user: ClerkBackendUser) {
  const clerkId = user.id;
  const primaryEmail =
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;

  const email = primaryEmail || `${clerkId}@clerk.local`;

  const nameParts = [user.firstName, user.lastName].filter(Boolean);
  const fullName =
    nameParts.length > 0
      ? nameParts.join(" ")
      : (user.username ?? email.split("@")[0] ?? "Pengguna KerjaNTB");

  const phone =
    user.phoneNumbers?.find((p) => p.id === user.primaryPhoneNumberId)
      ?.phoneNumber ??
    user.phoneNumbers?.[0]?.phoneNumber ??
    null;

  const avatarUrl = user.imageUrl ?? null;

  // KEAMANAN (SEC-01): Role HANYA boleh diekstrak dari publicMetadata backend
  const role = extractRoleFromMetadata(
    user.publicMetadata as Record<string, unknown> | undefined
  );

  return await upsertUserSafely({
    clerkId,
    email,
    fullName,
    avatarUrl,
    phone,
    role,
  });
}

/**
 * Menandai status user menjadi DEACTIVATED saat menerima event user.deleted dari Clerk.
 */
export async function deactivateClerkUserInDatabase(clerkId: string) {
  return await prisma.user.updateMany({
    where: { clerkId },
    data: {
      status: UserStatus.DEACTIVATED,
    },
  });
}

/**
 * Helper untuk mengambil record user aktif dari database MySQL.
 * Dibungkus dengan React cache() agar eksekusi paralel pada Server Components
 * (layout.tsx dan page.tsx) di-memoize per-request dan tidak memicu race-condition.
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      profile: true,
      company: true,
    },
  });

  if (dbUser) {
    return dbUser;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  return await syncClerkBackendUserToDatabase(clerkUser);
});
