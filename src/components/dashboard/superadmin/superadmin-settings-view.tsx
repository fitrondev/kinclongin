"use client";

import { useState, useTransition } from "react";

import {
  Building2,
  CheckCircle2,
  CreditCard,
  Headphones,
  PlusCircle,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  type PlatformSettingsData,
  savePlatformSettingsAction,
} from "@/actions/superadmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";

interface SuperadminSettingsViewProps {
  initialSettings: PlatformSettingsData;
}

export function SuperadminSettingsView({
  initialSettings,
}: SuperadminSettingsViewProps) {
  const [settings, setSettings] =
    useState<PlatformSettingsData>(initialSettings);
  const [isPending, startTransition] = useTransition();

  const handleBankChange = (
    index: number,
    field: "bankName" | "accountNumber" | "accountHolder",
    value: string
  ) => {
    setSettings((prev) => {
      const updated = [...prev.bankAccounts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, bankAccounts: updated };
    });
  };

  const handleAddBank = () => {
    setSettings((prev) => ({
      ...prev,
      bankAccounts: [
        ...prev.bankAccounts,
        {
          bankName: "Bank Baru",
          accountNumber: "",
          accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
          code: `BANK_${prev.bankAccounts.length + 1}`,
        },
      ],
    }));
  };

  const handleRemoveBank = (index: number) => {
    if (settings.bankAccounts.length <= 1) {
      toast.error("Minimal harus ada satu rekening bank resmi platform.");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await savePlatformSettingsAction(settings);
      if (res.success) {
        toast.success("Konfigurasi platform berhasil disimpan & diperbarui!");
      } else {
        toast.error(res.error || "Gagal menyimpan konfigurasi.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Pengaturan Bisnis Sewa & Rekening Platform
            </h1>
            <Badge className="border-purple-500/30 bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              SaaS Configuration
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Atur rekening bank resmi penerima transfer sewa Rp 50.000/bulan,
            masa tenggang (grace period), dan nomor kontak resmi Customer Care.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2 font-bold shadow-xs"
        >
          <Save className="h-4 w-4" />
          <span>{isPending ? "Menyimpan..." : "Simpan Perubahan"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 2. Rekening Bank Resmi Platform */}
        <Card className="shadow-2xs">
          <CardHeader className="bg-muted/20 border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase sm:text-base">
                  Rekening Bank Penerima Sewa Software
                </CardTitle>
                <CardDescription className="text-xs">
                  Rekening ini tampil di form pembayaran sewa lisensi cabang Rp
                  50.000/bulan milik Owner.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddBank}
                className="h-8 gap-1 text-xs font-bold"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Tambah Bank</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {settings.bankAccounts.map((b, idx) => (
              <div
                key={idx}
                className="bg-muted/20 space-y-3 rounded-xl border p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-xs font-bold">
                    Rekening #{idx + 1}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 h-7 w-7"
                    onClick={() => handleRemoveBank(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-muted-foreground text-[10px] font-bold uppercase">
                      Nama Bank
                    </label>
                    <Input
                      value={b.bankName}
                      onChange={(e) =>
                        handleBankChange(idx, "bankName", e.target.value)
                      }
                      className="mt-1 h-8 text-xs font-bold"
                      placeholder="Contoh: Bank Central Asia (BCA)"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground text-[10px] font-bold uppercase">
                      Nomor Rekening
                    </label>
                    <Input
                      value={b.accountNumber}
                      onChange={(e) =>
                        handleBankChange(idx, "accountNumber", e.target.value)
                      }
                      className="mt-1 h-8 font-mono text-xs font-bold"
                      placeholder="Contoh: 8735098123"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground text-[10px] font-bold uppercase">
                      Atas Nama (Pemilik Rekening)
                    </label>
                    <Input
                      value={b.accountHolder}
                      onChange={(e) =>
                        handleBankChange(idx, "accountHolder", e.target.value)
                      }
                      className="mt-1 h-8 text-xs font-semibold"
                      placeholder="Contoh: PT KINCLONGIN DIGITAL NUSANTARA"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 3. Parameter Tarif Sewa & Layanan Support */}
        <div className="space-y-6">
          <Card className="shadow-2xs">
            <CardHeader className="bg-muted/20 border-b p-4">
              <CardTitle className="text-sm font-bold uppercase sm:text-base">
                Biaya Lisensi & Kebijakan Masa Tenggang
              </CardTitle>
              <CardDescription className="text-xs">
                Ketentuan tarif sewa flat per cabang dan batas toleransi jatuh
                tempo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div>
                <label className="text-muted-foreground text-xs font-bold uppercase">
                  Tarif Flat Bulanan per Cabang (Rp)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.monthlyRentalPrice}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        monthlyRentalPrice: Number(e.target.value) || 50000,
                      }))
                    }
                    className="h-9 text-xs font-bold"
                  />
                  <Badge
                    variant="outline"
                    className="h-9 px-3 text-xs font-bold"
                  >
                    {formatRupiah(settings.monthlyRentalPrice)} / bln
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground text-xs font-bold uppercase">
                  Masa Tenggang Grace Period (Hari)
                </label>
                <Input
                  type="number"
                  value={settings.gracePeriodDays}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      gracePeriodDays: Number(e.target.value) || 3,
                    }))
                  }
                  className="mt-1 h-9 text-xs font-bold"
                />
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Cabang tetap bisa menggunakan POS selama masa tenggang sebelum
                  sistem mengunci akses input tiket baru.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="bg-muted/20 border-b p-4">
              <CardTitle className="text-sm font-bold uppercase sm:text-base">
                Hotline Customer Care Resmi Platform
              </CardTitle>
              <CardDescription className="text-xs">
                Kontak bantuan teknis platform untuk para pemilik tempat cuci.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div>
                <label className="text-muted-foreground text-xs font-bold uppercase">
                  Nomor WhatsApp Bantuan (CS)
                </label>
                <Input
                  value={settings.supportPhone}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      supportPhone: e.target.value,
                    }))
                  }
                  className="mt-1 h-9 font-mono text-xs font-bold"
                  placeholder="Contoh: 6281234567890"
                />
              </div>

              <div>
                <label className="text-muted-foreground text-xs font-bold uppercase">
                  Email Dukungan Teknis
                </label>
                <Input
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      supportEmail: e.target.value,
                    }))
                  }
                  className="mt-1 h-9 text-xs font-medium"
                  placeholder="support@kinclongin.com"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
