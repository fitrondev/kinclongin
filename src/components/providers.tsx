"use client";

import * as React from "react";

import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
