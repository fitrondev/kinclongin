"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Megaphone,
  Radio,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { sendPlatformBroadcastAction } from "@/actions/superadmin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface SuperadminBroadcastViewProps {
  initialHistory: Array<{
    id: string;
    title: string;
    message: string;
    targetAudience: string;
    priority: string;
    recipientCount: number;
    operatorName: string;
    createdAt: string;
  }>;
}

export function SuperadminBroadcastView({
  initialHistory,
}: SuperadminBroadcastViewProps) {
  const router = useRouter();
  const [history, setHistory] = useState(initialHistory);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<
    "ALL_OWNERS" | "ALL_MANAGERS" | "ALL_USERS"
  >("ALL_OWNERS");
  const [priority, setPriority] = useState<"INFO" | "IMPORTANT" | "CRITICAL">(
    "INFO"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Harap isi judul dan pesan pengumuman.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPlatformBroadcastAction({
        title,
        message,
        targetAudience,
        priority,
      });

      if (res.success && res.data) {
        toast.success(
          `Siaran berhasil dikirim ke ${res.data.recipientCount} pengguna sasaran.`
        );
        setTitle("");
        setMessage("");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengirim siaran.");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat mengirim pengumuman.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
          Pusat Siaran Pengumuman Platform
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Kirim notifikasi pengumuman pemeliharaan sistem, promosi sewa tahunan,
          atau pembaruan aplikasi langsung ke seluruh Owner cabang.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 2. Formulir Kirim Broadcast (7 Kolom) */}
        <div className="lg:col-span-7">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">
                    Buat Siaran Baru
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pengumuman resmi dari Kinclongin Platform Provider
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    Judul Pengumuman:
                  </label>
                  <Input
                    placeholder="Contoh: Pemeliharaan Server Kinclongin (Minggu, 01:00 WIB)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xs sm:text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">
                      Target Penerima:
                    </label>
                    <Select
                      value={targetAudience}
                      onValueChange={(v) =>
                        setTargetAudience(
                          v as "ALL_OWNERS" | "ALL_MANAGERS" | "ALL_USERS"
                        )
                      }
                    >
                      <SelectTrigger className="text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_OWNERS">
                          Semua Owner Cabang (Rekomendasi)
                        </SelectItem>
                        <SelectItem value="ALL_MANAGERS">
                          Semua Manajer Cabang
                        </SelectItem>
                        <SelectItem value="ALL_USERS">
                          Seluruh Pengguna Platform
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Prioritas:</label>
                    <Select
                      value={priority}
                      onValueChange={(v) =>
                        setPriority(v as "INFO" | "IMPORTANT" | "CRITICAL")
                      }
                    >
                      <SelectTrigger className="text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFO">
                          Informasi Biasa (Info)
                        </SelectItem>
                        <SelectItem value="IMPORTANT">
                          Penting (Important)
                        </SelectItem>
                        <SelectItem value="CRITICAL">
                          Mendesak (Critical)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    Isi Pesan Pengumuman:
                  </label>
                  <Textarea
                    placeholder="Tuliskan detail pesan pengumuman untuk para mitra..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-32 text-xs sm:text-sm"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !title || !message}
                  className="w-full bg-amber-600 font-bold text-white shadow-xs hover:bg-amber-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? "Mengirim Siaran..."
                      : "Kirim Pengumuman Sekarang"}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 3. Pratinjau Tampilan Pengumuman (5 Kolom) */}
        <div className="space-y-4 lg:col-span-5">
          <Card className="border-dashed shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-bold uppercase">
                Pratinjau Tampilan Pesan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`rounded-xl border p-4 ${
                  priority === "CRITICAL"
                    ? "border-destructive/30 bg-destructive/5"
                    : priority === "IMPORTANT"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold ${
                      priority === "CRITICAL"
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : priority === "IMPORTANT"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                          : "border-blue-500/20 bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {priority}
                  </Badge>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Kinclongin Official
                  </span>
                </div>

                <h4 className="text-foreground mt-2 text-sm font-black">
                  {title || "Judul Pengumuman Anda"}
                </h4>
                <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">
                  {message ||
                    "Isi pesan pengumuman yang Anda ketikkan akan tampil di dasbor penerima seperti ini."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold">
                Ketentuan Siaran Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1.5 text-xs">
              <p>
                • Siaran pengumuman akan tercatat di log audit sistem platform.
              </p>
              <p>
                • Pengumuman dengan prioritas <strong>CRITICAL</strong>{" "}
                ditujukan khusus untuk insiden keamanan atau pemadaman server
                darurat.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Riwayat Siaran Pengumuman Terakhir */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            Riwayat Siaran Terakhir
          </CardTitle>
          <CardDescription className="text-xs">
            Rekaman pengumuman yang telah disiarkan ke pengguna sistem
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">
                    Judul & Pesan
                  </TableHead>
                  <TableHead className="text-xs font-bold">Prioritas</TableHead>
                  <TableHead className="text-xs font-bold">
                    Target Audiens
                  </TableHead>
                  <TableHead className="text-xs font-bold">Penerima</TableHead>
                  <TableHead className="text-xs font-bold">Operator</TableHead>
                  <TableHead className="text-right text-xs font-bold">
                    Tanggal
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-8 text-center text-xs"
                    >
                      Belum ada siaran pengumuman yang dikirim.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="max-w-md py-3 text-xs">
                        <div className="font-bold">{h.title}</div>
                        <div className="text-muted-foreground line-clamp-1 text-[11px]">
                          {h.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold"
                        >
                          {h.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {h.targetAudience}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        {h.recipientCount} pengguna
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {h.operatorName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right font-mono text-xs">
                        {new Date(h.createdAt).toLocaleDateString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
