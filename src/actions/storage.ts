"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  PresignedUploadResult,
  UploadCategory,
  getPresignedUploadUrl,
  validateFileConstraints,
} from "@/lib/storage/upload";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const presignInputSchema = z.object({
  fileName: z.string().min(1, "Nama file wajib diisi."),
  fileType: z.string().min(1, "Tipe MIME file wajib diisi."),
  fileSize: z.number().positive("Ukuran file harus lebih dari 0."),
  category: z.enum([
    "INSPECTION",
    "PAYMENT_PROOF",
    "LOGO",
    "PRODUCT",
    "AVATAR",
  ] as const),
  outletId: z.string().optional(),
});

export type GetPresignedUploadUrlInput = z.infer<typeof presignInputSchema>;

export async function getPresignedUploadUrlAction(
  input: GetPresignedUploadUrlInput
): Promise<ActionResponse<PresignedUploadResult>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized. Silakan masuk terlebih dahulu.",
      };
    }

    const rateCheck = checkRateLimit(`presign_action:${user.id}`, {
      intervalMs: 60_000,
      maxRequests: 30,
    });
    if (!rateCheck.success) {
      return {
        success: false,
        error: "Terlalu banyak permintaan upload. Silakan tunggu 1 menit.",
      };
    }

    const parsed = presignInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validasi parameter gagal.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { fileName, fileType, fileSize, category, outletId } = parsed.data;

    const validation = validateFileConstraints(
      category as UploadCategory,
      fileSize,
      fileType,
      fileName
    );
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    let targetOwnerId = user.id;

    if (
      category === "LOGO" ||
      category === "PRODUCT" ||
      category === "INSPECTION"
    ) {
      const targetOutletId = outletId || user.outletId;
      if (!targetOutletId) {
        return {
          success: false,
          error: "ID Outlet Cabang wajib disertakan untuk kategori ini.",
        };
      }

      // Validasi hak akses jika bukan Superadmin/Owner
      if (user.role !== "OWNER") {
        const outlet = await prisma.outlet.findFirst({
          where: { id: targetOutletId },
          select: { id: true },
        });

        if (!outlet) {
          return {
            success: false,
            error: "Akses ditolak atau Cabang Outlet tidak ditemukan.",
          };
        }
      }

      targetOwnerId = targetOutletId;
    }

    const presigned = await getPresignedUploadUrl({
      fileName,
      fileType,
      fileSize,
      category: category as UploadCategory,
      ownerId: targetOwnerId,
    });

    return {
      success: true,
      data: presigned,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server storage.";
    return {
      success: false,
      error: message,
    };
  }
}
