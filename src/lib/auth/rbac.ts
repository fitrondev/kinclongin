import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db/prisma";
import type { Roles } from "@/types/globals";

/**
 * Memeriksa apakah role berstatus Admin / Superadmin / Owner
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().replace("org:", "");
  return (
    normalized === "admin" ||
    normalized === "superadmin" ||
    normalized === "owner"
  );
}

/**
 * Memeriksa role pengguna saat ini dari claims session token Clerk atau orgRole
 */
export async function checkRole(
  allowedRoles: Roles | Roles[]
): Promise<boolean> {
  const { sessionClaims, orgRole } = await auth();
  const userRole = sessionClaims?.metadata?.role || orgRole;

  if (!userRole) return false;

  const targetRoles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  return targetRoles.some((target) => {
    const normTarget = target.toLowerCase().replace("org:", "");
    const normUser = userRole.toLowerCase().replace("org:", "");
    if (isAdminRole(normTarget) && isAdminRole(normUser)) {
      return true;
    }
    return normTarget === normUser;
  });
}

/**
 * Guard untuk Server Components / Server Actions.
 * Mengalihkan (redirect) jika pengguna tidak memiliki role yang diizinkan.
 */
export async function requireRole(
  allowedRoles: Roles | Roles[],
  redirectTo = "/sign-in"
): Promise<{ userId: string; role?: string }> {
  const { userId, sessionClaims, orgRole } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const isAuthorized = await checkRole(allowedRoles);

  if (!isAuthorized) {
    redirect(redirectTo);
  }

  return {
    userId,
    role: sessionClaims?.metadata?.role || orgRole,
  };
}

/**
 * Guard Multi-Tenant B2B Kinclongin (Clerk Organizations).
 * Memvalidasi sesi login, keberadaan organisasi aktif (cabang outlet), dan status outlet di database.
 */
export async function requireOrgAuth(options?: {
  allowedRoles?: Roles[];
  redirectToNoOrg?: string;
  redirectToNoAccess?: string;
}) {
  const { userId, orgId, orgRole, orgSlug } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect(options?.redirectToNoOrg ?? "/choose-organization");
  }

  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    const isAuthorized = await checkRole(options.allowedRoles);
    if (!isAuthorized) {
      redirect(options?.redirectToNoAccess ?? "/");
    }
  }

  // Cari outlet cabang yang terhubung dengan Clerk Organization
  const outlet = await prisma.outlet.findUnique({
    where: { clerkOrgId: orgId },
  });

  return {
    userId,
    orgId,
    orgRole,
    orgSlug,
    outlet,
  };
}
