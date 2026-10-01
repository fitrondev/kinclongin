"use server";

import bcrypt from "bcryptjs";
import slugify from "slugify";
import { z } from "zod";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const registerOwnerSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  outletName: z.string().min(2, "Nama cabang minimal 2 karakter"),
  outletAddress: z.string().min(3, "Alamat cabang minimal 3 karakter"),
  outletPhone: z.string().min(5, "Nomor telepon cabang minimal 5 karakter"),
});

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;

/**
 * Pendaftaran akun Pemilik (Owner) dan Cabang Pertama Kinclongin
 */
export async function registerOwnerAction(
  input: RegisterOwnerInput
): Promise<ActionResponse<{ userId: string; outletId: string }>> {
  try {
    const parsed = registerOwnerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi data pendaftaran gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      fullName,
      email,
      password,
      outletName,
      outletAddress,
      outletPhone,
    } = parsed.data;

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Email sudah terdaftar. Silakan gunakan email lain atau masuk.",
      };
    }

    // Hash password dengan bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique slug untuk cabang
    let baseSlug = slugify(outletName, { lower: true, strict: true });
    if (!baseSlug) baseSlug = `outlet-${Date.now().toString().slice(-4)}`;

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.outlet.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Buat User dan Outlet dalam transaksi database terisolasi
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            fullName,
            role: UserRole.OWNER,
            status: UserStatus.ACTIVE,
          },
        });

        const outlet = await tx.outlet.create({
          data: {
            name: outletName,
            slug,
            address: outletAddress,
            phone: outletPhone,
            ownerId: user.id,
            isActive: true,
          },
        });

        // Tautkan outletId aktif ke user
        await tx.user.update({
          where: { id: user.id },
          data: { outletId: outlet.id },
        });

        return { user, outlet };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    return {
      success: true,
      data: {
        userId: result.user.id,
        outletId: result.outlet.id,
      },
    };
  } catch (error) {
    console.error("[Register Error]:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mendaftarkan akun.",
    };
  }
}
