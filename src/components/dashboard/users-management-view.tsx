"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import {
  type UserAccountItem,
  createAccountAction,
  deleteUserAction,
  resetUserPasswordAction,
  updateUserDetailsAction,
  updateUserRoleAction,
  updateUserStatusAction,
} from "@/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole, UserStatus } from "@/generated/prisma/enums";

import { ChangeRoleDialog } from "./users/change-role-dialog";
import { CreateUserDialog } from "./users/create-user-dialog";
import { DeleteUserDialog } from "./users/delete-user-dialog";
import { EditUserDialog } from "./users/edit-user-dialog";
import { ResetPasswordDialog } from "./users/reset-password-dialog";
import { RolePermissionsMatrix } from "./users/role-permissions-matrix";
import { getRoleLabel } from "./users/users-constants";
import { UsersFilterToolbar } from "./users/users-filter-toolbar";
import { UsersStatsCards } from "./users/users-stats-cards";
import { UsersTable } from "./users/users-table";

interface UsersManagementViewProps {
  initialUsers: UserAccountItem[];
  currentUserId: string;
  currentUserRole: UserRole;
  outletName: string;
}

export function UsersManagementView({
  initialUsers,
  currentUserId,
  currentUserRole,
  outletName,
}: UsersManagementViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUserRole === UserRole.OWNER;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ACCOUNTS" | "MATRIX">("ACCOUNTS");

  // State PIN Reveal per user
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // 1. Modal Tambah Akun
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>(UserRole.CASHIER);
  const [createPhone, setCreatePhone] = useState("");
  const [createPinCode, setCreatePinCode] = useState("");
  const [createCommissionRate, setCreateCommissionRate] = useState("10000");

  // 2. Modal Ubah Role
  const [roleModalUser, setRoleModalUser] = useState<UserAccountItem | null>(
    null
  );
  const [targetNewRole, setTargetNewRole] = useState<UserRole>(
    UserRole.CASHIER
  );

  // 3. Modal Edit Data Profil & PIN
  const [editModalUser, setEditModalUser] = useState<UserAccountItem | null>(
    null
  );
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPinCode, setEditPinCode] = useState("");
  const [editCommissionRate, setEditCommissionRate] = useState("10000");

  // 4. Modal Reset Password
  const [resetModalUser, setResetModalUser] = useState<UserAccountItem | null>(
    null
  );
  const [newPassword, setNewPassword] = useState("");

  // 5. Modal Konfirmasi Hapus Akun
  const [deleteModalUser, setDeleteModalUser] =
    useState<UserAccountItem | null>(null);

  const togglePinReveal = (userId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee?.phone && u.employee.phone.includes(q)) ||
        (u.employee?.pinCode && u.employee.pinCode.includes(q));

      const matchRole =
        selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;

      const matchStatus =
        selectedStatusFilter === "ALL" || u.status === selectedStatusFilter;

      return matchQuery && matchRole && matchStatus;
    });
  }, [initialUsers, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  const stats = useMemo(() => {
    const total = initialUsers.length;
    const active = initialUsers.filter(
      (u) => u.status === UserStatus.ACTIVE
    ).length;
    const managers = initialUsers.filter(
      (u) => u.role === UserRole.OWNER || u.role === UserRole.MANAGER
    ).length;
    const cashiers = initialUsers.filter(
      (u) => u.role === UserRole.CASHIER
    ).length;
    const washers = initialUsers.filter(
      (u) => u.role === UserRole.WASHER
    ).length;

    return { total, active, managers, cashiers, washers };
  }, [initialUsers]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFullName || !createEmail || !createPassword) {
      toast.error("Nama lengkap, email, dan kata sandi wajib diisi.");
      return;
    }

    if (
      createRole === UserRole.WASHER &&
      createPinCode &&
      !/^\d{4}$/.test(createPinCode)
    ) {
      toast.error("PIN Tablet Kiosk harus berupa 4 angka numerik.");
      return;
    }

    startTransition(async () => {
      const res = await createAccountAction({
        fullName: createFullName,
        email: createEmail,
        password: createPassword,
        role: createRole as "MANAGER" | "CASHIER" | "WASHER",
        status: UserStatus.ACTIVE,
        phone: createPhone || undefined,
        pinCode: createPinCode || undefined,
        commissionRate:
          createRole === UserRole.WASHER
            ? Number(createCommissionRate) || 10000
            : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal membuat akun.");
        return;
      }

      toast.success(
        `Akun ${createFullName} (${getRoleLabel(createRole)}) berhasil dibuat!`
      );
      setIsCreateOpen(false);
      setCreateFullName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreatePhone("");
      setCreatePinCode("");
      setCreateRole(UserRole.CASHIER);
      router.refresh();
    });
  };

  const handleUpdateRole = () => {
    if (!roleModalUser) return;

    startTransition(async () => {
      const res = await updateUserRoleAction({
        userId: roleModalUser.id,
        role: targetNewRole as "MANAGER" | "CASHIER" | "WASHER",
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui peran akun.");
        return;
      }

      toast.success(
        `Peran akun ${roleModalUser.fullName} diperbarui menjadi ${getRoleLabel(targetNewRole)}.`
      );
      setRoleModalUser(null);
      router.refresh();
    });
  };

  const handleUpdateStatus = (user: UserAccountItem, newStatus: UserStatus) => {
    startTransition(async () => {
      const res = await updateUserStatusAction({
        userId: user.id,
        status: newStatus,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mengubah status akun.");
        return;
      }

      const statusLabels = {
        ACTIVE: "Diaktifkan",
        INACTIVE: "Dinonaktifkan",
        SUSPENDED: "Ditangguhkan",
      };

      toast.success(
        `Akun ${user.fullName} berhasil ${statusLabels[newStatus]}.`
      );
      router.refresh();
    });
  };

  const openEditModal = (user: UserAccountItem) => {
    setEditModalUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditPhone(user.employee?.phone || "");
    setEditPinCode(user.employee?.pinCode || "");
    setEditCommissionRate(user.employee?.commissionRate?.toString() || "10000");
  };

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;

    if (!editFullName || !editEmail) {
      toast.error("Nama lengkap dan email tidak boleh kosong.");
      return;
    }

    if (editPinCode && !/^\d{4}$/.test(editPinCode)) {
      toast.error("PIN Kiosk harus tepat 4 angka numerik.");
      return;
    }

    startTransition(async () => {
      const res = await updateUserDetailsAction({
        userId: editModalUser.id,
        fullName: editFullName,
        email: editEmail,
        phone: editPhone || null,
        pinCode: editPinCode || null,
        commissionRate:
          editModalUser.role === UserRole.WASHER
            ? Number(editCommissionRate)
            : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui data pengguna.");
        return;
      }

      toast.success(`Data akun ${editFullName} berhasil diperbarui.`);
      setEditModalUser(null);
      router.refresh();
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    if (newPassword.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await resetUserPasswordAction({
        userId: resetModalUser.id,
        newPassword,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal mereset kata sandi.");
        return;
      }

      toast.success(
        `Kata sandi baru untuk ${resetModalUser.fullName} berhasil disimpan.`
      );
      setResetModalUser(null);
      setNewPassword("");
    });
  };

  const handleDeleteUser = () => {
    if (!deleteModalUser) return;

    startTransition(async () => {
      const res = await deleteUserAction({
        userId: deleteModalUser.id,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menghapus akun pengguna.");
        return;
      }

      toast.success(`Akun ${deleteModalUser.fullName} berhasil dihapus.`);
      setDeleteModalUser(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <h1 className="text-foreground text-lg font-black tracking-tight wrap-break-word sm:text-2xl md:text-3xl">
              Manajemen Staf & Karyawan Cabang
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary max-w-full text-xs font-bold break-all sm:break-normal"
              >
                Cabang: {outletName}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[10px] font-bold ${
                  isOwner
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                    : "border-blue-500/20 bg-blue-500/10 text-blue-600"
                }`}
              >
                {isOwner ? "Owner (Pemilik Bisnis)" : "Manajer Cabang"}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
            Kelola staf cabang, pembuatan akun kasir baru, pengaturan PIN Kiosk
            tablet untuk pekerja cuci, dan supervisi manajer cabang.
          </p>
        </div>

        {/* Action Button: Buat Akun Baru */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 w-full shrink-0 gap-2 font-bold shadow-xs sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Buat Akun Baru</span>
          </Button>
        </div>
      </div>

      {/* 2. Metric Stat Cards */}
      <UsersStatsCards stats={stats} />

      {/* 3. Tab Kontrol & Filter Toolbar */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "ACCOUNTS" | "MATRIX")}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted grid w-full grid-cols-2 rounded-xl p-1 sm:inline-flex sm:w-auto">
            <TabsTrigger
              value="ACCOUNTS"
              className="gap-1.5 px-2.5 py-1.5 text-xs font-bold data-active:shadow-xs sm:px-3"
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Akun Pengguna</span>
              <span className="text-muted-foreground font-mono text-[10px]">
                ({filteredUsers.length})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="MATRIX"
              className="gap-1.5 px-2.5 py-1.5 text-xs font-bold data-active:shadow-xs sm:px-3"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Matriks Role (RBAC)</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: DAFTAR AKUN */}
        <TabsContent value="ACCOUNTS" className="space-y-4">
          <UsersFilterToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedRoleFilter={selectedRoleFilter}
            setSelectedRoleFilter={setSelectedRoleFilter}
            selectedStatusFilter={selectedStatusFilter}
            setSelectedStatusFilter={setSelectedStatusFilter}
          />

          <UsersTable
            users={filteredUsers}
            currentUserId={currentUserId}
            isOwner={isOwner}
            revealedPins={revealedPins}
            onTogglePinReveal={togglePinReveal}
            onOpenEdit={openEditModal}
            onOpenChangeRole={(u) => {
              setRoleModalUser(u);
              setTargetNewRole(u.role);
            }}
            onOpenResetPassword={(u) => {
              setResetModalUser(u);
              setNewPassword("");
            }}
            onUpdateStatus={handleUpdateStatus}
            onOpenDelete={(u) => setDeleteModalUser(u)}
            onResetFilter={() => {
              setSearchQuery("");
              setSelectedRoleFilter("ALL");
              setSelectedStatusFilter("ALL");
            }}
          />
        </TabsContent>

        {/* TAB 2: MATRIKS HAK AKSES */}
        <TabsContent value="MATRIX" className="space-y-4">
          <RolePermissionsMatrix />
        </TabsContent>
      </Tabs>

      {/* 4. MODALS & DIALOGS */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        outletName={outletName}
        isOwner={isOwner}
        createFullName={createFullName}
        setCreateFullName={setCreateFullName}
        createEmail={createEmail}
        setCreateEmail={setCreateEmail}
        createPassword={createPassword}
        setCreatePassword={setCreatePassword}
        createRole={createRole}
        setCreateRole={setCreateRole}
        createPhone={createPhone}
        setCreatePhone={setCreatePhone}
        createPinCode={createPinCode}
        setCreatePinCode={setCreatePinCode}
        createCommissionRate={createCommissionRate}
        setCreateCommissionRate={setCreateCommissionRate}
        isPending={isPending}
        onSubmit={handleCreateAccount}
      />

      <EditUserDialog
        editModalUser={editModalUser}
        onOpenChange={(open) => !open && setEditModalUser(null)}
        editFullName={editFullName}
        setEditFullName={setEditFullName}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editPinCode={editPinCode}
        setEditPinCode={setEditPinCode}
        editCommissionRate={editCommissionRate}
        setEditCommissionRate={setEditCommissionRate}
        isPending={isPending}
        onSubmit={handleUpdateDetails}
      />

      <ChangeRoleDialog
        roleModalUser={roleModalUser}
        onOpenChange={(open) => !open && setRoleModalUser(null)}
        targetNewRole={targetNewRole}
        setTargetNewRole={setTargetNewRole}
        isOwner={isOwner}
        isPending={isPending}
        onConfirmUpdateRole={handleUpdateRole}
      />

      <ResetPasswordDialog
        resetModalUser={resetModalUser}
        onOpenChange={(open) => !open && setResetModalUser(null)}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        isPending={isPending}
        onSubmit={handleResetPassword}
      />

      <DeleteUserDialog
        deleteModalUser={deleteModalUser}
        onOpenChange={(open) => !open && setDeleteModalUser(null)}
        isPending={isPending}
        onConfirmDelete={handleDeleteUser}
      />
    </div>
  );
}
