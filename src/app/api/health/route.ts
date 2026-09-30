import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbStatus = "unhealthy";
    console.error("[HEALTHCHECK] Database connection failed:", error);
  }

  const isHealthy = dbStatus === "healthy";
  const totalResponseTime = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      responseTimeMs: totalResponseTime,
      version: "1.0.0",
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
