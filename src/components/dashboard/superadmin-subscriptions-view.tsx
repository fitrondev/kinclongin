"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { verifySubscriptionPaymentAction } from "@/actions/subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";

export interface PendingSubscriptionItem {
  id: string;
  outletId: string;
  outletName: string;
  amount: number;
  durationMonths: number;
  paymentMethod: string;
  proofImageUrl: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: Date;
}

export function SuperadminSubscriptionsView({
  initialPayments,
}: {
  initialPayments: PendingSubscriptionItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rejectDialogPayment, setRejectDialogPayment] =
    useState<PendingSubscriptionItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = (payment: PendingSubscriptionItem) => {
    startTransition(async () => {
      const res = await verifySubscriptionPaymentAction({
        paymentId: payment.id,
        decision: "APPROVE",
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyetujui pembayaran.");
        return;
      }

      toast.success(
        `Pembayaran ${payment.outletName} (${payment.durationMonths} Bulan) berhasil disetujui! Masa aktif diperpanjang +${
          payment.durationMonths * 30
        } hari.`
      );
      router.refresh();
    });
  };

  const handleConfirmReject = () => {
    if (!rejectDialogPayment) return;

    startTransition(async () => {
      const res = await verifySubscriptionPaymentAction({
        paymentId: rejectDialogPayment.id,
        decision: "REJECT",
        rejectionReason:
          rejectionReason || "Bukti transfer tidak dapat diverifikasi.",
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menolak pembayaran.");
        return;
      }

      toast.warning(
        `Pembayaran ${rejectDialogPayment.outletName} telah ditolak.`
      );
      setRejectDialogPayment(null);
      setRejectionReason("");
      router.refresh();
    });
  };

  const pendingCount = initialPayments.filter(
    (p) => p.status === "PENDING"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Verifikasi Pembayaran Langganan Superadmin
            </h1>
            {pendingCount > 0 && (
              <Badge className="border-amber-500/30 bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-300">
                {pendingCount} Menunggu
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Persetujuan 1-klik untuk memperpanjang masa aktif outlet cabang (+30
            hari per bulan).
          </p>
        </div>
      </div>

      <Card className="bg-card border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b text-[10px] font-bold uppercase">
                <tr>
                  <th className="px-5 py-3">Outlet Cabang</th>
                  <th className="px-5 py-3">Durasi Paket</th>
                  <th className="px-5 py-3">Total Transfer</th>
                  <th className="px-5 py-3">Metode</th>
                  <th className="px-5 py-3">Bukti Bayar</th>
                  <th className="px-5 py-3">Waktu Pengajuan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center"
                    >
                      Tidak ada riwayat pengajuan pembayaran langganan.
                    </td>
                  </tr>
                ) : (
                  initialPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="text-foreground px-5 py-4 font-bold">
                        <div className="flex items-center gap-2">
                          <Building2 className="text-primary h-4 w-4 shrink-0" />
                          <span>{p.outletName}</span>
                        </div>
                      </td>
                      <td className="text-foreground px-5 py-4 font-extrabold">
                        {p.durationMonths} Bulan
                      </td>
                      <td className="text-primary px-5 py-4 font-black">
                        {formatRupiah(p.amount)}
                      </td>
                      <td className="text-muted-foreground px-5 py-4 font-semibold">
                        {p.paymentMethod}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewImage(p.proofImageUrl)}
                          className="h-7 gap-1 px-2 text-[11px] font-bold"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Lihat Struk</span>
                        </Button>
                      </td>
                      <td className="text-muted-foreground px-5 py-4">
                        {new Date(p.submittedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            p.status === "APPROVED"
                              ? "default"
                              : p.status === "PENDING"
                                ? "outline"
                                : "destructive"
                          }
                          className="h-4 px-1.5 py-0 text-[10px] font-bold uppercase"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {p.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleApprove(p)}
                              className="h-8 gap-1 bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Setujui</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => setRejectDialogPayment(p)}
                              className="text-destructive hover:bg-destructive/10 h-8 gap-1 text-xs font-bold"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Tolak</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            {p.status === "APPROVED"
                              ? "Telah Disetujui"
                              : "Ditolak"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Preview Foto Struk */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onOpenChange={(open) => !open && setPreviewImage(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black">
                Foto Bukti Pembayaran / Struk
              </DialogTitle>
              <DialogDescription className="text-xs">
                Periksa keaslian transfer nominal dan rekening tujuan.
              </DialogDescription>
            </DialogHeader>
            <div className="relative h-80 w-full overflow-hidden rounded-xl border bg-black/5 dark:bg-black/30">
              <Image
                src={previewImage}
                alt="Bukti Transfer"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewImage(null)}
              >
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Konfirmasi Penolakan */}
      {rejectDialogPayment && (
        <Dialog
          open={!!rejectDialogPayment}
          onOpenChange={(open) => !open && setRejectDialogPayment(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-1.5 text-base font-black">
                <AlertTriangle className="h-4 w-4" />
                <span>Tolak Pembayaran Cabang</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Masukkan alasan penolakan untuk outlet{" "}
                {rejectDialogPayment.outletName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <Input
                type="text"
                placeholder="Alasan penolakan (cth: Nominal transfer tidak sesuai)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectDialogPayment(null)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmReject}
                disabled={isPending}
                className="font-bold"
              >
                {isPending ? "Memproses..." : "Konfirmasi Tolak"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
