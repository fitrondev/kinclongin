"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("[Kinclongin Error Boundary]:", error);
  }, [error]);

  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Background Warning Glow */}
      <div className="bg-destructive/10 pointer-events-none absolute -top-40 left-1/2 h-125 w-125 -translate-x-1/2 rounded-full blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-lg text-center">
        {/* Warning Icon Badge */}
        <div className="border-destructive/30 bg-destructive/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border shadow-2xl">
          <AlertTriangle className="text-destructive h-10 w-10 animate-bounce" />
        </div>

        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold">
          <span>Terjadi Kendala Sistem</span>
        </div>

        <h1 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
          Ups! Terjadi Kesalahan Operasional
        </h1>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed sm:text-sm">
          Aplikasi mengalami gangguan tak terduga saat memproses halaman ini.
          Data transaksi dan antrean Anda tetap aman di server.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            onClick={() => reset()}
            size="lg"
            className="h-11 w-full gap-2 font-bold shadow-md sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Coba Muat Ulang</span>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 w-full gap-2 font-bold sm:w-auto"
          >
            <Link href="/pos/antrean">
              <Home className="h-4 w-4" />
              <span>Kembali ke POS</span>
            </Link>
          </Button>
        </div>

        {/* Collapsible Error Debug Details */}
        <div className="mt-8 border-t pt-4 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-semibold"
          >
            <span>Rincian Diagnostik Teknis</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showDetails && (
            <div className="bg-muted/50 text-destructive mt-3 space-y-1 rounded-xl border p-3.5 font-mono text-[11px] break-all">
              <div>
                <strong>Pesan:</strong> {error.message || "Unknown error"}
              </div>
              {error.digest && (
                <div className="text-muted-foreground">
                  <strong>Digest ID:</strong> {error.digest}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
