/**
 * Memvalidasi dan memastikan URL pengalihan (redirect) aman dari serangan Open Redirect / Phishing.
 * Hanya mengizinkan URL lokal internal yang dimulai dengan satu karakter '/' (contoh: '/dashboard').
 * Menolak URL eksternal, protokol javascript:, data:, atau double-slash '//' (protocol-relative URLs).
 */
export function getSafeRedirectUrl(
  targetUrl: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!targetUrl || typeof targetUrl !== "string") {
    return fallback;
  }

  const trimmed = targetUrl.trim();

  // Tolak URL kosong
  if (!trimmed) {
    return fallback;
  }

  // Wajib diawali tepat satu slash '/'
  // Tolak protocol-relative '//', backslash '/\', atau yang mengandung skema protokol
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }

  return fallback;
}
