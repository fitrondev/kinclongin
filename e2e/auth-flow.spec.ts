import { expect, test } from "@playwright/test";

test.describe("Authentication Flow E2E", () => {
  test("Halaman /sign-in berhasil dimuat dan menampilkan form login", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Pastikan judul login muncul
    await expect(page.locator("text=Masuk ke Kinclongin")).toBeVisible();

    // Pastikan elemen input email dan kata sandi ada
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("Pilihan akun cepat demo dapat mengisi form email dan password", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Klik tombol quick demo akun Owner jika ada
    const ownerDemoBtn = page.locator('button:has-text("Owner")').first();
    if (await ownerDemoBtn.isVisible()) {
      await ownerDemoBtn.click();
      await expect(page.locator("#email")).toHaveValue("owner@kinclongin.com");
      await expect(page.locator("#password")).toHaveValue("123456");
    }
  });

  test("Pendaftaran publik /sign-up dinonaktifkan dan dialihkan ke /sign-in", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Pastikan tidak ada tautan pendaftaran cabang publik di halaman login
    const signUpLink = page.locator('a[href*="/sign-up"]');
    await expect(signUpLink).toHaveCount(0);

    // Kunjungan langsung ke /sign-up wajib dialihkan ke /sign-in
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/.*sign-in/);
  });
});
