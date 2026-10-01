import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import type { Roles } from "@/types/globals";

export { getCurrentUser } from "@/lib/auth/session";

/**
 * Matriks Hak Akses Granular untuk 4 Role Utama di Kinclongin POS.
 */
export const ROLE_PERMISSIONS = {
  OWNER: {
    canViewBusinessAnalytics: true,
    canManageUsers: true,
    canManageInventory: true,
    canViewPayroll: true,
    canDisburseCommissions: true,
    canOperatePOS: true,
    canOperateKiosk: true,
    canManageSubscriptions: true,
    canSwitchOutlet: true,
    canViewCustomers: true,
  },
  MANAGER: {
    canViewBusinessAnalytics: true,
    canManageUsers: false, // Hanya Owner yang boleh mengelola akun & role pengguna
    canManageInventory: true,
    canViewPayroll: true,
    canDisburseCommissions: true,
    canOperatePOS: true,
    canOperateKiosk: true,
    canManageSubscriptions: false,
    canSwitchOutlet: false,
    canViewCustomers: true,
  },
  CASHIER: {
    canViewBusinessAnalytics: false, // Dilarang melihat omset dan profit margin
    canManageUsers: false,
    canManageInventory: false,
    canViewPayroll: false,
    canDisburseCommissions: false,
    canOperatePOS: true,
    canOperateKiosk: true,
    canManageSubscriptions: false,
    canSwitchOutlet: false,
    canViewCustomers: false, // Hanya via pencarian POS
  },
  WASHER: {
    canViewBusinessAnalytics: false,
    canViewWasherDashboard: true, // Dashboard personal komisi dan unit diri sendiri
    canManageUsers: false,
    canManageInventory: false,
    canViewPayroll: false, // Tidak bisa melihat payroll global orang lain
    canDisburseCommissions: false,
    canOperatePOS: false, // Dilarang checkout dan input tiket baru kasir
    canOperateKiosk: true, // Kiosk pengerjaan cuci dengan PIN
    canManageSubscriptions: false,
    canSwitchOutlet: false,
    canViewCustomers: false,
  },
} as const;

export type PermissionKey =
  keyof (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS];

/**
 * Memeriksa apakah suatu role memiliki permission tertentu.
 */
export function hasPermission(
  role: string | undefined | null,
  permission: PermissionKey
): boolean {
  if (!role) return false;
  const upperRole = role.toUpperCase() as keyof typeof ROLE_PERMISSIONS;
  const permissions = ROLE_PERMISSIONS[upperRole];
  if (!permissions) return false;
  return Boolean((permissions as Record<string, boolean>)[permission]);
}

export function isOwner(role?: string | null): boolean {
  return role?.toUpperCase() === "OWNER";
}

export function isManager(role?: string | null): boolean {
  return role?.toUpperCase() === "MANAGER";
}

export function isCashier(role?: string | null): boolean {
  return role?.toUpperCase() === "CASHIER";
}

export function isWasher(role?: string | null): boolean {
  return role?.toUpperCase() === "WASHER";
}

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
