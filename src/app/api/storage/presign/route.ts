import { NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  UploadCategory,
  getPresignedUploadUrl,
  validateFileConstraints,
} from "@/lib/storage/upload";

const presignSchema = z.object({
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

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Silakan masuk terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    // Rate limiting proteksi presign flooding (max 30 req/min)
    const rateCheck = checkRateLimit(`presign_api:${user.id}`, {
      intervalMs: 60_000,
      maxRequests: 30,
    });
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Terlalu banyak permintaan presign upload. Silakan tunggu 1 menit.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = presignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi parameter gagal.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { fileName, fileType, fileSize, category, outletId } = parsed.data;

    const validation = validateFileConstraints(
      category as UploadCategory,
      fileSize,
      fileType,
      fileName
    );
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    let ownerId = user.id;

    if (
      category === "LOGO" ||
      category === "PRODUCT" ||
      category === "INSPECTION"
    ) {
      const targetOutletId = outletId || user.outletId;
      if (!targetOutletId) {
        return NextResponse.json(
          {
            success: false,
            error: "ID Cabang Outlet wajib disertakan untuk kategori ini.",
          },
          { status: 400 }
        );
      }

      if (user.role !== "OWNER") {
        const outlet = await prisma.outlet.findFirst({
          where: { id: targetOutletId },
          select: { id: true },
        });

        if (!outlet) {
          return NextResponse.json(
            {
              success: false,
              error: "Akses ditolak atau Cabang Outlet tidak ditemukan.",
            },
            { status: 403 }
          );
        }
      }

      ownerId = targetOutletId;
    }

    const presigned = await getPresignedUploadUrl({
      fileName,
      fileType,
      fileSize,
      category: category as UploadCategory,
      ownerId,
    });

    return NextResponse.json({
      success: true,
      data: presigned,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server storage.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
