"use client";

import { useEffect } from "react";

import { CheckCircle2, RefreshCw, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/lib/offline/sync-manager";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetworkStatus();

  // Register PWA Service Worker (hanya di production)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log(
              "Kinclongin SW registered with scope:",
              registration.scope
            );
          })
          .catch((err) => {
            console.warn("Kinclongin SW registration failed:", err);
          });
      });
    } else {
      // Di development / localhost: bersihkan service worker & cache agar HMR & hydration tidak korup
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    }
  }, []);

  // 1. KONDISI OFFLINE: Banner Kuning/Oranye Tegas
  if (!isOnline) {
    return (
      <aside
        aria-label="Status koneksi jaringan offline"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-800 transition-colors dark:text-amber-300"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 animate-pulse text-amber-600" />
          <span>
            <strong>Mode Luring Aktif:</strong> Koneksi internet terputus. Input
            pendaftaran kendaraan & antrean tetap berjalan lancar dan disimpan
            aman di memori lokal (IndexedDB).
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
            {pendingCount > 0
              ? `${pendingCount} antrean tersimpan lokal`
              : "Siap rekam lokal"}
          </span>
        </div>
      </aside>
    );
  }

  // 2. KONDISI ONLINE DENGAN ANTREAN TERTUNDA: Banner Sinkronisasi Biru/Kuning
  if (pendingCount > 0) {
    return (
      <aside
        aria-label="Status sinkronisasi antrean offline"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/30 bg-blue-500/15 px-4 py-2 text-xs font-semibold text-blue-900 transition-colors dark:text-blue-200"
      >
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>Koneksi Internet Pulih:</strong> Ditemukan{" "}
            <strong>{pendingCount} transaksi offline</strong> yang siap
            disinkronkan ke server pusat.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isSyncing}
            onClick={triggerSync}
            className="bg-background hover:bg-muted h-7 gap-1.5 text-xs font-bold shadow-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span>
              {isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
            </span>
          </Button>
        </div>
      </aside>
    );
  }

  // 3. KONDISI ONLINE SEMPURNA: Status Bar Hijau Minimalis
  return (
    <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>
          <strong>Online:</strong> Sistem terhubung ke cloud server &bull; PWA
          Offline-Ready
        </span>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
        <CheckCircle2 className="h-3 w-3" />
        <span>Sinkron</span>
      </div>
    </div>
  );
}
