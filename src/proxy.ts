import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isPublicRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/track") ||
    pathname.startsWith("/lacak") ||
    pathname.startsWith("/layar-cuci") ||
    pathname.startsWith("/api/storage/file");

  if (!isLoggedIn && !isPublicRoute) {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(signInUrl);
  }

  // Role-Based Access Control (RBAC) Route Guards
  if (isLoggedIn) {
    const role = req.auth?.user?.role;

    // 1. CASHIER: Terkunci di operasional loket POS, dilarang mengakses ringkasan bisnis & manajemen
    if (role === "CASHIER" && pathname.startsWith("/dashboard")) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/pos/antrean";
      return Response.redirect(redirectUrl);
    }

    // 2. WASHER: Dilarang memproses checkout/kasir bayar dan pendaftaran tiket baru
    if (
      role === "WASHER" &&
      (pathname === "/pos" ||
        pathname.startsWith("/pos/bayar") ||
        pathname.startsWith("/pos/daftar-baru"))
    ) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/pos/antrean";
      return Response.redirect(redirectUrl);
    }

    // 3. WASHER: Dilarang mengakses modul manajerial dashboard (stok, CRM pelanggan, membership, payroll global, pengguna)
    if (
      role === "WASHER" &&
      (pathname.startsWith("/dashboard/stok") ||
        pathname.startsWith("/dashboard/pelanggan") ||
        pathname.startsWith("/dashboard/membership") ||
        pathname.startsWith("/dashboard/komisi") ||
        pathname.startsWith("/dashboard/pengguna") ||
        pathname.startsWith("/dashboard/admin") ||
        pathname.startsWith("/dashboard/pengaturan"))
    ) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return Response.redirect(redirectUrl);
    }

    // 4. MANAGER: Dilarang mengelola akun/role staf (/dashboard/pengguna) & billing SaaS Superadmin
    if (
      role === "MANAGER" &&
      (pathname.startsWith("/dashboard/pengguna") ||
        pathname.startsWith("/dashboard/admin/subscriptions"))
    ) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return Response.redirect(redirectUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes (except api/auth)
    "/(api|trpc)(.*)",
  ],
};
