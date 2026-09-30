"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileCheck,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  type SubscriptionStatusInfo,
  submitSubscriptionPaymentAction,
} from "@/actions/subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStorageUpload } from "@/hooks/use-storage-upload";
import { formatRupiah } from "@/lib/formatters";

const DURATION_OPTIONS = [
  { months: 1, label: "1 Bulan", price: 50000, tag: "Standar" },
  { months: 3, label: "3 Bulan", price: 150000, tag: "Populer" },
  { months: 6, label: "6 Bulan", price: 300000, tag: "Hemat" },
  { months: 12, label: "12 Bulan (1 Thn)", price: 600000, tag: "Terbaik" },
];

const BANK_ACCOUNTS = [
  { bank: "BCA", number: "056-189-2234", name: "PT KINCLONGIN SOLUSI DIGITAL" },
  {
    bank: "Mandiri",
    number: "161-00-98213-44",
    name: "PT KINCLONGIN SOLUSI DIGITAL",
  },
  {
    bank: "BRI",
    number: "0052-01-002341-53",
    name: "PT KINCLONGIN SOLUSI DIGITAL",
  },
];

export function SubscriptionView({
  statusInfo,
}: {
  statusInfo: SubscriptionStatusInfo;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedDuration, setSelectedDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "QRIS">(
    "BANK_TRANSFER"
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const { upload, isUploading } = useStorageUpload();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    toast.success("Nomor rekening disalin ke clipboard!");
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofFile) {
      toast.error(
        "Pilih foto struk / tangkapan layar bukti transfer terlebih dahulu."
      );
      return;
    }

    startTransition(async () => {
      // 1. Upload foto bukti ke SumoPod S3 via presigned URL
      const uploadRes = await upload(
        proofFile,
        "PAYMENT_PROOF",
        statusInfo.outletId
      );
      if (!uploadRes || (!uploadRes.fileUrl && !uploadRes.publicUrl)) {
        toast.error("Gagal mengunggah foto bukti ke server S3.");
        return;
      }

      const proofImageUrl = uploadRes.fileUrl || uploadRes.publicUrl || "";

      // 2. Kirim mutasi pengajuan ke Server Action
      const res = await submitSubscriptionPaymentAction({
        outletId: statusInfo.outletId,
        durationMonths: selectedDuration,
        paymentMethod,
        proofImageUrl,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mengajukan pembayaran langganan.");
        return;
      }

      toast.success(
        "Bukti pembayaran berhasil diajukan! Superadmin akan memverifikasi dalam waktu singkat."
      );
      setProofFile(null);
      router.refresh();
    });
  };

  const activeOption = DURATION_OPTIONS.find(
    (d) => d.months === selectedDuration
  )!;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
          Langganan SaaS Outlet Cabang
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Tarif flat tunggal Rp 50.000 / bulan untuk fitur lengkap kasir,
          antrean visual, layar cuci hidrolik & mode luring.
        </p>
      </div>

      {/* Status Masa Aktif Card */}
      <Card
        className={`border-2 ${
          statusInfo.isHardLocked
            ? "border-destructive/40 bg-destructive/5"
            : statusInfo.isGracePeriod
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-primary/20 bg-card"
        } shadow-xs`}
      >
        <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Status Cabang Saat Ini
              </span>
              <Badge
                variant={
                  statusInfo.status === "ACTIVE"
                    ? "default"
                    : statusInfo.status === "PENDING_VERIFICATION"
                      ? "outline"
                      : "destructive"
                }
                className="px-2 py-0.5 text-xs font-extrabold uppercase"
              >
                {statusInfo.status === "PENDING_VERIFICATION"
                  ? "Menunggu Verifikasi"
                  : statusInfo.status}
              </Badge>
            </div>

            <div className="text-foreground text-lg font-black">
              {statusInfo.daysRemaining > 0 ? (
                <span>
                  Masa Aktif Tersisa: {statusInfo.daysRemaining} Hari Lagi
                </span>
              ) : statusInfo.isGracePeriod ? (
                <span className="text-amber-600 dark:text-amber-400">
                  Masa Tenggang (Grace Period): Tersisa{" "}
                  {statusInfo.graceDaysRemaining} Hari
                </span>
              ) : (
                <span className="text-destructive">
                  Masa Langganan Telah Berakhir
                </span>
              )}
            </div>

            <p className="text-muted-foreground text-xs">
              Berlaku hingga:{" "}
              <strong>
                {statusInfo.expiresAt
                  ? new Date(statusInfo.expiresAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Masa Uji Coba Gratis"}
              </strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-muted-foreground block text-xs">
              Tarif Flat
            </span>
            <span className="text-primary text-xl font-black">
              Rp 50.000 / bln
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Pilihan Paket & Instruksi Pembayaran */}
        <div className="space-y-6 lg:col-span-7">
          {/* Pilihan Durasi Bulan */}
          <Card className="bg-card border shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-extrabold">
                1. Pilih Durasi Perpanjangan
              </CardTitle>
              <CardDescription className="text-xs">
                Pilih paket masa aktif cabang yang ingin diperpanjang.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => setSelectedDuration(opt.months)}
                    className={`rounded-xl border p-3.5 text-center transition-all ${
                      selectedDuration === opt.months
                        ? "border-primary bg-primary/10 ring-primary/20 ring-2"
                        : "bg-muted/30 hover:bg-muted/60 border-border"
                    }`}
                  >
                    <Badge
                      variant="secondary"
                      className="mb-1 h-4 px-1 py-0 text-[10px] font-bold"
                    >
                      {opt.tag}
                    </Badge>
                    <div className="text-foreground text-sm font-black">
                      {opt.label}
                    </div>
                    <div className="text-primary mt-1 text-xs font-bold">
                      {formatRupiah(opt.price)}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rekening Bank & QRIS Usaha */}
          <Card className="bg-card border shadow-xs">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold">
                  2. Metode Pembayaran & Transfer
                </CardTitle>
                <div className="bg-muted/40 flex items-center gap-1 rounded-lg border p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    className={`rounded-md px-2.5 py-1 ${
                      paymentMethod === "BANK_TRANSFER"
                        ? "bg-background text-primary shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    Transfer Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("QRIS")}
                    className={`rounded-md px-2.5 py-1 ${
                      paymentMethod === "QRIS"
                        ? "bg-background text-primary shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    QRIS Usaha
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-5 pt-0">
              {paymentMethod === "BANK_TRANSFER" ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs">
                    Silakan transfer tepat sebesar{" "}
                    <strong className="text-foreground text-sm font-black">
                      {formatRupiah(activeOption.price)}
                    </strong>{" "}
                    ke salah satu rekening resmi di bawah ini:
                  </p>

                  <div className="space-y-2">
                    {BANK_ACCOUNTS.map((acc) => (
                      <div
                        key={acc.bank}
                        className="bg-muted/40 flex items-center justify-between rounded-xl border p-3.5"
                      >
                        <div>
                          <span className="text-primary block text-xs font-extrabold">
                            Bank {acc.bank}
                          </span>
                          <span className="text-foreground font-mono text-base font-black">
                            {acc.number}
                          </span>
                          <span className="text-muted-foreground block text-[11px]">
                            a.n. {acc.name}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(acc.number)}
                          className="h-8 gap-1 text-xs font-bold"
                        >
                          {copiedAccount === acc.number ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 space-y-3 rounded-xl border p-4 text-center">
                  <div className="inline-block rounded-2xl border bg-white p-4 shadow-sm">
                    <QrCode className="mx-auto h-36 w-36 text-slate-900" />
                  </div>
                  <div>
                    <h4 className="text-foreground text-sm font-extrabold">
                      QRIS Usaha Kinclongin
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      Bisa di-scan menggunakan GoPay, OVO, DANA, ShopeePay, atau
                      Mobile Banking apa saja.
                    </p>
                  </div>
                  <div className="text-primary text-sm font-black">
                    Total: {formatRupiah(activeOption.price)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Upload Bukti Transfer */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="bg-card border shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-extrabold">
                3. Unggah Bukti Bayar
              </CardTitle>
              <CardDescription className="text-xs">
                Kirim tangkapan layar struk transfer bank atau bukti transaksi
                QRIS.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5 pt-0">
              <div className="border-border hover:border-primary/50 rounded-2xl border-2 border-dashed p-6 text-center transition-colors">
                <input
                  type="file"
                  id="proof-upload"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="proof-upload"
                  className="flex cursor-pointer flex-col items-center justify-center space-y-2"
                >
                  <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-primary block text-xs font-bold">
                      Klik untuk pilih foto bukti
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Format PNG, JPG, WebP (maks. 5MB)
                    </span>
                  </div>
                </label>
              </div>

              {proofFile && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs">
                  <div className="flex items-center gap-2 truncate text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate font-semibold">
                      {proofFile.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {(proofFile.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              )}

              {/* Ringkasan Konfirmasi */}
              <div className="bg-muted/40 space-y-1.5 rounded-xl border p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durasi Pilihan:</span>
                  <span className="font-bold">{activeOption.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Metode Pembayaran:
                  </span>
                  <span className="font-bold">{paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 text-sm font-black">
                  <span>Total Tagihan:</span>
                  <span className="text-primary">
                    {formatRupiah(activeOption.price)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                disabled={!proofFile || isPending || isUploading}
                onClick={handleSubmitProof}
                className="h-11 w-full gap-2 text-sm font-black shadow-sm"
              >
                {isPending || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengunggah & Mengajukan...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    <span>Kirim Bukti Pembayaran</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
