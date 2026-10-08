import { describe, expect, it } from "vitest";

import { isAuthorizedForOutlet } from "@/lib/auth/rbac";
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
  describe("isAuthorizedForOutlet (Multi-Tenant IDOR Protection)", () => {
    it("mengizinkan akses staf jika outletId cocok dengan cabang aktif", () => {
      const user = {
        role: "CASHIER",
        outletId: "outlet-surabaya-01",
        ownedOutlets: [],
      };
      expect(isAuthorizedForOutlet(user, "outlet-surabaya-01")).toBe(true);
    });

    it("menolak akses staf jika mencoba memanipulasi outlet cabang lain", () => {
      const user = {
        role: "CASHIER",
        outletId: "outlet-surabaya-01",
        ownedOutlets: [],
      };
      expect(isAuthorizedForOutlet(user, "outlet-malang-02")).toBe(false);
    });

    it("mengizinkan Owner mengakses seluruh cabang yang dimilikinya", () => {
      const owner = {
        role: "OWNER",
        outletId: "outlet-surabaya-01",
        ownedOutlets: [
          { id: "outlet-surabaya-01" },
          { id: "outlet-malang-02" },
        ],
      };
      expect(isAuthorizedForOutlet(owner, "outlet-surabaya-01")).toBe(true);
      expect(isAuthorizedForOutlet(owner, "outlet-malang-02")).toBe(true);
      expect(isAuthorizedForOutlet(owner, "outlet-jakarta-99")).toBe(false);
    });

    it("selalu mengizinkan Superadmin mengakses seluruh tenant dan cabang", () => {
      const superadmin = {
        role: "SUPERADMIN",
        outletId: null,
        ownedOutlets: [],
      };
      expect(isAuthorizedForOutlet(superadmin, "any-outlet-id")).toBe(true);
    });

    it("menolak pengguna yang tidak memiliki sesi login (null/undefined)", () => {
      expect(isAuthorizedForOutlet(null, "outlet-surabaya-01")).toBe(false);
      expect(isAuthorizedForOutlet(undefined, "outlet-surabaya-01")).toBe(
        false
      );
    });
  });
});
