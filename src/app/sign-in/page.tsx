import { Suspense } from "react";

import { AuthSplitWrapper } from "@/components/auth/auth-split-wrapper";
import { SignInForm } from "@/components/auth/sign-in-form";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <AuthSplitWrapper mode="sign-in">
      <Suspense
        fallback={
          <div className="bg-card/50 h-64 w-full animate-pulse rounded-2xl" />
        }
      >
        <SignInForm />
      </Suspense>
    </AuthSplitWrapper>
  );
}
