import { expect, test } from "@playwright/test";

test.describe("Route Protection & Public Tracking E2E", () => {
  test("Akses ke halaman terlindungi (/pos/antrean) tanpa login dialihkan ke /sign-in", async ({
    page,
  }) => {
    await page.goto("/pos/antrean");

    // Harus dialihkan ke /sign-in dengan parameter callbackUrl
    await expect(page).toHaveURL(/.*sign-in.*callbackUrl/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("Akses ke dasbor (/dashboard) tanpa login dialihkan ke /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*sign-in.*callbackUrl/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("Halaman publik lacak status (/lacak/[ticketId]) dapat diakses tanpa autentikasi", async ({
    page,
  }) => {
    // Rute publik tidak boleh dialihkan ke login
    const response = await page.goto("/lacak/KNC-DEMO-999");
    expect(response?.status()).toBeLessThan(500);

    // Memastikan tidak dialihkan ke /sign-in
    expect(page.url()).not.toContain("/sign-in");
  });
});
