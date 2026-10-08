"use client";

import { useMemo, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";

import type { PlatformWhatsAppLogItem } from "@/actions/superadmin";
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
import { WhatsAppDeliveryStatus } from "@/generated/prisma/enums";

interface SuperadminWhatsAppViewProps {
  initialLogs: PlatformWhatsAppLogItem[];
  stats: {
    totalLogs: number;
    delivered: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

export function SuperadminWhatsAppView({
  initialLogs,
  stats,
}: SuperadminWhatsAppViewProps) {
  const [logs, setLogs] = useState<PlatformWhatsAppLogItem[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        search === "" ||
        log.recipientPhone.includes(search) ||
        log.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        log.outletName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "ALL" || log.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [logs, search, statusFilter]);

  const getStatusBadge = (status: WhatsAppDeliveryStatus) => {
    switch (status) {
      case WhatsAppDeliveryStatus.DELIVERED:
        return (
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Terkirim & Diterima
          </Badge>
        );
      case WhatsAppDeliveryStatus.SENT:
        return (
          <Badge className="border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">
            <Send className="mr-1 h-3 w-3" />
            Terkirim ke Gateway
          </Badge>
        );
      case WhatsAppDeliveryStatus.PENDING:
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400"
          >
            <Clock className="mr-1 h-3 w-3" />
            Antrean Kirim
          </Badge>
        );
      case WhatsAppDeliveryStatus.FAILED:
        return (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold"
          >
            <XCircle className="mr-1 h-3 w-3" />
            Gagal Terkirim
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
              Log WhatsApp Gateway Platform
            </h1>
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Fonnte API Gateway
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pantau seluruh lalu lintas notifikasi WhatsApp pesan struk digital &
            info selesai cuci yang dikirimkan oleh cabang ke nomor pelanggan.
          </p>
        </div>
      </div>

      {/* 2. Metrik Pengiriman WhatsApp */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
              Total Pesan
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.totalLogs}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Notifikasi terdaftar
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
              Berhasil Diterima
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.delivered}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Centang dua WhatsApp
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              Terkirim Gateway
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.sent}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Berhasil diteruskan Fonnte
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-destructive text-[11px] font-bold tracking-wider uppercase">
              Gagal Terkirim
            </div>
            <div className="text-foreground mt-1 text-2xl font-black">
              {stats.failed}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Nomor tidak aktif / kuota habis
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Toolbar Pencarian & Filter */}
      <Card className="shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Cari nomor HP tujuan, nomor tiket, atau nama cabang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 text-xs">
                <SelectValue placeholder="Status Pengiriman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value={WhatsAppDeliveryStatus.DELIVERED}>
                  Terkirim & Diterima
                </SelectItem>
                <SelectItem value={WhatsAppDeliveryStatus.SENT}>
                  Terkirim Gateway
                </SelectItem>
                <SelectItem value={WhatsAppDeliveryStatus.PENDING}>
                  Antrean Kirim
                </SelectItem>
                <SelectItem value={WhatsAppDeliveryStatus.FAILED}>
                  Gagal Terkirim
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabel Log WhatsApp */}
      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="bg-muted/20 border-b p-4">
          <CardTitle className="text-sm font-bold uppercase sm:text-base">
            Daftar Log Pengiriman Pesan
          </CardTitle>
          <CardDescription className="text-xs">
            Menampilkan {filteredLogs.length} riwayat pengiriman pesan terkini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">
                    Waktu Kirim
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Cabang Outlet
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Nomor Tiket
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Nomor HP Tujuan
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Tipe Pesan
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Status Pengiriman
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    External ID
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center text-xs"
                    >
                      Tidak ada log WhatsApp yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">
                        {new Date(log.sentAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {log.outletName}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        {log.ticketNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.recipientPhone}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {log.messageType}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {log.externalId || "-"}
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
