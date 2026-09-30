import { S3Client } from "@aws-sdk/client-s3";

const endpoint =
  process.env.SUMOPOD_S3_ENDPOINT || "https://kencana.basic.box.cloudeka.id";
const region = process.env.SUMOPOD_S3_REGION || "kencana";
const accessKeyId = process.env.SUMOPOD_S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.SUMOPOD_S3_SECRET_ACCESS_KEY || "";

export const S3_BUCKET_NAME =
  process.env.SUMOPOD_S3_BUCKET ||
  process.env.SUMOPOD_S3_BUCKET_NAME ||
  "s3kerjantb-wskw97";

export const S3_ENDPOINT = endpoint;
export const S3_REGION = region;

export const S3_PUBLIC_URL =
  process.env.SUMOPOD_S3_PUBLIC_URL || `${endpoint}/${S3_BUCKET_NAME}`;

/**
 * Singleton S3Client untuk SumoPod Object Storage (S3-Compatible API)
 * forcePathStyle wajib true untuk endpoint S3 non-AWS (seperti SumoPod / Cloudeka)
 */
const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | undefined;
};

export const s3Client =
  globalForS3.s3Client ??
  new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3Client = s3Client;
}

/**
 * URL Logo Resmi KerjaNTB di SumoPod Storage
 */
export const KERJANTB_LOGO_URL = "/api/storage/file/Logo/logo.webp";

/**
 * Helper untuk mendapatkan URL publik berkas (Avatar, Logo, Cover Blog)
 */
export function getStoragePublicUrl(storageKey: string): string {
  const cleanKey = storageKey.startsWith("/")
    ? storageKey.slice(1)
    : storageKey;
  return `/api/storage/file/${cleanKey}`;
}
