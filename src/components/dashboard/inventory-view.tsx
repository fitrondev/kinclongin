"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Droplets,
  Edit2,
  History,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  type CreateOperationalSupplyInput,
  type CreateRetailProductInput,
  type UpdateOperationalSupplyInput,
  type UpdateRetailProductInput,
  createOperationalSupplyAction,
  createRetailProductAction,
  deleteOperationalSupplyAction,
  deleteRetailProductAction,
  restockProductAction,
  restockSupplyAction,
  submitStockOpnameAction,
  updateOperationalSupplyAction,
  updateRetailProductAction,
} from "@/actions/inventory";
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
    sku?: string | null;
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

  const [activeTab, setActiveTab] = useState<
    "RETAIL" | "SUPPLIES" | "OPNAME" | "HISTORY"
  >("RETAIL");
  const [searchQuery, setSearchQuery] = useState("");

  // -------------------------------------------------------------
  // STATE MODAL RESTOK
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // STATE MODAL CRUD PRODUK RITEL
  // -------------------------------------------------------------
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<
    InventoryData["products"][0] | null
  >(null);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Minuman",
    costPrice: 0,
    sellingPrice: 10000,
    initialStock: 10,
    minStockAlert: 5,
    sku: "",
  });

  // -------------------------------------------------------------
  // STATE MODAL CRUD BAHAN OPERASIONAL
  // -------------------------------------------------------------
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<
    InventoryData["supplies"][0] | null
  >(null);
  const [supplyForm, setSupplyForm] = useState({
    name: "",
    unit: "Liter",
    initialStock: 10,
    minStockAlert: 5,
    usagePerCarWash: 0.1,
    usagePerMotorWash: 0.04,
    sku: "",
  });

  // -------------------------------------------------------------
  // STATE TAB & MODAL STOCK OPNAME (TASK 6.3)
  // -------------------------------------------------------------
  const [opnameTargetType, setOpnameTargetType] = useState<"RETAIL" | "SUPPLY">(
    "RETAIL"
  );
  const [selectedOpnameItemId, setSelectedOpnameItemId] = useState<string>("");
  const [opnamePhysicalStock, setOpnamePhysicalStock] = useState<string>("");
  const [opnameReason, setOpnameReason] = useState<string>(
    "Selisih hitung fisik periodik"
  );

  // -------------------------------------------------------------
  // HANDLERS RESTOK
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // HANDLERS PRODUK RITEL CRUD
  // -------------------------------------------------------------
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      category: "Minuman",
      costPrice: 0,
      sellingPrice: 10000,
      initialStock: 10,
      minStockAlert: 5,
      sku: "",
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: InventoryData["products"][0]) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      category: prod.category,
      costPrice: prod.costPrice || 0,
      sellingPrice: prod.sellingPrice,
      initialStock: prod.stock,
      minStockAlert: prod.minStockAlert,
      sku: prod.sku || "",
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.name.trim()) {
      toast.error("Nama produk tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      if (editingProduct) {
        const res = await updateRetailProductAction({
          id: editingProduct.id,
          name: productForm.name,
          category: productForm.category,
          costPrice: Number(productForm.costPrice),
          sellingPrice: Number(productForm.sellingPrice),
          minStockAlert: Number(productForm.minStockAlert),
          sku: productForm.sku || null,
          isActive: true,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal memperbarui produk.");
          return;
        }
        toast.success(`Produk "${productForm.name}" berhasil diperbarui!`);
      } else {
        const res = await createRetailProductAction({
          name: productForm.name,
          category: productForm.category,
          costPrice: Number(productForm.costPrice),
          sellingPrice: Number(productForm.sellingPrice),
          initialStock: Number(productForm.initialStock),
          minStockAlert: Number(productForm.minStockAlert),
          sku: productForm.sku || null,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal membuat produk.");
          return;
        }
        toast.success(`Produk ritel "${productForm.name}" berhasil dibuat!`);
      }

      setIsProductModalOpen(false);
      router.refresh();
    });
  };

  const handleDeleteProduct = (prod: InventoryData["products"][0]) => {
    if (!confirm(`Hapus produk "${prod.name}" dari katalog ritel?`)) return;

    startTransition(async () => {
      const res = await deleteRetailProductAction(prod.id);
      if (!res.success) {
        toast.error(res.error || "Gagal menghapus produk.");
        return;
      }
      toast.success(`Produk "${prod.name}" berhasil dihapus.`);
      router.refresh();
    });
  };

  // -------------------------------------------------------------
  // HANDLERS BAHAN OPERASIONAL CRUD
  // -------------------------------------------------------------
  const handleOpenAddSupply = () => {
    setEditingSupply(null);
    setSupplyForm({
      name: "",
      unit: "Liter",
      initialStock: 10,
      minStockAlert: 5,
      usagePerCarWash: 0.1,
      usagePerMotorWash: 0.04,
      sku: "",
    });
    setIsSupplyModalOpen(true);
  };

  const handleOpenEditSupply = (supply: InventoryData["supplies"][0]) => {
    setEditingSupply(supply);
    setSupplyForm({
      name: supply.name,
      unit: supply.unit,
      initialStock: supply.currentStock,
      minStockAlert: supply.minStockAlert,
      usagePerCarWash: supply.usagePerCarWash,
      usagePerMotorWash: supply.usagePerMotorWash,
      sku: supply.sku || "",
    });
    setIsSupplyModalOpen(true);
  };

  const handleSaveSupply = () => {
    if (!supplyForm.name.trim()) {
      toast.error("Nama bahan tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      if (editingSupply) {
        const res = await updateOperationalSupplyAction({
          id: editingSupply.id,
          name: supplyForm.name,
          unit: supplyForm.unit,
          minStockAlert: Number(supplyForm.minStockAlert),
          usagePerCarWash: Number(supplyForm.usagePerCarWash),
          usagePerMotorWash: Number(supplyForm.usagePerMotorWash),
          sku: supplyForm.sku || null,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal memperbarui bahan operasional.");
          return;
        }
        toast.success(`Bahan "${supplyForm.name}" berhasil diperbarui!`);
      } else {
        const res = await createOperationalSupplyAction({
          name: supplyForm.name,
          unit: supplyForm.unit,
          initialStock: Number(supplyForm.initialStock),
          minStockAlert: Number(supplyForm.minStockAlert),
          usagePerCarWash: Number(supplyForm.usagePerCarWash),
          usagePerMotorWash: Number(supplyForm.usagePerMotorWash),
          sku: supplyForm.sku || null,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal menambah bahan.");
          return;
        }
        toast.success(
          `Bahan operasional "${supplyForm.name}" berhasil dibuat!`
        );
      }

      setIsSupplyModalOpen(false);
      router.refresh();
    });
  };

  const handleDeleteSupply = (supply: InventoryData["supplies"][0]) => {
    if (!confirm(`Hapus bahan operasional "${supply.name}"?`)) return;

    startTransition(async () => {
      const res = await deleteOperationalSupplyAction(supply.id);
      if (!res.success) {
        toast.error(res.error || "Gagal menghapus bahan.");
        return;
      }
      toast.success(`Bahan "${supply.name}" berhasil dihapus.`);
      router.refresh();
    });
  };

  // -------------------------------------------------------------
  // HANDLERS STOCK OPNAME (TASK 6.3)
  // -------------------------------------------------------------
  const selectedOpnameProduct = useMemo(() => {
    if (opnameTargetType !== "RETAIL") return null;
    return data.products.find((p) => p.id === selectedOpnameItemId) || null;
  }, [data.products, opnameTargetType, selectedOpnameItemId]);

  const selectedOpnameSupply = useMemo(() => {
    if (opnameTargetType !== "SUPPLY") return null;
    return data.supplies.find((s) => s.id === selectedOpnameItemId) || null;
  }, [data.supplies, opnameTargetType, selectedOpnameItemId]);

  const currentSystemStock = useMemo(() => {
    if (opnameTargetType === "RETAIL") {
      return selectedOpnameProduct ? selectedOpnameProduct.stock : 0;
    }
    return selectedOpnameSupply ? selectedOpnameSupply.currentStock : 0;
  }, [opnameTargetType, selectedOpnameProduct, selectedOpnameSupply]);

  const opnameDifference = useMemo(() => {
    if (!opnamePhysicalStock.trim()) return 0;
    const phys = parseFloat(opnamePhysicalStock);
    if (isNaN(phys)) return 0;
    return phys - currentSystemStock;
  }, [opnamePhysicalStock, currentSystemStock]);

  const handleLaunchQuickOpname = (type: "RETAIL" | "SUPPLY", id: string) => {
    setOpnameTargetType(type);
    setSelectedOpnameItemId(id);
    if (type === "RETAIL") {
      const item = data.products.find((p) => p.id === id);
      setOpnamePhysicalStock(item ? String(item.stock) : "0");
    } else {
      const item = data.supplies.find((s) => s.id === id);
      setOpnamePhysicalStock(item ? String(item.currentStock) : "0");
    }
    setActiveTab("OPNAME");
  };

  const handleSubmitOpname = () => {
    if (!selectedOpnameItemId) {
      toast.error("Pilih barang atau bahan yang ingin di-opname.");
      return;
    }
    const phys = parseFloat(opnamePhysicalStock);
    if (isNaN(phys) || phys < 0) {
      toast.error("Masukkan angka stok fisik yang valid.");
      return;
    }
    if (!opnameReason.trim()) {
      toast.error("Masukkan alasan penyesuaian opname.");
      return;
    }

    startTransition(async () => {
      const res = await submitStockOpnameAction({
        itemType: opnameTargetType,
        itemId: selectedOpnameItemId,
        physicalStock: phys,
        reason: opnameReason,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan penyesuaian opname.");
        return;
      }

      toast.success(
        `Sukses! Stok fisik ${res.data?.itemName} berhasil disesuaikan ke ${res.data?.physicalStock}. (Selisih: ${
          (res.data?.difference ?? 0) >= 0 ? "+" : ""
        }${res.data?.difference}).`
      );
      setOpnamePhysicalStock("");
      router.refresh();
    });
  };

  // Filtered views
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

  const opnameMovements = useMemo(() => {
    return data.movements.filter((m) => m.type === "ADJUSTMENT_OPNAME");
  }, [data.movements]);

  // Export CSV
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
            Kontrol Stok, Bahan Cucian, & Opname
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Pelacakan bahan baku cucian mobil/motor, penjualan ritel kasir, dan
            rekonsiliasi fisik berkala.
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
              onClick={() => setActiveTab("OPNAME")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                activeTab === "OPNAME"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>Stock Opname</span>
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

      {/* Low Stock Warning Banner */}
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

      {/* ------------------------------------------------------------- */}
      {/* 1. TAB PRODUK RITEL (TASK 6.2) */}
      {/* ------------------------------------------------------------- */}
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

              <Button
                onClick={handleOpenAddProduct}
                className="h-9 gap-1.5 text-xs font-bold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Produk Ritel</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-y text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-5 py-3">Nama Produk</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3">Harga Modal</th>
                    <th className="px-5 py-3">Harga Jual</th>
                    <th className="px-5 py-3">Stok Saat Ini</th>
                    <th className="px-5 py-3">Batas Minimum</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Tidak ada produk ritel yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock <= p.minStockAlert;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="text-foreground px-5 py-3.5 font-bold">
                            <div>{p.name}</div>
                            {p.sku && (
                              <span className="text-muted-foreground font-mono text-[10px]">
                                SKU: {p.sku}
                              </span>
                            )}
                          </td>
                          <td className="text-muted-foreground px-5 py-3.5">
                            {p.category}
                          </td>
                          <td className="text-muted-foreground px-5 py-3.5 font-medium">
                            {p.costPrice ? formatRupiah(p.costPrice) : "-"}
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
                            <div className="flex items-center justify-end gap-1.5">
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleLaunchQuickOpname("RETAIL", p.id)
                                }
                                className="h-8 gap-1 border-purple-500/30 text-xs font-bold text-purple-700 hover:bg-purple-500/10 dark:text-purple-300"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                <span>Opname</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditProduct(p)}
                                className="h-8 w-8 p-0"
                                title="Edit Produk"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteProduct(p)}
                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                title="Hapus Produk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB BAHAN CUCI OPERASIONAL (TASK 6.1) */}
      {/* ------------------------------------------------------------- */}
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

              <Button
                onClick={handleOpenAddSupply}
                className="h-9 gap-1.5 text-xs font-bold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Bahan Operasional</span>
              </Button>
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
                  {filteredSupplies.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Tidak ada bahan operasional yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSupplies.map((s) => {
                      const isLow = s.currentStock <= s.minStockAlert;
                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="text-foreground px-5 py-3.5 font-bold">
                            <div>{s.name}</div>
                            {s.sku && (
                              <span className="text-muted-foreground font-mono text-[10px]">
                                SKU: {s.sku}
                              </span>
                            )}
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
                            <div className="flex items-center justify-end gap-1.5">
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
                                <span>Restok</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleLaunchQuickOpname("SUPPLY", s.id)
                                }
                                className="h-8 gap-1 border-purple-500/30 text-xs font-bold text-purple-700 hover:bg-purple-500/10 dark:text-purple-300"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                <span>Opname</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditSupply(s)}
                                className="h-8 w-8 p-0"
                                title="Edit Bahan"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSupply(s)}
                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                title="Hapus Bahan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB STOCK OPNAME & REKONSILIASI FISIK (TASK 6.3) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "OPNAME" && (
        <div className="space-y-6">
          <Card className="bg-card border shadow-xs">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2 text-base font-black">
                <ClipboardCheck className="text-primary h-5 w-5" />
                <span>Form Rekonsiliasi Stock Opname Fisik</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Sesuaikan stok sistem dengan jumlah fisik aktual di gudang atau
                area pengerjaan. Sistem otomatis mencatat log audit alasan
                selisih.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 p-4 pt-0 sm:p-5 sm:pt-0">
              {/* Pilihan Jenis Item */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-muted-foreground w-36 text-xs font-bold uppercase">
                  Jenis Item:
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      opnameTargetType === "RETAIL" ? "default" : "outline"
                    }
                    onClick={() => {
                      setOpnameTargetType("RETAIL");
                      setSelectedOpnameItemId("");
                      setOpnamePhysicalStock("");
                    }}
                    className="h-8 gap-1.5 text-xs font-bold"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Produk Ritel</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      opnameTargetType === "SUPPLY" ? "default" : "outline"
                    }
                    onClick={() => {
                      setOpnameTargetType("SUPPLY");
                      setSelectedOpnameItemId("");
                      setOpnamePhysicalStock("");
                    }}
                    className="h-8 gap-1.5 text-xs font-bold"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    <span>Bahan Operasional</span>
                  </Button>
                </div>
              </div>

              {/* Dropdown Item */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-muted-foreground w-36 text-xs font-bold uppercase">
                  Pilih Item:
                </label>
                <select
                  value={selectedOpnameItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedOpnameItemId(id);
                    if (opnameTargetType === "RETAIL") {
                      const item = data.products.find((p) => p.id === id);
                      setOpnamePhysicalStock(item ? String(item.stock) : "");
                    } else {
                      const item = data.supplies.find((s) => s.id === id);
                      setOpnamePhysicalStock(
                        item ? String(item.currentStock) : ""
                      );
                    }
                  }}
                  className="bg-background focus:ring-primary/20 h-10 w-full max-w-md rounded-xl border px-3 text-xs font-semibold focus:ring-2 focus:outline-none"
                >
                  <option value="">
                    -- Pilih{" "}
                    {opnameTargetType === "RETAIL"
                      ? "Produk Ritel"
                      : "Bahan Cuci"}{" "}
                    --
                  </option>
                  {opnameTargetType === "RETAIL"
                    ? data.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stok Sistem: {p.stock} Unit)
                        </option>
                      ))
                    : data.supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Stok Sistem: {s.currentStock} {s.unit})
                        </option>
                      ))}
                </select>
              </div>

              {/* Perbandingan Tiga Kotak KPI */}
              {selectedOpnameItemId && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-muted/40 rounded-xl border p-4">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      Stok Sistem Saat Ini
                    </span>
                    <div className="text-foreground mt-1 text-2xl font-black">
                      {currentSystemStock}{" "}
                      <span className="text-xs font-normal">
                        {opnameTargetType === "RETAIL"
                          ? "Unit"
                          : selectedOpnameSupply?.unit}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase dark:text-blue-300">
                      Stok Fisik Aktual (Riil)
                    </span>
                    <Input
                      type="number"
                      step={opnameTargetType === "SUPPLY" ? "0.01" : "1"}
                      min="0"
                      value={opnamePhysicalStock}
                      onChange={(e) => setOpnamePhysicalStock(e.target.value)}
                      placeholder="Masukkan hitungan fisik..."
                      className="mt-1 h-9 text-base font-black"
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${
                      opnameDifference > 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : opnameDifference < 0
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "bg-muted/30 border"
                    }`}
                  >
                    <span className="text-[10px] font-bold tracking-wider uppercase">
                      Selisih Hitungan
                    </span>
                    <div className="mt-1 text-2xl font-black">
                      {opnameDifference > 0
                        ? `+${opnameDifference}`
                        : opnameDifference}{" "}
                      <span className="text-xs font-semibold">
                        {opnameDifference > 0
                          ? "(Surplus)"
                          : opnameDifference < 0
                            ? "(Defisit)"
                            : "(Sesuai/Klop)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Alasan Penyesuaian */}
              {selectedOpnameItemId && (
                <div className="space-y-2">
                  <label className="text-muted-foreground block text-xs font-bold uppercase">
                    Alasan Selisih / Catatan Opname:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Selisih hitung fisik periodik",
                      "Barang tumpah / bocor di area bay",
                      "Bahan rusak / kedaluwarsa",
                      "Barang hilang / tidak tercatat",
                      "Koreksi input stok sebelumnya",
                    ].map((reasonOption) => (
                      <Button
                        key={reasonOption}
                        type="button"
                        size="sm"
                        variant={
                          opnameReason === reasonOption ? "default" : "outline"
                        }
                        onClick={() => setOpnameReason(reasonOption)}
                        className="h-7 text-[11px]"
                      >
                        {reasonOption}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="text"
                    value={opnameReason}
                    onChange={(e) => setOpnameReason(e.target.value)}
                    placeholder="Alasan penyesuaian opname..."
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {/* Tombol Eksekusi */}
              {selectedOpnameItemId && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSubmitOpname}
                    disabled={isPending || !opnamePhysicalStock.trim()}
                    className="h-10 gap-2 font-bold shadow-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span>Simpan & Rekonsiliasi Saldo Riil</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat Opname Terakhir */}
          <Card className="bg-card border shadow-xs">
            <CardHeader className="p-4 sm:p-5">
              <CardTitle className="text-sm font-black">
                Riwayat Rekonsiliasi Stock Opname Terakhir
              </CardTitle>
              <CardDescription className="text-xs">
                Catatan mutasi stok dengan tipe penyesuaian opname fisik.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-y text-[10px] font-bold uppercase">
                    <tr>
                      <th className="px-5 py-3">Waktu</th>
                      <th className="px-5 py-3">Nama Barang / Bahan</th>
                      <th className="px-5 py-3">Jumlah Selisih</th>
                      <th className="px-5 py-3">Saldo Setelahnya</th>
                      <th className="px-5 py-3">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {opnameMovements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-muted-foreground py-6 text-center"
                        >
                          Belum ada catatan rekonsiliasi stock opname.
                        </td>
                      </tr>
                    ) : (
                      opnameMovements.map((m) => (
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
                          <td className="px-5 py-3 font-bold text-purple-600 dark:text-purple-400">
                            {m.quantity}
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB RIWAYAT MUTASI LENGKAP */}
      {/* ------------------------------------------------------------- */}
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
                                  : m.type === "ADJUSTMENT_OPNAME"
                                    ? "outline"
                                    : "outline"
                            }
                            className={`h-4 px-1.5 py-0 text-[10px] font-bold ${
                              m.type === "ADJUSTMENT_OPNAME"
                                ? "border-purple-500/30 text-purple-700 dark:text-purple-300"
                                : ""
                            }`}
                          >
                            {m.type === "IN_RESTOCK"
                              ? "Restok Masuk"
                              : m.type === "OUT_SALE"
                                ? "Terjual POS"
                                : m.type === "ADJUSTMENT_OPNAME"
                                  ? "Opname Fisik"
                                  : "Pemakaian Cuci"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-bold">
                          {m.type === "IN_RESTOCK" ? (
                            <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                              +{m.quantity}
                            </span>
                          ) : m.type === "ADJUSTMENT_OPNAME" ? (
                            <span className="text-purple-600 dark:text-purple-400">
                              &plusmn;{m.quantity}
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL RESTOK PRODUK RITEL */}
      {/* ------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL RESTOK BAHAN OPERASIONAL */}
      {/* ------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL TAMBAH / EDIT PRODUK RITEL */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isProductModalOpen}
        onOpenChange={(open) => !open && setIsProductModalOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {editingProduct
                ? "Edit Produk Ritel"
                : "Tambah Produk Ritel Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Katalog barang dagangan kasir (parfum mobil, minuman dingin,
              snack, wiper).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div>
              <label className="text-muted-foreground font-bold">
                Nama Produk *
              </label>
              <Input
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                placeholder="Contoh: Parfum Mobil Kopi, Pocari Sweat 500ml"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground font-bold">
                  Kategori
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                  className="bg-background focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-2.5 text-xs font-semibold focus:ring-2 focus:outline-none"
                >
                  <option value="Minuman">Minuman</option>
                  <option value="Makanan">Makanan / Snack</option>
                  <option value="Aksesoris">Aksesoris Mobil</option>
                  <option value="Perawatan">Perawatan Kendaraan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground font-bold">
                  SKU / Barcode (Opsional)
                </label>
                <Input
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sku: e.target.value })
                  }
                  placeholder="KNC-RTL-001"
                  className="mt-1 h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground font-bold">
                  Harga Modal (Rp)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={productForm.costPrice}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      costPrice: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground font-bold">
                  Harga Jual Kasir (Rp) *
                </label>
                <Input
                  type="number"
                  min={100}
                  value={productForm.sellingPrice}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      sellingPrice: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!editingProduct && (
                <div>
                  <label className="text-muted-foreground font-bold">
                    Stok Awal (Unit)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={productForm.initialStock}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        initialStock: Number(e.target.value),
                      })
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-muted-foreground font-bold">
                  Batas Peringatan Minimum
                </label>
                <Input
                  type="number"
                  min={1}
                  value={productForm.minStockAlert}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      minStockAlert: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProductModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleSaveProduct}
              className="font-bold"
            >
              {isPending ? "Menyimpan..." : "Simpan Produk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL TAMBAH / EDIT BAHAN OPERASIONAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isSupplyModalOpen}
        onOpenChange={(open) => !open && setIsSupplyModalOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {editingSupply
                ? "Edit Bahan Operasional"
                : "Tambah Bahan Operasional Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Formula bahan cucian (shampo salju, semir ban, wax, lap
              microfiber) dan takaran pemakaian per kendaraan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div>
              <label className="text-muted-foreground font-bold">
                Nama Bahan *
              </label>
              <Input
                value={supplyForm.name}
                onChange={(e) =>
                  setSupplyForm({ ...supplyForm, name: e.target.value })
                }
                placeholder="Contoh: Shampo Salju Konsentrat, Semir Ban Silikon"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground font-bold">
                  Satuan Ukuran *
                </label>
                <select
                  value={supplyForm.unit}
                  onChange={(e) =>
                    setSupplyForm({ ...supplyForm, unit: e.target.value })
                  }
                  className="bg-background focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-2.5 text-xs font-semibold focus:ring-2 focus:outline-none"
                >
                  <option value="Liter">Liter</option>
                  <option value="Mililiter">Mililiter (ml)</option>
                  <option value="Botol">Botol</option>
                  <option value="Lembar">Lembar / Pcs</option>
                  <option value="Gram">Gram / Kg</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground font-bold">
                  SKU / Kode Bahan
                </label>
                <Input
                  value={supplyForm.sku}
                  onChange={(e) =>
                    setSupplyForm({ ...supplyForm, sku: e.target.value })
                  }
                  placeholder="KNC-SUP-001"
                  className="mt-1 h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground font-bold">
                  Takaran per Mobil ({supplyForm.unit})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min={0}
                  value={supplyForm.usagePerCarWash}
                  onChange={(e) =>
                    setSupplyForm({
                      ...supplyForm,
                      usagePerCarWash: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground font-bold">
                  Takaran per Motor ({supplyForm.unit})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min={0}
                  value={supplyForm.usagePerMotorWash}
                  onChange={(e) =>
                    setSupplyForm({
                      ...supplyForm,
                      usagePerMotorWash: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!editingSupply && (
                <div>
                  <label className="text-muted-foreground font-bold">
                    Stok Awal ({supplyForm.unit})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={supplyForm.initialStock}
                    onChange={(e) =>
                      setSupplyForm({
                        ...supplyForm,
                        initialStock: Number(e.target.value),
                      })
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-muted-foreground font-bold">
                  Batas Peringatan Minimum
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={supplyForm.minStockAlert}
                  onChange={(e) =>
                    setSupplyForm({
                      ...supplyForm,
                      minStockAlert: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSupplyModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleSaveSupply}
              className="font-bold"
            >
              {isPending ? "Menyimpan..." : "Simpan Bahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
