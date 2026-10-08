"use client";

import { useState } from "react";

import Link from "next/link";

import {
  Bluetooth,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ReceiptData,
  generatePlainTextReceipt,
  printReceiptViaBluetooth,
} from "@/lib/printer/escpos";
import { formatWhatsAppReceiptMessage } from "@/lib/whatsapp/template";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData;
  customerPhone?: string | null;
  ticketId: string;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  receiptData,
  customerPhone,
  ticketId,
}: ReceiptDialogProps) {
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");

  const columnWidth = paperWidth === "58mm" ? 32 : 48;
  const receiptPlainText = generatePlainTextReceipt(receiptData, columnWidth);

  const handleBluetoothPrint = async () => {
    setIsPrintingBt(true);
    const res = await printReceiptViaBluetooth(
      receiptData,
      columnWidth,
      false
    );
    setIsPrintingBt(false);

    if (res.success) {
      toast.success(
        `Struk ${paperWidth} berhasil dikirim ke printer Bluetooth thermal!`
      );
    } else {
      toast.error(res.error || "Gagal mencetak via Bluetooth.");
    }
  };

  const handleBrowserPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up browser terblokir. Izinkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk #${receiptData.ticketNumber}</title>
          <style>
            @page { size: ${paperWidth} auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === "58mm" ? "11px" : "13px"};
              width: ${paperWidth};
              margin: 0;
              padding: 6px;
              white-space: pre-wrap;
              line-height: 1.25;
            }
          </style>
        </head>
        <body>${receiptPlainText}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleOpenWhatsApp = () => {
    if (!customerPhone) {
      toast.error("Nomor WhatsApp pelanggan belum terdaftar pada tiket ini.");
      return;
    }

    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "62" + cleanPhone.slice(1)
      : cleanPhone;

    const message = formatWhatsAppReceiptMessage({
      ticketId,
      ticketNumber: receiptData.ticketNumber,
      recipientPhone: formattedPhone,
      customerName: receiptData.customerName,
      licensePlate: receiptData.licensePlate,
      vehicleDesc: receiptData.vehicleModel,
      packageName: receiptData.serviceName,
      totalAmount: receiptData.total,
      paymentMethod: receiptData.paymentMethod,
      outletName: receiptData.outletName,
      outletAddress: receiptData.outletAddress,
      outletPhone: receiptData.outletPhone,
      slogan: receiptData.slogan,
      loyaltyPoints: receiptData.loyaltyPoints,
    });

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>Pembayaran Lunas & Struk Kasir</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pemilih Lebar Kertas Struk 58mm / 80mm */}
          <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-1.5 text-xs font-semibold">
            <span className="text-muted-foreground pl-2 text-[11px]">
              Format Lebar Kertas:
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  paperWidth === "58mm"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                58 mm (Standar)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  paperWidth === "80mm"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                80 mm (Lebar)
              </button>
            </div>
          </div>

          {/* Preview Kertas Struk Thermal Monospace */}
          <div className="bg-muted/40 text-foreground max-h-72 overflow-x-auto overflow-y-auto rounded-xl border p-3.5 font-mono text-[11px] leading-tight whitespace-pre shadow-inner select-all">
            {receiptPlainText}
          </div>

          {/* Tombol Opsi Cetak Struk */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBrowserPrint}
              className="h-12 gap-2 text-xs font-bold"
            >
              <Printer className="text-primary h-4 w-4" />
              <span>Cetak USB / PC</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPrintingBt}
              onClick={handleBluetoothPrint}
              className="h-12 gap-2 text-xs font-bold"
            >
              <Bluetooth className="h-4 w-4 text-blue-500" />
              <span>{isPrintingBt ? "Koneksi..." : "Thermal Bluetooth"}</span>
            </Button>
          </div>

          {/* Opsi Kirim WhatsApp Struk Digital */}
          {customerPhone && (
            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              className="h-12 w-full gap-2 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Kirim Struk WhatsApp ke {customerPhone}</span>
              <ExternalLink className="ml-auto h-3.5 w-3.5" />
            </Button>
          )}

          {/* Tombol Selesai & Kembali ke Antrean */}
          <Button asChild className="h-12 w-full text-sm font-extrabold">
            <Link href="/pos/antrean">
              <span>Selesai & Kembali ke Antrean</span>
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
