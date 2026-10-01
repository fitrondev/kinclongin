"use client";

import Link from "next/link";

import { Crown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubscriptionView() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
        <Crown className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold">Kinclongin Bebas Biaya SaaS</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Platform Kinclongin POS dapat digunakan sepenuhnya tanpa biaya langganan
        bulanan. Anda dapat mengelola paket keanggotaan (membership) pelanggan
        di menu Langganan Member.
      </p>
      <Button
        asChild
        className="gap-2 bg-amber-600 font-bold text-white hover:bg-amber-700"
      >
        <Link href="/dashboard/membership">
          <Sparkles className="h-4 w-4" />
          <span>Buka Langganan Member Pelanggan</span>
        </Link>
      </Button>
    </div>
  );
}
