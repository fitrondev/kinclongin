"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Clock,
  Coins,
  History,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sparkles,
  Tablet,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LayarCuciHeaderProps {
  outletName?: string;
  onOpenShiftSummary?: () => void;
}

export function LayarCuciHeader({
  outletName = "Kinclongin Cabang Pusat",
  onOpenShiftSummary,
}: LayarCuciHeaderProps) {
  const [timeStr, setTimeStr] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="bg-card/95 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:h-20 sm:px-6">
        {/* Logo & Mode Layar Cuci */}
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm sm:h-12 sm:w-12">
            <Tablet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-foreground text-base font-black tracking-tight sm:text-lg">
                LAYAR CUCI
              </span>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 text-[11px] font-bold"
              >
                AREA HIDROLIK
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-50 truncate text-xs sm:max-w-none">
              {outletName}
            </p>
          </div>
        </div>

        {/* Jam Digital Real-time */}
        <div className="bg-muted/60 text-foreground hidden items-center gap-2 rounded-xl border px-4 py-2 font-mono text-base font-bold md:flex">
          <Clock className="text-primary h-4 w-4" />
          <span>{timeStr || "12:00:00"}</span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Cek Komisi Shift */}
          <Button
            type="button"
            onClick={onOpenShiftSummary}
            className="h-11 gap-2 bg-amber-500 px-4 text-xs font-bold text-amber-950 shadow-sm hover:bg-amber-600 sm:h-12 sm:px-5 sm:text-sm dark:text-amber-100"
          >
            <Coins className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Cek Komisi Shift Saya</span>
            <span className="sm:hidden">Komisi</span>
          </Button>

          {/* Toggle Fullscreen */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden h-11 w-11 rounded-xl sm:flex sm:h-12 sm:w-12"
            title="Layar Penuh"
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>

          {/* Link kembali ke Kasir POS */}
          <Button
            asChild
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hidden h-11 gap-1.5 px-3 text-xs sm:h-12 lg:flex"
            title="Kembali ke Layar Antrean Kasir"
          >
            <Link href="/pos/antrean">
              <LayoutGrid className="h-4 w-4" />
              <span>Antrean Kasir</span>
            </Link>
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
