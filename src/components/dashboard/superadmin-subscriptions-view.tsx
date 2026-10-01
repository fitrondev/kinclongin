"use client";

import Link from "next/link";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SuperadminSubscriptionsView() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold">Tidak Ada Tagihan SaaS</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Model langganan SaaS outlet telah ditiadakan. Semua cabang aktif
        permanen secara gratis.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard/membership">
          Ke Halaman Membership Pelanggan
        </Link>
      </Button>
    </div>
  );
}
