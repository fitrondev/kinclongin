"use client";

import { useState } from "react";

import {
  CheckCircle2,
  Crown,
  ExternalLink,
  Info,
  Key,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  saveWhatsAppConfigAction,
  testWhatsAppMessageAction,
} from "@/actions/owner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WhatsAppSettingsViewProps {
  initialApiKey?: string | null;
  initialSenderNumber?: string | null;
  outletName: string;
}

export function WhatsAppSettingsView({
  initialApiKey = "",
  initialSenderNumber = "",
  outletName,
}: WhatsAppSettingsViewProps) {
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [senderNumber, setSenderNumber] = useState(initialSenderNumber || "");
  const [isSaving, setIsSaving] = useState(false);

  // State Uji Kirim Pesan
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    `Halo! Ini adalah pesan uji coba dari ${outletName} menggunakan WhatsApp Gateway Kinclongin POS. Notifikasi siap digunakan!`
  );
  const [isTesting, setIsTesting] = useState(false);

  const isConfigured = Boolean(apiKey && senderNumber);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !senderNumber.trim()) {
      toast.error("Mohon lengkapi API Key dan Nomor WhatsApp Pengirim.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveWhatsAppConfigAction({
        apiKey: apiKey.trim(),
        senderNumber: senderNumber.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan konfigurasi.");
        return;
      }

      toast.success("Konfigurasi WhatsApp Gateway berhasil disimpan!");
    } catch {
      toast.error("Terjadi kendala jaringan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      toast.error("Masukkan nomor WhatsApp penerima uji coba.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await testWhatsAppMessageAction({
        targetPhone: testPhone.trim(),
        testMessage: testMessage.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Pengujian pesan WhatsApp gagal.");
        return;
      }

      toast.success("Pesan uji coba berhasil terkirim ke WhatsApp!");
    } catch {
      toast.error("Gagal menghubungi server gateway WhatsApp.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Konfigurasi Webhook & WhatsApp Gateway
            </h1>
            <Badge
              variant="outline"
              className="shrink-0 items-center gap-1 border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600"
            >
              <Crown className="h-3 w-3 text-amber-600" />
              <span>Khusus Owner</span>
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Atur integrasi gateway pengiriman struk kasir digital dan notifikasi
            kendaraan siap diambil untuk {outletName}.
          </p>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {isConfigured ? (
            <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/15 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Gateway Terkonfigurasi</span>
            </Badge>
          ) : (
            <Badge
              variant="destructive"
              className="gap-1.5 py-1 text-xs font-bold"
            >
              <Info className="h-4 w-4" />
              <span>Belum Dikonfigurasi</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kolom 1: Formulir API Key & Pengirim */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="space-y-1.5 pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-foreground text-base font-bold">
                Kredensial Gateway WhatsApp
              </CardTitle>
              <Key className="text-primary h-4 w-4" />
            </div>
            <CardDescription className="text-xs">
              Mendukung provider gateway seperti <strong>Fonnte</strong>,{" "}
              <strong>Wablas</strong>, atau gateway HTTP lokal.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSaveConfig}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="apiKey" className="text-xs font-semibold">
                  API Key / Token WhatsApp Gateway
                </Label>
                <div className="relative">
                  <Key className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Contoh: fonnte_token_xxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Dapatkan token API dari dasbor penyedia WhatsApp Gateway Anda.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderNumber" className="text-xs font-semibold">
                  Nomor WhatsApp Pengirim Resmi Cabang
                </Label>
                <div className="relative">
                  <Phone className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="senderNumber"
                    type="tel"
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    required
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Nomor perangkat yang telah di-scan / pairing pada provider
                  gateway.
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Keamanan & Enkripsi Kunci</p>
                    <p className="text-[11px] leading-relaxed">
                      API Key disimpan aman di basis data per cabang dan hanya
                      dieksekusi dari sisi server (Server Actions) tanpa pernah
                      terekspos ke browser pelanggan.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 w-full gap-2 rounded-xl text-xs font-bold shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Simpan Pengaturan Gateway</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Kolom 2: Uji Coba Kirim Pesan & Simulasi Struk */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="space-y-1.5 pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-foreground text-base font-bold">
                  Uji Konektivitas Gateway (Test Ping)
                </CardTitle>
                <Smartphone className="h-4 w-4 text-emerald-500" />
              </div>
              <CardDescription className="text-xs">
                Kirim pesan uji coba ke nomor Anda untuk memastikan koneksi
                aktif
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="testPhone" className="text-xs font-semibold">
                  Nomor WhatsApp Penerima Uji Coba
                </Label>
                <div className="relative">
                  <Phone className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                  <Input
                    id="testPhone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="h-10 rounded-xl pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="testMsg" className="text-xs font-semibold">
                  Pesan Uji Coba
                </Label>
                <Textarea
                  id="testMsg"
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="button"
                onClick={handleTestSend}
                disabled={isTesting || !isConfigured}
                variant="outline"
                className="h-10 w-full gap-2 rounded-xl text-xs font-bold shadow-xs hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>Mengirim Pesan...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-emerald-600" />
                    <span>Kirim Pesan Uji Coba</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Panduan Integrasi */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-sm font-bold">
                Fitur Pesan Otomatis Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Struk Pembayaran Digital</strong>: Terkirim otomatis
                  saat kasir memproses checkout tiket.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Tautan Pelacakan Live</strong>: Pelanggan dapat
                  memantau status cuci di <code>/lacak/[ticketId]</code>.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Notifikasi Unit Selesai</strong>: Memberitahu
                  pelanggan saat kendaraan siap diserahterimakan.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
