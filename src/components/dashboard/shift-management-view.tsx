"use client";

import { useMemo, useState, useTransition } from "react";

import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  Settings2,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  type AssignShiftInput,
  type CreateWorkShiftInput,
  type DailyRosterData,
  type ShiftAssignmentItem,
  type ShiftEmployeeItem,
  type UpdateWorkShiftInput,
  type WorkShiftItem,
  assignStaffShiftAction,
  createWorkShiftAction,
  deleteWorkShiftAction,
  getDailyRosterAction,
  removeShiftAssignmentAction,
  updateWorkShiftAction,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserRole } from "@/generated/prisma/enums";
import { formatTanggalIndo } from "@/lib/formatters";

const COLOR_CLASSES: Record<
  string,
  { badge: string; border: string; bg: string; dot: string }
> = {
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-500",
  },
  blue: {
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    dot: "bg-blue-500",
  },
  amber: {
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    dot: "bg-amber-500",
  },
  purple: {
    badge: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    dot: "bg-purple-500",
  },
  rose: {
    badge: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
    dot: "bg-rose-500",
  },
};

interface ShiftManagementViewProps {
  initialRoster: DailyRosterData;
  outletName: string;
  userRole: string;
}

export function ShiftManagementView({
  initialRoster,
  outletName,
  userRole,
}: ShiftManagementViewProps) {
  const [currentDate, setCurrentDate] = useState<string>(initialRoster.date);
  const [shifts, setShifts] = useState<WorkShiftItem[]>(initialRoster.shifts);
  const [employees, setEmployees] = useState<ShiftEmployeeItem[]>(
    initialRoster.employees
  );
  const [assignments, setAssignments] = useState<ShiftAssignmentItem[]>(
    initialRoster.assignments
  );
  const [stats, setStats] = useState(initialRoster.stats);
  const [isPending, startTransition] = useTransition();

  // State Dialog Tugaskan Staf
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  // State Dialog Template Shift
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShiftItem | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("07:30");
  const [shiftEndTime, setShiftEndTime] = useState("15:30");
  const [shiftDesc, setShiftDesc] = useState("");
  const [shiftColor, setShiftColor] = useState<
    "emerald" | "blue" | "amber" | "purple" | "rose"
  >("blue");

  const isOwnerOrManager = userRole === "OWNER" || userRole === "MANAGER";

  // Tanggal helper: format display YYYY-MM-DD to Indonesian
  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(currentDate + "T00:00:00");
      return formatTanggalIndo(d);
    } catch {
      return currentDate;
    }
  }, [currentDate]);

  // Load roster data for date
  const loadRosterForDate = (newDateStr: string) => {
    setCurrentDate(newDateStr);
    startTransition(async () => {
      const res = await getDailyRosterAction(newDateStr);
      if (res.success && res.data) {
        setShifts(res.data.shifts);
        setEmployees(res.data.employees);
        setAssignments(res.data.assignments);
        setStats(res.data.stats);
      } else {
        toast.error(res.error || "Gagal memuat jadwal untuk tanggal ini.");
      }
    });
  };

  const handlePrevDay = () => {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const newStr = d.toISOString().split("T")[0];
    loadRosterForDate(newStr);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const newStr = d.toISOString().split("T")[0];
    loadRosterForDate(newStr);
  };

  const handleToday = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    loadRosterForDate(todayStr);
  };

  // Open Assign Dialog
  const handleOpenAssign = (defaultShiftId?: string, defaultEmpId?: string) => {
    setSelectedShiftId(defaultShiftId || (shifts[0]?.id ?? ""));
    setSelectedEmployeeId(defaultEmpId || (employees[0]?.id ?? ""));
    setAssignNotes("");
    setIsAssignOpen(true);
  };

  // Submit Assign
  const handleSaveAssignment = () => {
    if (!selectedEmployeeId || !selectedShiftId) {
      toast.error("Pilih staf dan shift yang ditugaskan.");
      return;
    }

    startTransition(async () => {
      const payload: AssignShiftInput = {
        employeeId: selectedEmployeeId,
        shiftId: selectedShiftId,
        date: currentDate,
        notes: assignNotes.trim() || null,
      };

      const res = await assignStaffShiftAction(payload);
      if (res.success && res.data) {
        toast.success(
          `Staf ${res.data.employeeName} ditugaskan ke ${res.data.shiftName}.`
        );
        // Reload roster to recalculate stats
        loadRosterForDate(currentDate);
        setIsAssignOpen(false);
      } else {
        toast.error(res.error || "Gagal menetapkan penugasan shift.");
      }
    });
  };

  // Remove Assignment
  const handleRemoveAssignment = (assignmentId: string, empName: string) => {
    startTransition(async () => {
      const res = await removeShiftAssignmentAction(assignmentId);
      if (res.success) {
        toast.success(`Penugasan ${empName} berhasil dibatalkan.`);
        loadRosterForDate(currentDate);
      } else {
        toast.error(res.error || "Gagal membatalkan penugasan.");
      }
    });
  };

  // Open Template Modal
  const handleOpenShiftModal = (s?: WorkShiftItem) => {
    if (s) {
      setEditingShift(s);
      setShiftName(s.name);
      setShiftStartTime(s.startTime);
      setShiftEndTime(s.endTime);
      setShiftDesc(s.description || "");
      setShiftColor(
        (s.color as "emerald" | "blue" | "amber" | "purple" | "rose") || "blue"
      );
    } else {
      setEditingShift(null);
      setShiftName("");
      setShiftStartTime("07:30");
      setShiftEndTime("15:30");
      setShiftDesc("");
      setShiftColor("blue");
    }
    setIsShiftModalOpen(true);
  };

  // Save Shift Template
  const handleSaveShiftTemplate = () => {
    if (!shiftName.trim()) {
      toast.error("Nama shift tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      if (editingShift) {
        const payload: UpdateWorkShiftInput = {
          id: editingShift.id,
          name: shiftName.trim(),
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          description: shiftDesc.trim() || null,
          color: shiftColor,
          isActive: editingShift.isActive,
        };
        const res = await updateWorkShiftAction(payload);
        if (res.success && res.data) {
          toast.success(`Template shift "${res.data.name}" diperbarui.`);
          setShifts((prev) =>
            prev.map((s) => (s.id === res.data!.id ? res.data! : s))
          );
          setIsShiftModalOpen(false);
        } else {
          toast.error(res.error || "Gagal memperbarui shift.");
        }
      } else {
        const payload: CreateWorkShiftInput = {
          name: shiftName.trim(),
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          description: shiftDesc.trim() || null,
          color: shiftColor,
          isActive: true,
        };
        const res = await createWorkShiftAction(payload);
        if (res.success && res.data) {
          toast.success(`Template shift "${res.data.name}" ditambahkan.`);
          setShifts((prev) => [...prev, res.data!]);
          setIsShiftModalOpen(false);
        } else {
          toast.error(res.error || "Gagal menambahkan shift.");
        }
      }
    });
  };

  // Delete Shift Template
  const handleDeleteShift = (id: string, name: string) => {
    if (!confirm(`Hapus template shift "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteWorkShiftAction(id);
      if (res.success) {
        toast.success(`Shift "${name}" berhasil dihapus.`);
        setShifts((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error(res.error || "Gagal menghapus template shift.");
      }
    });
  };

  // Group assignments by shift
  const assignmentsByShift = useMemo(() => {
    const map = new Map<string, ShiftAssignmentItem[]>();
    for (const shift of shifts) {
      map.set(shift.id, []);
    }
    for (const a of assignments) {
      const list = map.get(a.shiftId) || [];
      list.push(a);
      map.set(a.shiftId, list);
    }
    return map;
  }, [shifts, assignments]);

  // Unassigned employees for this date
  const assignedEmployeeIds = useMemo(() => {
    return new Set(assignments.map((a) => a.employeeId));
  }, [assignments]);

  const unassignedEmployees = useMemo(() => {
    return employees.filter((e) => !assignedEmployeeIds.has(e.id));
  }, [employees, assignedEmployeeIds]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Jadwal & Shift Kerja Staf
            </h1>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary text-xs font-bold"
            >
              Manajer & Owner
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Atur jam kerja shift (Pagi, Siang, Sore) dan penugasan harian tukang
            cuci & kasir cabang{" "}
            <span className="text-foreground font-semibold">{outletName}</span>.
          </p>
        </div>

        {isOwnerOrManager && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenShiftModal()}
              className="h-11 gap-2 font-bold"
            >
              <Settings2 className="h-4 w-4" />
              <span>Kelola Template Shift</span>
            </Button>

            <Button
              onClick={() => handleOpenAssign()}
              className="h-11 gap-2 font-bold shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tugaskan Staf</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. Date Navigator Bar */}
      <Card className="bg-card/60 border">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              disabled={isPending}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="text-primary h-4 w-4" />
              <span className="text-sm font-black tracking-tight sm:text-base">
                {formattedDateTitle}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                ({currentDate})
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              disabled={isPending}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={currentDate}
              onChange={(e) => loadRosterForDate(e.target.value)}
              className="h-9 w-40 text-xs font-semibold"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToday}
              disabled={isPending}
              className="h-9 text-xs font-bold"
            >
              Hari Ini
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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

      {/* 4. Tab Roster & Template Shift */}
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster" className="gap-2 text-xs font-bold">
            <Users className="h-4 w-4" />
            <span>Roster Shift Harian</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 text-xs font-bold">
            <Clock className="h-4 w-4" />
            <span>Master Template Shift ({shifts.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ROSTER HARIAN */}
        <TabsContent value="roster" className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift) => {
              const assignedList = assignmentsByShift.get(shift.id) || [];
              const colorStyle =
                COLOR_CLASSES[shift.color || "blue"] || COLOR_CLASSES.blue;

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

                    {shift.description && (
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {shift.description}
                      </p>
                    )}
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
                              {a.notes && (
                                <p className="text-muted-foreground truncate text-[11px]">
                                  {a.notes}
                                </p>
                              )}
                            </div>

                            {isOwnerOrManager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveAssignment(a.id, a.employeeName)
                                }
                                disabled={isPending}
                                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  {isOwnerOrManager && (
                    <div className="p-4 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssign(shift.id)}
                        className="h-8 w-full gap-1.5 text-xs font-bold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tugaskan ke Shift Ini</span>
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Staf Belum Terjadwal Hari Ini */}
          <Card className="border">
            <CardHeader className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-black">
                    <UserX className="h-4 w-4 text-amber-500" />
                    <span>
                      Staf Belum Terjadwal Hari Ini (
                      {unassignedEmployees.length})
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
                    Seluruh staf aktif telah mendapatkan penugasan shift hari
                    ini!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {unassignedEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="bg-muted/30 flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-bold">
                            {emp.fullName}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-bold"
                          >
                            {emp.role === UserRole.WASHER ? "Washer" : "Kasir"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {emp.phone ||
                            "PIN Kiosk: " + (emp.pinCode ? "Tersedia" : "-")}
                        </p>
                      </div>

                      {isOwnerOrManager && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenAssign(undefined, emp.id)}
                          className="h-7 gap-1 text-[11px] font-bold"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Tugaskan</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MASTER TEMPLATE SHIFT */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map((s) => {
              const colorStyle =
                COLOR_CLASSES[s.color || "blue"] || COLOR_CLASSES.blue;

              return (
                <Card
                  key={s.id}
                  className="flex flex-col justify-between border"
                >
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

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenShiftModal(s)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShift(s.id, s.name)}
                          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
        </TabsContent>
      </Tabs>

      {/* 5. Dialog Tugaskan Staf */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              Tugaskan Staf ke Shift
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih karyawan dan shift kerja yang akan dijalankan pada tanggal{" "}
              <span className="text-foreground font-bold">{currentDate}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Pilih Karyawan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Karyawan *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue placeholder="Pilih staf karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{emp.fullName}</span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] font-bold"
                        >
                          {emp.role === UserRole.WASHER ? "Washer" : "Kasir"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pilih Shift */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Pilih Shift Kerja *</Label>
              <Select
                value={selectedShiftId}
                onValueChange={setSelectedShiftId}
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue placeholder="Pilih shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{s.name}</span>
                        <span className="text-muted-foreground text-[11px]">
                          ({s.startTime} - {s.endTime})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Catatan Tugas Khusus */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Catatan Tugas (Opsional)
              </Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Contoh: Pegang area hidrolik 1, atau buka laci kasir pagi..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsAssignOpen(false)}
              disabled={isPending}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveAssignment}
              disabled={isPending}
              className="text-xs font-bold"
            >
              {isPending ? "Menugaskan..." : "Simpan Penugasan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog Template Shift */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {editingShift
                ? "Edit Template Shift"
                : "Tambah Template Shift Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atur nama shift, rentang jam kerja operasional, dan tema warna.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Shift *</Label>
              <Input
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                placeholder="Contoh: Shift Pagi (Buka), Shift Malam"
                className="text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Jam Mulai (HH:mm) *</Label>
                <Input
                  type="text"
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  placeholder="07:30"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Jam Selesai (HH:mm) *
                </Label>
                <Input
                  type="text"
                  value={shiftEndTime}
                  onChange={(e) => setShiftEndTime(e.target.value)}
                  placeholder="15:30"
                  className="font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Warna Tema Badge</Label>
              <Select
                value={shiftColor}
                onValueChange={(val) =>
                  setShiftColor(
                    val as "emerald" | "blue" | "amber" | "purple" | "rose"
                  )
                }
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emerald" className="text-xs">
                    🟢 Hijau Emerald (Pagi / Buka)
                  </SelectItem>
                  <SelectItem value="blue" className="text-xs">
                    🔵 Biru Modern (Siang / Peak)
                  </SelectItem>
                  <SelectItem value="amber" className="text-xs">
                    🟠 Oranye Amber (Sore / Tutup)
                  </SelectItem>
                  <SelectItem value="purple" className="text-xs">
                    🟣 Ungu Eksklusif
                  </SelectItem>
                  <SelectItem value="rose" className="text-xs">
                    🔴 Merah Rose (Khusus / Lembur)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Deskripsi Shift (Opsional)
              </Label>
              <Textarea
                value={shiftDesc}
                onChange={(e) => setShiftDesc(e.target.value)}
                placeholder="Deskripsi tugas umum shift..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsShiftModalOpen(false)}
              disabled={isPending}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveShiftTemplate}
              disabled={isPending}
              className="text-xs font-bold"
            >
              {isPending ? "Menyimpan..." : "Simpan Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
