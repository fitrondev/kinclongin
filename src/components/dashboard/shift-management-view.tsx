"use client";

import { useMemo, useState, useTransition } from "react";

import { Clock, Settings2, UserPlus, Users } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTanggalIndo } from "@/lib/formatters";

import { ShiftAssignmentDialog } from "./shift/shift-assignment-dialog";
import { ShiftDateNavigator } from "./shift/shift-date-navigator";
import { ShiftRosterView } from "./shift/shift-roster-view";
import { ShiftStatsCards } from "./shift/shift-stats-cards";
import { ShiftTemplateDialog } from "./shift/shift-template-dialog";
import { ShiftTemplatesView } from "./shift/shift-templates-view";

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl lg:text-3xl">
              Jadwal & Shift Kerja Staf
            </h1>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary shrink-0 text-xs font-bold"
            >
              Manajer & Owner
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Atur jam kerja shift (Pagi, Siang, Sore) dan penugasan harian tukang
            cuci & kasir cabang{" "}
            <span className="text-foreground font-semibold">{outletName}</span>.
          </p>
        </div>

        {isOwnerOrManager && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={() => handleOpenShiftModal()}
              className="h-10 flex-1 gap-2 text-xs font-bold sm:h-11 sm:flex-none sm:text-sm"
            >
              <Settings2 className="h-4 w-4" />
              <span>Kelola Template Shift</span>
            </Button>

            <Button
              onClick={() => handleOpenAssign()}
              className="h-10 flex-1 gap-2 text-xs font-bold shadow-sm sm:h-11 sm:flex-none sm:text-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tugaskan Staf</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. Date Navigator Bar */}
      <ShiftDateNavigator
        currentDate={currentDate}
        formattedDateTitle={formattedDateTitle}
        isPending={isPending}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        onDateChange={loadRosterForDate}
      />

      {/* 3. 4 Stat Cards */}
      <ShiftStatsCards stats={stats} />

      {/* 4. Tab Roster & Template Shift */}
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList className="bg-muted grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 group-data-horizontal/tabs:h-auto sm:inline-flex sm:h-10 sm:w-auto sm:gap-1.5 sm:rounded-lg">
          <TabsTrigger
            value="roster"
            className="h-9 gap-1.5 px-2 text-xs font-bold data-active:shadow-xs sm:gap-2"
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Roster Harian</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="h-9 gap-1.5 px-2 text-xs font-bold data-active:shadow-xs sm:gap-2"
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Template Shift</span>
            <span className="text-muted-foreground shrink-0 font-mono text-[10px] sm:text-xs">
              ({shifts.length})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ROSTER HARIAN */}
        <TabsContent value="roster">
          <ShiftRosterView
            shifts={shifts}
            assignmentsByShift={assignmentsByShift}
            unassignedEmployees={unassignedEmployees}
            isOwnerOrManager={isOwnerOrManager}
            isPending={isPending}
            onOpenAssign={handleOpenAssign}
            onRemoveAssignment={handleRemoveAssignment}
          />
        </TabsContent>

        {/* TAB 2: MASTER TEMPLATE SHIFT */}
        <TabsContent value="templates">
          <ShiftTemplatesView
            shifts={shifts}
            isOwnerOrManager={isOwnerOrManager}
            onOpenShiftModal={handleOpenShiftModal}
            onDeleteShift={handleDeleteShift}
          />
        </TabsContent>
      </Tabs>

      {/* 5. Dialog Tugaskan Staf */}
      <ShiftAssignmentDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        currentDate={currentDate}
        employees={employees}
        shifts={shifts}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
        selectedShiftId={selectedShiftId}
        setSelectedShiftId={setSelectedShiftId}
        assignNotes={assignNotes}
        setAssignNotes={setAssignNotes}
        isPending={isPending}
        onSaveAssignment={handleSaveAssignment}
      />

      {/* 6. Dialog Template Shift */}
      <ShiftTemplateDialog
        open={isShiftModalOpen}
        onOpenChange={setIsShiftModalOpen}
        editingShift={editingShift}
        shiftName={shiftName}
        setShiftName={setShiftName}
        shiftStartTime={shiftStartTime}
        setShiftStartTime={setShiftStartTime}
        shiftEndTime={shiftEndTime}
        setShiftEndTime={setShiftEndTime}
        shiftDesc={shiftDesc}
        setShiftDesc={setShiftDesc}
        shiftColor={shiftColor}
        setShiftColor={setShiftColor}
        isPending={isPending}
        onSaveShiftTemplate={handleSaveShiftTemplate}
      />
    </div>
  );
}
