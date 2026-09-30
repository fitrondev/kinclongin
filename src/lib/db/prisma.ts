import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makePrismaClient(): PrismaClient {
  const rawUrl =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/kerjantb";

  let connectionString = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    // Required for MySQL 8 caching_sha2_password authentication
    if (!parsed.searchParams.has("allowPublicKeyRetrieval")) {
      parsed.searchParams.set("allowPublicKeyRetrieval", "true");
    }
    if (!parsed.searchParams.has("connectionLimit")) {
      parsed.searchParams.set("connectionLimit", "10");
    }
    if (!parsed.searchParams.has("connectTimeout")) {
      parsed.searchParams.set("connectTimeout", "15000");
    }
    connectionString = parsed.toString();
  } catch {
    // If URL parsing fails, fallback to rawUrl
  }

  const adapter = new PrismaMariaDb(connectionString);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@/generated/prisma/client";
