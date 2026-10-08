"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  type PlatformUserItem,
  resetPlatformUserPasswordAction,
  togglePlatformUserStatusAction,
} from "@/actions/superadmin";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole, UserStatus } from "@/generated/prisma/enums";

interface SuperadminUsersViewProps {
  initialUsers: PlatformUserItem[];
}

export function SuperadminUsersView({
  initialUsers,
}: SuperadminUsersViewProps) {
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Modal Reset Password
  const [resetTargetUser, setResetTargetUser] =
    useState<PlatformUserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        search === "" ||
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.outletName &&
          u.outletName.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleToggleStatus = async (
    userId: string,
    targetStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ) => {
    setIsLoading(true);
    try {
      const res = await togglePlatformUserStatusAction({
        userId,
        newStatus: targetStatus,
      });

      if (res.success) {
        toast.success(`Status akun berhasil diubah menjadi ${targetStatus}.`);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: targetStatus as UserStatus } : u
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengubah status akun.");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat memperbarui status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser || !newPassword) return;
    setIsResetting(true);
    try {
      const res = await resetPlatformUserPasswordAction({
        userId: resetTargetUser.id,
        newPassword,
      });

      if (res.success) {
        toast.success(res.data?.message || "Kata sandi berhasil diperbarui.");
        setResetTargetUser(null);
        setNewPassword("");
      } else {
        toast.error(res.error || "Gagal memperbarui kata sandi.");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-xl font-black tracking-tight sm:text-2xl">
            Manajemen Pengguna Global Platform
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Kendali seluruh akun pengguna di ekosistem Kinclongin: Superadmin,
            Owner cabang, Manajer, Kasir, dan Washer.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="font-bold shadow-xs"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          <span>Segarkan Data</span>
        </Button>
      </div>

      {/* 2. Filter Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                placeholder="Cari nama pengguna, email, atau cabang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full text-xs font-semibold sm:w-40">
                  <SelectValue placeholder="Semua Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Peran</SelectItem>
                  <SelectItem value={UserRole.SUPERADMIN}>
                    Superadmin
                  </SelectItem>
                  <SelectItem value={UserRole.OWNER}>Owner Bisnis</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manajer</SelectItem>
                  <SelectItem value={UserRole.CASHIER}>Kasir</SelectItem>
                  <SelectItem value={UserRole.WASHER}>Washer</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full text-xs font-semibold sm:w-36">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Tabel Pengguna */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">
            Daftar Pengguna ({filteredUsers.length} dari {users.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Kelola hak akses dan atur ulang kata sandi pengguna platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* 1. Mobile & Tablet Portrait Card List (Khusus < md) */}
          <div className="divide-border/60 divide-y md:hidden">
            {filteredUsers.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center text-xs">
                Tidak ada pengguna yang cocok dengan filter pencarian.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-foreground text-sm font-bold">
                          {u.fullName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] font-bold ${
                            u.role === "SUPERADMIN"
                              ? "border-purple-500/20 bg-purple-500/10 text-purple-600"
                              : u.role === "OWNER"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                : u.role === "MANAGER"
                                  ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                                  : u.role === "CASHIER"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                    : "border-cyan-500/20 bg-cyan-500/10 text-cyan-600"
                          }`}
                        >
                          {u.role}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground font-mono text-xs">
                        {u.email}
                      </p>
                      {u.outletName ? (
                        <span className="text-muted-foreground block text-[11px]">
                          Cabang: {u.outletName}
                        </span>
                      ) : null}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={isLoading}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem
                          onClick={() => {
                            setResetTargetUser(u);
                            setNewPassword("");
                          }}
                          className="font-semibold text-purple-600 dark:text-purple-400"
                        >
                          <KeyRound className="mr-2 h-3.5 w-3.5" />
                          <span>Reset Kata Sandi</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {u.status === "SUSPENDED" ? (
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(u.id, "ACTIVE")}
                            className="font-semibold text-emerald-600"
                          >
                            <UserCheck className="mr-2 h-3.5 w-3.5" />
                            <span>Buka Blokir (Aktifkan)</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(u.id, "SUSPENDED")
                            }
                            className="text-destructive font-semibold"
                          >
                            <UserX className="mr-2 h-3.5 w-3.5" />
                            <span>Tangguhkan (Suspend)</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-2 text-xs">
                    <span className="text-muted-foreground text-[10px]">
                      Daftar:{" "}
                      {new Date(u.createdAt).toLocaleDateString("id-ID")}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        u.status === "ACTIVE"
                          ? "border-emerald-500/30 text-emerald-600"
                          : "border-destructive/30 text-destructive"
                      }
                    >
                      {u.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Desktop & Tablet Landscape Table (Khusus >= md) */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">
                    Nama Lengkap
                  </TableHead>
                  <TableHead className="text-xs font-bold">Email</TableHead>
                  <TableHead className="text-xs font-bold">
                    Peran (Role)
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Cabang Terkait
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Status Akun
                  </TableHead>
                  <TableHead className="text-xs font-bold">
                    Terdaftar Pada
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center text-xs"
                    >
                      Tidak ada pengguna yang cocok dengan filter pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="py-3 text-xs font-bold">
                        {u.fullName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            u.role === "SUPERADMIN"
                              ? "border-purple-500/20 bg-purple-500/10 text-purple-600"
                              : u.role === "OWNER"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                                : u.role === "MANAGER"
                                  ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                                  : u.role === "CASHIER"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                    : "border-cyan-500/20 bg-cyan-500/10 text-cyan-600"
                          }`}
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {u.outletName || (
                          <span className="text-[11px] italic">
                            {u.role === "SUPERADMIN"
                              ? "Platform HQ"
                              : "Multi-Cabang"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            u.status === "ACTIVE"
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                              : u.status === "SUSPENDED"
                                ? "border-destructive/30 text-destructive bg-destructive/5"
                                : "border-muted text-muted-foreground"
                          }
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {new Date(u.createdAt).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isLoading}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 text-xs"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                setResetTargetUser(u);
                                setNewPassword("");
                              }}
                              className="font-semibold text-blue-600 dark:text-blue-400"
                            >
                              <KeyRound className="mr-2 h-3.5 w-3.5" />
                              <span>Reset Kata Sandi</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {u.status !== "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(u.id, "ACTIVE")
                                }
                                className="font-semibold text-emerald-600"
                              >
                                <UserCheck className="mr-2 h-3.5 w-3.5" />
                                <span>Aktifkan Akun</span>
                              </DropdownMenuItem>
                            )}

                            {u.status !== "SUSPENDED" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(u.id, "SUSPENDED")
                                }
                                className="text-destructive font-semibold"
                              >
                                <UserX className="mr-2 h-3.5 w-3.5" />
                                <span>Tangguhkan (Suspend)</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Modal Dialog: Reset Password Pengguna */}
      <Dialog
        open={Boolean(resetTargetUser)}
        onOpenChange={(open) => !open && setResetTargetUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Reset Kata Sandi: {resetTargetUser?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan kata sandi baru untuk akun {resetTargetUser?.email}.
              Pengguna dapat langsung masuk dengan kata sandi baru ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Kata Sandi Baru (Min. 6 Karakter):
              </label>
              <Input
                type="password"
                placeholder="Masukkan kata sandi baru..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetTargetUser(null)}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 font-bold text-white hover:bg-blue-700"
              onClick={handleResetPassword}
              disabled={isResetting || newPassword.length < 6}
            >
              {isResetting ? "Menyimpan..." : "Perbarui Kata Sandi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
