interface RateLimitConfig {
  intervalMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory sliding tracker untuk proteksi anti-DoS & anti-spam
const tracker = new Map<string, { count: number; resetTime: number }>();

// Pembersihan berkala setiap 5 menit untuk mencegah kebocoran memori (memory leak)
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of tracker.entries()) {
        if (now > value.resetTime) {
          tracker.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );

  // Jangan menahan event loop Node.js agar proses build/exit tetap bersih
  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

/**
 * Memeriksa limit pemanggilan request berdasarkan identifier (IP atau User ID).
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = tracker.get(identifier);

  if (!record || now > record.resetTime) {
    tracker.set(identifier, {
      count: 1,
      resetTime: now + config.intervalMs,
    });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.ceil((now + config.intervalMs) / 1000),
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  record.count++;
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  };
}

/**
 * Mengambil alamat IP klien dari header request secara aman.
 */
export async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return headersList.get("x-real-ip") || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}
