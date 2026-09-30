import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

import { S3_BUCKET_NAME, S3_PUBLIC_URL, s3Client } from "./s3";

// Aturan Ukuran Maksimal, Ekstensi & MIME Type yang Diizinkan (SEC-06 Hardening)
export const UPLOAD_CONSTRAINTS = {
  RESUME: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    allowedExtensions: ["pdf", "doc", "docx"],
    prefix: "resumes",
    isPrivate: true,
  },
  LOGO: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    prefix: "logos",
    isPrivate: false,
  },
  AVATAR: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    prefix: "avatars",
    isPrivate: false,
  },
  VERIFICATION: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
    prefix: "verifications",
    isPrivate: true,
  },
  BLOG: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    prefix: "blog",
    isPrivate: false,
  },
} as const;

export type UploadCategory = keyof typeof UPLOAD_CONSTRAINTS;

export interface PresignedUploadParams {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: UploadCategory;
  ownerId: string; // userId atau companyId
}

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  fileUrl: string;
  publicUrl: string | null;
  isPrivate: boolean;
  expiresInSeconds: number;
}

/**
 * Validasi batasan berkas sebelum proses upload
 */
export function validateFileConstraints(
  category: UploadCategory,
  fileSize: number,
  fileType: string,
  fileName?: string
): { valid: boolean; error?: string } {
  const constraint = UPLOAD_CONSTRAINTS[category];
  if (!constraint) {
    return { valid: false, error: "Kategori berkas tidak valid." };
  }

  if (fileSize > constraint.maxSize) {
    const maxMb = constraint.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `Ukuran berkas melebihi batas maksimal (${maxMb}MB).`,
    };
  }

  const normalizedMime = fileType.toLowerCase().trim();
  // SEC-06: Blokir eksplisit format SVG, skrip atau HTML berbahaya
  if (
    normalizedMime === "image/svg+xml" ||
    normalizedMime.includes("javascript") ||
    normalizedMime.includes("html") ||
    normalizedMime.includes("xml")
  ) {
    return {
      valid: false,
      error:
        "Format berkas SVG, HTML, atau skrip dilarang demi keamanan sistem.",
    };
  }

  const isAllowedMime = (
    constraint.allowedMimeTypes as readonly string[]
  ).includes(normalizedMime);
  if (!isAllowedMime) {
    return {
      valid: false,
      error: `Format berkas tidak didukung. Format yang diizinkan: ${constraint.allowedMimeTypes.join(
        ", "
      )}`,
    };
  }

  // Validasi ekstensi nama berkas jika fileName disediakan
  if (fileName) {
    const parts = fileName.split(".");
    const ext =
      (parts.length > 1 ? parts.pop() : "")?.toLowerCase().trim() || "";

    const dangerousExts = [
      "svg",
      "html",
      "htm",
      "php",
      "js",
      "exe",
      "sh",
      "bat",
      "cmd",
      "vbs",
    ];
    if (dangerousExts.includes(ext)) {
      return {
        valid: false,
        error:
          "Ekstensi berkas berbahaya tidak diizinkan demi keamanan sistem.",
      };
    }

    if (
      constraint.allowedExtensions &&
      !(constraint.allowedExtensions as readonly string[]).includes(ext)
    ) {
      return {
        valid: false,
        error: `Ekstensi berkas .${ext} tidak diizinkan untuk kategori ${category}. Ekstensi yang diizinkan: ${constraint.allowedExtensions.join(
          ", "
        )}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Menghasilkan Presigned PUT URL untuk upload langsung dari browser ke SumoPod S3
 */
export async function getPresignedUploadUrl({
  fileName,
  fileType,
  fileSize,
  category,
  ownerId,
}: PresignedUploadParams): Promise<PresignedUploadResult> {
  const constraint = UPLOAD_CONSTRAINTS[category];

  // 1. Validasi
  const validation = validateFileConstraints(
    category,
    fileSize,
    fileType,
    fileName
  );
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 2. Sanitasi ekstensi & generate unique storage key
  const parts = fileName.split(".");
  const rawExtension = (parts.length > 1 ? parts.pop() : "")
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (
    !rawExtension ||
    !(constraint.allowedExtensions as readonly string[]).includes(rawExtension)
  ) {
    throw new Error(
      `Ekstensi berkas .${rawExtension} tidak didukung untuk kategori ${category}.`
    );
  }

  const fileUuid = crypto.randomUUID();

  // Pola path: {prefix}/{ownerId}/{uuid}.{ext}
  const storageKey = `${constraint.prefix}/${ownerId}/${fileUuid}.${rawExtension}`;

  // 3. Buat PutObjectCommand
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: storageKey,
    ContentType: fileType,
  });

  // URL upload berlaku selama 15 menit (900 detik)
  const expiresInSeconds = 900;
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  const fileUrl = `/api/storage/file/${storageKey}`;

  return {
    uploadUrl,
    storageKey,
    fileUrl,
    publicUrl: constraint.isPrivate ? null : fileUrl,
    isPrivate: constraint.isPrivate,
    expiresInSeconds,
  };
}

/**
 * Menghasilkan Presigned GET URL untuk membaca atau mengunduh berkas privat (CV / NIB)
 * URL default berlaku selama 15 menit (900 detik)
 */
export async function getPresignedDownloadUrl(
  storageKey: string,
  expiresInSeconds = 900
): Promise<string> {
  const cleanKey = storageKey.startsWith("/")
    ? storageKey.slice(1)
    : storageKey;

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: cleanKey,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Menghapus objek berkas dari SumoPod Object Storage
 */
export async function deleteObjectFromStorage(
  storageKey: string
): Promise<boolean> {
  const cleanKey = storageKey.startsWith("/")
    ? storageKey.slice(1)
    : storageKey;

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: cleanKey,
  });

  await s3Client.send(command);
  return true;
}

/**
 * Memeriksa apakah berkas ada di storage (HeadObject)
 */
export async function checkObjectExists(storageKey: string): Promise<boolean> {
  const cleanKey = storageKey.startsWith("/")
    ? storageKey.slice(1)
    : storageKey;

  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: cleanKey,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}
