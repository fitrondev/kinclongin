import { SignUp } from "@clerk/nextjs";

import { getSafeRedirectUrl } from "@/lib/security/redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const safeRedirect = getSafeRedirectUrl(redirect_url, "/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        fallbackRedirectUrl={safeRedirect}
        forceRedirectUrl={redirect_url ? safeRedirect : undefined}
      />
    </div>
  );
}
