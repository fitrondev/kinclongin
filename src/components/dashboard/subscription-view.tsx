"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Info,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import {
  SubscriptionStatusInfo,
  TenantSubscriptionPaymentItem,
  getSubscriptionHistoryAction,
  getSubscriptionStatusAction,
  submitSubscriptionPaymentAction,
} from "@/actions/subscription";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStorageUpload } from "@/hooks/use-storage-upload";
import { formatRupiah, formatTanggalIndo } from "@/lib/formatters";

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  code: string;
  color: string;
}

const OFFICIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    bankName: "Bank Central Asia (BCA)",
    accountNumber: "8735092111",
    accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
    code: "BCA",
    color: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300",
  },
  {
    bankName: "Bank Mandiri",
    accountNumber: "1610098234888",
    accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
    code: "MANDIRI",
    color:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  {
    bankName: "Bank Rakyat Indonesia (BRI)",
    accountNumber: "002101009876502",
    accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
    code: "BRI",
    color: "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300",
  },
  {
    bankName: "Bank NTB Syariah",
    accountNumber: "501020988711",
    accountHolder: "PT KINCLONGIN DIGITAL NUSANTARA",
    code: "NTB_SYARIAH",
    color:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  },
];

const DURATION_OPTIONS = [
  {
    months: 1,
    title: "1 Bulan",
    price: 50000,
    badge: "Standar Bulanan",
    recommended: false,
  },
  {
    months: 3,
    title: "3 Bulan",
    price: 150000,
    badge: "Fleksibel",
    recommended: false,
  },
  {
    months: 6,
    title: "6 Bulan",
    price: 300000,
    badge: "Paling Populer",
    recommended: true,
  },
  {
    months: 12,
    title: "12 Bulan (1 Tahun)",
    price: 600000,
    badge: "Bebas Pusing Setahun",
    recommended: false,
  },
];

interface SubscriptionViewProps {
  outletId: string;
  outletName: string;
  initialStatus?: SubscriptionStatusInfo;
  initialHistory?: TenantSubscriptionPaymentItem[];
}

export function SubscriptionView({
  outletId,
  outletName,
  initialStatus,
  initialHistory = [],
}: SubscriptionViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SubscriptionStatusInfo | undefined>(
    initialStatus
  );
  const [history, setHistory] =
    useState<TenantSubscriptionPaymentItem[]>(initialHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form State
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<
    "MANUAL_TRANSFER" | "QRIS"
  >("MANUAL_TRANSFER");
  const [senderNotes, setSenderNotes] = useState("");
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Storage Upload Hook
  const {
    upload,
    isUploading,
    progress,
    error: uploadError,
    reset: resetUpload,
  } = useStorageUpload();

  // QRIS Image Data URL
  const [qrisDataUrl, setQrisDataUrl] = useState<string>("");

  // Modal Preview Bukti Bayar
  const [previewPayment, setPreviewPayment] =
    useState<TenantSubscriptionPaymentItem | null>(null);

  // Generate QR Code QRIS statis Kinclongin
  useEffect(() => {
    const qrisPayload =
      "00020101021226670016ID.CO.KINCLONGIN01189360091400208123455204581253033605802ID5920PT KINCLONGIN DIGITAL5907MATARAM62070703A016304ABCD";

    QRCode.toDataURL(qrisPayload, {
      width: 320,
      margin: 1,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrisDataUrl(url))
      .catch((err) => console.error("Gagal generate QRIS:", err));
  }, []);

  const totalAmount = selectedDuration * 50000;

  // Refresh status & riwayat
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        getSubscriptionStatusAction(outletId),
        getSubscriptionHistoryAction(outletId),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
      toast.success("Status langganan berhasil diperbarui.");
    } catch {
      toast.error("Gagal memperbarui status langganan.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Salin nomor rekening ke clipboard
  const handleCopy = async (accountNumber: string, bankName: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(accountNumber);
      toast.success(`Nomor rekening ${bankName} berhasil disalin!`);
      setTimeout(() => setCopiedAccount(null), 2500);
    } catch {
      toast.error("Gagal menyalin nomor rekening.");
    }
  };

  // Upload berkas bukti transfer ke SumoPod S3
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran berkas maksimal 5MB.");
      return;
    }

    const res = await upload(file, "PAYMENT_PROOF", outletId);
    if (res && res.publicUrl) {
      setUploadedProofUrl(res.publicUrl);
      toast.success("Bukti transfer berhasil diunggah ke penyimpanan cloud.");
    } else {
      toast.error(uploadError || "Gagal mengunggah foto bukti bayar.");
    }
  };

  // Submit formulir pembayaran sewa
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedProofUrl) {
      toast.error(
        "Silakan unggah foto/screenshot bukti transfer terlebih dahulu."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitSubscriptionPaymentAction({
        outletId,
        periodMonths: selectedDuration,
        paymentMethod,
        paymentProofUrl: uploadedProofUrl,
        notes: senderNotes,
      });

      if (res.success) {
        toast.success(
          "Bukti transfer berhasil dikirim! Menunggu verifikasi Superadmin platform."
        );
        setUploadedProofUrl(null);
        setSenderNotes("");
        resetUpload();

        // Refresh data
        await handleRefresh();
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengirim bukti pembayaran.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysRemaining = status?.daysRemaining ?? 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, (daysRemaining / 30) * 100)
  );

  return (
    <div className="space-y-8">
      {/* 1. Header Page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tagihan & Lisensi Cabang
            </h1>
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-600"
            >
              Rp 50.000 / Bulan
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Cabang: <strong className="text-foreground">{outletName}</strong> —
            Kelola biaya sewa software, perpanjang masa aktif, dan unggah bukti
            transfer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan Status</span>
          </Button>

          <Button asChild size="sm" className="gap-1.5 font-bold shadow-xs">
            <Link href="/pos">
              <span>Buka POS Kasir</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Banner Notifikasi Pembayaran Pending */}
      {status?.hasPendingPayment && (
        <aside
          aria-label="Pemberitahuan verifikasi pembayaran"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
        >
          <Clock className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-amber-600 dark:text-amber-400" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold">
              Pembayaran Sewa Sedang Dalam Antrean Verifikasi Admin
            </h4>
            <p className="leading-relaxed opacity-90">
              Bukti pembayaran Anda telah tersimpan di sistem dan sedang
              ditinjau oleh Superadmin platform. Akses POS dan seluruh fitur
              operasional cabang tetap aktif berjalan seperti biasa.
            </p>
          </div>
        </aside>
      )}

      {/* 3. Kartu Ringkasan Status Sewa */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Status Masa Aktif */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold">
                Status Masa Aktif Cabang
              </CardDescription>
              {status?.isHardLocked ? (
                <Badge variant="destructive" className="gap-1 font-bold">
                  <Lock className="h-3 w-3" />
                  <span>Kedaluwarsa</span>
                </Badge>
              ) : status?.isGracePeriod ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  <span>Masa Tenggang</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300"
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>Langganan Aktif</span>
                </Badge>
              )}
            </div>
            <CardTitle className="mt-2 text-2xl font-black">
              {status?.isHardLocked
                ? "Akses POS Terkunci"
                : status?.isGracePeriod
                  ? `Sisa ${status.graceDaysRemaining} Hari Masa Tenggang`
                  : `Sisa ${daysRemaining} Hari Aktif`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            <div className="space-y-1 text-xs">
              <div className="text-muted-foreground flex justify-between">
                <span>Masa Berlaku:</span>
                <span className="text-foreground font-semibold">
                  {status?.expiresAt
                    ? formatTanggalIndo(status.expiresAt)
                    : "Belum Ditentukan"}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {status?.isHardLocked
                ? "Masa tenggang 3 hari telah berakhir. Perpanjang sewa untuk mengaktifkan kembali pendaftaran tiket kasir."
                : status?.isGracePeriod
                  ? "Cabang berada dalam masa tenggang toleransi (3 hari). Kasir masih dapat mencuci namun harap segera lakukan transfer."
                  : "Sistem beroperasi normal tanpa pembatasan antrean atau fitur."}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Tarif Flat & Keunggulan */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold">
                Tarif Flat Lisensi Cabang
              </CardDescription>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Semua Fitur
              </Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-primary text-3xl font-black">
                Rp 50.000
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                / cabang / bulan
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-3 text-xs">
            <div className="text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Multi-Kasir POS & Kanban Visual Realtime</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Tablet Kiosk Washer PIN Area Basah</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>PWA Offline-First & Struk Thermal Bluetooth</span>
            </div>
          </CardContent>
          <CardFooter className="text-muted-foreground pt-0 text-[11px]">
            Tanpa potongan persen omzet. 100% keuntungan tiket milik Anda.
          </CardFooter>
        </Card>

        {/* Card 3: Rekap Pembayaran */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold">
                Riwayat Pengajuan Sewa
              </CardDescription>
              <FileText className="text-muted-foreground h-4 w-4" />
            </div>
            <CardTitle className="text-2xl font-black">
              {history.length} Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disetujui:</span>
              <span className="font-bold text-emerald-600">
                {history.filter((h) => h.status === "APPROVED").length} kali
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Menunggu Verifikasi:
              </span>
              <span className="font-bold text-amber-600">
                {history.filter((h) => h.status === "PENDING").length} kali
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ditolak:</span>
              <span className="text-destructive font-bold">
                {history.filter((h) => h.status === "REJECTED").length} kali
              </span>
            </div>
          </CardContent>
          <CardFooter className="text-muted-foreground pt-0 text-[11px]">
            Verifikasi ditangani langsung oleh tim finance Kinclongin.
          </CardFooter>
        </Card>
      </div>

      {/* 4. Formulir Perpanjang Masa Langganan (Multi-Step Form) */}
      <Card className="border shadow-md">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center gap-2">
            <CreditCard className="text-primary h-5 w-5" />
            <CardTitle className="text-lg font-bold">
              Formulir Perpanjangan Sewa Software
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Pilih paket durasi, lakukan transfer pembayaran, dan unggah foto
            bukti transfer untuk verifikasi admin.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmitPayment}>
          <CardContent className="space-y-6 pt-6">
            {/* Langkah 1: Pilih Durasi */}
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Langkah 1: Pilih Durasi Sewa
              </Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = selectedDuration === opt.months;
                  return (
                    <div
                      key={opt.months}
                      onClick={() => setSelectedDuration(opt.months)}
                      className={`hover:border-primary/50 relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-primary/20 shadow-xs ring-2"
                          : "border-border bg-card"
                      }`}
                    >
                      {opt.recommended && (
                        <div className="absolute -top-2.5 right-3">
                          <Badge className="bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-black shadow-xs">
                            REKOMENDASI
                          </Badge>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground text-sm font-bold">
                            {opt.title}
                          </span>
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 stroke-3" />
                            )}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[11px]">
                          {opt.badge}
                        </p>
                      </div>

                      <div className="mt-4 border-t pt-2">
                        <span className="text-foreground text-lg font-black">
                          {formatRupiah(opt.price)}
                        </span>
                        <span className="text-muted-foreground block text-[10px]">
                          +{opt.months * 30} hari masa aktif
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Langkah 2: Metode Pembayaran & Rekening Instruksi */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Langkah 2: Pilih Metode Pembayaran
                </Label>
                <div className="text-xs">
                  Total Tagihan:{" "}
                  <strong className="text-primary text-base">
                    {formatRupiah(totalAmount)}
                  </strong>
                </div>
              </div>

              <Tabs
                value={paymentMethod}
                onValueChange={(v) =>
                  setPaymentMethod(v as "MANUAL_TRANSFER" | "QRIS")
                }
                className="w-full"
              >
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="MANUAL_TRANSFER"
                    className="gap-2 text-xs font-bold"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Transfer Bank Manual</span>
                  </TabsTrigger>
                  <TabsTrigger value="QRIS" className="gap-2 text-xs font-bold">
                    <QrCode className="h-3.5 w-3.5" />
                    <span>QRIS Usaha Statis</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Transfer Bank Manual */}
                <TabsContent value="MANUAL_TRANSFER" className="space-y-3 pt-3">
                  <p className="text-muted-foreground text-xs">
                    Transfer nominal{" "}
                    <strong>{formatRupiah(totalAmount)}</strong> ke salah satu
                    rekening bank resmi platform Kinclongin berikut:
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {OFFICIAL_BANK_ACCOUNTS.map((b) => (
                      <div
                        key={b.code}
                        className={`flex flex-col justify-between rounded-xl border p-4 ${b.color}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black">
                              {b.bankName}
                            </span>
                            <span className="text-muted-foreground block text-[11px]">
                              a.n. {b.accountHolder}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold"
                          >
                            {b.code}
                          </Badge>
                        </div>

                        <div className="bg-background/80 mt-3 flex items-center justify-between rounded-lg border p-2.5">
                          <span className="text-foreground font-mono text-base font-black tracking-wider">
                            {b.accountNumber}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopy(b.accountNumber, b.bankName)
                            }
                            className="h-8 gap-1 px-2.5 text-xs font-bold"
                          >
                            {copiedAccount === b.accountNumber ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-600">
                                  Tersalin
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Salin</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-[11px]">
                    <strong className="text-foreground">Tips:</strong> Cantumkan
                    nama cabang Anda (<em>{outletName}</em>) pada kolom
                    berita/catatan transfer m-banking agar verifikasi berjalan
                    cepat.
                  </div>
                </TabsContent>

                {/* Tab: QRIS Usaha Statis */}
                <TabsContent value="QRIS" className="space-y-4 pt-3">
                  <div className="bg-card flex flex-col items-center gap-6 rounded-2xl border p-6 sm:flex-row sm:items-start">
                    {/* Visual QRIS Card */}
                    <div className="flex flex-col items-center rounded-2xl border bg-white p-4 text-slate-900 shadow-md">
                      {/* Logo Header QRIS & GPN */}
                      <div className="flex w-full items-center justify-between border-b pb-2">
                        <span className="text-sm font-black tracking-tighter text-red-600">
                          QRIS
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          PEMBAYARAN DIGITAL
                        </span>
                      </div>

                      {/* QR Code Container */}
                      <div className="my-3 flex items-center justify-center rounded-xl bg-white p-2">
                        {qrisDataUrl ? (
                          <Image
                            src={qrisDataUrl}
                            alt="QRIS Kinclongin POS"
                            width={220}
                            height={220}
                            className="h-52 w-52 object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-52 w-52 items-center justify-center bg-slate-100">
                            <span className="text-xs text-slate-400">
                              Memuat QRIS...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Merchant Identity */}
                      <div className="w-full text-center">
                        <span className="block text-xs font-black tracking-tight">
                          PT KINCLONGIN DIGITAL NUSANTARA
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          NMID: ID1024392817291
                        </span>
                      </div>
                    </div>

                    {/* Instruksi Pembayaran QRIS */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <h4 className="text-foreground text-sm font-bold">
                          Scan QRIS via Mobile Banking & E-Wallet
                        </h4>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Mendukung BCA Mobile, Livin by Mandiri, BRImo, BNI
                          Mobile, GoPay, OVO, Dana, ShopeePay, dan seluruh
                          aplikasi berstandar QRIS.
                        </p>
                      </div>

                      <ol className="text-muted-foreground list-decimal space-y-2 pl-4">
                        <li>
                          Buka aplikasi mobile banking atau e-wallet pilihan
                          Anda.
                        </li>
                        <li>Pindai (Scan) kode QRIS di sebelah kiri.</li>
                        <li>
                          Ketik nominal persis:{" "}
                          <strong className="text-foreground">
                            {formatRupiah(totalAmount)}
                          </strong>
                          .
                        </li>
                        <li>
                          Konfirmasi pembayaran dan simpan bukti
                          transaksi/struk.
                        </li>
                      </ol>

                      {qrisDataUrl && (
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                            className="gap-1.5 text-xs font-semibold"
                          >
                            <a
                              href={qrisDataUrl}
                              download="QRIS-Kinclongin-POS.png"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Unduh Gambar QRIS</span>
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <Separator />

            {/* Langkah 3: Unggah Bukti Bayar & Catatan */}
            <div className="space-y-4">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Langkah 3: Unggah Bukti Transfer & Catatan
              </Label>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Uploader Box */}
                <div className="space-y-2">
                  <Label htmlFor="proof-file" className="text-xs font-semibold">
                    Foto / Screenshot Struk Bukti Bayar *
                  </Label>

                  <div className="border-border bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors">
                    {uploadedProofUrl ? (
                      <div className="flex flex-col items-center space-y-3 text-center">
                        <div className="relative h-32 w-32 overflow-hidden rounded-lg border shadow-xs">
                          <Image
                            src={uploadedProofUrl}
                            alt="Bukti Transfer"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Berkas Siap</span>
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedProofUrl(null);
                              resetUpload();
                            }}
                            className="text-destructive hover:bg-destructive/10 h-7 text-xs"
                          >
                            Ganti Foto
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                          <Upload className="h-5 w-5" />
                        </div>
                        <span className="text-foreground mt-2 text-xs font-bold">
                          Pilih berkas bukti transfer
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          Format JPG, PNG, WEBP, atau PDF (Maks. 5MB)
                        </span>

                        <input
                          id="proof-file"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          className="text-muted-foreground file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 mt-3 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                        />

                        {isUploading && (
                          <div className="mt-3 w-full space-y-1">
                            <Progress value={progress} className="h-1.5" />
                            <span className="text-muted-foreground text-[10px]">
                              Mengunggah ke SumoPod S3 ({progress}%)...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Input Catatan Pengirim */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-semibold">
                      Nama Pengirim / Catatan Rekening (Opsional)
                    </Label>
                    <Input
                      id="notes"
                      placeholder="Contoh: Transfer BCA a.n. Budi Santoso"
                      value={senderNotes}
                      onChange={(e) => setSenderNotes(e.target.value)}
                      className="text-xs"
                    />
                    <span className="text-muted-foreground text-[10px]">
                      Membantu proses pencocokan mutasi rekening oleh tim admin
                      kami.
                    </span>
                  </div>

                  <div className="bg-muted/30 space-y-1.5 rounded-xl border p-3 text-xs">
                    <span className="text-foreground block font-bold">
                      Ringkasan Pengajuan:
                    </span>
                    <div className="text-muted-foreground flex justify-between">
                      <span>Cabang:</span>
                      <span className="text-foreground font-semibold">
                        {outletName}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex justify-between">
                      <span>Durasi:</span>
                      <span className="text-foreground font-semibold">
                        {selectedDuration} Bulan (+{selectedDuration * 30} Hari)
                      </span>
                    </div>
                    <div className="text-muted-foreground flex justify-between">
                      <span>Metode:</span>
                      <span className="text-foreground font-semibold">
                        {paymentMethod === "QRIS"
                          ? "QRIS Usaha"
                          : "Transfer Bank"}
                      </span>
                    </div>
                    <div className="text-foreground flex justify-between border-t pt-1 text-sm font-black">
                      <span>Total Biaya:</span>
                      <span className="text-primary">
                        {formatRupiah(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/10 flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-[11px]">
              Setelah dikirim, perpanjangan akan diverifikasi dalam 1x24 jam
              kerja.
            </p>

            <Button
              type="submit"
              disabled={isSubmitting || !uploadedProofUrl || isUploading}
              className="w-full gap-2 font-bold shadow-xs sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Mengirim Bukti...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Kirim Bukti Pembayaran ({formatRupiah(totalAmount)})
                  </span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 5. Riwayat Pembayaran Sewa Outlet (Task 6.3) */}
      <Card className="border shadow-xs">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">
                Riwayat Tagihan & Pembayaran Sewa Cabang
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar lengkap bukti transfer yang diajukan beserta status
                verifikasi admin.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Total {history.length} Catatan
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-2xl">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-foreground mt-3 text-sm font-bold">
                Belum Ada Riwayat Pembayaran
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                Anda belum pernah mengajukan bukti pembayaran sewa. Gunakan
                formulir di atas untuk memperpanjang masa aktif cabang Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-bold">Tanggal</TableHead>
                    <TableHead className="text-xs font-bold">Durasi</TableHead>
                    <TableHead className="text-xs font-bold">Nominal</TableHead>
                    <TableHead className="text-xs font-bold">Metode</TableHead>
                    <TableHead className="text-xs font-bold">
                      Bukti Transfer
                    </TableHead>
                    <TableHead className="text-xs font-bold">
                      Status Verifikasi
                    </TableHead>
                    <TableHead className="text-xs font-bold">
                      Catatan & Verifikator
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} className="text-xs">
                      {/* Tanggal */}
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatTanggalIndo(item.createdAt)}
                      </TableCell>

                      {/* Durasi */}
                      <TableCell className="whitespace-nowrap">
                        <span className="text-foreground font-bold">
                          {item.periodMonths} Bulan
                        </span>
                        <span className="text-muted-foreground block text-[10px]">
                          +{item.periodMonths * 30} Hari
                        </span>
                      </TableCell>

                      {/* Nominal */}
                      <TableCell className="text-foreground font-bold whitespace-nowrap">
                        {formatRupiah(item.amount)}
                      </TableCell>

                      {/* Metode */}
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold"
                        >
                          {item.paymentMethod === "QRIS"
                            ? "QRIS Usaha"
                            : "Transfer Bank"}
                        </Badge>
                      </TableCell>

                      {/* Bukti Transfer */}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewPayment(item)}
                          className="h-7 gap-1 text-[11px] font-semibold"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Lihat Bukti</span>
                        </Button>
                      </TableCell>

                      {/* Status Verifikasi Badge */}
                      <TableCell>
                        {item.status === "APPROVED" ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Disetujui</span>
                          </Badge>
                        ) : item.status === "REJECTED" ? (
                          <Badge
                            variant="destructive"
                            className="gap-1 font-bold"
                          >
                            <X className="h-3 w-3" />
                            <span>Ditolak</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300"
                          >
                            <Clock className="h-3 w-3" />
                            <span>Menunggu Verifikasi</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Catatan / Alasan Penolakan */}
                      <TableCell className="text-muted-foreground max-w-xs truncate text-[11px]">
                        {item.status === "REJECTED" && item.rejectionReason ? (
                          <span className="text-destructive block font-medium">
                            Alasan: {item.rejectionReason}
                          </span>
                        ) : null}
                        {item.notes ? (
                          <span className="block truncate">
                            Ket: {item.notes}
                          </span>
                        ) : null}
                        {item.verifiedBy ? (
                          <span className="text-muted-foreground/80 block text-[10px]">
                            Oleh: {item.verifiedBy} (
                            {item.verifiedAt
                              ? formatTanggalIndo(item.verifiedAt)
                              : "-"}
                            )
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-[10px] italic">
                            Dalam antrean
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Modal Dialog Preview Bukti Transfer */}
      <Dialog
        open={!!previewPayment}
        onOpenChange={(open) => !open && setPreviewPayment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Detail Bukti Pembayaran Sewa
            </DialogTitle>
            <DialogDescription className="text-xs">
              ID: {previewPayment?.id} • Diajukan:{" "}
              {previewPayment?.createdAt
                ? formatTanggalIndo(previewPayment.createdAt)
                : "-"}
            </DialogDescription>
          </DialogHeader>

          {previewPayment && (
            <div className="space-y-4">
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border bg-black/5 dark:bg-white/5">
                <Image
                  src={previewPayment.paymentProofUrl}
                  alt="Bukti Transfer"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="bg-muted/40 space-y-1 rounded-xl border p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durasi:</span>
                  <span className="text-foreground font-bold">
                    {previewPayment.periodMonths} Bulan (+
                    {previewPayment.periodMonths * 30} Hari)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal:</span>
                  <span className="text-primary font-black">
                    {formatRupiah(previewPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode:</span>
                  <span className="text-foreground font-semibold">
                    {previewPayment.paymentMethod === "QRIS"
                      ? "QRIS Usaha"
                      : "Transfer Bank Manual"}
                  </span>
                </div>
                {previewPayment.notes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Catatan:</span>
                    <span className="text-foreground font-medium">
                      {previewPayment.notes}
                    </span>
                  </div>
                )}
                {previewPayment.rejectionReason && (
                  <div className="text-destructive border-t pt-1">
                    <span className="font-bold">Alasan Penolakan: </span>
                    <span>{previewPayment.rejectionReason}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs font-semibold"
                >
                  <a
                    href={previewPayment.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Buka Ukuran Asli</span>
                  </a>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPreviewPayment(null)}
                  className="text-xs font-semibold"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
