"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import {
  Car,
  CheckCircle2,
  Crown,
  Maximize2,
  Minimize2,
  QrCode,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTicketRealtime } from "@/hooks/use-ticket-realtime";
import { formatRupiah } from "@/lib/formatters";
import type { CdsPayload } from "@/lib/realtime/events";

interface OutletInfo {
  id: string;
  name: string;
  slogan?: string | null;
  logoUrl?: string | null;
  address: string;
  phone: string;
}

interface CustomerDisplayViewProps {
  outlet: OutletInfo;
}

type CdsMode = "IDLE" | "CART" | "QRIS" | "SUCCESS";

const PROMO_SLIDES = [
  {
    title: "Unlimited Wash Club",
    subtitle: "Cuci Mobil & Motor Sepuasnya Setiap Hari Tanpa Batas Kuota",
    badge: "Mulai Rp 150rb/bln",
    icon: Crown,
    gradient: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
  },
  {
    title: "Paket Detailing & Nano Ceramic",
    subtitle: "Kilau Ekstra & Perlindungan Cat Tahan Air Efek Daun Talas",
    badge: "Diskon Khusus Member",
    icon: Sparkles,
    gradient: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
  },
  {
    title: "Promo Cuci 10x Gratis 1x",
    subtitle: "Kumpulkan Kunjungan Cuci Terkunci Otomatis pada Plat Kendaraan",
    badge: "Otomatis di Kasir",
    icon: Car,
    gradient: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
  },
];

export function CustomerDisplayView({ outlet }: CustomerDisplayViewProps) {
  const [mode, setMode] = useState<CdsMode>("IDLE");
  const [cartData, setCartData] = useState<CdsPayload | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [promoIndex, setPromoIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Realtime hook
  const { isConnected, isMuted, toggleMute } = useTicketRealtime({
    outletId: outlet.id,
    onEvent: (event) => {
      if (event.type === "CDS_CART_UPDATED" && event.payload) {
        setCartData(event.payload);
        setTicketNumber(event.ticketNumber || "");
        setMode("CART");
      } else if (event.type === "CDS_QRIS_DISPLAY" && event.payload) {
        setCartData(event.payload);
        setTicketNumber(event.ticketNumber || "");
        setMode("QRIS");
      } else if (event.type === "CDS_PAYMENT_SUCCESS") {
        setTicketNumber(event.ticketNumber || "");
        if (event.payload) setCartData(event.payload);
        setMode("SUCCESS");
      } else if (event.type === "CDS_IDLE") {
        setMode("IDLE");
        setCartData(null);
      }
    },
  });

  // Jam waktu riil
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carousel promo berganti tiap 6 detik jika IDLE
  useEffect(() => {
    if (mode !== "IDLE") return;
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [mode]);

  // Mode SUCCESS kembali ke IDLE setelah 8 detik
  useEffect(() => {
    if (mode === "SUCCESS") {
      const timer = setTimeout(() => {
        setMode("IDLE");
        setCartData(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activePromo = PROMO_SLIDES[promoIndex] || PROMO_SLIDES[0];
  const PromoIcon = activePromo?.icon || Crown;

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Floating Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {outlet.logoUrl ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              <Image
                src={outlet.logoUrl}
                alt={outlet.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-xl font-black">
              K
            </div>
          )}
          <div>
            <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
              {outlet.name}
            </h1>
            <p className="text-xs text-slate-400">
              {outlet.slogan || "Kendaraan Bersih, Perjalanan Menyenangkan"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400"
          >
            <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {isConnected ? "Layar Tamu Terhubung" : "Menghubungkan..."}
          </Badge>

          <div className="hidden font-mono text-xs font-bold text-slate-400 sm:block">
            {currentTime}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className="h-8 w-8 text-slate-400 hover:text-white"
            title={isMuted ? "Aktifkan Audio" : "Bisukan Audio"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-slate-400 hover:text-white"
            title="Layar Penuh"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col p-6 sm:p-10">
        {/* 1. MODE: IDLE (Selamat Datang & Promosi Berputar) */}
        {mode === "IDLE" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="border-primary/30 bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Customer Display Screen</span>
            </div>

            <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
              Selamat Datang di {outlet.name}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-slate-400 sm:text-base">
              Silakan sebutkan nomor plat kendaraan Anda ke kasir. Kami siap
              memberikan perawatan terbaik untuk kendaraan Anda.
            </p>

            {/* Carousel Promo Card */}
            <div className="mt-10 w-full max-w-xl transition-all duration-500">
              <div
                className={`rounded-2xl border bg-gradient-to-br p-6 text-left shadow-lg ${activePromo.gradient}`}
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-yellow-500 text-xs font-black text-black">
                    {activePromo.badge}
                  </Badge>
                  <PromoIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <h3 className="mt-3 text-xl font-black text-white">
                  {activePromo.title}
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  {activePromo.subtitle}
                </p>
              </div>

              <div className="mt-4 flex justify-center gap-1.5">
                {PROMO_SLIDES.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === promoIndex
                        ? "bg-primary w-6"
                        : "w-1.5 bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. MODE: CART (Rincian Transaksi Live) */}
        {mode === "CART" && cartData && (
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-primary text-xs font-bold tracking-wider uppercase">
                    Sedang Diproses Kasir
                  </span>
                  <h2 className="text-2xl font-black text-white sm:text-3xl">
                    {cartData.licensePlate
                      ? `Kendaraan: ${cartData.licensePlate}`
                      : "Rincian Transaksi Anda"}
                  </h2>
                  {cartData.customerName ? (
                    <p className="text-xs text-slate-400">
                      Pelanggan: {cartData.customerName}
                    </p>
                  ) : null}
                </div>
                {ticketNumber ? (
                  <Badge
                    variant="outline"
                    className="border-primary/40 bg-primary/10 text-primary px-3 py-1 font-mono text-sm font-bold"
                  >
                    #{ticketNumber}
                  </Badge>
                ) : null}
              </div>

              {/* Tabel Pesanan */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-xs font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Item Layanan / Produk</th>
                      <th className="p-4 text-center">Jumlah</th>
                      <th className="p-4 text-right">Harga</th>
                      <th className="p-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cartData.items && cartData.items.length > 0 ? (
                      cartData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-4 font-bold text-white">
                            {item.name}
                          </td>
                          <td className="p-4 text-center text-slate-300">
                            {item.quantity}x
                          </td>
                          <td className="p-4 text-right text-slate-300">
                            {formatRupiah(item.price)}
                          </td>
                          <td className="p-4 text-right font-black text-white">
                            {formatRupiah(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-xs text-slate-500"
                        >
                          Menunggu input kasir...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Section Bottom */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatRupiah(cartData.subtotal || 0)}</span>
                </div>
                {cartData.discount && cartData.discount > 0 ? (
                  <div className="flex justify-between text-sm font-bold text-emerald-400">
                    <span>Potongan Diskon</span>
                    <span>- {formatRupiah(cartData.discount)}</span>
                  </div>
                ) : null}
                {cartData.tax && cartData.tax > 0 ? (
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Pajak (PB1)</span>
                    <span>+ {formatRupiah(cartData.tax)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      Total yang Harus Dibayar
                    </span>
                    <p className="text-xs text-slate-500">
                      Metode Bayar:{" "}
                      <strong className="text-slate-300">
                        {cartData.paymentMethod || "Menunggu"}
                      </strong>
                    </p>
                  </div>
                  <div className="text-3xl font-black text-emerald-400 sm:text-5xl">
                    {formatRupiah(cartData.totalAmount || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MODE: QRIS (Scan QRIS Full Screen) */}
        {mode === "QRIS" && cartData && (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center text-center">
            <Badge className="mb-3 bg-blue-600 text-xs font-bold text-white">
              PEMBAYARAN NON-TUNAI
            </Badge>

            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Scan QRIS untuk Membayar
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Mendukung BCA, GoPay, OVO, Dana, ShopeePay, Livin & Mobile Banking
            </p>

            {/* QR Box Container */}
            <div className="border-primary/50 ring-primary/20 mt-6 rounded-3xl border-2 bg-white p-6 shadow-2xl ring-4">
              {cartData.qrisUrl ? (
                <div className="relative h-64 w-64">
                  <Image
                    src={cartData.qrisUrl}
                    alt="QRIS Dinamis"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-64 w-64 flex-col items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                  <QrCode className="h-44 w-44 text-slate-900" />
                  <span className="mt-1 text-[10px] font-bold text-slate-600 uppercase">
                    QRIS STANDAR NASIONAL
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 px-8 py-4 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Nominal Transfer
              </span>
              <div className="mt-0.5 text-3xl font-black text-emerald-400 sm:text-4xl">
                {formatRupiah(cartData.totalAmount || 0)}
              </div>
              {cartData.licensePlate ? (
                <p className="mt-1 text-xs text-slate-400">
                  Kendaraan: <strong>{cartData.licensePlate}</strong>
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* 4. MODE: SUCCESS (Pembayaran Berhasil) */}
        {mode === "SUCCESS" && (
          <div className="animate-in fade-in zoom-in mx-auto flex flex-1 flex-col items-center justify-center text-center duration-300">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="h-14 w-14" />
            </div>

            <h2 className="text-3xl font-black text-white sm:text-5xl">
              Pembayaran Berhasil!
            </h2>
            <p className="mt-2 text-base text-slate-300">
              Terima kasih atas kunjungan Anda di {outlet.name}.
            </p>

            {ticketNumber ? (
              <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-4 shadow-lg">
                <span className="text-xs font-bold text-emerald-400 uppercase">
                  Nomor Antrean Anda
                </span>
                <span className="mt-0.5 font-mono text-3xl font-black text-white">
                  #{ticketNumber}
                </span>
              </div>
            ) : null}

            <p className="mt-6 text-xs text-slate-500">
              Kendaraan Anda sedang dikerjakan dengan cermat oleh tim cuci kami.
            </p>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-3 text-center text-[11px] text-slate-500">
        {outlet.address} • Kontak Bantuan: {outlet.phone} • Didukung oleh
        Kinclongin POS
      </footer>
    </div>
  );
}
