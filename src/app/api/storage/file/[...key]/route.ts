import { NextResponse } from "next/server";

import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getCurrentUser } from "@/lib/auth/clerk-sync";
import { canAccessStorageFile } from "@/lib/storage/authorization";
import { S3_BUCKET_NAME, s3Client } from "@/lib/storage/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    // Sanitasi dari potensi path traversal
    const safeSegments = key.filter(
      (segment) => segment && segment !== ".." && segment !== "."
    );
    const storageKey = safeSegments.join("/");

    if (!storageKey) {
      return new NextResponse("Path berkas tidak valid", { status: 400 });
    }

    // Berkas privat (CV pelamar & dokumen NIB) mewajibkan autentikasi sesi dan otorisasi kepemilikan objek (SEC-02)
    const isPrivate =
      storageKey.startsWith("resumes/") ||
      storageKey.startsWith("verifications/");

    if (isPrivate) {
      const user = await getCurrentUser();
      if (!user) {
        return new NextResponse(
          "Akses ditolak. Silakan masuk terlebih dahulu untuk melihat berkas ini.",
          { status: 401 }
        );
      }

      const isAuthorized = await canAccessStorageFile(
        { id: user.id, clerkId: user.clerkId, role: user.role },
        storageKey
      );

      if (!isAuthorized) {
        return new NextResponse(
          "Akses ditolak. Anda tidak memiliki izin untuk mengakses dokumen privat ini.",
          { status: 403 }
        );
      }
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: storageKey,
      })
    );

    if (!response.Body) {
      return new NextResponse("File tidak ditemukan di SumoPod Storage", {
        status: 404,
      });
    }

    const byteArray = await response.Body.transformToByteArray();

    // Deteksi tipe konten jika S3 mengembalikan generic octet-stream
    let contentType = response.ContentType || "application/octet-stream";
    const lowerKey = storageKey.toLowerCase();
    if (lowerKey.endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (lowerKey.endsWith(".webp")) {
      contentType = "image/webp";
    } else if (lowerKey.endsWith(".png")) {
      contentType = "image/png";
    } else if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    }

    const filename = storageKey.split("/").pop() || "file";

    return new NextResponse(Buffer.from(byteArray), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isPrivate
          ? "private, no-cache, no-store, must-revalidate"
          : "public, max-age=31536000, immutable",
        // SEC-06: Paksa unduhan (attachment) untuk berkas privat agar terhindar dari rendered stored XSS
        "Content-Disposition": isPrivate
          ? `attachment; filename="${encodeURIComponent(filename)}"`
          : `inline; filename="${encodeURIComponent(filename)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("Error mengambil file dari SumoPod Storage:", error);
    return new NextResponse("File tidak ditemukan atau tidak dapat diakses", {
      status: 404,
    });
  }
}
