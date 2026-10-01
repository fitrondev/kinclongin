import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import type { Roles } from "@/types/globals";

export { getCurrentUser } from "@/lib/auth/session";

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
 * Memeriksa role pengguna saat ini dari database user
 */
export async function checkRole(
  allowedRoles: Roles | Roles[]
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !user.role) return false;

  const userRole = user.role;
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const isAuthorized = await checkRole(allowedRoles);

  if (!isAuthorized) {
    redirect(redirectTo);
  }

  return {
    userId: user.id,
    role: user.role,
  };
}

/**
 * Guard Multi-Tenant Kinclongin (Manual Multi-Outlet Organisasi).
 * Memvalidasi sesi login, keberadaan organisasi aktif (cabang outlet), dan status outlet di database.
 */
export async function requireOrgAuth(options?: {
  allowedRoles?: Roles[];
  redirectToNoOrg?: string;
  redirectToNoAccess?: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.outlet) {
    redirect(options?.redirectToNoOrg ?? "/sign-in");
  }

  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    const isAuthorized = await checkRole(options.allowedRoles);
    if (!isAuthorized) {
      redirect(options?.redirectToNoAccess ?? "/");
    }
  }

  const outlet = user.outlet;

  return {
    userId: user.id,
    orgId: outlet.id,
    orgRole: user.role,
    orgSlug: outlet.slug,
    outlet,
    user,
  };
}
