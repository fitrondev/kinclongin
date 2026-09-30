import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";

import type { Roles } from "@/types/globals";

/**
 * Memeriksa apakah role berstatus Admin / Superadmin
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
}

/**
 * Memeriksa role pengguna saat ini dari claims session token Clerk
 */
export async function checkRole(
  allowedRoles: Roles | Roles[]
): Promise<boolean> {
  const { sessionClaims } = await auth();
  const userRole = sessionClaims?.metadata?.role;

  if (!userRole) return false;

  const targetRoles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  return targetRoles.some((target) => {
    if (isAdminRole(target)) {
      return isAdminRole(userRole);
    }
    return target.toLowerCase() === userRole.toLowerCase();
  });
}

/**
 * Guard untuk Server Components / Server Actions.
 * Mengalihkan (redirect) jika pengguna tidak memiliki role yang diizinkan.
 */
export async function requireRole(
  allowedRoles: Roles | Roles[],
  redirectTo = "/"
): Promise<{ userId: string; role?: Roles }> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const isAuthorized = await checkRole(allowedRoles);

  if (!isAuthorized) {
    redirect(redirectTo);
  }

  return {
    userId,
    role: sessionClaims?.metadata?.role,
  };
}
