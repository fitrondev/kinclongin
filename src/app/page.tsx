import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  HardDrive,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  const features = [
    {
      icon: <Layers className="h-5 w-5 text-primary" />,
      title: "Next.js 16 + React 19",
      description:
        "App Router terbaru dengan dukungan Turbopack, Server Components, dan async request APIs.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-primary" />,
      title: "Clerk Authentication",
      description:
        "Otentikasi multi-session, OAuth Google, email OTP, serta webhook database sync & RBAC siap pakai.",
    },
    {
      icon: <Database className="h-5 w-5 text-primary" />,
      title: "Prisma ORM & MySQL",
      description:
        "Client database singleton terkelola dengan koneksi teroptimasi dan skema terstruktur.",
    },
    {
      icon: <HardDrive className="h-5 w-5 text-primary" />,
      title: "S3 Object Storage",
      description:
        "Klien SumoPod / AWS S3 siap digunakan dengan dukungan direct presigned URL upload.",
    },
    {
      icon: <Palette className="h-5 w-5 text-primary" />,
      title: "Tailwind v4 & shadcn/ui",
      description:
        "Sistem desain modern dengan OKLCH semantic tokens, Dark Mode, dan 60+ komponen Radix UI.",
    },
    {
      icon: <Bot className="h-5 w-5 text-primary" />,
      title: "AI Agent Skills",
      description:
        "Folder .agents terintegrasi dengan berbagai workflow khusus, rules, dan skill coding profesional.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">New Project</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Masuk
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Daftar</Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-9 w-9",
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          {/* Hero Section */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-chart-1" />
                Template Siap Pakai
              </Badge>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Hello World!
            </h1>

            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Proyek Next.js baru Anda berhasil disiapkan dengan seluruh stack konfigurasi:
              autentikasi, basis data, penyimpanan berkas, desain sistem, dan AI agent rules.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg" className="gap-2">
                    Mulai Eksplorasi <ArrowRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button size="lg" asChild>
                  <Link href="/dashboard" className="gap-2">
                    Buka Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </SignedIn>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://nextjs.org/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Dokumentasi Next.js
                </a>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Start Guide */}
          <div className="mt-16 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold tracking-tight">Langkah Selanjutnya</h2>
            <div className="mt-4 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <span className="font-semibold text-foreground">1. Install Dependencies</span>
                <p className="mt-1 font-mono text-xs text-primary">bun install</p>
                <p className="mt-2 text-xs">Pasang seluruh pustaka dan dependensi proyek.</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <span className="font-semibold text-foreground">2. Push DB & Generate</span>
                <p className="mt-1 font-mono text-xs text-primary">bunx prisma db push</p>
                <p className="mt-2 text-xs">Sinkronkan skema Prisma dengan database Anda.</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <span className="font-semibold text-foreground">3. Jalankan Dev Server</span>
                <p className="mt-1 font-mono text-xs text-primary">bun run dev</p>
                <p className="mt-2 text-xs">Buka http://localhost:3000 di peramban Anda.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          &copy; {new Date().getFullYear()} New Project. Dibangun dengan Next.js & shadcn/ui.
        </div>
      </footer>
    </div>
  );
}
