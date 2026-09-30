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
    "RESUME",
    "LOGO",
    "AVATAR",
    "VERIFICATION",
    "BLOG",
  ] as const),
  companyId: z.string().optional(),
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

    // SEC-04: Rate limiting proteksi presign flooding (max 20 req/min)
    const rateCheck = checkRateLimit(`presign_api:${user.id}`, {
      intervalMs: 60_000,
      maxRequests: 20,
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

    const { fileName, fileType, fileSize, category, companyId } = parsed.data;

    const validation = validateFileConstraints(
      category,
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

    // SEC-03: Validasi relasi kepemilikan perusahaan untuk mencegah IDOR
    let ownerId = user.id;
    if (category === "LOGO" || category === "VERIFICATION") {
      const targetCompanyId = companyId || user.company?.id;
      if (!targetCompanyId) {
        return NextResponse.json(
          {
            success: false,
            error: "ID Perusahaan wajib disertakan untuk kategori ini.",
          },
          { status: 400 }
        );
      }

      if (user.role !== "SUPERADMIN") {
        const ownedCompany = await prisma.company.findFirst({
          where: { id: targetCompanyId, userId: user.id },
          select: { id: true },
        });

        if (!ownedCompany) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Akses ditolak. Anda tidak memiliki hak akses atas perusahaan ini.",
            },
            { status: 403 }
          );
        }
      }

      ownerId = targetCompanyId;
    } else if (category === "BLOG") {
      if (user.role !== "SUPERADMIN") {
        return NextResponse.json(
          {
            success: false,
            error: "Hanya Superadmin yang berhak mengunggah aset blog.",
          },
          { status: 403 }
        );
      }
      ownerId = "public";
    }

    const presigned = await getPresignedUploadUrl({
      fileName,
      fileType,
      fileSize,
      category,
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
