import { chromium } from "@playwright/test";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const testUsers = [
    { name: "Owner", email: "owner@kinclongin.com", pass: "123456" },
    {
      name: "Manager (danu.manager)",
      email: "danu.manager@kinclongin.com",
      pass: "123456",
    },
    {
      name: "Manager (danu.operasional)",
      email: "danu.operasional@kinclongin.com",
      pass: "123456",
    },
    {
      name: "Manager (manager@)",
      email: "manager@kinclongin.com",
      pass: "123456",
    },
    { name: "Admin (admin@)", email: "admin@kinclongin.com", pass: "123456" },
    {
      name: "Cashier (kasir.pagi)",
      email: "kasir.pagi@kinclongin.com",
      pass: "123456",
    },
    {
      name: "Cashier (kasir.mataram)",
      email: "kasir.mataram@kinclongin.com",
      pass: "123456",
    },
    {
      name: "Cashier (kasir@)",
      email: "kasir@kinclongin.com",
      pass: "123456",
    },
  ];

  for (const u of testUsers) {
    await page.goto("http://localhost:3000/sign-in");
    await page.fill("#email", u.email);
    await page.fill("#password", u.pass);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    const url = page.url();
    const toast = await page
      .locator("[data-sonner-toast]")
      .first()
      .innerText()
      .catch(() => "");
    console.log(
      `[${u.name}] ${u.email} -> URL: ${url} | Toast: ${toast.replace(/\n/g, " ")}`
    );
  }

  await browser.close();
  process.exit(0);
}

test().catch(console.error);
