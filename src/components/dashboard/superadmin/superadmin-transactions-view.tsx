"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  AlertCircle,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import type {
  NationalTransactionItem,
  NationalTransactionsSummary,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PaymentStatus, TicketStatus } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

interface SuperadminTransactionsViewProps {
  initialItems: NationalTransactionItem[];
  summary: NationalTransactionsSummary;
  outlets: Array<{ id: string; name: string }>;
}

export function SuperadminTransactionsView({
  initialItems,
  summary,
  outlets,
}: SuperadminTransactionsViewProps) {
  const [items, setItems] = useState<NationalTransactionItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [outletFilter, setOutletFilter] = useState<string>("ALL");
  const [selectedTicket, setSelectedTicket] =
    useState<NationalTransactionItem | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        search === "" ||
        item.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
        item.outletName.toLowerCase().includes(search.toLowerCase()) ||
        (item.customerName &&
          item.customerName.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      const matchOutlet =
        outletFilter === "ALL" || item.outletId === outletFilter;

      return matchSearch && matchStatus && matchOutlet;
    });
  }, [items, search, statusFilter, outletFilter]);

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.QUEUED:
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400"
          >
            Antre (Queued)
          </Badge>
        );
      case TicketStatus.WASHING:
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400"
          >
            Sedang Cuci
          </Badge>
        );
      case TicketStatus.READY:
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400"
          >
            Siap Ambil
          </Badge>
        );
      case TicketStatus.COMPLETED:
        return (
          <Badge
            variant="outline"
            className="border-muted-foreground/30 bg-muted/40 text-muted-foreground text-xs font-bold"
          >
            Selesai
          </Badge>
        );
      case TicketStatus.CANCELLED:
        return (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold"
          >
            Dibatalkan
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
              Monitoring Transaksi Cuci Nasional
            </h1>
            <Badge className="border-purple-500/30 bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              Live Feed
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pantau arus transaksi tiket cuci, pengerjaan washer, dan pembayaran
            di seluruh cabang mitra se-Indonesia secara terpusat.
          </p>
        </div>
      </div>

      {/* 2. Ringkasan Metrik Nasional (GMV & Status) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-purple-500/20 bg-purple-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
              Total GMV Cuci
            </div>
            <div className="text-foreground mt-1 text-lg font-black sm:text-xl">
              {formatRupiah(summary.totalGmv)}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              {summary.totalTickets} tiket tercatat
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              Antrean (Queued)
            </div>
            <div className="text-foreground mt-1 text-lg font-black sm:text-xl">
              {summary.queuedCount}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Menunggu hidrolik
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              Sedang Dicuci
            </div>
            <div className="text-foreground mt-1 text-lg font-black sm:text-xl">
              {summary.washingCount}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Di area hidrolik
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
              Siap Diambil
            </div>
            <div className="text-foreground mt-1 text-lg font-black sm:text-xl">
              {summary.readyCount}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Sudah kering / poles
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
              Selesai Diambil
            </div>
            <div className="text-foreground mt-1 text-lg font-black sm:text-xl">
              {summary.completedCount}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Selesai & diserahterimakan
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-destructive text-[11px] font-bold tracking-wider uppercase">
              Dibatalkan / Void
            </div>
            <div className="text-foreground mt-1 text-lg font-black sm:text-xl">
              {summary.cancelledCount}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">
              Audit anomali tiket
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Toolbar Pencarian & Filter Cabang */}
      <Card className="shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Cari plat nomor, nomor tiket, cabang, atau nama pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={outletFilter} onValueChange={setOutletFilter}>
                <SelectTrigger className="w-44 text-xs">
                  <SelectValue placeholder="Pilih Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    Semua Cabang ({outlets.length})
                  </SelectItem>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue placeholder="Status Tiket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value={TicketStatus.QUEUED}>Antre</SelectItem>
                  <SelectItem value={TicketStatus.WASHING}>
                    Sedang Cuci
                  </SelectItem>
                  <SelectItem value={TicketStatus.READY}>Siap Ambil</SelectItem>
                  <SelectItem value={TicketStatus.COMPLETED}>
                    Selesai
                  </SelectItem>
                  <SelectItem value={TicketStatus.CANCELLED}>
                    Dibatalkan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabel Transaksi Nasional */}
      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="bg-muted/20 border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase sm:text-base">
                Log Tiket Cuci Realtime
              </CardTitle>
              <CardDescription className="text-xs">
                Menampilkan {filteredItems.length} transaksi cuci kendaraan
                terkini.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">
                    No. Tiket & Waktu
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Cabang Outlet
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Plat & Kendaraan
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Layanan & Harga
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Washer Bertugas
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Status Cuci
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    Pembayaran
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-8 text-center text-xs"
                    >
                      Tidak ada transaksi cuci yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs">
                        <div className="font-mono font-bold">
                          {item.ticketNumber}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {new Date(item.queuedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ·{" "}
                          {new Date(item.queuedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-semibold">{item.outletName}</div>
                        <div className="text-muted-foreground text-[10px]">
                          Kasir: {item.creatorName}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-mono font-black">
                          {item.licensePlate}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {item.customerName || "Walk-in"}
                          {item.inspectionPhotosCount > 0 && (
                            <span className="ml-1 inline-flex items-center text-blue-500">
                              <Camera className="mr-0.5 h-3 w-3" />
                              {item.inspectionPhotosCount}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-medium">{item.serviceName}</div>
                        <div className="text-foreground font-bold">
                          {formatRupiah(item.totalAmount)}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {item.washers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.washers.map((w, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-[10px] font-medium"
                              >
                                {w}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">
                            Belum diklaim
                          </span>
                        )}
                      </TableCell>

                      <TableCell>{getStatusBadge(item.status)}</TableCell>

                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {item.paymentStatus === PaymentStatus.PAID ? (
                            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
                              Lunas
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-600"
                            >
                              Belum Bayar
                            </Badge>
                          )}
                          {item.paymentMethod && (
                            <span className="text-muted-foreground text-[10px] uppercase">
                              {item.paymentMethod}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-bold"
                          onClick={() => setSelectedTicket(item)}
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Modal Detail Tiket Superadmin */}
      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black uppercase">
              <Sparkles className="text-primary h-5 w-5" />
              <span>Detail Tiket #{selectedTicket?.ticketNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informasi lengkap pengerjaan cuci di cabang{" "}
              {selectedTicket?.outletName}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 text-xs">
              <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-xl p-3">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Plat Nomor
                  </span>
                  <span className="font-mono text-sm font-black">
                    {selectedTicket.licensePlate}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Kategori Kendaraan
                  </span>
                  <span className="font-bold">
                    {selectedTicket.vehicleCategory}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Paket Layanan
                  </span>
                  <span className="font-bold">
                    {selectedTicket.serviceName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Total Tarif
                  </span>
                  <span className="text-primary font-mono text-sm font-black">
                    {formatRupiah(selectedTicket.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="font-bold">
                    {selectedTicket.customerName || "Pelanggan Walk-in"} (
                    {selectedTicket.customerPhone || "-"})
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Kasir Pembuat:</span>
                  <span className="font-bold">
                    {selectedTicket.creatorName}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Tim Washer:</span>
                  <span className="font-bold">
                    {selectedTicket.washers.length > 0
                      ? selectedTicket.washers.join(", ")
                      : "Belum diklaim"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Waktu Masuk:</span>
                  <span className="font-bold">
                    {new Date(selectedTicket.queuedAt).toLocaleString("id-ID")}
                  </span>
                </div>
                {selectedTicket.completedAt && (
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">
                      Waktu Selesai:
                    </span>
                    <span className="font-bold">
                      {new Date(selectedTicket.completedAt).toLocaleString(
                        "id-ID"
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pb-1.5">
                  <span className="text-muted-foreground">
                    Foto Kondisi Awal:
                  </span>
                  <span className="font-bold">
                    {selectedTicket.inspectionPhotosCount} foto di SumoPod S3
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
