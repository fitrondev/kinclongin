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
  metadata?: Record<string, unknown> | null,
  orgRole?: string | null
): UserRole {
  const roleRaw = metadata?.role || orgRole;
  if (!roleRaw || typeof roleRaw !== "string") {
    return UserRole.CASHIER;
  }

  const normalized = roleRaw.toUpperCase().replace("ORG:", "");
  if (
    normalized === "OWNER" ||
    normalized === "ADMIN" ||
    normalized === "SUPERADMIN"
  ) {
    return UserRole.OWNER;
  }
  if (normalized === "MANAGER") {
    return UserRole.MANAGER;
  }
  if (normalized === "WASHER") {
    return UserRole.WASHER;
  }
  return UserRole.CASHIER;
}

interface UpsertUserInput {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role?: UserRole;
  outletId?: string | null;
}

/**
 * Helper sinkronisasi yang aman dari race-condition paralel RSC dan
 * konflik unique constraint (User_clerkId_key & User_email_key).
 */
async function upsertUserSafely(input: UpsertUserInput) {
  const { clerkId, email, fullName, avatarUrl, role, outletId } = input;

  // 1. Cek apakah pengguna sudah terdaftar berdasarkan clerkId
  const existingByClerk = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      outlet: true,
      employee: true,
    },
  });

  if (existingByClerk) {
    return await prisma.user.update({
      where: { clerkId },
      data: {
        email,
        fullName,
        avatarUrl,
        ...(role ? { role } : {}),
        ...(outletId !== undefined ? { outletId } : {}),
        status: UserStatus.ACTIVE,
      },
      include: {
        outlet: true,
        employee: true,
      },
    });
  }

  // 2. Cek apakah pengguna sudah ada berdasarkan email
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    include: {
      outlet: true,
      employee: true,
    },
  });

  if (existingByEmail) {
    return await prisma.user.update({
      where: { email },
      data: {
        clerkId,
        fullName,
        avatarUrl,
        ...(role ? { role } : {}),
        ...(outletId !== undefined ? { outletId } : {}),
        status: UserStatus.ACTIVE,
      },
      include: {
        outlet: true,
        employee: true,
      },
    });
  }

  // 3. Jika belum ada sama sekali, buat entitas user baru
  try {
    return await prisma.user.create({
      data: {
        clerkId,
        email,
        fullName,
        avatarUrl,
        role: role ?? UserRole.CASHIER,
        status: UserStatus.ACTIVE,
        outletId: outletId ?? null,
      },
      include: {
        outlet: true,
        employee: true,
      },
    });
  } catch (_error: unknown) {
    // Jika eksekusi paralel bersamaan, fallback ambil data yang baru saja dibuat
    const fallbackUser = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId }, { email }],
      },
      include: {
        outlet: true,
        employee: true,
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
      : (data.username ?? email.split("@")[0] ?? "Staff Kinclongin");

  const avatarUrl = data.image_url ?? null;

  const role = extractRoleFromMetadata(
    data.public_metadata as Record<string, unknown> | undefined
  );

  return await upsertUserSafely({
    clerkId,
    email,
    fullName,
    avatarUrl,
    role,
  });
}

/**
 * Melakukan sinkronisasi data user dari instance backend Clerk (currentUser) ke MySQL.
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
      : (user.username ?? email.split("@")[0] ?? "Staff Kinclongin");

  const avatarUrl = user.imageUrl ?? null;

  const role = extractRoleFromMetadata(
    user.publicMetadata as Record<string, unknown> | undefined
  );

  return await upsertUserSafely({
    clerkId,
    email,
    fullName,
    avatarUrl,
    role,
  });
}

/**
 * Menandai status user menjadi INACTIVE saat menerima event user.deleted dari Clerk.
 */
export async function deactivateClerkUserInDatabase(clerkId: string) {
  return await prisma.user.updateMany({
    where: { clerkId },
    data: {
      status: UserStatus.INACTIVE,
    },
  });
}

/**
 * Sinkronisasi data Organisasi Clerk ke model Outlet di database.
 */
export async function syncClerkOrganizationToDatabase(data: {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
}) {
  const clerkOrgId = data.id;
  const name = data.name;
  const slug = data.slug || `outlet-${clerkOrgId.slice(-6).toLowerCase()}`;
  const logoUrl = data.image_url ?? null;

  // Trial 14 hari default untuk outlet baru
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  return await prisma.outlet.upsert({
    where: { clerkOrgId },
    create: {
      clerkOrgId,
      name,
      slug,
      logoUrl,
      address: "Alamat belum diatur",
      phone: "-",
      subscriptionStatus: "TRIAL",
      trialEndsAt,
      subscriptionExpiresAt: trialEndsAt,
      isActive: true,
    },
    update: {
      name,
      slug,
      logoUrl,
    },
  });
}

/**
 * Menandai status outlet menjadi non-aktif saat organization.deleted diterima.
 */
export async function deactivateClerkOrganizationInDatabase(
  clerkOrgId: string
) {
  return await prisma.outlet.updateMany({
    where: { clerkOrgId },
    data: {
      isActive: false,
    },
  });
}

/**
 * Sinkronisasi keanggotaan pengguna di organisasi (Cabang Outlet & Peran).
 */
export async function syncOrganizationMembershipToDatabase(data: {
  organization: { id: string };
  public_user_data: { user_id: string };
  role: string;
}) {
  const clerkOrgId = data.organization.id;
  const clerkUserId = data.public_user_data.user_id;
  const orgRole = data.role;

  // Cari outlet di DB
  const outlet = await prisma.outlet.findUnique({
    where: { clerkOrgId },
  });

  if (!outlet) {
    console.warn(`[Org Sync] Outlet with clerkOrgId ${clerkOrgId} not found`);
    return null;
  }

  const role = extractRoleFromMetadata(null, orgRole);

  return await prisma.user.updateMany({
    where: { clerkId: clerkUserId },
    data: {
      outletId: outlet.id,
      role,
    },
  });
}

/**
 * Menghapus keterikatan outlet saat keanggotaan dihapus.
 */
export async function removeOrganizationMembershipFromDatabase(data: {
  organization: { id: string };
  public_user_data: { user_id: string };
}) {
  const clerkOrgId = data.organization.id;
  const clerkUserId = data.public_user_data.user_id;

  const outlet = await prisma.outlet.findUnique({
    where: { clerkOrgId },
  });

  if (!outlet) return null;

  return await prisma.user.updateMany({
    where: { clerkId: clerkUserId, outletId: outlet.id },
    data: {
      outletId: null,
    },
  });
}

/**
 * Helper untuk mengambil record user aktif dari database MySQL.
 * Dibungkus dengan React cache() agar eksekusi paralel pada Server Components di-memoize per-request.
 */
export const getCurrentUser = cache(async () => {
  const { userId, orgId } = await auth();

  if (!userId) {
    return null;
  }

  let dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      outlet: true,
      employee: true,
    },
  });

  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }
    dbUser = await syncClerkBackendUserToDatabase(clerkUser);
  }

  // Jika pengguna memiliki active organization di Clerk, sinkronkan langsung ke outlet di DB
  if (orgId && dbUser && dbUser.outlet?.clerkOrgId !== orgId) {
    let outlet = await prisma.outlet.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!outlet) {
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      outlet = await prisma.outlet.create({
        data: {
          clerkOrgId: orgId,
          name: "Cabang Baru",
          slug: `outlet-${orgId.slice(-6).toLowerCase()}`,
          address: "Alamat belum diatur",
          phone: "-",
          subscriptionStatus: "TRIAL",
          trialEndsAt,
          subscriptionExpiresAt: trialEndsAt,
          isActive: true,
        },
      });
    }

    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        outletId: outlet.id,
        role: UserRole.OWNER,
      },
      include: {
        outlet: true,
        employee: true,
      },
    });
  }

  return dbUser;
});
