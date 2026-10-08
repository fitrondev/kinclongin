"use client";

import { useState, useTransition } from "react";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  MessageSquare,
  Power,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  type WashClubSubscriptionItem,
  sendWashClubPassAction,
  toggleWashClubSubscriptionAction,
} from "@/actions/wash-club";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/formatters";

interface WashClubTableProps {
  initialSubscriptions: WashClubSubscriptionItem[];
  outletId: string;
}

export function WashClubTable({
  initialSubscriptions,
  outletId,
}: WashClubTableProps) {
  const [subscriptions, setSubscriptions] =
    useState<WashClubSubscriptionItem[]>(initialSubscriptions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "EXPIRED"
  >("ALL");
  const [isPending, startTransition] = useTransition();

  const filteredItems = subscriptions.filter((sub) => {
    if (statusFilter === "ACTIVE" && (!sub.isActive || sub.isExpired))
      return false;
    if (statusFilter === "EXPIRED" && !sub.isExpired) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        sub.vehicle.licensePlate.toLowerCase().includes(q) ||
        sub.customer.fullName.toLowerCase().includes(q) ||
        sub.customer.phone.includes(q) ||
        sub.qrPassCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleWashClubSubscriptionAction(id, !currentStatus);
      if (!res.success) {
        toast.error(res.error || "Gagal mengubah status langganan.");
        return;
      }
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !currentStatus } : s))
      );
      toast.success(
        `Langganan berhasil ${!currentStatus ? "diaktifkan" : "dinonaktifkan"}.`
      );
    });
  };

  const handleSendPass = (id: string, phone: string) => {
    startTransition(async () => {
      const res = await sendWashClubPassAction(id);
      if (!res.success) {
        toast.error(res.error || "Gagal mengirim kartu pass ke WhatsApp.");
        return;
      }
      toast.success(`Kartu Digital Pass berhasil dikirim ulang ke ${phone}!`);
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>Member Unlimited Wash Club Terdaftar</span>
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Pelanggan dengan akses cuci tanpa batas terkunci pada nomor plat
            kendaraan.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            placeholder="Cari plat nomor / pelanggan / kode pass..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl text-xs sm:w-64"
          />

          <div className="flex items-center gap-1 rounded-xl border p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Semua ({subscriptions.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === "ACTIVE"
                  ? "bg-yellow-500 font-bold text-black"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("EXPIRED")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === "EXPIRED"
                  ? "bg-muted text-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Kedaluwarsa
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-xs">
            <Crown className="mx-auto mb-2 h-8 w-8 text-yellow-500 opacity-40" />
            Tidak ada kendaraan dengan paket Unlimited Wash Club yang sesuai
            filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-180">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">
                    Plat & Kendaraan
                  </TableHead>
                  <TableHead className="text-xs font-bold">Pemilik</TableHead>
                  <TableHead className="text-xs font-bold">
                    Paket Langganan
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Masa Aktif
                  </TableHead>
                  <TableHead className="text-xs font-bold">Kode Pass</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((sub) => {
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-foreground font-mono text-xs font-black">
                            {sub.vehicle.licensePlate}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {sub.vehicle.brand || ""} {sub.vehicle.model || ""}{" "}
                            ({sub.vehicle.totalVisits}x kunjungan)
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-foreground text-xs font-bold">
                            {sub.customer.fullName}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {sub.customer.phone}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-foreground text-xs font-bold">
                            {sub.planName}
                          </span>
                          <span className="text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">
                            {formatRupiah(sub.priceMonthly)}/bln
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-foreground font-semibold">
                            s/d{" "}
                            {new Date(sub.expiresAt).toLocaleDateString(
                              "id-ID"
                            )}
                          </span>
                          <span
                            className={`text-[11px] font-bold ${
                              sub.isExpired
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {sub.isExpired
                              ? "Sudah Kedaluwarsa"
                              : `Sisa ${sub.daysRemaining} hari`}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="border-yellow-500/40 bg-yellow-500/10 font-mono text-[11px] font-bold text-yellow-800 dark:text-yellow-300"
                        >
                          {sub.qrPassCode}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {!sub.isActive ? (
                          <Badge variant="secondary" className="text-[11px]">
                            Nonaktif
                          </Badge>
                        ) : sub.isExpired ? (
                          <Badge
                            variant="outline"
                            className="border-destructive/30 bg-destructive/10 text-destructive text-[11px] font-bold"
                          >
                            Kedaluwarsa
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-[11px] font-bold text-white">
                            Aktif (Unlimited)
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() =>
                              handleSendPass(sub.id, sub.customer.phone)
                            }
                            className="h-8 gap-1 text-[11px] font-bold"
                            title="Kirim Kartu Digital Pass WhatsApp"
                          >
                            <Send className="h-3 w-3 text-emerald-600" />
                            <span className="hidden sm:inline">Kirim WA</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() =>
                              handleToggleStatus(sub.id, sub.isActive)
                            }
                            className={`h-8 px-2 text-xs ${
                              sub.isActive
                                ? "text-muted-foreground hover:text-destructive"
                                : "text-emerald-600"
                            }`}
                            title={sub.isActive ? "Nonaktifkan" : "Aktifkan"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
