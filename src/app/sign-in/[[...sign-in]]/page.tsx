import { SignIn } from "@clerk/nextjs";

import { AuthSplitWrapper } from "@/components/auth/auth-split-wrapper";
import { getSafeRedirectUrl } from "@/lib/security/redirect";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const safeRedirect = getSafeRedirectUrl(redirect_url, "/dashboard");

  return (
    <AuthSplitWrapper mode="sign-in">
      <SignIn
        fallbackRedirectUrl={safeRedirect}
        forceRedirectUrl={redirect_url ? safeRedirect : undefined}
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-md border border-border bg-card rounded-2xl w-full",
            headerTitle: "text-foreground font-black text-xl tracking-tight",
            headerSubtitle: "text-muted-foreground text-xs",
            formButtonPrimary:
              "bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold h-11 rounded-xl shadow-xs transition-all",
            formFieldInput:
              "rounded-xl border-input bg-background text-foreground h-11 text-sm focus:ring-2 focus:ring-primary",
            footerActionLink: "text-primary hover:text-primary/90 font-bold",
          },
        }}
      />
    </AuthSplitWrapper>
  );
}
