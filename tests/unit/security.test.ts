import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/security/rate-limit";
import { getSafeRedirectUrl } from "@/lib/security/redirect";

describe("Security & Validation Unit Tests", () => {
  describe("getSafeRedirectUrl (Open Redirect Protection)", () => {
    it("mengizinkan rute lokal internal yang valid", () => {
      expect(getSafeRedirectUrl("/pos/antrean")).toBe("/pos/antrean");
      expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
      expect(getSafeRedirectUrl("/layar-cuci")).toBe("/layar-cuci");
    });

    it("menolak URL eksternal berbahaya dan mengembalikan fallback", () => {
      expect(getSafeRedirectUrl("https://evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("http://phishing.site/login")).toBe(
        "/dashboard"
      );
      expect(getSafeRedirectUrl("//evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("/\\evil.com")).toBe("/dashboard");
      expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
    });

    it("menangani nilai kosong atau null dengan fallback kustom", () => {
      expect(getSafeRedirectUrl(null, "/pos")).toBe("/pos");
      expect(getSafeRedirectUrl("", "/sign-in")).toBe("/sign-in");
      expect(getSafeRedirectUrl(undefined, "/layar-cuci")).toBe("/layar-cuci");
    });
  });

  describe("checkRateLimit (Brute Force Protection)", () => {
    it("mengizinkan request dalam batas limit yang wajar", () => {
      const key = `test-ip-${Date.now()}`;
      const res1 = checkRateLimit(key, { maxRequests: 5, intervalMs: 60000 });
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(4);

      const res2 = checkRateLimit(key, { maxRequests: 5, intervalMs: 60000 });
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(3);
    });

    it("memblokir request saat batas kuota terlampaui", () => {
      const key = `limit-ip-${Date.now()}`;
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, { maxRequests: 3, intervalMs: 60000 });
      }

      const blocked = checkRateLimit(key, {
        maxRequests: 3,
        intervalMs: 60000,
      });
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });
  });
});
