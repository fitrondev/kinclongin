"use client";

import Link from "next/link";

import { AlertTriangle, ArrowRight, Lock, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SubscriptionBannerProps {
  status?: string;
  isGracePeriod?: boolean;
  graceDaysRemaining?: number;
  isHardLocked?: boolean;
}

export function SubscriptionBanner({
  status,
  isGracePeriod = false,
  graceDaysRemaining = 0,
  isHardLocked = false,
}: SubscriptionBannerProps) {
  if (isHardLocked) {
    return (
      <aside
        aria-label="Pemberitahuan masa langganan berakhir"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      >
        <div className="bg-card w-full max-w-md space-y-4 rounded-2xl border p-6 text-center shadow-2xl">
          <div className="bg-destructive/10 text-destructive mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <Lock className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-foreground text-lg font-black">
              Masa Akses Sistem Berakhir
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Masa tenggang telah terlewati. Hubungi administrator atau perbarui
              akses untuk melanjutkan pendaftaran tiket baru. Seluruh data
              riwayat tiket dan laporan keuangan tetap tersimpan aman.
            </p>
          </div>

          <div className="bg-muted/40 rounded-xl border p-3 text-xs">
            <span className="text-muted-foreground block">Status Layanan</span>
            <span className="text-primary text-base font-black">
              Kinclongin POS & Operasional
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="h-10 w-full gap-1.5 font-bold shadow-sm">
              <Link href="/dashboard/pengaturan/langganan">
                <span>Perpanjang Langganan Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <Link href="/dashboard">Buka Dasbor Owner</Link>
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  if (isGracePeriod) {
    return (
      <aside
        aria-label="Peringatan masa tenggang langganan"
        className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse text-amber-600" />
          <span>
            <strong>Masa Tenggang (Grace Period):</strong> Masa aktif langganan
            cabang berakhir. Tersisa <strong>{graceDaysRemaining} hari</strong>{" "}
            sebelum akses input tiket baru dinonaktifkan.
          </span>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="bg-background hover:bg-muted h-7 shrink-0 gap-1 text-xs font-bold text-amber-900 shadow-xs dark:text-amber-100"
        >
          <Link href="/dashboard/pengaturan/langganan">
            <span>Perpanjang Rp 50rb</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </aside>
    );
  }

  return null;
}
