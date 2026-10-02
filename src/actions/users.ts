"use server";

import { revalidatePath } from "next/cache";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export interface UserAccountItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  outletId: string | null;
  createdAt: Date;
  employee: {
    id: string;
    phone: string | null;
    pinCode: string | null;
    commissionRate: number;
    isActive: boolean;
    assignedTicketsCount: number;
  } | null;
  stats: {
    createdTicketsCount: number;
    handledPaymentsCount: number;
  };
}

// -------------------------------------------------------------
// SCHEMAS
// -------------------------------------------------------------

const createAccountSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["OWNER", "MANAGER", "CASHIER", "WASHER"]),
  status: z
    .enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
    .optional()
    .default("ACTIVE"),
  phone: z.string().optional(),
  pinCode: z
    .string()
    .regex(/^\d{4}$/, "PIN harus tepat 4 angka")
    .optional()
    .or(z.literal("")),
  commissionRate: z.number().min(0).optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  role: z.enum(["OWNER", "MANAGER", "CASHIER", "WASHER"]),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

const updateUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

const updateUserDetailsSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().optional().nullable(),
  pinCode: z
    .string()
    .regex(/^\d{4}$/, "PIN harus tepat 4 angka")
    .optional()
    .nullable()
    .or(z.literal("")),
  commissionRate: z.number().min(0).optional().nullable(),
});

export type UpdateUserDetailsInput = z.infer<typeof updateUserDetailsSchema>;

const resetUserPasswordSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

const deleteUserSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

// -------------------------------------------------------------
// ACTIONS
// -------------------------------------------------------------

/**
 * Mengambil daftar pengguna cabang aktif lengkap dengan data employee dan statistik
 */
export async function getUsersAction(
  customOutletId?: string
): Promise<ActionResponse<UserAccountItem[]>> {
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer yang memiliki akses ke modul manajemen akun.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    // Manajer hanya boleh melihat cabang miliknya, sedangkan Owner dapat memilih cabang
    const targetOutletId = isOwner
      ? customOutletId || currentUser.outletId
      : currentUser.outletId;

    if (!targetOutletId) {
      return { success: false, error: "Cabang outlet aktif tidak ditemukan." };
    }

    const users = await prisma.user.findMany({
      where: isOwner
        ? {
            OR: [
              { outletId: targetOutletId },
              // Jika owner, sertakan juga owner akun cabang
              { ownedOutlets: { some: { id: targetOutletId } } },
            ],
          }
        : {
            // Manajer: HANYA melihat user yang terdaftar pada outlet cabang yang sama
            outletId: targetOutletId,
          },
      include: {
        employee: {
          include: {
            _count: {
              select: { assignedTickets: true },
            },
          },
        },
        _count: {
          select: {
            createdTickets: true,
            handledPayments: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    });

    const result: UserAccountItem[] = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      outletId: u.outletId,
      createdAt: u.createdAt,
      employee: u.employee
        ? {
            id: u.employee.id,
            phone: u.employee.phone,
            pinCode: u.employee.pinCode,
            commissionRate: Number(u.employee.commissionRate),
            isActive: u.employee.isActive,
            assignedTicketsCount: u.employee._count.assignedTickets,
          }
        : null,
      stats: {
        createdTicketsCount: u._count.createdTickets,
        handledPaymentsCount: u._count.handledPayments,
      },
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Gagal mengambil daftar pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memuat data pengguna.",
    };
  }
}

/**
 * Pembuatan Akun Baru (Kasir, Manajer, Washer, atau Owner)
 */
export async function createAccountAction(
  input: CreateAccountInput
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer Cabang yang berhak membuat akun pengguna.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    const outletId = currentUser.outletId;
    if (!outletId) {
      return { success: false, error: "Cabang outlet aktif tidak ditemukan." };
    }

    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi data akun baru gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      fullName,
      email,
      password,
      role,
      status,
      phone,
      pinCode,
      commissionRate,
    } = parsed.data;

    // Batasan Keamanan: Manajer DILARANG membuat akun OWNER
    if (!isOwner && role === "OWNER") {
      return {
        success: false,
        error:
          "Manajer cabang tidak berhak membuat akun dengan peran Pemilik (Owner).",
      };
    }

    // Cek apakah email sudah terdaftar
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return {
        success: false,
        error: "Email sudah terdaftar pada sistem.",
      };
    }

    // Jika ada PIN Kiosk (untuk Washer atau Kasir), pastikan tidak duplikat di cabang ini
    if (pinCode) {
      const existingPin = await prisma.employee.findFirst({
        where: {
          outletId,
          pinCode,
          isActive: true,
        },
      });

      if (existingPin) {
        return {
          success: false,
          error: `PIN "${pinCode}" sudah digunakan oleh staf lain (${existingPin.fullName}) di cabang ini. Silakan gunakan 4 digit lain.`,
        };
      }
    }

    // Hash kata sandi akun
    const passwordHash = await bcrypt.hash(password, 10);

    const prismaRole =
      role === "OWNER"
        ? UserRole.OWNER
        : role === "MANAGER"
          ? UserRole.MANAGER
          : role === "WASHER"
            ? UserRole.WASHER
            : UserRole.CASHIER;

    const prismaStatus =
      status === "SUSPENDED"
        ? UserStatus.SUSPENDED
        : status === "INACTIVE"
          ? UserStatus.INACTIVE
          : UserStatus.ACTIVE;

    // Buat User di database
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName,
        role: prismaRole,
        status: prismaStatus,
        outletId,
      },
    });

    let employeeId: string | undefined;

    // Buat profil Employee untuk Washer, Kasir, atau jika no. HP / PIN diisi
    if (
      role === "WASHER" ||
      role === "CASHIER" ||
      role === "MANAGER" ||
      phone ||
      pinCode
    ) {
      const employee = await prisma.employee.create({
        data: {
          outletId,
          userId: newUser.id,
          fullName,
          phone: phone || null,
          pinCode: pinCode || null,
          role: prismaRole,
          commissionRate: commissionRate ?? (role === "WASHER" ? 10000 : 0),
          isActive: prismaStatus === UserStatus.ACTIVE,
        },
      });
      employeeId = employee.id;
    }

    revalidatePath("/dashboard/pengguna");
    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        userId: newUser.id,
        employeeId,
      },
    };
  } catch (error) {
    console.error("Gagal membuat akun pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Terjadi kesalahan sistem.",
    };
  }
}

/**
 * Ubah Role / Peran Pengguna
 */
export async function updateUserRoleAction(
  input: UpdateUserRoleInput
): Promise<ActionResponse<{ userId: string; newRole: UserRole }>> {
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer yang dapat mengubah peran pengguna.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    const parsed = updateUserRoleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Data perubahan peran tidak valid." };
    }

    const { userId, role } = parsed.data;

    // Tidak boleh mengubah peran diri sendiri (mencegah lockout)
    if (currentUser.id === userId) {
      return {
        success: false,
        error: "Anda tidak dapat mengubah peran akun Anda sendiri.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!targetUser) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    // Batasan untuk Manajer:
    if (!isOwner) {
      // 1. Harus berada di cabang yang sama
      if (targetUser.outletId !== currentUser.outletId) {
        return {
          success: false,
          error:
            "Anda hanya memiliki wewenang untuk staf di cabang Anda sendiri.",
        };
      }
      // 2. Tidak boleh mengubah peran akun OWNER
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat mengubah peran akun Owner.",
        };
      }
      // 3. Tidak boleh mengubah peran sesama MANAGER
      if (targetUser.role === UserRole.MANAGER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat mengubah peran sesama Manajer.",
        };
      }
      // 4. Tidak boleh mempromosikan menjadi OWNER
      if (role === "OWNER") {
        return {
          success: false,
          error: "Manajer cabang tidak dapat menetapkan peran Owner.",
        };
      }
    } else {
      // Owner tidak boleh mengubah peran akun OWNER
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Hanya Owner utama yang dapat mengelola sesama akun Owner.",
        };
      }
    }

    const newPrismaRole =
      role === "OWNER"
        ? UserRole.OWNER
        : role === "MANAGER"
          ? UserRole.MANAGER
          : role === "WASHER"
            ? UserRole.WASHER
            : UserRole.CASHIER;

    // Update User
    await prisma.user.update({
      where: { id: userId },
      data: { role: newPrismaRole },
    });

    // Update Employee jika ada, atau buat jika beralih ke WASHER
    if (targetUser.employee) {
      await prisma.employee.update({
        where: { id: targetUser.employee.id },
        data: { role: newPrismaRole },
      });
    } else if (newPrismaRole === UserRole.WASHER && targetUser.outletId) {
      await prisma.employee.create({
        data: {
          outletId: targetUser.outletId,
          userId: targetUser.id,
          fullName: targetUser.fullName,
          role: UserRole.WASHER,
          commissionRate: 10000,
          isActive: targetUser.status === UserStatus.ACTIVE,
        },
      });
    }

    revalidatePath("/dashboard/pengguna");
    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { userId, newRole: newPrismaRole },
    };
  } catch (error) {
    console.error("Gagal mengubah peran pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengubah peran akun.",
    };
  }
}

/**
 * Ubah Status Akun (ACTIVE, INACTIVE, SUSPENDED)
 */
export async function updateUserStatusAction(
  input: UpdateUserStatusInput
): Promise<ActionResponse<{ userId: string; newStatus: UserStatus }>> {
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer yang dapat mengubah status akun.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    const parsed = updateUserStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Data status tidak valid." };
    }

    const { userId, status } = parsed.data;

    // Tidak boleh menonaktifkan akun sendiri
    if (currentUser.id === userId) {
      return {
        success: false,
        error: "Anda tidak dapat mengubah status akun Anda sendiri.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    // Batasan untuk Manajer:
    if (!isOwner) {
      if (targetUser.outletId !== currentUser.outletId) {
        return {
          success: false,
          error:
            "Anda hanya memiliki wewenang untuk staf di cabang Anda sendiri.",
        };
      }
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat mengubah status akun Owner.",
        };
      }
      if (targetUser.role === UserRole.MANAGER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat mengubah status sesama Manajer.",
        };
      }
    } else {
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Akun Pemilik (Owner) tidak dapat dinonaktifkan.",
        };
      }
    }

    const newPrismaStatus =
      status === "SUSPENDED"
        ? UserStatus.SUSPENDED
        : status === "INACTIVE"
          ? UserStatus.INACTIVE
          : UserStatus.ACTIVE;

    await prisma.user.update({
      where: { id: userId },
      data: { status: newPrismaStatus },
    });

    // Sinkronkan status aktif pada profil Employee jika ada
    await prisma.employee.updateMany({
      where: { userId },
      data: { isActive: newPrismaStatus === UserStatus.ACTIVE },
    });

    revalidatePath("/dashboard/pengguna");
    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { userId, newStatus: newPrismaStatus },
    };
  } catch (error) {
    console.error("Gagal mengubah status pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengubah status akun.",
    };
  }
}

/**
 * Ubah Detail Profil, Nomor Telepon, PIN Kiosk, dan Komisi Staf
 */
export async function updateUserDetailsAction(
  input: UpdateUserDetailsInput
): Promise<ActionResponse<{ userId: string }>> {
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer yang dapat mengubah data akun.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    const parsed = updateUserDetailsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi data gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { userId, fullName, email, phone, pinCode, commissionRate } =
      parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!targetUser) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    // Batasan untuk Manajer:
    if (!isOwner) {
      if (targetUser.outletId !== currentUser.outletId) {
        return {
          success: false,
          error:
            "Anda hanya memiliki wewenang untuk staf di cabang Anda sendiri.",
        };
      }
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat mengubah data akun Owner.",
        };
      }
      if (
        targetUser.role === UserRole.MANAGER &&
        targetUser.id !== currentUser.id
      ) {
        return {
          success: false,
          error:
            "Manajer cabang tidak dapat mengubah data profil sesama Manajer.",
        };
      }
    }

    // Jika email diubah, pastikan tidak bentrok dengan user lain
    if (email.toLowerCase().trim() !== targetUser.email.toLowerCase().trim()) {
      const emailClash = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailClash) {
        return {
          success: false,
          error: "Email baru sudah digunakan oleh akun lain.",
        };
      }
    }

    // Jika PIN Kiosk diubah, pastikan tidak bentrok dengan karyawan aktif lain
    if (pinCode && targetUser.outletId) {
      const pinClash = await prisma.employee.findFirst({
        where: {
          outletId: targetUser.outletId,
          pinCode,
          isActive: true,
          userId: { not: userId },
        },
      });

      if (pinClash) {
        return {
          success: false,
          error: `PIN "${pinCode}" sudah digunakan oleh ${pinClash.fullName} di cabang ini.`,
        };
      }
    }

    // Update data User
    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        email: email.toLowerCase().trim(),
      },
    });

    // Update atau upsert Employee record
    if (targetUser.employee) {
      await prisma.employee.update({
        where: { id: targetUser.employee.id },
        data: {
          fullName,
          phone: phone || null,
          pinCode: pinCode || null,
          commissionRate:
            commissionRate !== undefined && commissionRate !== null
              ? commissionRate
              : targetUser.employee.commissionRate,
        },
      });
    } else if (targetUser.outletId && (phone || pinCode)) {
      await prisma.employee.create({
        data: {
          outletId: targetUser.outletId,
          userId: targetUser.id,
          fullName,
          phone: phone || null,
          pinCode: pinCode || null,
          role: targetUser.role,
          commissionRate: commissionRate ?? 10000,
          isActive: targetUser.status === UserStatus.ACTIVE,
        },
      });
    }

    revalidatePath("/dashboard/pengguna");
    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { userId },
    };
  } catch (error) {
    console.error("Gagal memperbarui data pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui profil.",
    };
  }
}

/**
 * Reset Kata Sandi Akun Pengguna oleh Owner/Manajer
 */
export async function resetUserPasswordAction(
  input: ResetUserPasswordInput
): Promise<ActionResponse<{ userId: string }>> {
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer yang dapat mereset kata sandi akun.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    const parsed = resetUserPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Kata sandi baru minimal 6 karakter.",
      };
    }

    const { userId, newPassword } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    // Batasan untuk Manajer:
    if (!isOwner) {
      if (targetUser.outletId !== currentUser.outletId) {
        return {
          success: false,
          error:
            "Anda hanya memiliki wewenang untuk staf di cabang Anda sendiri.",
        };
      }
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat mereset kata sandi akun Owner.",
        };
      }
      if (
        targetUser.role === UserRole.MANAGER &&
        targetUser.id !== currentUser.id
      ) {
        return {
          success: false,
          error:
            "Manajer cabang tidak dapat mereset kata sandi sesama Manajer.",
        };
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return {
      success: true,
      data: { userId },
    };
  } catch (error) {
    console.error("Gagal mereset kata sandi pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mereset kata sandi.",
    };
  }
}

/**
 * Hapus Akun Pengguna (Hanya jika belum memiliki relasi transaksi audit ketat)
 */
export async function deleteUserAction(
  input: DeleteUserInput
): Promise<ActionResponse<{ userId: string }>> {
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
        error:
          "Hanya Pemilik Bisnis (Owner) dan Manajer yang memiliki izin menghapus akun.",
      };
    }

    const isOwner = currentUser.role === UserRole.OWNER;
    const parsed = deleteUserSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Parameter tidak valid." };
    }

    const { userId } = parsed.data;

    // Dilarang menghapus akun sendiri
    if (currentUser.id === userId) {
      return {
        success: false,
        error: "Anda tidak dapat menghapus akun Anda sendiri.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: {
            _count: {
              select: { assignedTickets: true },
            },
          },
        },
        _count: {
          select: {
            createdTickets: true,
            handledPayments: true,
          },
        },
      },
    });

    if (!targetUser) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    // Batasan untuk Manajer:
    if (!isOwner) {
      if (targetUser.outletId !== currentUser.outletId) {
        return {
          success: false,
          error:
            "Anda hanya memiliki wewenang untuk staf di cabang Anda sendiri.",
        };
      }
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Akun Pemilik (Owner) tidak dapat dihapus.",
        };
      }
      if (targetUser.role === UserRole.MANAGER) {
        return {
          success: false,
          error: "Manajer cabang tidak dapat menghapus akun sesama Manajer.",
        };
      }
    } else {
      // Tidak boleh menghapus akun OWNER
      if (targetUser.role === UserRole.OWNER) {
        return {
          success: false,
          error: "Akun Pemilik (Owner) tidak dapat dihapus dari sistem.",
        };
      }
    }

    // Integritas audit: Cek apakah user memiliki riwayat tiket atau pembayaran
    const ticketsCreated = targetUser._count.createdTickets;
    const paymentsHandled = targetUser._count.handledPayments;
    const washAssigned = targetUser.employee?._count.assignedTickets || 0;

    if (ticketsCreated > 0 || paymentsHandled > 0 || washAssigned > 0) {
      return {
        success: false,
        error: `Akun ${targetUser.fullName} memiliki riwayat operasional (${ticketsCreated} tiket dibuat, ${paymentsHandled} transaksi kasir, ${washAssigned} pengerjaan cuci). Demi integritas pembukuan dan audit finansial, akun ini tidak boleh dihapus permanen. Silakan ubah status akun menjadi "NONAKTIF" atau "DITANGGUHKAN".`,
      };
    }

    // Hapus relasi employee jika ada
    if (targetUser.employee) {
      await prisma.employee.delete({
        where: { id: targetUser.employee.id },
      });
    }

    // Hapus akun user
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/dashboard/pengguna");
    revalidatePath("/dashboard/komisi");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { userId },
    };
  } catch (error) {
    console.error("Gagal menghapus akun pengguna:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghapus akun sistem.",
    };
  }
}
