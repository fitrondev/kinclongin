import { Suspense } from "react";

import { AuthSplitWrapper } from "@/components/auth/auth-split-wrapper";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Daftar Cabang Baru | Kinclongin POS",
  description:
    "Daftarkan usaha cuci mobil & motor Anda. Uji coba 14 hari gratis akses penuh seluruh fitur.",
};

export default function SignUpPage() {
  return (
    <AuthSplitWrapper mode="sign-up">
      <Suspense
        fallback={
          <div className="bg-card/50 h-64 w-full animate-pulse rounded-2xl" />
        }
      >
        <SignUpForm />
      </Suspense>
    </AuthSplitWrapper>
  );
}
