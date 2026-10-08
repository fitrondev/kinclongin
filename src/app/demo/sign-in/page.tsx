import { Suspense } from "react";

import { AuthSplitWrapper } from "@/components/auth/auth-split-wrapper";
import { DemoSignInForm } from "@/components/auth/demo-sign-in-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login Demo Interaktif (1-Klik) | Kinclongin POS",
  description:
    "Coba seluruh peran kasir, washer, manajer, owner, dan superadmin Kinclongin POS dalam 1-klik tanpa registrasi.",
};

export default function DemoSignInPage() {
  return (
    <AuthSplitWrapper mode="sign-in">
      <Suspense
        fallback={
          <div className="bg-card/50 h-64 w-full animate-pulse rounded-2xl" />
        }
      >
        <DemoSignInForm />
      </Suspense>
    </AuthSplitWrapper>
  );
}

