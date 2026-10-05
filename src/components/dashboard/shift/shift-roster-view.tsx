import { CheckCircle2, Clock, Plus, Trash2, UserX } from "lucide-react";

import type {
  ShiftAssignmentItem,
  ShiftEmployeeItem,
  WorkShiftItem,
} from "@/actions/shifts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserRole } from "@/generated/prisma/enums";

import { SHIFT_COLOR_CLASSES } from "./shift-constants";

export interface ShiftRosterViewProps {
  shifts: WorkShiftItem[];
  assignmentsByShift: Map<string, ShiftAssignmentItem[]>;
  unassignedEmployees: ShiftEmployeeItem[];
  isOwnerOrManager: boolean;
  isPending: boolean;
  onOpenAssign: (shiftId?: string, empId?: string) => void;
  onRemoveAssignment: (assignmentId: string, empName: string) => void;
}

export function ShiftRosterView({
  shifts,
  assignmentsByShift,
  unassignedEmployees,
  isOwnerOrManager,
  isPending,
  onOpenAssign,
  onRemoveAssignment,
}: ShiftRosterViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {shifts.map((shift) => {
          const assignedList = assignmentsByShift.get(shift.id) || [];
          const colorStyle =
            SHIFT_COLOR_CLASSES[shift.color || "blue"] ||
            SHIFT_COLOR_CLASSES.blue;

          return (
            <Card
              key={shift.id}
              className={`flex flex-col justify-between border ${colorStyle.border} ${colorStyle.bg}`}
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge
                      variant="outline"
                      className={`font-bold ${colorStyle.badge}`}
                    >
                      <span
                        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${colorStyle.dot}`}
                      />
                      {shift.name}
                    </Badge>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold">
                      <Clock className="text-muted-foreground h-3.5 w-3.5" />
                      <span>
                        {shift.startTime} – {shift.endTime} WIB
                      </span>
                    </div>
                  </div>

                  <Badge variant="secondary" className="font-mono text-xs">
                    {assignedList.length} Staf
                  </Badge>
                </div>

                {shift.description ? (
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {shift.description}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="flex-1 space-y-2 p-4 pt-1">
                {assignedList.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-muted-foreground text-xs">
                      Belum ada staf yang ditugaskan di shift ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedList.map((a) => (
                      <div
                        key={a.id}
                        className="bg-card flex items-center justify-between rounded-lg border p-2.5 shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold">
                              {a.employeeName}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] font-bold ${
                                a.employeeRole === UserRole.WASHER
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              {a.employeeRole === UserRole.WASHER
                                ? "Washer"
                                : "Kasir"}
                            </Badge>
                          </div>
                          {a.notes ? (
                            <p className="text-muted-foreground truncate text-[11px]">
                              {a.notes}
                            </p>
                          ) : null}
                        </div>

                        {isOwnerOrManager ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onRemoveAssignment(a.id, a.employeeName)
                            }
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              {isOwnerOrManager ? (
                <div className="p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenAssign(shift.id)}
                    className="h-8 w-full gap-1.5 text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tugaskan ke Shift Ini</span>
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {/* Staf Belum Terjadwal Hari Ini */}
      <Card className="border">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-black sm:text-base">
                <UserX className="h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  Staf Belum Terjadwal Hari Ini ({unassignedEmployees.length})
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Karyawan aktif cabang yang belum ditugaskan pada tanggal ini
                (dapat dijadwalkan shift atau tercatat libur).
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          {unassignedEmployees.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="text-foreground mt-2 text-xs font-bold">
                Seluruh staf aktif telah mendapatkan penugasan shift hari ini!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {unassignedEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-bold">
                        {emp.fullName}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[9px] font-bold"
                      >
                        {emp.role === UserRole.WASHER ? "Washer" : "Kasir"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {emp.phone ||
                        "PIN Kiosk: " + (emp.pinCode ? "Tersedia" : "-")}
                    </p>
                  </div>

                  {isOwnerOrManager ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenAssign(undefined, emp.id)}
                      className="h-7 shrink-0 gap-1 text-[11px] font-bold"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Tugaskan</span>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
