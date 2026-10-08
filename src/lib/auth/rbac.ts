import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import type { Roles } from "@/types/globals";

export { getCurrentUser } from "@/lib/auth/session";

/**
 * Matriks Hak Akses Granular untuk 4 Role Utama di Kinclongin POS.
 */
export const ROLE_PERMISSIONS = {
  SUPERADMIN: {
    canViewBusinessAnalytics: false, // Superadmin tidak mengelola performa cuci cabang
    canViewCashFlow: false,
    canManageUsers: false,
    canManageInventory: false,
    canViewPayroll: false,
    canDisburseCommissions: false,
    canOperatePOS: false,
    canOperateKiosk: false,
    canManageSubscriptions: true,
    canSwitchOutlet: false,
    canManageOutlets: false,
    canViewAuditLogs: true,
    canConfigureWhatsApp: false,
    canViewCustomers: false,
    canManageServices: false,
    canManageShifts: false,
    canViewCashierDashboard: false,
    canViewWasherDashboard: false,
    canAccessSuperadmin: true,
  },
  OWNER: {
    canViewBusinessAnalytics: true,
    canViewCashFlow: true, // Khusus Owner: Akses laporan arus kas & neraca pemasukan/pengeluaran
    canManageUsers: true,
    canManageInventory: true,
    canViewPayroll: true,
    canDisburseCommissions: true,
    canOperatePOS: true,
    canOperateKiosk: true,
    canManageSubscriptions: true,
    canSwitchOutlet: true,
    canManageOutlets: true, // Khusus Owner: Pengelolaan profil cabang & ekspansi outlet baru
    canViewAuditLogs: false, // Audit log sistem adalah hak eksklusif Superadmin platform
    canConfigureWhatsApp: true, // Khusus Owner: Konfigurasi API gateway WhatsApp
    canViewCustomers: true,
    canManageServices: true, // Master tarif & paket layanan cuci
    canManageShifts: true, // Penjadwalan & shift kerja staf
    canViewCashierDashboard: true,
    canViewWasherDashboard: false,
    canAccessSuperadmin: false, // Owner adalah tenant, bukan Superadmin platform provider
  },
  MANAGER: {
    canViewBusinessAnalytics: true,
    canViewCashFlow: false, // Dilarang melihat arus kas eksekutif
    canManageUsers: true, // Pengelolaan akun & role staf di cabang sendiri
    canManageInventory: true,
    canViewPayroll: true,
    canDisburseCommissions: true,
    canOperatePOS: true,
    canOperateKiosk: true,
    canManageSubscriptions: false,
    canSwitchOutlet: false,
    canManageOutlets: false,
    canViewAuditLogs: false,
    canConfigureWhatsApp: false,
    canViewCustomers: true,
    canManageServices: true, // Master tarif & paket layanan cuci
    canManageShifts: true, // Penjadwalan & shift kerja staf
    canViewCashierDashboard: true,
    canViewWasherDashboard: false,
    canAccessSuperadmin: false,
  },
  CASHIER: {
    canViewBusinessAnalytics: false, // Dilarang melihat omset dan profit margin
    canViewCashFlow: false,
    canViewCashierDashboard: true, // Dasbor shift, laci kasir, dan performa transaksi
    canManageUsers: false,
    canManageInventory: false,
    canViewPayroll: false,
    canDisburseCommissions: false,
    canOperatePOS: true,
    canOperateKiosk: true,
    canManageSubscriptions: false,
    canSwitchOutlet: false,
    canManageOutlets: false,
    canViewAuditLogs: false,
    canConfigureWhatsApp: false,
    canViewCustomers: false, // Hanya via pencarian POS
    canManageServices: false,
    canManageShifts: false,
    canViewWasherDashboard: false,
    canAccessSuperadmin: false,
  },
  WASHER: {
    canViewBusinessAnalytics: false,
    canViewCashFlow: false,
    canViewWasherDashboard: true, // Dashboard personal komisi dan unit diri sendiri
    canManageUsers: false,
    canManageInventory: false,
    canViewPayroll: false, // Tidak bisa melihat payroll global orang lain
    canDisburseCommissions: false,
    canOperatePOS: false, // Dilarang checkout dan input tiket baru kasir
    canOperateKiosk: true, // Kiosk pengerjaan cuci dengan PIN
    canManageSubscriptions: false,
    canSwitchOutlet: false,
    canManageOutlets: false,
    canViewAuditLogs: false,
    canConfigureWhatsApp: false,
    canViewCustomers: false,
    canManageServices: false,
    canManageShifts: false,
    canViewCashierDashboard: false,
    canAccessSuperadmin: false,
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

export function isSuperadmin(
  user?: { role?: string | null; email?: string | null } | null
): boolean {
  if (!user) return false;
  if (user.role?.toUpperCase() === "SUPERADMIN") return true;
  const masterEmails = ["admin@kinclongin.com", "superadmin@kinclongin.com"];
  if (user.email && masterEmails.includes(user.email.toLowerCase()))
    return true;
  return false;
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

/**
 * Guard proteksi rute platform Superadmin (/dashboard/admin/*).
 * Hanya dapat diakses oleh Superadmin platform atau master admin email.
 */
export async function requireSuperadminAuth(redirectTo = "/dashboard") {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!isSuperadmin(user)) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Memvalidasi kepemilikan dan hak akses pengguna terhadap suatu outlet (Proteksi IDOR).
 */
export function isAuthorizedForOutlet(
  user:
    | {
        role?: string | null;
        outletId?: string | null;
        ownedOutlets?: Array<{ id: string }>;
      }
    | null
    | undefined,
  targetOutletId: string
): boolean {
  if (!user || !targetOutletId) return false;
  if (user.role?.toUpperCase() === "SUPERADMIN") return true;
  if (user.outletId === targetOutletId) return true;
  if (user.ownedOutlets?.some((o) => o.id === targetOutletId)) return true;
  return false;
}
