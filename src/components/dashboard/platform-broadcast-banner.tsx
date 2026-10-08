"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, Info, Megaphone, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PlatformBroadcastItem {
  id: string;
  title: string;
  message: string;
  priority: "INFO" | "IMPORTANT" | "CRITICAL";
  operatorName: string;
  createdAt: string;
}

interface PlatformBroadcastBannerProps {
  broadcast: PlatformBroadcastItem | null;
}

export function PlatformBroadcastBanner({
  broadcast,
}: PlatformBroadcastBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!broadcast) return;
    const dismissedKey = `broadcast_dismissed_${broadcast.id}`;
    const isDismissed = sessionStorage.getItem(dismissedKey);
    if (!isDismissed) {
      queueMicrotask(() => {
        setDismissed(false);
      });
    }
  }, [broadcast]);

  if (!broadcast || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem(`broadcast_dismissed_${broadcast.id}`, "true");
    setDismissed(true);
  };

  const isCritical = broadcast.priority === "CRITICAL";
  const isImportant = broadcast.priority === "IMPORTANT";

  return (
    <div
      role="alert"
      className={`relative mx-3 mt-3 flex items-start justify-between gap-3 overflow-hidden rounded-xl border p-4 shadow-xs transition-all sm:mx-4 lg:mx-6 ${
        isCritical
          ? "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/15"
          : isImportant
            ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            : "border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isCritical
              ? "bg-destructive/20 text-destructive"
              : isImportant
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-purple-500/20 text-purple-600 dark:text-purple-400"
          }`}
        >
          {isCritical ? (
            <AlertTriangle className="h-4 w-4 animate-bounce" />
          ) : isImportant ? (
            <Megaphone className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black tracking-tight">
              {broadcast.title}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold uppercase ${
                isCritical
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : isImportant
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300"
              }`}
            >
              {broadcast.priority}
            </Badge>
            <span className="text-muted-foreground text-[11px]">
              • dari {broadcast.operatorName} (Platform Pusat)
            </span>
          </div>

          <p className="text-xs leading-relaxed opacity-90 sm:text-sm">
            {broadcast.message}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="h-7 w-7 shrink-0 opacity-70 hover:opacity-100"
        title="Tutup Pengumuman"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Tutup</span>
      </Button>
    </div>
  );
}
