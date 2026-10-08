"use client";

import { useState } from "react";

import {
  Car,
  Clock,
  Coins,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import type { ServicePackageTemplate } from "@/actions/superadmin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/formatters";

interface SuperadminCatalogViewProps {
  templates: ServicePackageTemplate[];
  totalOutletServicesCount: number;
  popularServicesAcrossTenants: Array<{ name: string; count: number }>;
}

export function SuperadminCatalogView({
  templates,
  totalOutletServicesCount,
  popularServicesAcrossTenants,
}: SuperadminCatalogViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Master Template Layanan Cuci Nasional
            </h1>
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
              Katalog Standar
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Katalog acuan standar paket cuci mobil, motor, hidrolik, dan salon
            detailing yang menjadi acuan default untuk seluruh mitra baru.
          </p>
        </div>
      </div>

      {/* 2. Statistik Layanan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-cyan-500/20 bg-cyan-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-cyan-700 uppercase dark:text-cyan-300">
              Template Standar Platform
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {templates.length} Paket
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Kategori Mobil, Motor & Detailing
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-purple-700 uppercase dark:text-purple-300">
              Total Layanan Terdaftar di Seluruh Cabang
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {totalOutletServicesCount} Paket Aktif
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Dibuat oleh mitra di seluruh Indonesia
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
              Layanan Terpopuler Nasional
            </div>
            <div className="text-foreground mt-1 text-lg font-black truncate">
              {popularServicesAcrossTenants[0]?.name || "Cuci Salju Hidrolik"}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Digunakan di {popularServicesAcrossTenants[0]?.count || 0} cabang
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Daftar Template Standar Platform */}
      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="bg-muted/20 border-b p-4">
          <CardTitle className="text-sm font-bold uppercase sm:text-base">
            Daftar Paket Acuan Default Platform
          </CardTitle>
          <CardDescription className="text-xs">
            Paket ini otomatis di-deploy ke outlet baru saat proses registrasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Nama Paket Layanan</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Kategori Kendaraan</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Tarif Acuan</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Komisi Washer</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estimasi Waktu</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Deskripsi Pengerjaan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((pkg, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-bold text-foreground">
                      {pkg.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {pkg.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-black text-foreground">
                      {formatRupiah(pkg.defaultPrice)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-emerald-600">
                      {formatRupiah(pkg.commissionWasher)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pkg.recommendedDurationMinutes} menit
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {pkg.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Layanan Terpopuler di Kalangan Mitra */}
      <Card className="shadow-2xs">
        <CardHeader className="bg-muted/20 border-b p-4">
          <CardTitle className="text-sm font-bold uppercase sm:text-base">
            Tren Paket Layanan Terbanyak Digunakan Mitra
          </CardTitle>
          <CardDescription className="text-xs">
            Frekuensi paket layanan yang paling sering dikonfigurasi oleh pemilik tempat cuci.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {popularServicesAcrossTenants.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border bg-muted/20 p-3"
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-xs font-bold text-foreground">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Diadopsi {item.count} cabang
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] font-bold">
                  #{idx + 1}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

