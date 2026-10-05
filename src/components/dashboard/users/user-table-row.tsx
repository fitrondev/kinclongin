import {
  Ban,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MoreVertical,
  Phone,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

import type { UserAccountItem } from "@/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

import { RoleBadge, StatusBadge } from "./users-constants";

export interface UserTableRowProps {
  user: UserAccountItem;
  currentUserId: string;
  isOwner: boolean;
  isRevealed: boolean;
  onTogglePinReveal: (userId: string) => void;
  onOpenEdit: (user: UserAccountItem) => void;
  onOpenChangeRole: (user: UserAccountItem) => void;
  onOpenResetPassword: (user: UserAccountItem) => void;
  onUpdateStatus: (user: UserAccountItem, newStatus: UserStatus) => void;
  onOpenDelete: (user: UserAccountItem) => void;
}

export function UserTableRow({
  user,
  currentUserId,
  isOwner,
  isRevealed,
  onTogglePinReveal,
  onOpenEdit,
  onOpenChangeRole,
  onOpenResetPassword,
  onUpdateStatus,
  onOpenDelete,
}: UserTableRowProps) {
  const isSelf = user.id === currentUserId;
  const isOwnerUser = user.role === UserRole.OWNER;
  const canModifyRole = isOwner ? true : !isOwnerUser;

  return (
    <TableRow className="hover:bg-muted/30">
      {/* Pengguna (Avatar, Nama, Email) */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 border">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {user.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground truncate text-xs font-bold">
                {user.fullName}
              </span>
              {isSelf ? (
                <span className="bg-primary/20 text-primary rounded px-1 text-[9px] font-bold">
                  Anda
                </span>
              ) : null}
            </div>
            <span className="text-muted-foreground truncate font-mono text-[11px]">
              {user.email}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Peran / Role */}
      <TableCell className="whitespace-nowrap">
        <RoleBadge role={user.role} />
      </TableCell>

      {/* Kontak HP & PIN Kiosk */}
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          {user.employee?.phone ? (
            <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{user.employee.phone}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60 text-[11px] italic">
              Tidak ada telepon
            </span>
          )}

          {/* Tampilkan PIN Kiosk jika Washer */}
          {user.role === UserRole.WASHER && user.employee?.pinCode ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">
                PIN:
              </span>
              <span className="bg-muted text-foreground font-mono text-xs font-black tracking-widest">
                {isRevealed ? user.employee.pinCode : "••••"}
              </span>
              <button
                type="button"
                onClick={() => onTogglePinReveal(user.id)}
                className="text-muted-foreground hover:text-foreground p-0.5"
                title={isRevealed ? "Sembunyikan PIN" : "Lihat PIN"}
              >
                {isRevealed ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : null}

          {/* Tampilkan Komisi jika Washer */}
          {user.role === UserRole.WASHER && user.employee?.commissionRate ? (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Komisi: {formatRupiah(Number(user.employee.commissionRate))}/mobil
            </span>
          ) : null}
        </div>
      </TableCell>

      {/* Status Akun */}
      <TableCell className="whitespace-nowrap">
        <StatusBadge status={user.status} />
      </TableCell>

      {/* Menu Aksi Dropdown */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">
              Aksi Akun Staf
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Edit Profil & PIN */}
            <DropdownMenuItem
              onClick={() => onOpenEdit(user)}
              className="text-xs font-bold"
            >
              <Edit2 className="mr-2 h-3.5 w-3.5" />
              <span>Edit Data & PIN</span>
            </DropdownMenuItem>

            {/* Ubah Peran (Role) */}
            {canModifyRole ? (
              <DropdownMenuItem
                onClick={() => onOpenChangeRole(user)}
                className="text-xs font-bold"
              >
                <ShieldCheck className="mr-2 h-3.5 w-3.5 text-blue-500" />
                <span>Ubah Peran (Role)</span>
              </DropdownMenuItem>
            ) : null}

            {/* Reset Password */}
            <DropdownMenuItem
              onClick={() => onOpenResetPassword(user)}
              className="text-xs font-bold"
            >
              <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-500" />
              <span>Reset Password</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Toggle Status Aktif / Nonaktif */}
            {!isSelf && (
              <>
                {user.status === UserStatus.ACTIVE ? (
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus(user, UserStatus.INACTIVE)}
                    className="text-xs font-bold text-amber-600"
                  >
                    <Ban className="mr-2 h-3.5 w-3.5" />
                    <span>Nonaktifkan Akun</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus(user, UserStatus.ACTIVE)}
                    className="text-xs font-bold text-emerald-600"
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    <span>Aktifkan Kembali</span>
                  </DropdownMenuItem>
                )}

                {/* Hapus Akun */}
                <DropdownMenuItem
                  onClick={() => onOpenDelete(user)}
                  className="text-destructive text-xs font-bold"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  <span>Hapus Akun</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
