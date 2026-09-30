"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Award,
  Car,
  CheckCircle2,
  Gift,
  History,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLicensePlate } from "@/lib/formatters";

export interface CustomerRowData {
  id: string;
  fullName: string;
  phone: string;
  totalVisits: number;
  loyaltyPoints: number;
  createdAt: string;
  vehicles: Array<{
    id: string;
    licensePlate: string;
    category: string;
    brand: string | null;
    model: string | null;
    color: string | null;
    totalVisits: number;
    isPromoEligible: boolean;
    visitsToNextPromo: number;
  }>;
  recentLogs: Array<{
    id: string;
    pointsChanged: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }>;
}

interface CustomerLoyaltyTableProps {
  initialCustomers: CustomerRowData[];
  totalEligibleVehicles: number;
  totalPointsCirculating: number;
}

export function CustomerLoyaltyTable({
  initialCustomers,
  totalEligibleVehicles,
  totalPointsCirculating,
}: CustomerLoyaltyTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "PROMO_READY" | "POINTS"
  >("ALL");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerRowData | null>(null);

  // Filter & Search Pelanggan
  const filteredCustomers = useMemo(() => {
    return initialCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.vehicles.some(
          (v) =>
            v.licensePlate.toLowerCase().includes(q) ||
            (v.brand && v.brand.toLowerCase().includes(q)) ||
            (v.model && v.model.toLowerCase().includes(q))
        );

      if (!matchQuery) return false;

      if (filterType === "PROMO_READY") {
        return c.vehicles.some((v) => v.isPromoEligible);
      }
      if (filterType === "POINTS") {
        return c.loyaltyPoints >= 10;
      }
      return true;
    });
  }, [initialCustomers, searchQuery, filterType]);

  const totalRegisteredVehicles = useMemo(() => {
    return initialCustomers.reduce((acc, c) => acc + c.vehicles.length, 0);
  }, [initialCustomers]);

  return (
    <div className="space-y-6">
      {/* 1. Header Metrik Keanggotaan & Loyalitas Pelanggan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metrik 1: Total Pelanggan Terdaftar */}
        <Card className="border-primary/20 from-primary/10 via-card to-card bg-linear-to-br">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Member Terdaftar
                </p>
                <p className="text-foreground mt-1 font-mono text-2xl font-black">
                  {initialCustomers.length}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Otomatis via Walk-In POS
                </p>
              </div>
              <div className="bg-primary/20 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
                <Gift className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrik 2: Total Kendaraan Terkunci */}
        <Card className="via-card to-card border-cyan-500/20 bg-linear-to-br from-cyan-500/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Kendaraan Terkunci
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-cyan-600 dark:text-cyan-400">
                  {totalRegisteredVehicles}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Terkunci per Plat Nomor
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <Car className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrik 3: Kendaraan Siap Klaim Promo Cuci 10x */}
        <Card className="via-card to-card border-amber-500/20 bg-linear-to-br from-amber-500/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Klaim Cuci Gratis 10x
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                  {totalEligibleVehicles}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Kelipatan 10 kunjungan
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrik 4: Saldo Poin Akumulatif */}
        <Card className="via-card to-card border-emerald-500/20 bg-linear-to-br from-emerald-500/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Saldo Poin Beredar
                </p>
                <p className="mt-1 font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalPointsCirculating}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  1 poin / Rp 10.000 belanja
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Filter & Pencarian Kilat */}
      <Card>
        <CardHeader className="p-4 pb-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
                <Gift className="h-5 w-5 text-amber-500" />
                <span>Direktori Member & Loyalitas Pelanggan</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Data keanggotaan terdaftar otomatis melalui nomor WhatsApp saat
                pertama kali walk-in cuci mobil/motor.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filterType === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("ALL")}
                className="h-8 text-xs font-bold"
              >
                Semua ({initialCustomers.length})
              </Button>
              <Button
                variant={filterType === "PROMO_READY" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("PROMO_READY")}
                className="h-8 border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300"
              >
                <Sparkles className="mr-1 h-3.5 w-3.5 text-amber-500" />
                Siap Cuci Gratis ({totalEligibleVehicles})
              </Button>
              <Button
                variant={filterType === "POINTS" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("POINTS")}
                className="h-8 text-xs font-bold"
              >
                Poin &ge; 10
              </Button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              placeholder="Cari nama pelanggan, nomor WhatsApp, atau plat nomor kendaraan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-bold">Pelanggan</TableHead>
                  <TableHead className="text-xs font-bold">WhatsApp</TableHead>
                  <TableHead className="text-xs font-bold">
                    Kendaraan Terkunci & Promo 10x
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold">
                    Saldo Poin
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-12 text-center text-xs"
                    >
                      Tidak ada data pelanggan yang sesuai dengan pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/30">
                      {/* Pelanggan */}
                      <TableCell className="py-3 align-top">
                        <div className="text-foreground text-xs font-bold sm:text-sm">
                          {customer.fullName}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[11px]">
                          Total {customer.totalVisits} Kunjungan Cuci
                        </div>
                      </TableCell>

                      {/* WhatsApp */}
                      <TableCell className="py-3 align-top">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Phone className="text-muted-foreground h-3.5 w-3.5" />
                          <span>{customer.phone}</span>
                        </div>
                        <a
                          href={`https://wa.me/${customer.phone.replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat WhatsApp</span>
                        </a>
                      </TableCell>

                      {/* Kendaraan Terkunci & Progress Promo 10x Cuci */}
                      <TableCell className="py-3 align-top">
                        {customer.vehicles.length === 0 ? (
                          <span className="text-muted-foreground text-xs italic">
                            Belum ada kendaraan terkait
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {customer.vehicles.map((v) => {
                              const progress = (v.totalVisits % 10) * 10;
                              return (
                                <div
                                  key={v.id}
                                  className="border-border/60 bg-muted/20 rounded-lg border p-2 text-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 font-mono font-bold">
                                      <span className="bg-background text-foreground rounded border px-1.5 py-0.5">
                                        {formatLicensePlate(v.licensePlate)}
                                      </span>
                                      {v.brand && (
                                        <span className="text-muted-foreground text-[11px]">
                                          {v.brand} {v.model || ""}
                                        </span>
                                      )}
                                    </div>

                                    {v.isPromoEligible ? (
                                      <Badge className="gap-1 bg-amber-500 text-[10px] font-bold text-white shadow-xs">
                                        <Sparkles className="h-3 w-3" />
                                        Berhak Cuci 10x Gratis!
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-[11px] font-medium">
                                        Sisa {v.visitsToNextPromo}x lagi
                                      </span>
                                    )}
                                  </div>

                                  {/* Progress bar visual 10x */}
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          v.isPromoEligible
                                            ? "bg-amber-500"
                                            : "bg-primary"
                                        }`}
                                        style={{
                                          width: `${Math.max(5, progress)}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-muted-foreground font-mono text-[10px]">
                                      {v.totalVisits} Kunjungan
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>

                      {/* Saldo Poin */}
                      <TableCell className="py-3 text-center align-top">
                        <Badge
                          variant="secondary"
                          className="border-emerald-500/20 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          {customer.loyaltyPoints} Poin
                        </Badge>
                      </TableCell>

                      {/* Aksi Detail */}
                      <TableCell className="py-3 text-right align-top">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                          className="h-8 gap-1 text-xs font-bold"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Riwayat</span>
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

      {/* 3. Modal Riwayat Poin & Loyalitas Pelanggan */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Gift className="h-5 w-5 text-amber-500" />
              <span>Riwayat Loyalitas Pelanggan</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedCustomer?.fullName} ({selectedCustomer?.phone})
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4 text-xs">
              {/* Saldo Poin & Total Kunjungan */}
              <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-xl p-3">
                <div>
                  <p className="text-muted-foreground text-[11px] font-bold uppercase">
                    Saldo Poin Aktif
                  </p>
                  <p className="mt-0.5 font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                    {selectedCustomer.loyaltyPoints} Poin
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-bold uppercase">
                    Total Kunjungan
                  </p>
                  <p className="text-foreground mt-0.5 font-mono text-base font-black">
                    {selectedCustomer.totalVisits} Kali
                  </p>
                </div>
              </div>

              {/* Log Perubahan Poin */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Catatan Riwayat Poin Terakhir
                </p>
                {selectedCustomer.recentLogs.length === 0 ? (
                  <p className="text-muted-foreground py-3 text-center text-xs italic">
                    Belum ada riwayat transaksi poin untuk pelanggan ini.
                  </p>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {selectedCustomer.recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-card flex items-start justify-between rounded-lg border p-2.5 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="text-foreground font-semibold">
                            {log.description}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {new Date(log.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            log.pointsChanged > 0
                              ? "border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-600"
                              : log.pointsChanged < 0
                                ? "border-rose-500/30 bg-rose-500/10 font-mono text-[10px] text-rose-600"
                                : "font-mono text-[10px]"
                          }
                        >
                          {log.pointsChanged > 0
                            ? `+${log.pointsChanged}`
                            : `${log.pointsChanged}`}{" "}
                          Poin
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
