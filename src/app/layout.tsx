import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const defaultBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultBaseUrl),
  title: {
    default: "Kinclongin — POS & Operasional Cuci Mobil & Motor",
    template: "%s | Kinclongin",
  },
  description:
    "Sistem POS pintar dan manajemen operasional pencucian mobil, motor & auto-detailing multi-cabang.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} h-full font-sans antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
