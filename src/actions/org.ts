"use server";

import { revalidatePath } from "next/cache";

import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const createBranchMemberSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password sementara minimal 6 karakter"),
  role: z.enum(["CASHIER", "MANAGER", "WASHER"]),
  phone: z.string().optional(),
  pinCode: z
    .string()
    .regex(/^\d{4}$/, "PIN harus tepat 4 angka")
    .optional(),
  commissionRate: z.number().min(0).optional(),
});

export type CreateBranchMemberInput = z.infer<typeof createBranchMemberSchema>;

/**
 * Pendaftaran staf (Kasir, Manager, atau Tukang Cuci) langsung oleh Owner/Admin
 * tanpa proses undangan email berbelit.
 */
export async function createBranchMemberAction(
  input: CreateBranchMemberInput
): Promise<ActionResponse<{ userId: string; employeeId?: string }>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (
      currentUser.role !== UserRole.OWNER &&
      currentUser.role !== UserRole.MANAGER
    ) {
      return {
        success: false,
        error: "Hanya Owner atau Manajer yang dapat menambah staf cabang.",
      };
    }

    const outletId = currentUser.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang outlet aktif tidak ditemukan." };
    }

    const parsed = createBranchMemberSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi formulir pendaftaran staf gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { fullName, email, password, role, phone, pinCode, commissionRate } =
      parsed.data;

    // Ambil data outlet
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      return {
        success: false,
        error: "Data outlet tidak ditemukan di database.",
      };
    }

    // 1. Buat akun di Clerk Backend
    const client = await clerkClient();
    const clerkOrgRole = role === "MANAGER" ? "org:admin" : "org:member";

    let clerkUser;
    try {
      clerkUser = await client.users.createUser({
        emailAddress: [email],
        password,
        firstName: fullName,
        publicMetadata: {
          role,
          outletId,
        },
      });
    } catch (clerkErr) {
      console.error("Gagal membuat user di Clerk:", clerkErr);
      return {
        success: false,
        error:
          clerkErr instanceof Error
            ? clerkErr.message
            : "Gagal mendaftarkan akun di Clerk.",
      };
    }

    // 2. Tambahkan ke Clerk Organization cabang
    try {
      await client.organizations.createOrganizationMembership({
        organizationId: outlet.clerkOrgId,
        userId: clerkUser.id,
        role: clerkOrgRole,
      });
    } catch (membershipErr) {
      console.warn(
        "Gagal menambahkan membership organisasi Clerk:",
        membershipErr
      );
    }

    // 3. Simpan ke Database Prisma (User & Employee)
    const prismaRole =
      role === "MANAGER"
        ? UserRole.MANAGER
        : role === "WASHER"
          ? UserRole.WASHER
          : UserRole.CASHIER;

    const dbUser = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        fullName,
        role: prismaRole,
        outletId,
      },
    });

    let employeeId: string | undefined;

    // Jika pekerja adalah Washer atau Kasir, buat profil Employee
    if (role === "WASHER" || role === "CASHIER") {
      const employee = await prisma.employee.create({
        data: {
          outletId,
          userId: dbUser.id,
          fullName,
          phone: phone || null,
          pinCode: pinCode || null,
          role: prismaRole,
          commissionRate: commissionRate ?? (role === "WASHER" ? 10000 : 0),
          isActive: true,
        },
      });
      employeeId = employee.id;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard/analytics/payroll");

    return {
      success: true,
      data: {
        userId: dbUser.id,
        employeeId,
      },
    };
  } catch (error) {
    console.error("Gagal mendaftarkan anggota cabang:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Terjadi kesalahan internal.",
    };
  }
}

/**
 * Mengambil daftar staf pada cabang aktif
 */
export async function getBranchMembersAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      fullName: string;
      email: string;
      role: UserRole;
      createdAt: Date;
      employee?: {
        id: string;
        pinCode: string | null;
        commissionRate: number;
        isActive: boolean;
      } | null;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.outletId) {
      return { success: false, error: "Sesi tidak valid." };
    }

    const members = await prisma.user.findMany({
      where: { outletId: user.outletId },
      include: {
        employee: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        role: m.role,
        createdAt: m.createdAt,
        employee: m.employee
          ? {
              id: m.employee.id,
              pinCode: m.employee.pinCode,
              commissionRate: Number(m.employee.commissionRate),
              isActive: m.employee.isActive,
            }
          : null,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memuat staf cabang.",
    };
  }
}
