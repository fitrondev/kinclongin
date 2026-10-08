"use client";

import { useState } from "react";

import {
  Camera,
  CheckCircle2,
  CreditCard,
  Database,
  ExternalLink,
  Eye,
  FileImage,
  HardDrive,
  Layers,
  Sparkles,
} from "lucide-react";

import type { PlatformStorageStats } from "@/actions/superadmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SuperadminMediaViewProps {
  stats: PlatformStorageStats;
}

export function SuperadminMediaView({ stats }: SuperadminMediaViewProps) {
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    label: string;
    type: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Inspektur Media & Cloud Object Storage
            </h1>
            <Badge className="border-sky-500/30 bg-sky-500/10 text-[10px] font-bold text-sky-600 dark:text-sky-400">
              SumoPod S3 API
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pantau pemakaian media foto baret kendaraan sebelum cuci, bukti bayar POS,
            bukti transfer sewa cabang Rp 50.000, dan logo tenant.
          </p>
        </div>
      </div>

      {/* 2. Metrik Penggunaan Media Storage */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-sky-500/20 bg-sky-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
              <span>Estimasi Penyimpanan</span>
              <HardDrive className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.estimatedStorageMb} MB
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Tersimpan di SumoPod S3 Bucket
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
              <span>Bukti Sewa Flat 50k</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.totalSubscriptionProofs}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Foto transfer perpanjangan tenant
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
              <span>Foto Kondisi Kendaraan</span>
              <Camera className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.totalInspectionPhotosEstimate}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Foto inspeksi baret / lecet awal
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
              <span>Logo White-Label Cabang</span>
              <FileImage className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.totalOutletsWithLogo}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Logo tempat cuci aktif
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Galeri Media Terbaru */}
      <Card className="shadow-2xs">
        <CardHeader className="bg-muted/20 border-b p-4">
          <CardTitle className="text-sm font-bold uppercase sm:text-base">
            Galeri Berkas Media Terunggah Terkini
          </CardTitle>
          <CardDescription className="text-xs">
            Daftar foto inspeksi cuci, logo cabang, dan bukti bayar yang baru
            diunggah melalui presigned S3 URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {stats.recentMediaUploads.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Belum ada file media yang terunggah ke penyimpanan cloud.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {stats.recentMediaUploads.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border bg-muted/20 transition-all hover:shadow-xs"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.label}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-1.5 text-xs font-bold"
                        onClick={() =>
                          setPreviewMedia({
                            url: item.url,
                            label: item.label,
                            type: item.type,
                          })
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Pratinjau</span>
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="flex items-center justify-between gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          item.type === "SUBSCRIPTION_PROOF"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                            : item.type === "LOGO"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {item.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-foreground">
                      {item.label}
                    </div>
                    {item.outletName && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {item.outletName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Modal Pratinjau Gambar Penuh */}
      <Dialog
        open={Boolean(previewMedia)}
        onOpenChange={(open) => !open && setPreviewMedia(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">
              {previewMedia?.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tipe Berkas: {previewMedia?.type}
            </DialogDescription>
          </DialogHeader>

          {previewMedia && (
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewMedia.url}
                  alt={previewMedia.label}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex justify-end">
                <Button asChild size="sm" variant="outline" className="text-xs font-bold">
                  <a
                    href={previewMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                  >
                    <span>Buka Tautan Asli</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

