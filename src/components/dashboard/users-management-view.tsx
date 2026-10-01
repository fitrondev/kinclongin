"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Droplets,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MoreVertical,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCog,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

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
  const isManager = currentUserRole === UserRole.MANAGER;

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ACCOUNTS" | "MATRIX">("ACCOUNTS");

  // State PIN Reveal per user
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // -----------------------------------------------------------
  // MODAL STATES
  // -----------------------------------------------------------

  // 1. Modal Tambah / Buat Akun Baru
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

  // Toggle reveal PIN
  const togglePinReveal = (userId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // -----------------------------------------------------------
  // FILTERING LOGIC
  // -----------------------------------------------------------
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

  // Statistik Ringkas
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

  // -----------------------------------------------------------
  // HANDLERS
  // -----------------------------------------------------------

  // Handle Buat Akun Baru
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
        role: createRole,
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
      // Reset input form
      setCreateFullName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreatePhone("");
      setCreatePinCode("");
      setCreateRole(UserRole.CASHIER);
      router.refresh();
    });
  };

  // Handle Ubah Role
  const handleUpdateRole = () => {
    if (!roleModalUser) return;

    startTransition(async () => {
      const res = await updateUserRoleAction({
        userId: roleModalUser.id,
        role: targetNewRole,
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

  // Handle Ubah Status
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

  // Handle Buka Edit Profil
  const openEditModal = (user: UserAccountItem) => {
    setEditModalUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditPhone(user.employee?.phone || "");
    setEditPinCode(user.employee?.pinCode || "");
    setEditCommissionRate(user.employee?.commissionRate?.toString() || "10000");
  };

  // Handle Submit Edit Profil
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

  // Handle Reset Password
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

  // Handle Hapus Akun
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight uppercase sm:text-3xl">
              Manajemen Akun & Role
            </h1>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary text-xs font-bold"
            >
              Cabang: {outletName}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Kendali hak akses pengguna, pembuatan akun staf baru, pengaturan PIN
            Kiosk dan peran operasional kasir serta tim cuci.
          </p>
        </div>

        {/* Action Button: Buat Akun Baru */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 gap-2 font-bold shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Buat Akun Baru</span>
          </Button>
        </div>
      </div>

      {/* 2. Metric Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="bg-card/70 border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-bold uppercase">
                Total Akun
              </span>
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight">
              {stats.total}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {stats.active} akun berstatus aktif
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-bold uppercase">
                Owner & Manajer
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-blue-600">
              {stats.managers}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Hak akses manajerial penuh
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-bold uppercase">
                Kasir (POS)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-emerald-600">
              {stats.cashiers}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Front-desk & penerimaan bayar
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-bold uppercase">
                Tukang Cuci (Washer)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                <Droplets className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-cyan-600">
              {stats.washers}
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Layar Tablet PIN & komisi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Navigation Tabs: Akun vs Matriks Hak Akses */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "ACCOUNTS" | "MATRIX")}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger
              value="ACCOUNTS"
              className="gap-2 text-xs font-bold data-[state=active]:shadow-xs"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Daftar Pengguna & Staf</span>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary ml-1 h-4 px-1 text-[10px] font-bold"
              >
                {filteredUsers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="MATRIX"
              className="gap-2 text-xs font-bold data-[state=active]:shadow-xs"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Matriks Hak Akses (Role Permissions)</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: DAFTAR PENGGUNA & AKUN */}
        <TabsContent value="ACCOUNTS" className="space-y-4">
          {/* Toolbar Pencarian & Filter Role */}
          <Card className="bg-card/50 border-border/70 p-3 shadow-2xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Cari berdasarkan nama, email, no. telepon, atau PIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background h-9 pl-9 text-xs sm:text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Role & Status */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-muted/40 flex items-center gap-1 overflow-x-auto rounded-lg border p-1 text-xs">
                  <span className="text-muted-foreground px-1.5 text-[11px] font-bold uppercase">
                    Role:
                  </span>
                  {(
                    [
                      { id: "ALL", label: "Semua" },
                      { id: UserRole.OWNER, label: "Owner" },
                      { id: UserRole.MANAGER, label: "Manajer" },
                      { id: UserRole.CASHIER, label: "Kasir" },
                      { id: UserRole.WASHER, label: "Washer" },
                    ] as const
                  ).map((rf) => (
                    <button
                      key={rf.id}
                      onClick={() => setSelectedRoleFilter(rf.id)}
                      className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                        selectedRoleFilter === rf.id
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rf.label}
                    </button>
                  ))}
                </div>

                <div className="bg-muted/40 flex items-center gap-1 rounded-lg border p-1 text-xs">
                  <span className="text-muted-foreground px-1.5 text-[11px] font-bold uppercase">
                    Status:
                  </span>
                  {(
                    [
                      { id: "ALL", label: "Semua" },
                      { id: UserStatus.ACTIVE, label: "Aktif" },
                      { id: UserStatus.INACTIVE, label: "Nonaktif" },
                      { id: UserStatus.SUSPENDED, label: "Ditangguhkan" },
                    ] as const
                  ).map((sf) => (
                    <button
                      key={sf.id}
                      onClick={() => setSelectedStatusFilter(sf.id)}
                      className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                        selectedStatusFilter === sf.id
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {sf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Table Pengguna */}
          <Card className="border-border/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-70 text-xs font-bold uppercase">
                      Pengguna & Kontak
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Peran (Role)
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Status Akun
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      PIN Tablet Kiosk
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Komisi Washer
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase">
                      Aktivitas
                    </TableHead>
                    <TableHead className="w-20 text-right text-xs font-bold uppercase">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground py-12 text-center"
                      >
                        <UserX className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        <p className="text-sm font-semibold">
                          Tidak ada pengguna yang sesuai dengan kriteria filter.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedRoleFilter("ALL");
                            setSelectedStatusFilter("ALL");
                          }}
                          className="mt-2 text-xs font-bold"
                        >
                          Reset Filter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelf = user.id === currentUserId;
                      const isUserOwner = user.role === UserRole.OWNER;
                      const isUserManager = user.role === UserRole.MANAGER;
                      const isUserWasher = user.role === UserRole.WASHER;

                      // Permission check for managing this particular row
                      // Manager cannot edit/delete Owner or other Managers
                      const canManageThisUser =
                        isOwner ||
                        (isManager && !isUserOwner && !isUserManager);

                      const canChangeRole =
                        !isSelf &&
                        (isOwner ||
                          (isManager && !isUserOwner && !isUserManager));

                      const canDelete =
                        !isSelf &&
                        !isUserOwner &&
                        (isOwner || (isManager && !isUserManager));

                      const pinShown = revealedPins[user.id];

                      return (
                        <TableRow
                          key={user.id}
                          className={`transition-colors ${
                            isSelf ? "bg-primary/5 hover:bg-primary/10" : ""
                          }`}
                        >
                          {/* Nama & Email & Telepon */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="border-border h-9 w-9 border">
                                <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                                  {user.fullName
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-bold sm:text-sm">
                                    {user.fullName}
                                  </span>
                                  {isSelf && (
                                    <Badge
                                      variant="outline"
                                      className="border-primary/40 bg-primary/15 text-primary text-[10px] font-bold"
                                    >
                                      Anda
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-muted-foreground truncate text-xs">
                                  {user.email}
                                </span>
                                {user.employee?.phone && (
                                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                                    <Phone className="h-3 w-3 opacity-60" />
                                    <span>{user.employee.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Role Badge */}
                          <TableCell>
                            <RoleBadge role={user.role} />
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell>
                            <StatusBadge status={user.status} />
                          </TableCell>

                          {/* PIN Kiosk Tablet */}
                          <TableCell>
                            {user.employee?.pinCode ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold tracking-widest">
                                  {pinShown ? user.employee.pinCode : "••••"}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => togglePinReveal(user.id)}
                                  className="text-muted-foreground hover:text-foreground h-6 w-6"
                                  title={
                                    pinShown
                                      ? "Sembunyikan PIN"
                                      : "Tampilkan PIN"
                                  }
                                >
                                  {pinShown ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                -
                              </span>
                            )}
                          </TableCell>

                          {/* Komisi Washer */}
                          <TableCell>
                            {isUserWasher && user.employee ? (
                              <span className="text-foreground font-mono text-xs font-bold">
                                {formatRupiah(user.employee.commissionRate)}
                                <span className="text-muted-foreground text-[10px] font-normal">
                                  {" "}
                                  / cuci
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                -
                              </span>
                            )}
                          </TableCell>

                          {/* Riwayat / Aktivitas */}
                          <TableCell>
                            <div className="text-muted-foreground flex flex-col text-[11px]">
                              {user.stats.createdTicketsCount > 0 && (
                                <span>
                                  {user.stats.createdTicketsCount} tiket dibuat
                                </span>
                              )}
                              {user.stats.handledPaymentsCount > 0 && (
                                <span>
                                  {user.stats.handledPaymentsCount} pembayaran
                                </span>
                              )}
                              {user.employee &&
                                user.employee.assignedTicketsCount > 0 && (
                                  <span>
                                    {user.employee.assignedTicketsCount}{" "}
                                    kendaraan dicuci
                                  </span>
                                )}
                              {user.stats.createdTicketsCount === 0 &&
                                user.stats.handledPaymentsCount === 0 &&
                                (!user.employee ||
                                  user.employee.assignedTicketsCount === 0) && (
                                  <span className="italic">
                                    Belum ada riwayat
                                  </span>
                                )}
                            </div>
                          </TableCell>

                          {/* Dropdown Aksi */}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-foreground h-8 w-8"
                                  disabled={isPending}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 text-xs"
                              >
                                <DropdownMenuLabel className="text-muted-foreground text-[11px] font-bold uppercase">
                                  Kelola Akun
                                </DropdownMenuLabel>

                                {/* 1. Edit Data Profil / PIN / Komisi */}
                                <DropdownMenuItem
                                  onClick={() => openEditModal(user)}
                                  disabled={!canManageThisUser && !isSelf}
                                  className="cursor-pointer gap-2"
                                >
                                  <UserCog className="h-4 w-4 text-blue-500" />
                                  <span>Edit Data & PIN</span>
                                </DropdownMenuItem>

                                {/* 2. Ubah Role */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRoleModalUser(user);
                                    setTargetNewRole(user.role);
                                  }}
                                  disabled={!canChangeRole}
                                  className="cursor-pointer gap-2"
                                >
                                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                                  <span>Ubah Peran (Role)</span>
                                </DropdownMenuItem>

                                {/* 3. Reset Kata Sandi */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setResetModalUser(user);
                                    setNewPassword("");
                                  }}
                                  disabled={!canManageThisUser}
                                  className="cursor-pointer gap-2"
                                >
                                  <KeyRound className="h-4 w-4 text-emerald-500" />
                                  <span>Reset Kata Sandi</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* 4. Status Toggles */}
                                {canManageThisUser && !isSelf && (
                                  <>
                                    <DropdownMenuLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                      Status Akun
                                    </DropdownMenuLabel>
                                    {user.status !== UserStatus.ACTIVE && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            user,
                                            UserStatus.ACTIVE
                                          )
                                        }
                                        className="cursor-pointer gap-2 text-emerald-600"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Aktifkan Akun</span>
                                      </DropdownMenuItem>
                                    )}

                                    {user.status !== UserStatus.INACTIVE && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            user,
                                            UserStatus.INACTIVE
                                          )
                                        }
                                        className="text-muted-foreground cursor-pointer gap-2"
                                      >
                                        <UserX className="h-4 w-4" />
                                        <span>Nonaktifkan</span>
                                      </DropdownMenuItem>
                                    )}

                                    {user.status !== UserStatus.SUSPENDED && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            user,
                                            UserStatus.SUSPENDED
                                          )
                                        }
                                        className="text-destructive cursor-pointer gap-2"
                                      >
                                        <Ban className="h-4 w-4" />
                                        <span>Tangguhkan (Suspend)</span>
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                {/* 5. Hapus Akun */}
                                <DropdownMenuItem
                                  onClick={() => setDeleteModalUser(user)}
                                  disabled={!canDelete}
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Hapus Akun</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: MATRIKS HAK AKSES (ROLE PERMISSIONS) */}
        <TabsContent value="MATRIX" className="space-y-4">
          <Card className="border-border/80 overflow-hidden shadow-2xs">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-base font-black uppercase">
                Matriks Hak Akses & Kewenangan Peran (Role Matrix)
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan lengkap izin modul sistem Kinclongin POS untuk
                Owner, Manajer, Kasir, dan Tukang Cuci.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-80 text-xs font-bold uppercase">
                      Modul / Fitur Sistem
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-amber-600 uppercase">
                      Owner (Pemilik)
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-blue-600 uppercase">
                      Manajer Cabang
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-emerald-600 uppercase">
                      Kasir (POS)
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-cyan-600 uppercase">
                      Tukang Cuci (Washer)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      feature: "Ringkasan Finansial & Omzet Cabang",
                      desc: "Grafik pendapatan harian, laba rugi, dan tren omzet",
                      owner: true,
                      manager: true,
                      cashier: false,
                      washer: false,
                    },
                    {
                      feature: "Buka Multi-Cabang (Outlet Switcher)",
                      desc: "Beralih antar cabang outlet secara instan",
                      owner: true,
                      manager: false,
                      cashier: false,
                      washer: false,
                    },
                    {
                      feature: "Manajemen Akun & Role Pengguna",
                      desc: "Buat akun staf, ganti password, atur hak akses",
                      owner: true,
                      manager: true,
                      cashier: false,
                      washer: false,
                    },
                    {
                      feature: "Gaji & Rekap Komisi Pekerja Cuci",
                      desc: "Hitung komisi per cuci, rincian bagi hasil & pelunasan",
                      owner: true,
                      manager: true,
                      cashier: false,
                      washer: false,
                    },
                    {
                      feature: "Manajemen Stok & Restok Bahan",
                      desc: "Inventori sampo, semir ban, ritel, & opname fisik",
                      owner: true,
                      manager: true,
                      cashier: false,
                      washer: false,
                    },
                    {
                      feature: "Front-Desk Kasir & Pembayaran POS",
                      desc: "Proses transaksi QRIS, Tunai, cetak struk thermal",
                      owner: true,
                      manager: true,
                      cashier: true,
                      washer: false,
                    },
                    {
                      feature: "Papan Antrean & Pendaftaran Cuci",
                      desc: "Input kendaraan masuk, pilih paket layanan, status cuci",
                      owner: true,
                      manager: true,
                      cashier: true,
                      washer: false,
                    },
                    {
                      feature: "Pendaftaran Member & Poin Loyalitas",
                      desc: "Daftar pelanggan tetap, tukar kupon cuci gratis 10x",
                      owner: true,
                      manager: true,
                      cashier: true,
                      washer: false,
                    },
                    {
                      feature: "Layar Cuci Tablet Kiosk (Area Hidrolik)",
                      desc: "Klaim tiket cuci via PIN 4 digit & konfirmasi selesai",
                      owner: true,
                      manager: true,
                      cashier: true,
                      washer: true,
                    },
                    {
                      feature: "Integrasi WhatsApp Gateway & Struk Digital",
                      desc: "Kirim notifikasi otomatis saat kendaraan siap diambil",
                      owner: true,
                      manager: true,
                      cashier: true,
                      washer: false,
                    },
                  ].map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-foreground text-xs font-bold">
                            {row.feature}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {row.desc}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <PermissionIcon allowed={row.owner} />
                      </TableCell>
                      <TableCell className="text-center">
                        <PermissionIcon allowed={row.manager} />
                      </TableCell>
                      <TableCell className="text-center">
                        <PermissionIcon allowed={row.cashier} />
                      </TableCell>
                      <TableCell className="text-center">
                        <PermissionIcon allowed={row.washer} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------- */}
      {/* 4. MODALS & DIALOGS                                      */}
      {/* ------------------------------------------------------- */}

      {/* MODAL 1: BUAT AKUN BARU */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <UserPlus className="text-primary h-5 w-5" />
              <span>Pembuatan Akun Staf Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat akun langsung untuk staf cabang {outletName} dengan
              kredensial login dan peran yang sesuai.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
            {/* Pilihan Peran (Role Selector) */}
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-bold uppercase">
                Peran Pengguna (Role)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  {
                    role: UserRole.CASHIER,
                    label: "Kasir POS",
                    desc: "Front-desk & Kasir",
                    icon: CreditCard,
                  },
                  {
                    role: UserRole.WASHER,
                    label: "Tukang Cuci",
                    desc: "PIN Tablet Kiosk",
                    icon: Droplets,
                  },
                  {
                    role: UserRole.MANAGER,
                    label: "Manajer",
                    desc: "Supervisi & Stok",
                    icon: ShieldCheck,
                  },
                  ...(isOwner
                    ? [
                        {
                          role: UserRole.OWNER,
                          label: "Owner",
                          desc: "Akses Penuh",
                          icon: Crown,
                        },
                      ]
                    : []),
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = createRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setCreateRole(item.role)}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-primary/20 ring-2"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <Icon className="h-4 w-4" />
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <span className="text-foreground mt-1 text-xs font-bold">
                        {item.label}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Contoh: Rian Pratama"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="h-10 pl-9 text-sm"
                  required
                />
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                  Email Akun (Login)
                </label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="staf@kinclongin.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="h-10 pl-9 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                  Kata Sandi Sementara
                </label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="h-10 pl-9 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* No. WhatsApp (Opsional) */}
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                No. WhatsApp (Opsional)
              </label>
              <div className="relative">
                <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="tel"
                  placeholder="08123456789"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="h-10 pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Khusus Tukang Cuci (Washer) atau Kasir dengan PIN Kiosk */}
            {createRole === UserRole.WASHER && (
              <div className="space-y-3 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600">
                  <Droplets className="h-4 w-4" />
                  <span>Pengaturan Layar Cuci PIN & Komisi</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[11px] font-bold uppercase">
                      PIN Tablet (4 Digit)
                    </label>
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      value={createPinCode}
                      onChange={(e) =>
                        setCreatePinCode(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      className="h-10 text-center font-mono text-base font-bold tracking-widest"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground mb-1 block text-[11px] font-bold uppercase">
                      Komisi Flat / Cuci
                    </label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={createCommissionRate}
                      onChange={(e) => setCreateCommissionRate(e.target.value)}
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="font-bold">
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan & Buat Akun"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: UBAH ROLE */}
      <Dialog
        open={!!roleModalUser}
        onOpenChange={(open) => !open && setRoleModalUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <ShieldCheck className="text-primary h-5 w-5" />
              <span>Ubah Peran Pengguna</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah peran dan kewenangan akun{" "}
              <strong className="text-foreground">
                {roleModalUser?.fullName}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-bold uppercase">
                Pilih Peran Baru:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    role: UserRole.CASHIER,
                    label: "Kasir (POS)",
                    icon: CreditCard,
                  },
                  {
                    role: UserRole.WASHER,
                    label: "Tukang Cuci",
                    icon: Droplets,
                  },
                  {
                    role: UserRole.MANAGER,
                    label: "Manajer Cabang",
                    icon: ShieldCheck,
                  },
                  ...(isOwner
                    ? [
                        {
                          role: UserRole.OWNER,
                          label: "Owner (Pemilik)",
                          icon: Crown,
                        },
                      ]
                    : []),
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = targetNewRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setTargetNewRole(item.role)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left font-bold transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-primary/20 ring-2"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-muted/30 text-muted-foreground rounded-xl border p-3 text-xs">
              <span className="text-foreground font-bold">Catatan:</span>{" "}
              Mengubah peran akan langsung memperbarui hak akses halaman dasbor,
              POS, dan fitur operasional terkait saat pengguna memuat ulang
              aplikasi.
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleModalUser(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={isPending}
              className="font-bold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: EDIT DATA PROFIL & PIN */}
      <Dialog
        open={!!editModalUser}
        onOpenChange={(open) => !open && setEditModalUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <UserCog className="text-primary h-5 w-5" />
              <span>Edit Data Akun & PIN</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui nama, kontak WhatsApp, atau PIN Kiosk karyawan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateDetails} className="space-y-4 pt-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Nama Lengkap
              </label>
              <Input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Email
              </label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Nomor WhatsApp
              </label>
              <Input
                type="tel"
                placeholder="08123456789"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* PIN Tablet Kiosk */}
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                PIN Tablet Kiosk (4 Digit Angka)
              </label>
              <Input
                type="text"
                maxLength={4}
                placeholder="Contoh: 1234"
                value={editPinCode}
                onChange={(e) =>
                  setEditPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="h-10 font-mono text-base font-bold tracking-widest"
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                Digunakan untuk login cepat layar cuci di area basah hidrolik.
              </p>
            </div>

            {/* Komisi jika Washer */}
            {editModalUser?.role === UserRole.WASHER && (
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                  Komisi Flat per Kendaraan (Rp)
                </label>
                <Input
                  type="number"
                  value={editCommissionRate}
                  onChange={(e) => setEditCommissionRate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalUser(null)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="font-bold">
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: RESET KATA SANDI */}
      <Dialog
        open={!!resetModalUser}
        onOpenChange={(open) => !open && setResetModalUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <KeyRound className="text-primary h-5 w-5" />
              <span>Reset Kata Sandi Pengguna</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat kata sandi baru untuk akun{" "}
              <strong className="text-foreground">
                {resetModalUser?.fullName}
              </strong>{" "}
              ({resetModalUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">
                Kata Sandi Baru
              </label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 text-sm"
                required
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                Beritahukan kata sandi baru ini kepada staf bersangkutan untuk
                masuk kembali.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalUser(null)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="font-bold">
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan Kata Sandi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: KONFIRMASI HAPUS AKUN */}
      <Dialog
        open={!!deleteModalUser}
        onOpenChange={(open) => !open && setDeleteModalUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-lg font-black uppercase">
              <Trash2 className="h-5 w-5" />
              <span>Hapus Akun Pengguna</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-foreground">
                {deleteModalUser?.fullName}
              </strong>{" "}
              secara permanen?
            </DialogDescription>
          </DialogHeader>

          <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border p-3 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">Peringatan Integritas Audit:</p>
                <p>
                  Jika staf ini pernah membuat tiket atau memproses pembayaran,
                  sistem akan membatalkan penghapusan demi audit pembukuan.
                  Sebagai alternatif, Anda dapat menonaktifkan akun tersebut.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalUser(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isPending}
              className="font-bold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                "Ya, Hapus Akun"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER COMPONENTS & BADGES
// -------------------------------------------------------------

function getRoleLabel(role: UserRole) {
  switch (role) {
    case UserRole.OWNER:
      return "Pemilik (Owner)";
    case UserRole.MANAGER:
      return "Manajer Cabang";
    case UserRole.CASHIER:
      return "Kasir (POS)";
    case UserRole.WASHER:
      return "Tukang Cuci (Washer)";
    default:
      return role;
  }
}

function RoleBadge({ role }: { role: UserRole }) {
  switch (role) {
    case UserRole.OWNER:
      return (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] font-bold text-amber-600"
        >
          <Crown className="h-3 w-3" />
          <span>Owner</span>
        </Badge>
      );
    case UserRole.MANAGER:
      return (
        <Badge
          variant="outline"
          className="gap-1 border-blue-500/30 bg-blue-500/10 text-[11px] font-bold text-blue-600"
        >
          <ShieldCheck className="h-3 w-3" />
          <span>Manajer</span>
        </Badge>
      );
    case UserRole.CASHIER:
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-600"
        >
          <CreditCard className="h-3 w-3" />
          <span>Kasir</span>
        </Badge>
      );
    case UserRole.WASHER:
      return (
        <Badge
          variant="outline"
          className="gap-1 border-cyan-500/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-600"
        >
          <Droplets className="h-3 w-3" />
          <span>Washer</span>
        </Badge>
      );
  }
}

function StatusBadge({ status }: { status: UserStatus }) {
  switch (status) {
    case UserStatus.ACTIVE:
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-600"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span>Aktif</span>
        </Badge>
      );
    case UserStatus.INACTIVE:
      return (
        <Badge
          variant="outline"
          className="border-border bg-muted text-muted-foreground gap-1.5 text-[11px] font-bold"
        >
          <span className="bg-muted-foreground h-1.5 w-1.5 rounded-full" />
          <span>Nonaktif</span>
        </Badge>
      );
    case UserStatus.SUSPENDED:
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive gap-1.5 text-[11px] font-bold"
        >
          <span className="bg-destructive h-1.5 w-1.5 rounded-full" />
          <span>Ditangguhkan</span>
        </Badge>
      );
  }
}

function PermissionIcon({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
      <CheckCircle2 className="h-4 w-4" />
    </div>
  ) : (
    <div className="bg-muted text-muted-foreground/40 inline-flex h-6 w-6 items-center justify-center rounded-full">
      <X className="h-3.5 w-3.5" />
    </div>
  );
}
