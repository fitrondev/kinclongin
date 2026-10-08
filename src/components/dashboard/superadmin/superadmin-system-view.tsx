"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  History,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

import type { SystemHealthInfo } from "@/actions/superadmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SuperadminSystemViewProps {
  health: SystemHealthInfo;
}

export function SuperadminSystemView({ health }: SuperadminSystemViewProps) {
  const router = useRouter();

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}h ${h}j ${m}m`;
    if (h > 0) return `${h} jam ${m} mnt`;
    return `${m} mnt ${s} dtk`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
            Kesehatan Sistem & Diagnostik Infrastruktur
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Status runtime server, latensi koneksi basis data MySQL, SumoPod
            Object Storage, dan integritas volume data platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="font-bold shadow-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            <span>Cek Ulang (Ping)</span>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="font-bold shadow-xs"
          >
            <Link href="/dashboard/audit">
              <History className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              <span>Buka Audit Log</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Kartu Status Komponen Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* C1. Status Database */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              Basis Data MySQL
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Database className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-black text-emerald-600">
                {health.dbLatencyMs} ms
              </span>
              <Badge
                variant="secondary"
                className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
              >
                {health.databaseStatus}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Connection Pool terkelola via Prisma ORM v7
            </p>
          </CardContent>
        </Card>

        {/* C2. SumoPod S3 Storage */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              Object Storage
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <HardDrive className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-foreground text-lg font-black">
                {health.storageStatus.status}
              </span>
              <Badge
                variant="outline"
                className="border-blue-500/30 text-[10px] font-bold text-blue-600"
              >
                S3 API
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
              Bucket: {health.storageStatus.bucket}
            </p>
          </CardContent>
        </Card>

        {/* C3. Memory Heap */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              Memori Server
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <Cpu className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground font-mono text-2xl font-black">
              {health.memoryUsageMb.heapUsed} MB
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Dari alokasi {health.memoryUsageMb.heapTotal} MB (RSS:{" "}
              {health.memoryUsageMb.rss} MB)
            </p>
          </CardContent>
        </Card>

        {/* C4. Uptime Server */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
              Uptime Runtime
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground font-mono text-xl font-black">
              {formatUptime(health.uptimeSeconds)}
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-[11px]">
              Node {health.nodeVersion} ({health.environment})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Rincian Volume Data Tabel MySQL Platform */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            Volume & Rekaman Data Platform Nasional
          </CardTitle>
          <CardDescription className="text-xs">
            Jumlah rekaman data entitas utama yang tersimpan dan aktif di sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Cabang Outlet
              </div>
              <div className="font-mono text-xl font-black">
                {health.tableCounts.outlets}
              </div>
            </div>

            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Akun User
              </div>
              <div className="font-mono text-xl font-black">
                {health.tableCounts.users}
              </div>
            </div>

            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Staf / Washer
              </div>
              <div className="font-mono text-xl font-black">
                {health.tableCounts.employees}
              </div>
            </div>

            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Tiket Cuci
              </div>
              <div className="font-mono text-xl font-black text-cyan-600">
                {health.tableCounts.washTickets}
              </div>
            </div>

            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Transaksi Kasir
              </div>
              <div className="font-mono text-xl font-black text-emerald-600">
                {health.tableCounts.payments}
              </div>
            </div>

            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Sewa Cabang (50k)
              </div>
              <div className="font-mono text-xl font-black text-purple-600">
                {health.tableCounts.subscriptionPayments}
              </div>
            </div>

            <div className="space-y-1 rounded-xl border p-3 text-center">
              <div className="text-muted-foreground text-[11px] font-bold uppercase">
                Audit Trail
              </div>
              <div className="font-mono text-xl font-black text-amber-600">
                {health.tableCounts.auditLogs}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
