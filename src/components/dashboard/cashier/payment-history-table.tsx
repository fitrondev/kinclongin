import Link from "next/link";

import { CreditCard, Printer, Receipt, Search, X } from "lucide-react";

import { PaymentMethodBadge } from "@/components/shared/payment-method-badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { formatLicensePlate, formatRupiah } from "@/lib/formatters";

export interface CashierPaymentItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  licensePlate: string;
  vehicleCategory: string;
  serviceName: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  method: PaymentMethod;
  cashGiven: number | null;
  changeGiven: number | null;
  paidAt: Date | string;
  referenceNumber: string | null;
}

export interface PaymentHistoryTableProps {
  cashierName: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedMethodFilter: string;
  setSelectedMethodFilter: (val: string) => void;
  filteredPayments: CashierPaymentItem[];
  onOpenReceipt: (payment: CashierPaymentItem) => void;
}

export function PaymentHistoryTable({
  cashierName,
  searchQuery,
  setSearchQuery,
  selectedMethodFilter,
  setSelectedMethodFilter,
  filteredPayments,
  onOpenReceipt,
}: PaymentHistoryTableProps) {
  return (
    <Card className="bg-card border-border/80 shadow-2xs">
      <CardHeader className="p-4 pb-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase sm:text-base">
              <Receipt className="text-primary h-5 w-5 shrink-0" />
              <span>Riwayat Pembayaran Kasir Hari Ini</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Daftar transaksi pembayaran yang diproses langsung oleh{" "}
              {cashierName} hari ini
            </CardDescription>
          </div>

          {/* Filter Metode Bayar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Semua" },
              { id: "CASH", label: "Tunai" },
              { id: "QRIS", label: "QRIS" },
              { id: "TRANSFER", label: "Transfer" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSelectedMethodFilter(btn.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedMethodFilter === btn.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box */}
        <div className="relative mt-2">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Cari berdasarkan nomor tiket, plat kendaraan, atau nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background h-9 pl-9 text-xs"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-5">
        {filteredPayments.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-10 w-10 opacity-30" />
            <p className="mt-2 text-sm font-semibold">
              {searchQuery
                ? "Tidak ada transaksi yang cocok dengan kata kunci pencarian."
                : "Belum ada transaksi pembayaran yang diproses pada shift ini."}
            </p>
            <Button asChild size="sm" className="mt-4 gap-1.5 font-bold">
              <Link href="/pos">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Proses Pembayaran Baru di POS</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-180">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-24 text-xs font-bold whitespace-nowrap uppercase">
                    Waktu
                  </TableHead>
                  <TableHead className="text-xs font-bold whitespace-nowrap uppercase">
                    No. Tiket
                  </TableHead>
                  <TableHead className="text-xs font-bold whitespace-nowrap uppercase">
                    Plat Nomor
                  </TableHead>
                  <TableHead className="text-xs font-bold whitespace-nowrap uppercase">
                    Layanan
                  </TableHead>
                  <TableHead className="text-xs font-bold whitespace-nowrap uppercase">
                    Metode
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold whitespace-nowrap uppercase">
                    Total Tagihan
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold whitespace-nowrap uppercase">
                    Tunai / Kembali
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold whitespace-nowrap uppercase">
                    Cetak Struk
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/30">
                    {/* Waktu */}
                    <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {new Date(payment.paidAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    {/* No. Tiket */}
                    <TableCell className="whitespace-nowrap">
                      <span className="font-mono text-xs font-bold">
                        {payment.ticketNumber}
                      </span>
                    </TableCell>

                    {/* Plat Nomor & Pelanggan */}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-black tracking-wider uppercase">
                          {formatLicensePlate(payment.licensePlate)}
                        </span>
                        {payment.customerName ? (
                          <span className="text-muted-foreground text-[11px]">
                            {payment.customerName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Layanan */}
                    <TableCell className="whitespace-nowrap">
                      <span className="text-xs font-medium">
                        {payment.serviceName}
                      </span>
                    </TableCell>

                    {/* Metode Bayar */}
                    <TableCell className="whitespace-nowrap">
                      <PaymentMethodBadge method={payment.method} />
                    </TableCell>

                    {/* Total Tagihan */}
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="text-primary font-mono text-xs font-black">
                        {formatRupiah(payment.totalAmount)}
                      </span>
                    </TableCell>

                    {/* Uang Diterima & Kembalian */}
                    <TableCell className="text-right text-[11px] whitespace-nowrap">
                      {payment.method === "CASH" && payment.cashGiven ? (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground font-mono">
                            Bayar: {formatRupiah(payment.cashGiven)}
                          </span>
                          {payment.changeGiven && payment.changeGiven > 0 ? (
                            <span className="font-mono font-bold text-emerald-600">
                              Kembali: {formatRupiah(payment.changeGiven)}
                            </span>
                          ) : null}
                        </div>
                      ) : payment.referenceNumber ? (
                        <span className="text-muted-foreground font-mono text-[10px]">
                          Ref: {payment.referenceNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </TableCell>

                    {/* Aksi Cetak Ulang Struk */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenReceipt(payment)}
                        className="hover:bg-primary/10 hover:text-primary h-8 gap-1.5 text-xs font-bold"
                        title="Cetak Struk Thermal atau Kirim via WhatsApp"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Struk</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
