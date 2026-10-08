"use client";

import { useMemo, useState, useTransition } from "react";

import { Bike, Car, Filter, Plus, Search, Truck } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionType, VehicleCategory } from "@/generated/prisma/enums";

import { DeleteServiceDialog } from "./services/delete-service-dialog";
import { ServiceCardItem } from "./services/service-card-item";
import { CATEGORY_INFO } from "./services/service-constants";
import { ServicePackageDialog } from "./services/service-package-dialog";
import { ServiceRecipeDialog } from "./services/service-recipe-dialog";
import { ServiceStatsCards } from "./services/service-stats-cards";

export { CATEGORY_INFO };

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

  // State Resep Bahan Kimia (COGS)
  const [recipeTarget, setRecipeTarget] = useState<ServicePackageItem | null>(
    null
  );

  const isOwnerOrManager = userRole === "OWNER" || userRole === "MANAGER";

  // Filter list
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (selectedTab === "MOBIL") {
        if (!pkg.vehicleCategory.startsWith("MOBIL")) return false;
      } else if (selectedTab === "MOTOR") {
        if (!pkg.vehicleCategory.startsWith("MOTOR")) return false;
      } else if (selectedTab === "LAINNYA") {
        if (pkg.vehicleCategory !== "KENDARAAN_LAIN") return false;
      } else if (selectedTab !== "ALL") {
        if (pkg.vehicleCategory !== selectedTab) return false;
      }

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl lg:text-3xl">
              Master Paket & Tarif Layanan
            </h1>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary shrink-0 text-xs font-bold"
            >
              Manajer & Owner
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Atur katalog layanan, tarif per kategori kendaraan, durasi SLA, dan
            skema komisi pekerja cabang{" "}
            <span className="text-foreground font-semibold">{outletName}</span>.
          </p>
        </div>

        {isOwnerOrManager && (
          <Button
            onClick={handleOpenCreate}
            className="h-10 w-full shrink-0 gap-2 font-bold shadow-sm sm:h-11 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Paket Layanan</span>
          </Button>
        )}
      </div>

      {/* 2. Stat Cards */}
      <ServiceStatsCards stats={stats} />

      {/* 3. Filter Bar & Tabs */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 sm:flex">
            <TabsTrigger value="ALL" className="text-xs font-bold">
              Semua
            </TabsTrigger>
            <TabsTrigger value="MOBIL" className="gap-1.5 text-xs font-bold">
              <Car className="h-3.5 w-3.5 shrink-0" />
              <span>Mobil</span>
            </TabsTrigger>
            <TabsTrigger value="MOTOR" className="gap-1.5 text-xs font-bold">
              <Bike className="h-3.5 w-3.5 shrink-0" />
              <span>Motor</span>
            </TabsTrigger>
            <TabsTrigger value="LAINNYA" className="gap-1.5 text-xs font-bold">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>Lainnya</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPackages.map((pkg) => (
            <ServiceCardItem
              key={pkg.id}
              pkg={pkg}
              isOwnerOrManager={isOwnerOrManager}
              isPending={isPending}
              onEdit={handleOpenEdit}
              onDelete={(target) => setDeleteTarget(target)}
              onToggleStatus={handleToggleStatus}
              onConfigureRecipe={(target) => setRecipeTarget(target)}
            />
          ))}
        </div>
      )}

      {/* Dialog Resep Bahan Kimia (COGS) */}
      <ServiceRecipeDialog
        pkg={recipeTarget}
        isOpen={Boolean(recipeTarget)}
        onClose={() => setRecipeTarget(null)}
      />

      {/* 5. Dialog Form Tambah / Edit */}
      <ServicePackageDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingPackage={editingPackage}
        formName={formName}
        setFormName={setFormName}
        formDescription={formDescription}
        setFormDescription={setFormDescription}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formPrice={formPrice}
        setFormPrice={setFormPrice}
        formMinutes={formMinutes}
        setFormMinutes={setFormMinutes}
        formCommissionType={formCommissionType}
        setFormCommissionType={setFormCommissionType}
        formCommissionRate={formCommissionRate}
        setFormCommissionRate={setFormCommissionRate}
        formIsActive={formIsActive}
        setFormIsActive={setFormIsActive}
        isPending={isPending}
        onSave={handleSavePackage}
      />

      {/* 6. Dialog Konfirmasi Hapus */}
      <DeleteServiceDialog
        deleteTarget={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        isPending={isPending}
        onConfirmDelete={handleDelete}
      />
    </div>
  );
}
