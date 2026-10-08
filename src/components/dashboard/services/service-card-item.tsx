import { Beaker, Car, Clock, Edit2, Trash2 } from "lucide-react";

import type { ServicePackageItem } from "@/actions/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CommissionType } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

import { CATEGORY_INFO } from "./service-constants";

export interface ServiceCardItemProps {
  pkg: ServicePackageItem;
  isOwnerOrManager: boolean;
  isPending: boolean;
  onEdit: (pkg: ServicePackageItem) => void;
  onDelete: (pkg: ServicePackageItem) => void;
  onToggleStatus: (pkg: ServicePackageItem) => void;
  onConfigureRecipe?: (pkg: ServicePackageItem) => void;
}

export function ServiceCardItem({
  pkg,
  isOwnerOrManager,
  isPending,
  onEdit,
  onDelete,
  onToggleStatus,
  onConfigureRecipe,
}: ServiceCardItemProps) {
  const cat = CATEGORY_INFO[pkg.vehicleCategory];
  const CatIcon = cat?.icon || Car;

  return (
    <Card
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
          {isOwnerOrManager ? (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[10px] font-semibold">
                {pkg.isActive ? "Aktif" : "Nonaktif"}
              </span>
              <Switch
                checked={pkg.isActive}
                onCheckedChange={() => onToggleStatus(pkg)}
                disabled={isPending}
                className="scale-75"
              />
            </div>
          ) : null}
        </div>

        <CardTitle className="mt-2 text-lg font-black tracking-tight">
          {pkg.name}
        </CardTitle>

        <CardDescription className="line-clamp-2 min-h-8 text-xs">
          {pkg.description || "Layanan pencucian standar berkualitas tinggi."}
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
        {isOwnerOrManager ? (
          <div className="flex items-center gap-1.5 border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(pkg)}
              className="h-8 flex-1 gap-1 text-[11px] font-bold"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </Button>

            {onConfigureRecipe ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onConfigureRecipe(pkg)}
                className="h-8 gap-1 bg-cyan-500/10 text-[11px] font-bold text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-300"
                title="Atur takaran bahan kimia & kalkulasi HPP"
              >
                <Beaker className="h-3 w-3" />
                <span>Resep HPP</span>
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(pkg)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
