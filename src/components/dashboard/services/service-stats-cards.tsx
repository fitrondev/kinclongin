import { Car, Clock, Coins, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/formatters";

export interface ServiceStatsCardsProps {
  stats: {
    totalPackages: number;
    activePackages: number;
    totalCategoriesCovered: number;
    averageMinutes: number;
    averageCommission: number;
  };
}

export function ServiceStatsCards({ stats }: ServiceStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
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
  );
}
