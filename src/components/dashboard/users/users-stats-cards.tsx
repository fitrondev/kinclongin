import { CreditCard, Droplets, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface UsersStatsCardsProps {
  stats: {
    total: number;
    active: number;
    managers: number;
    cashiers: number;
    washers: number;
  };
}

export function UsersStatsCards({ stats }: UsersStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <Card className="bg-card/70 border-border/80 min-w-0 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground truncate text-xs font-bold uppercase">
              Total Akun
            </span>
            <Users className="text-primary h-4 w-4 shrink-0" />
          </div>
          <div className="mt-2 text-xl font-black sm:text-2xl">
            {stats.total}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
            {stats.active} akun berstatus aktif
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/70 border-border/80 min-w-0 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground truncate text-xs font-bold uppercase">
              Manajer & Owner
            </span>
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-600 sm:text-2xl dark:text-amber-400">
            {stats.managers}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
            Akses supervisi & analitik
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/70 border-border/80 min-w-0 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground truncate text-xs font-bold uppercase">
              Kasir (POS)
            </span>
            <CreditCard className="h-4 w-4 shrink-0 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-600 sm:text-2xl dark:text-emerald-400">
            {stats.cashiers}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
            Front-desk & antrean kasir
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/70 border-border/80 min-w-0 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground truncate text-xs font-bold uppercase">
              Tukang Cuci
            </span>
            <Droplets className="h-4 w-4 shrink-0 text-cyan-500" />
          </div>
          <div className="mt-2 text-xl font-black text-cyan-600 sm:text-2xl dark:text-cyan-400">
            {stats.washers}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
            PIN Tablet Layar Cuci Kiosk
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
