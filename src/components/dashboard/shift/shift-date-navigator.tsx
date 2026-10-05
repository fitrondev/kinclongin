import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface ShiftDateNavigatorProps {
  currentDate: string;
  formattedDateTitle: string;
  isPending: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onDateChange: (dateStr: string) => void;
}

export function ShiftDateNavigator({
  currentDate,
  formattedDateTitle,
  isPending,
  onPrevDay,
  onNextDay,
  onToday,
  onDateChange,
}: ShiftDateNavigatorProps) {
  return (
    <Card className="bg-card/60 border">
      <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:justify-start">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevDay}
            disabled={isPending}
            className="h-9 w-9 shrink-0"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 items-center gap-1.5 px-1 sm:gap-2">
            <Calendar className="text-primary h-4 w-4 shrink-0" />
            <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="truncate text-xs font-black tracking-tight sm:text-sm">
                {formattedDateTitle}
              </span>
              <span className="text-muted-foreground font-mono text-[10px] sm:text-xs">
                ({currentDate})
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onNextDay}
            disabled={isPending}
            className="h-9 w-9 shrink-0"
            title="Hari Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          <Input
            type="date"
            value={currentDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 flex-1 text-xs font-semibold sm:w-36 md:w-40"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={onToday}
            disabled={isPending}
            className="h-9 shrink-0 text-xs font-bold"
          >
            Hari Ini
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
