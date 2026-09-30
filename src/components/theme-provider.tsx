"use client";

import * as React from "react";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Menangani peringatan false-positive di React 19 / Next.js 16 saat development:
// React 19 memperingatkan keberadaan tag <script> inline yang dirender next-themes untuk mencegah FOUC (flash of unstyled content).
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const isPatched = Boolean(
    (console.error as { __nextThemesPatched?: boolean }).__nextThemesPatched
  );

  if (!isPatched) {
    const origError = console.error;
    const patchedError = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes(
          "Encountered a script tag while rendering React component"
        )
      ) {
        return;
      }
      origError.apply(console, args);
    };
    (patchedError as { __nextThemesPatched?: boolean }).__nextThemesPatched =
      true;
    console.error = patchedError;
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export { useTheme } from "next-themes";
