"use client";

import { useMemo, useState, useTransition } from "react";

import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Coins,
  Edit2,
  Filter,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  type CreateServicePackageInput,
  type ServicePackageItem,
  type ServicePackagesSummary,
  type UpdateServicePackageInput,
  createServicePackageAction,
  deleteServicePackageAction,
  toggleServicePackageStatusAction,
  updateServicePackageAction,
} from "@/actions/services";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CommissionType, VehicleCategory } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

export const CATEGORY_INFO: Record<
  VehicleCategory,
  { label: string; sub: string; icon: typeof Car; color: string }
> = {
  MOTOR_KECIL: {
    label: "Motor Kecil",
    sub: "Beat, Mio, Vario 125",
    icon: Bike,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  MOTOR_BESAR: {
    label: "Motor Besar",
    sub: "NMax, PCX, Vespa, 150-250cc",
    icon: Bike,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  MOTOR_MOGE: {
    label: "Motor Moge",
    sub: "250cc+, Harley, Trail",
    icon: Bike,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  MOBIL_KECIL: {
    label: "Mobil Kecil",
    sub: "Brio, Agya, Yaris, Hatchback",
    icon: Car,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  MOBIL_SEDANG: {
    label: "Mobil Sedang",
    sub: "Avanza, Xpander, HR-V, Sedan",
    icon: Car,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  MOBIL_BESAR: {
    label: "Mobil Besar",
    sub: "Pajero, Fortuner, Alphard",
    icon: Car,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  KENDARAAN_LAIN: {
    label: "Kendaraan Lain",
    sub: "Pick-up, Truk Engkel, Box",
    icon: Truck,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
};

interface ServicesManagementViewProps {
  initialData: ServicePackagesSummary;
  outletName: string;
  userRole: string;
}

export function ServicesManagementView({
  initialData,
  outletName,
  userRole,
}: ServicesManagementViewProps) {
  const [packages, setPackages] = useState<ServicePackageItem[]>(
    initialData.packages
  );
  const [stats, setStats] = useState(initialData.stats);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // State Dialog Form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<ServicePackageItem | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<VehicleCategory>(
    VehicleCategory.MOBIL_SEDANG
  );
  const [formPrice, setFormPrice] = useState<number>(45000);
  const [formMinutes, setFormMinutes] = useState<number>(30);
  const [formCommissionType, setFormCommissionType] = useState<CommissionType>(
    CommissionType.FIXED_NOMINAL
  );
  const [formCommissionRate, setFormCommissionRate] = useState<number>(12000);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // State Confirm Delete
  const [deleteTarget, setDeleteTarget] = useState<ServicePackageItem | null>(
    null
  );

  const isOwnerOrManager = userRole === "OWNER" || userRole === "MANAGER";

  // Filter list
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Filter kategori tab
      if (selectedTab === "MOBIL") {
        if (!pkg.vehicleCategory.startsWith("MOBIL")) return false;
      } else if (selectedTab === "MOTOR") {
        if (!pkg.vehicleCategory.startsWith("MOTOR")) return false;
      } else if (selectedTab === "LAINNYA") {
        if (pkg.vehicleCategory !== "KENDARAAN_LAIN") return false;
      } else if (selectedTab !== "ALL") {
        if (pkg.vehicleCategory !== selectedTab) return false;
      }

      // Filter pencarian
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchName = pkg.name.toLowerCase().includes(query);
        const matchDesc = pkg.description?.toLowerCase().includes(query);
        const matchCat = CATEGORY_INFO[pkg.vehicleCategory]?.label
          .toLowerCase()
          .includes(query);
        return matchName || matchDesc || matchCat;
      }

      return true;
    });
  }, [packages, selectedTab, searchQuery]);

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormName("");
    setFormDescription("");
    setFormCategory(VehicleCategory.MOBIL_SEDANG);
    setFormPrice(45000);
    setFormMinutes(30);
    setFormCommissionType(CommissionType.FIXED_NOMINAL);
    setFormCommissionRate(12000);
    setFormIsActive(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (pkg: ServicePackageItem) => {
    setEditingPackage(pkg);
    setFormName(pkg.name);
    setFormDescription(pkg.description || "");
    setFormCategory(pkg.vehicleCategory);
    setFormPrice(pkg.price);
    setFormMinutes(pkg.estimatedMinutes);
    setFormCommissionType(pkg.commissionType);
    setFormCommissionRate(pkg.defaultCommission);
    setFormIsActive(pkg.isActive);
    setIsDialogOpen(true);
  };

  const handleSavePackage = () => {
    if (!formName.trim()) {
      toast.error("Nama paket layanan tidak boleh kosong.");
      return;
    }

    if (formPrice < 0) {
      toast.error("Tarif harga tidak boleh negatif.");
      return;
    }

    startTransition(async () => {
      if (editingPackage) {
        const payload: UpdateServicePackageInput = {
          id: editingPackage.id,
          name: formName.trim(),
          description: formDescription.trim() || null,
          vehicleCategory: formCategory,
          price: Number(formPrice),
          estimatedMinutes: Number(formMinutes),
          defaultCommission: Number(formCommissionRate),
          commissionType: formCommissionType,
          isActive: formIsActive,
        };

        const res = await updateServicePackageAction(payload);
        if (res.success && res.data) {
          toast.success(`Paket "${res.data.name}" berhasil diperbarui.`);
          setPackages((prev) =>
            prev.map((p) => (p.id === res.data!.id ? res.data! : p))
          );
          setIsDialogOpen(false);
        } else {
          toast.error(res.error || "Gagal memperbarui paket layanan.");
        }
      } else {
        const payload: CreateServicePackageInput = {
          name: formName.trim(),
          description: formDescription.trim() || null,
          vehicleCategory: formCategory,
          price: Number(formPrice),
          estimatedMinutes: Number(formMinutes),
          defaultCommission: Number(formCommissionRate),
          commissionType: formCommissionType,
          isActive: formIsActive,
        };

        const res = await createServicePackageAction(payload);
        if (res.success && res.data) {
          toast.success(`Paket "${res.data.name}" berhasil ditambahkan.`);
          setPackages((prev) => [...prev, res.data!]);
          setStats((prev) => ({
            ...prev,
            totalPackages: prev.totalPackages + 1,
            activePackages: prev.activePackages + (res.data!.isActive ? 1 : 0),
          }));
          setIsDialogOpen(false);
        } else {
          toast.error(res.error || "Gagal membuat paket layanan baru.");
        }
      }
    });
  };

  const handleToggleStatus = (pkg: ServicePackageItem) => {
    const nextStatus = !pkg.isActive;
    // Optimistic UI
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, isActive: nextStatus } : p))
    );
    setStats((prev) => ({
      ...prev,
      activePackages: prev.activePackages + (nextStatus ? 1 : -1),
    }));

    startTransition(async () => {
      const res = await toggleServicePackageStatusAction(pkg.id, nextStatus);
      if (res.success) {
        toast.success(
          nextStatus
            ? `Paket "${pkg.name}" kini AKTIF.`
            : `Paket "${pkg.name}" telah DINONAKTIFKAN.`
        );
      } else {
        // Rollback
        setPackages((prev) =>
          prev.map((p) =>
            p.id === pkg.id ? { ...p, isActive: !nextStatus } : p
          )
        );
        toast.error(res.error || "Gagal mengubah status paket.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deleteServicePackageAction(deleteTarget.id);
      if (res.success) {
        if (res.data?.deactivatedInstead) {
          toast.info(
            `Paket telah digunakan di transaksi tiket sebelumnya, sehingga dinonaktifkan (bukan dihapus permanen).`
          );
          setPackages((prev) =>
            prev.map((p) =>
              p.id === deleteTarget.id ? { ...p, isActive: false } : p
            )
          );
        } else {
          toast.success(`Paket "${deleteTarget.name}" berhasil dihapus.`);
          setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
          setStats((prev) => ({
            ...prev,
            totalPackages: prev.totalPackages - 1,
            activePackages:
              prev.activePackages - (deleteTarget.isActive ? 1 : 0),
          }));
        }
        setDeleteTarget(null);
      } else {
        toast.error(res.error || "Gagal menghapus paket layanan.");
      }
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Master Paket & Tarif Layanan
            </h1>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary text-xs font-bold"
            >
              Manajer & Owner
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Atur katalog layanan, tarif per kategori kendaraan, durasi SLA, dan
            skema komisi pekerja cabang{" "}
            <span className="text-foreground font-semibold">{outletName}</span>.
          </p>
        </div>

        {isOwnerOrManager && (
          <Button
            onClick={handleOpenCreate}
            className="h-11 gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Paket Layanan</span>
          </Button>
        )}
      </div>

      {/* 2. 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                Total Paket Layanan
              </span>
              <Sparkles className="text-primary h-4 w-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight">
                {stats.totalPackages}
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                ({stats.activePackages} aktif)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                Kategori Kendaraan
              </span>
              <Car className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight">
                {stats.totalCategoriesCovered}
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                tipe unit
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                Rata-rata Durasi SLA
              </span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight">
                {stats.averageMinutes}
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                Menit / mobil
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                Rata-rata Komisi Cuci
              </span>
              <Coins className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-black tracking-tight sm:text-xl">
                {formatRupiah(stats.averageCommission)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Bar & Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 sm:flex">
            <TabsTrigger value="ALL" className="text-xs font-bold">
              Semua
            </TabsTrigger>
            <TabsTrigger value="MOBIL" className="text-xs font-bold">
              🚗 Mobil
            </TabsTrigger>
            <TabsTrigger value="MOTOR" className="text-xs font-bold">
              🛵 Motor
            </TabsTrigger>
            <TabsTrigger value="LAINNYA" className="text-xs font-bold">
              🚚 Lainnya
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama paket layanan..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* 4. Service Packages Grid */}
      {filteredPackages.length === 0 ? (
        <Card className="border border-dashed p-10 text-center">
          <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Filter className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold">
            Tidak ada paket layanan ditemukan
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {searchQuery
              ? `Tidak ada paket yang cocok dengan kata kunci "${searchQuery}".`
              : "Belum ada paket layanan pada kategori ini. Silakan tambahkan paket baru."}
          </p>
          {isOwnerOrManager && (
            <Button
              onClick={handleOpenCreate}
              variant="outline"
              className="mt-4 font-bold"
            >
              + Tambah Paket Baru
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => {
            const cat = CATEGORY_INFO[pkg.vehicleCategory];
            const CatIcon = cat?.icon || Car;

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col justify-between border transition-all ${
                  !pkg.isActive
                    ? "bg-muted/30 opacity-60"
                    : "hover:border-primary/50 shadow-xs"
                }`}
              >
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 px-2 py-0.5 text-[11px] font-bold ${
                        cat?.color || "text-muted-foreground"
                      }`}
                    >
                      <CatIcon className="h-3 w-3" />
                      <span>{cat?.label || pkg.vehicleCategory}</span>
                    </Badge>

                    {/* Switch Aktif / Nonaktif */}
                    {isOwnerOrManager && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-[10px] font-semibold">
                          {pkg.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                        <Switch
                          checked={pkg.isActive}
                          onCheckedChange={() => handleToggleStatus(pkg)}
                          disabled={isPending}
                          className="scale-75"
                        />
                      </div>
                    )}
                  </div>

                  <CardTitle className="mt-2 text-lg font-black tracking-tight">
                    {pkg.name}
                  </CardTitle>

                  <CardDescription className="line-clamp-2 min-h-8 text-xs">
                    {pkg.description ||
                      "Layanan pencucian standar berkualitas tinggi."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
                  {/* Harga Jasa & Komisi Pekerja */}
                  <div className="bg-muted/50 flex items-baseline justify-between rounded-lg p-2.5">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-semibold tracking-wider uppercase">
                        Tarif Pelanggan
                      </span>
                      <span className="text-primary font-mono text-xl font-black">
                        {formatRupiah(pkg.price)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] font-semibold tracking-wider uppercase">
                        Komisi Pekerja
                      </span>
                      <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                        {pkg.commissionType === CommissionType.PERCENTAGE
                          ? `${pkg.defaultCommission}%`
                          : formatRupiah(pkg.defaultCommission)}
                      </span>
                    </div>
                  </div>

                  {/* SLA & Riwayat Pengerjaan */}
                  <div className="text-muted-foreground flex items-center justify-between pt-1 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>SLA: {pkg.estimatedMinutes} Menit</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span>{pkg.ticketsCount} unit dikerjakan</span>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  {isOwnerOrManager && (
                    <div className="flex items-center gap-2 border-t pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(pkg)}
                        className="h-8 flex-1 gap-1.5 text-xs font-bold"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Tarif</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(pkg)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Dialog Form Tambah / Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingPackage
                ? "Edit Paket Layanan Cuci"
                : "Tambah Paket Layanan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan nama paket, kategori kendaraan, tarif pelanggan, SLA
              menit, dan komisi pekerja cuci.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama Layanan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Paket Layanan *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Cuci Salju + Hidrolik + Semir Ban"
                className="text-xs font-semibold"
              />
            </div>

            {/* Kategori Kendaraan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kategori Kendaraan *</Label>
              <Select
                value={formCategory}
                onValueChange={(val) => setFormCategory(val as VehicleCategory)}
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue placeholder="Pilih kategori kendaraan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                    const Icon = info.icon;
                    return (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="text-muted-foreground h-3.5 w-3.5" />
                          <span className="font-bold">{info.label}</span>
                          <span className="text-muted-foreground text-[11px]">
                            ({info.sub})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Harga & SLA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tarif Harga (Rp) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Estimasi SLA (Menit) *
                </Label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(Number(e.target.value))}
                  className="font-mono text-xs font-bold"
                />
              </div>
            </div>

            {/* Skema Komisi Pekerja */}
            <div className="bg-muted/30 space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-xs font-bold">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  <span>Skema Komisi Tukang Cuci</span>
                </Label>

                <div className="flex items-center gap-2 text-xs">
                  <span
                    onClick={() =>
                      setFormCommissionType(CommissionType.FIXED_NOMINAL)
                    }
                    className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-bold ${
                      formCommissionType === CommissionType.FIXED_NOMINAL
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Nominal (Rp)
                  </span>
                  <span
                    onClick={() =>
                      setFormCommissionType(CommissionType.PERCENTAGE)
                    }
                    className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-bold ${
                      formCommissionType === CommissionType.PERCENTAGE
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Persentase (%)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium">
                  {formCommissionType === CommissionType.PERCENTAGE
                    ? "Nilai Persentase Komisi (%)"
                    : "Nominal Rupiah per Unit (Rp)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formCommissionRate}
                  onChange={(e) =>
                    setFormCommissionRate(Number(e.target.value))
                  }
                  className="font-mono text-xs font-bold"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Deskripsi Layanan (Opsional)
              </Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Rincian bagian pengerjaan: bodi luar, kolong hidrolik, vakum interior, semir ban..."
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Status Aktif */}
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold">Status Paket Aktif</Label>
                <p className="text-muted-foreground text-[11px]">
                  Paket aktif dapat langsung dipilih oleh kasir saat pendaftaran
                  tiket.
                </p>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isPending}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSavePackage}
              disabled={isPending}
              className="text-xs font-bold"
            >
              {isPending ? "Menyimpan..." : "Simpan Paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog Konfirmasi Hapus */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base font-black">
              <Trash2 className="h-5 w-5" />
              <span>Hapus Paket Layanan?</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus paket{" "}
              <span className="text-foreground font-bold">
                &ldquo;{deleteTarget?.name}&rdquo;
              </span>
              ? Jika sudah pernah ada transaksi tiket dengan paket ini, paket
              akan otomatis dinonaktifkan agar rekap data historis tetap aman.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs font-bold"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
