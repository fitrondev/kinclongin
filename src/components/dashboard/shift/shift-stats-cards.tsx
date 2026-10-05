import { UserCheck, UserX, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface ShiftStatsCardsProps {
  stats: {
    totalAssigned: number;
    washersOnDuty: number;
    cashiersOnDuty: number;
    unassignedStaff: number;
  };
}

export function ShiftStatsCards({ stats }: ShiftStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <Card className="border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-semibold">
              Staf Bertugas
            </span>
            <UserCheck className="text-primary h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {stats.totalAssigned}
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              orang
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-semibold">
              Washer Bertugas
            </span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-emerald-600">
              {stats.washersOnDuty}
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              di area pit cuci
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-semibold">
              Kasir Bertugas
            </span>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-blue-600">
              {stats.cashiersOnDuty}
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              di loket pembayaran
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-semibold">
              Libur / Belum Shift
            </span>
            <UserX className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-amber-600">
              {stats.unassignedStaff}
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              karyawan
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
