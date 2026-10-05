"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Download,
  Droplets,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { restockProductAction, restockSupplyAction } from "@/actions/inventory";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/formatters";

export interface InventoryData {
  products: Array<{
    id: string;
    sku: string | null;
    name: string;
    category: string;
    sellingPrice: number;
    costPrice: number | null;
    stock: number;
    minStockAlert: number;
  }>;
  supplies: Array<{
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    minStockAlert: number;
    usagePerCarWash: number;
    usagePerMotorWash: number;
  }>;
  movements: Array<{
    id: string;
    itemName: string;
    type: string;
    quantity: number;
    previousStock: number;
    currentStock: number;
    notes: string | null;
    createdAt: Date;
  }>;
}

export function InventoryView({ data }: { data: InventoryData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"RETAIL" | "SUPPLIES" | "HISTORY">(
    "RETAIL"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Modal restok
  const [restockProductTarget, setRestockProductTarget] = useState<{
    id: string;
    name: string;
    stock: number;
  } | null>(null);

  const [restockSupplyTarget, setRestockSupplyTarget] = useState<{
    id: string;
    name: string;
    unit: string;
    currentStock: number;
  } | null>(null);

  const [restockQty, setRestockQty] = useState("10");

  const handleConfirmProductRestock = () => {
    if (!restockProductTarget) return;
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Masukkan jumlah restok yang valid.");
      return;
    }

    startTransition(async () => {
      const res = await restockProductAction({
        productId: restockProductTarget.id,
        quantity: qty,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal restok produk.");
        return;
      }

      toast.success(
        `Sukses! Stok ${restockProductTarget.name} bertambah +${qty} unit (Total: ${res.data?.newStock}).`
      );
      setRestockProductTarget(null);
      setRestockQty("10");
      router.refresh();
    });
  };

  const handleConfirmSupplyRestock = () => {
    if (!restockSupplyTarget) return;
    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Masukkan jumlah restok bahan yang valid.");
      return;
    }

    startTransition(async () => {
      const res = await restockSupplyAction({
        supplyId: restockSupplyTarget.id,
        quantity: qty,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal restok bahan operasional.");
        return;
      }

      toast.success(
        `Sukses! Stok ${restockSupplyTarget.name} bertambah +${qty} ${restockSupplyTarget.unit} (Total: ${res.data?.newStock}).`
      );
      setRestockSupplyTarget(null);
      setRestockQty("10");
      router.refresh();
    });
  };

  const filteredProducts = data.products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSupplies = data.supplies.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProductsCount = data.products.filter(
    (p) => p.stock <= p.minStockAlert
  ).length;

  const lowStockSuppliesCount = data.supplies.filter(
    (s) => s.currentStock <= s.minStockAlert
  ).length;

  const handleExportCSV = () => {
    let csvHeader = "";
    let csvRows = "";
    if (activeTab === "RETAIL") {
      csvHeader =
        "Nama Produk,Kategori,Harga Jual,Harga Modal,Stok Saat Ini,Batas Peringatan\n";
      csvRows = data.products
        .map(
          (p) =>
            `"${p.name}","${p.category}",${p.sellingPrice},${p.costPrice || 0},${p.stock},${p.minStockAlert}`
        )
        .join("\n");
    } else if (activeTab === "SUPPLIES") {
      csvHeader =
        "Nama Bahan,Satuan,Stok Saat Ini,Batas Peringatan,Pemakaian Mobil,Pemakaian Motor\n";
      csvRows = data.supplies
        .map(
          (s) =>
            `"${s.name}","${s.unit}",${s.currentStock},${s.minStockAlert},${s.usagePerCarWash},${s.usagePerMotorWash}`
        )
        .join("\n");
    } else {
      csvHeader = "Waktu,Item,Jenis Mutasi,Jumlah,Keterangan\n";
      csvRows = data.movements
        .map(
          (m) =>
            `"${new Date(m.createdAt).toLocaleString("id-ID")}","${m.itemName}","${m.type}",${m.quantity},"${m.notes || "-"}"`
        )
        .join("\n");
    }
    const blob = new Blob([csvHeader + csvRows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `laporan-inventaris-${activeTab.toLowerCase()}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan inventaris berhasil diekspor ke CSV!");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
            Kontrol Stok & Bahan Operasional
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Manajemen dual-track inventaris ritel kasir dan formula takaran
            bahan cuci kendaraan.
          </p>
        </div>

        {/* Tab Switcher & Export */}
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="bg-card flex flex-wrap items-center gap-1 rounded-xl border p-1 text-xs font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("RETAIL")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                activeTab === "RETAIL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Produk Ritel ({data.products.length})</span>
              {lowStockProductsCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SUPPLIES")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                activeTab === "SUPPLIES"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Droplets className="h-3.5 w-3.5" />
              <span>Bahan Cuci ({data.supplies.length})</span>
              {lowStockSuppliesCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("HISTORY")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                activeTab === "HISTORY"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Riwayat Mutasi</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 w-full gap-1.5 text-xs font-bold shadow-xs sm:w-auto"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {(lowStockProductsCount > 0 || lowStockSuppliesCount > 0) && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Peringatan Stok Menipis:</strong> Ditemukan{" "}
              {lowStockProductsCount > 0 &&
                `${lowStockProductsCount} barang ritel `}
              {lowStockProductsCount > 0 && lowStockSuppliesCount > 0 && "dan "}
              {lowStockSuppliesCount > 0 &&
                `${lowStockSuppliesCount} bahan operasional `}
              yang berada di bawah batas minimum alert!
            </span>
          </div>
        </div>
      )}

      {/* 1. Tab Produk Ritel */}
      {activeTab === "RETAIL" && (
        <Card className="bg-card border shadow-xs">
          <CardHeader className="p-4 pb-3 sm:p-5">
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Cari produk ritel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-y text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-5 py-3">Nama Produk</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3">Harga Jual</th>
                    <th className="px-5 py-3">Stok Saat Ini</th>
                    <th className="px-5 py-3">Batas Minimum</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.minStockAlert;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="text-foreground px-5 py-3.5 font-bold">
                          {p.name}
                        </td>
                        <td className="text-muted-foreground px-5 py-3.5">
                          {p.category}
                        </td>
                        <td className="text-primary px-5 py-3.5 font-black">
                          {formatRupiah(p.sellingPrice)}
                        </td>
                        <td className="px-5 py-3.5 font-bold">
                          <span
                            className={
                              isLow
                                ? "text-destructive font-black"
                                : "text-foreground"
                            }
                          >
                            {p.stock} Unit
                          </span>
                          {isLow && (
                            <Badge
                              variant="outline"
                              className="text-destructive border-destructive/30 ml-2 px-1 py-0 text-[10px]"
                            >
                              Stok Menipis
                            </Badge>
                          )}
                        </td>
                        <td className="text-muted-foreground px-5 py-3.5">
                          {p.minStockAlert} Unit
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRestockProductTarget({
                                id: p.id,
                                name: p.name,
                                stock: p.stock,
                              })
                            }
                            className="h-8 gap-1 text-xs font-bold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Restok</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Tab Bahan Cuci Operasional */}
      {activeTab === "SUPPLIES" && (
        <Card className="bg-card border shadow-xs">
          <CardHeader className="p-4 pb-3 sm:p-5">
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Cari bahan operasional..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-y text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-5 py-3">Nama Bahan</th>
                    <th className="px-5 py-3">Stok Saat Ini</th>
                    <th className="px-5 py-3">Formula Mobil</th>
                    <th className="px-5 py-3">Formula Motor</th>
                    <th className="px-5 py-3">Batas Minimum</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSupplies.map((s) => {
                    const isLow = s.currentStock <= s.minStockAlert;
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="text-foreground px-5 py-3.5 font-bold">
                          {s.name}
                        </td>
                        <td className="px-5 py-3.5 font-bold">
                          <span
                            className={
                              isLow
                                ? "text-destructive font-black"
                                : "text-foreground"
                            }
                          >
                            {s.currentStock} {s.unit}
                          </span>
                          {isLow && (
                            <Badge
                              variant="outline"
                              className="text-destructive border-destructive/30 ml-2 px-1 py-0 text-[10px]"
                            >
                              Kritis
                            </Badge>
                          )}
                        </td>
                        <td className="text-muted-foreground px-5 py-3.5">
                          {s.usagePerCarWash} {s.unit} / mobil
                        </td>
                        <td className="text-muted-foreground px-5 py-3.5">
                          {s.usagePerMotorWash} {s.unit} / motor
                        </td>
                        <td className="text-muted-foreground px-5 py-3.5">
                          {s.minStockAlert} {s.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRestockSupplyTarget({
                                id: s.id,
                                name: s.name,
                                unit: s.unit,
                                currentStock: s.currentStock,
                              })
                            }
                            className="h-8 gap-1 text-xs font-bold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Restok Bahan</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Tab Riwayat Mutasi */}
      {activeTab === "HISTORY" && (
        <Card className="bg-card border shadow-xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-5 py-3">Item / Bahan</th>
                    <th className="px-5 py-3">Tipe Mutasi</th>
                    <th className="px-5 py-3">Perubahan</th>
                    <th className="px-5 py-3">Sisa Stok</th>
                    <th className="px-5 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.movements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Belum ada catatan mutasi stok.
                      </td>
                    </tr>
                  ) : (
                    data.movements.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="text-muted-foreground px-5 py-3">
                          {new Date(m.createdAt).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="text-foreground px-5 py-3 font-bold">
                          {m.itemName}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={
                              m.type === "IN_RESTOCK"
                                ? "default"
                                : m.type === "OUT_SALE"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="h-4 px-1.5 py-0 text-[10px] font-bold"
                          >
                            {m.type === "IN_RESTOCK"
                              ? "Restok Masuk"
                              : m.type === "OUT_SALE"
                                ? "Terjual POS"
                                : "Pemakaian Cuci"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-bold">
                          {m.type === "IN_RESTOCK" ? (
                            <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                              +{m.quantity}
                            </span>
                          ) : (
                            <span className="text-destructive flex items-center">
                              -{m.quantity}
                            </span>
                          )}
                        </td>
                        <td className="text-foreground px-5 py-3 font-bold">
                          {m.currentStock}
                        </td>
                        <td className="text-muted-foreground px-5 py-3">
                          {m.notes || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Restok Produk Ritel */}
      {restockProductTarget && (
        <Dialog
          open={!!restockProductTarget}
          onOpenChange={(open) => !open && setRestockProductTarget(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-black">
                Restok {restockProductTarget.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Stok saat ini: {restockProductTarget.stock} unit. Masukkan
                kuantitas tambahan barang.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <label className="text-muted-foreground block text-xs font-bold uppercase">
                Jumlah Unit Masuk
              </label>
              <Input
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="h-10 text-base font-bold"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestockProductTarget(null)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={handleConfirmProductRestock}
                className="font-bold"
              >
                {isPending ? "Menyimpan..." : "Konfirmasi Tambah Stok"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Restok Bahan Operasional */}
      {restockSupplyTarget && (
        <Dialog
          open={!!restockSupplyTarget}
          onOpenChange={(open) => !open && setRestockSupplyTarget(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-black">
                Restok {restockSupplyTarget.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Stok saat ini: {restockSupplyTarget.currentStock}{" "}
                {restockSupplyTarget.unit}. Masukkan takaran bahan masuk.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <label className="text-muted-foreground block text-xs font-bold uppercase">
                Jumlah Bahan Masuk ({restockSupplyTarget.unit})
              </label>
              <Input
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="h-10 text-base font-bold"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestockSupplyTarget(null)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={handleConfirmSupplyRestock}
                className="font-bold"
              >
                {isPending ? "Menyimpan..." : "Konfirmasi Tambah Bahan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
