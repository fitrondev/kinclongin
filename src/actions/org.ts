"use server";

import { revalidatePath } from "next/cache";

import bcrypt from "bcryptjs";
import slugify from "slugify";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
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
 * disimpan langsung ke database Prisma dengan hash password bcryptjs.
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

    // Hash password staf baru
    const passwordHash = await bcrypt.hash(password, 10);

    const prismaRole =
      role === "MANAGER"
        ? UserRole.MANAGER
        : role === "WASHER"
          ? UserRole.WASHER
          : UserRole.CASHIER;

    // Buat User di database
    const dbUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName,
        role: prismaRole,
        outletId,
      },
    });

    let employeeId: string | undefined;

    // Jika pekerja adalah Washer atau Kasir, buat profil Employee (untuk PIN Kiosk & komisi)
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

/**
 * Mengambil seluruh outlet yang dapat diakses oleh user saat ini
 * (Jika OWNER: semua cabang miliknya; Jika staf: cabang tempatnya bekerja)
 */
export async function getUserOutletsAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      slug: string;
      address: string;
      phone: string;
      isActive: boolean;
      isCurrent: boolean;
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    type OutletRecord = Awaited<
      ReturnType<typeof prisma.outlet.findMany>
    >[number];
    let outlets: OutletRecord[] = [];
    if (user.role === UserRole.OWNER) {
      outlets = await prisma.outlet.findMany({
        where: {
          OR: [{ ownerId: user.id }, { id: user.outletId ?? undefined }],
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    } else if (user.outletId) {
      outlets = await prisma.outlet.findMany({
        where: { id: user.outletId, isActive: true },
      });
    } else {
      outlets = [];
    }

    return {
      success: true,
      data: outlets.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        address: o.address,
        phone: o.phone,
        isActive: o.isActive,
        isCurrent: o.id === user.outletId,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar cabang.",
    };
  }
}

/**
 * Beralih cabang aktif (Active Outlet Switcher)
 */
export async function switchActiveOutletAction(
  outletId: string
): Promise<ActionResponse<{ currentOutletId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid." };
    }

    // Validasi apakah user memiliki akses ke cabang target
    const targetOutlet = await prisma.outlet.findFirst({
      where: {
        id: outletId,
        isActive: true,
        ...(user.role === UserRole.OWNER
          ? {
              OR: [{ ownerId: user.id }, { id: user.outletId ?? undefined }],
            }
          : { id: user.outletId ?? undefined }),
      },
    });

    if (!targetOutlet) {
      return {
        success: false,
        error: "Cabang tidak ditemukan atau Anda tidak memiliki akses.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { outletId: targetOutlet.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pos");
    revalidatePath("/pos/antrean");
    revalidatePath("/layar-cuci");

    return {
      success: true,
      data: { currentOutletId: targetOutlet.id },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal beralih cabang outlet.",
    };
  }
}

const createOutletSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter"),
  address: z.string().min(3, "Alamat cabang minimal 3 karakter"),
  phone: z.string().min(5, "Nomor telepon cabang minimal 5 karakter"),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;

/**
 * Membuat cabang outlet baru (khusus akun Owner)
 */
export async function createOutletAction(
  input: CreateOutletInput
): Promise<ActionResponse<{ outletId: string; slug: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Sesi berakhir. Silakan masuk kembali." };
    }

    if (user.role !== UserRole.OWNER) {
      return {
        success: false,
        error: "Hanya Owner yang dapat membuka cabang outlet baru.",
      };
    }

    const parsed = createOutletSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi formulir cabang gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, address, phone, logoUrl } = parsed.data;

    // Generate unique slug
    let baseSlug = slugify(name, { lower: true, strict: true });
    if (!baseSlug) baseSlug = `outlet-${Date.now().toString().slice(-4)}`;

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.outlet.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const outlet = await prisma.outlet.create({
      data: {
        name,
        slug,
        address,
        phone,
        logoUrl: logoUrl || null,
        ownerId: user.id,
        isActive: true,
      },
    });

    // Otomatis aktifkan cabang baru ini untuk user Owner
    await prisma.user.update({
      where: { id: user.id },
      data: { outletId: outlet.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pos");

    return {
      success: true,
      data: { outletId: outlet.id, slug: outlet.slug },
    };
  } catch (error) {
    console.error("Gagal membuat cabang baru:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membuat cabang baru.",
    };
  }
}
