import { Clock, Edit2, Trash2 } from "lucide-react";

import type { WorkShiftItem } from "@/actions/shifts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { SHIFT_COLOR_CLASSES } from "./shift-constants";

export interface ShiftTemplatesViewProps {
  shifts: WorkShiftItem[];
  isOwnerOrManager: boolean;
  onOpenShiftModal: (shift?: WorkShiftItem) => void;
  onDeleteShift: (id: string, name: string) => void;
}

export function ShiftTemplatesView({
  shifts,
  isOwnerOrManager,
  onOpenShiftModal,
  onDeleteShift,
}: ShiftTemplatesViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {shifts.map((s) => {
        const colorStyle =
          SHIFT_COLOR_CLASSES[s.color || "blue"] || SHIFT_COLOR_CLASSES.blue;

        return (
          <Card key={s.id} className="flex flex-col justify-between border">
            <CardHeader className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <Badge
                  variant="outline"
                  className={`font-bold ${colorStyle.badge}`}
                >
                  <span
                    className={`mr-1.5 h-1.5 w-1.5 rounded-full ${colorStyle.dot}`}
                  />
                  {s.name}
                </Badge>

                {isOwnerOrManager ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenShiftModal(s)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteShift(s.id, s.name)}
                      className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>

              <CardTitle className="mt-2 flex items-center gap-2 text-base font-black">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span>
                  {s.startTime} – {s.endTime} WIB
                </span>
              </CardTitle>

              <CardDescription className="text-xs">
                {s.description || "Shift kerja operasional standar."}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="text-muted-foreground text-[11px]">
                Total riwayat penugasan:{" "}
                <span className="text-foreground font-bold">
                  {s.assignedCount} kali
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
