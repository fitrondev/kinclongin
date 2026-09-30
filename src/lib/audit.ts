import { headers } from "next/headers";
import { after } from "next/server";

import { prisma } from "@/lib/db/prisma";

export interface CreateAuditLogParams {
  actorId: string;
  actorRole: string;
  action: string; // e.g. "JOB_APPROVE", "JOB_REJECT", "COMPANY_VERIFY", "REPORT_RESOLVE", "USER_ROLE_UPDATE", "USER_SUSPEND"
  entityType:
    "Job" | "Company" | "User" | "Report" | "CompanyVerification" | "System";
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Mencatat aktivitas administratif ke dalam tabel AuditLog di MySQL.
 * Otomatis mendeteksi IP Address dan User-Agent dari request header.
 * Memanfaatkan after() dari next/server untuk eksekusi non-blocking di latar belakang.
 * Bersifat fail-safe (tidak melempar error yang membatalkan mutasi utama jika logging gagal).
 */
export async function createAuditLog({
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  metadata,
}: CreateAuditLogParams): Promise<void> {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
      ipAddress = forwardedFor.split(",")[0].trim();
    } else {
      ipAddress = headersList.get("x-real-ip") || null;
    }
    userAgent = headersList.get("user-agent") || null;
  } catch {
    // Dalam konteks tertentu (misal CLI/worker), headers() mungkin tidak tersedia
    ipAddress = null;
    userAgent = null;
  }

  const logTask = async () => {
    try {
      await prisma.auditLog.create({
        data: {
          actorId,
          actorRole,
          action,
          entityType,
          entityId,
          metadata: metadata ? (metadata as object) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error(
        "[createAuditLog Warning]: Gagal mencatat jejak audit:",
        error
      );
    }
  };

  try {
    after(logTask);
  } catch {
    // Jika dipanggil di luar konteks request Next.js (misal script/CLI), eksekusi langsung
    await logTask();
  }
}
