import {
  Ban,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  MoreVertical,
  Phone,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";

import type { UserAccountItem } from "@/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { formatRupiah } from "@/lib/formatters";

import { UserTableRow } from "./user-table-row";
import { RoleBadge, StatusBadge } from "./users-constants";

export interface UsersTableProps {
  users: UserAccountItem[];
  currentUserId: string;
  isOwner: boolean;
  revealedPins: Record<string, boolean>;
  onTogglePinReveal: (userId: string) => void;
  onOpenEdit: (user: UserAccountItem) => void;
  onOpenChangeRole: (user: UserAccountItem) => void;
  onOpenResetPassword: (user: UserAccountItem) => void;
  onUpdateStatus: (user: UserAccountItem, newStatus: UserStatus) => void;
  onOpenDelete: (user: UserAccountItem) => void;
  onResetFilter: () => void;
}

export function UsersTable({
  users,
  currentUserId,
  isOwner,
  revealedPins,
  onTogglePinReveal,
  onOpenEdit,
  onOpenChangeRole,
  onOpenResetPassword,
  onUpdateStatus,
  onOpenDelete,
  onResetFilter,
}: UsersTableProps) {
  if (users.length === 0) {
    return (
      <Card className="border-border/80 shadow-2xs">
        <div className="text-muted-foreground flex flex-col items-center justify-center p-12 text-center">
          <UserX className="h-10 w-10 opacity-30" />
          <p className="mt-2 text-sm font-semibold">
            Tidak ada akun pengguna yang sesuai dengan filter atau kata kunci.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilter}
            className="mt-2 text-xs font-bold"
          >
            Reset Filter
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 overflow-hidden shadow-2xs">
      {/* 1. Tampilan Mobile Card List (Khusus layar < md) */}
      <div className="divide-border/60 divide-y md:hidden">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isOwnerUser = user.role === UserRole.OWNER;
          const canModifyRole = isOwner ? true : !isOwnerUser;
          const isRevealed = Boolean(revealedPins[user.id]);

          return (
            <div key={user.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 border">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {user.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground truncate text-sm font-bold">
                        {user.fullName}
                      </span>
                      {isSelf ? (
                        <span className="bg-primary/20 text-primary py-0.2 shrink-0 rounded px-1.5 text-[9px] font-bold">
                          Anda
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate font-mono text-xs">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Dropdown Menu Aksi Mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-8 w-8 shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs">
                      Aksi Akun Staf
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => onOpenEdit(user)}
                      className="text-xs font-bold"
                    >
                      <Edit2 className="mr-2 h-3.5 w-3.5" />
                      <span>Edit Data & PIN</span>
                    </DropdownMenuItem>

                    {canModifyRole ? (
                      <DropdownMenuItem
                        onClick={() => onOpenChangeRole(user)}
                        className="text-xs font-bold"
                      >
                        <ShieldCheck className="mr-2 h-3.5 w-3.5 text-blue-500" />
                        <span>Ubah Peran (Role)</span>
                      </DropdownMenuItem>
                    ) : null}

                    <DropdownMenuItem
                      onClick={() => onOpenResetPassword(user)}
                      className="text-xs font-bold"
                    >
                      <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-500" />
                      <span>Reset Password</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {!isSelf && (
                      <>
                        {user.status === UserStatus.ACTIVE ? (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(user, UserStatus.INACTIVE)
                            }
                            className="text-xs font-bold text-amber-600"
                          >
                            <Ban className="mr-2 h-3.5 w-3.5" />
                            <span>Nonaktifkan Akun</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(user, UserStatus.ACTIVE)
                            }
                            className="text-xs font-bold text-emerald-600"
                          >
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                            <span>Aktifkan Kembali</span>
                          </DropdownMenuItem>
                        )}

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
              </div>

              {/* Badges Role & Status */}
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                {user.employee?.phone ? (
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{user.employee.phone}</span>
                  </div>
                ) : null}
              </div>

              {/* Khusus Washer: Informasi PIN Kiosk & Komisi */}
              {user.role === UserRole.WASHER && (
                <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5 text-xs">
                  {user.employee?.pinCode ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-[10px] font-bold uppercase">
                        PIN Kiosk:
                      </span>
                      <span className="bg-background text-foreground rounded px-1.5 py-0.5 font-mono text-xs font-black tracking-widest">
                        {isRevealed ? user.employee.pinCode : "••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onTogglePinReveal(user.id)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        title={isRevealed ? "Sembunyikan PIN" : "Lihat PIN"}
                      >
                        {isRevealed ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[11px] italic">
                      PIN belum diatur
                    </span>
                  )}

                  {user.employee?.commissionRate ? (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Komisi:{" "}
                      {formatRupiah(Number(user.employee.commissionRate))}/unit
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Tampilan Desktop & Tablet Table (md dan ke atas) */}
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-160">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-64 text-xs font-bold uppercase">
                Nama & Akun Login
              </TableHead>
              <TableHead className="w-36 text-xs font-bold uppercase">
                Peran (Role)
              </TableHead>
              <TableHead className="w-56 text-xs font-bold uppercase">
                Kontak & PIN Kiosk
              </TableHead>
              <TableHead className="w-32 text-xs font-bold uppercase">
                Status Akun
              </TableHead>
              <TableHead className="w-20 text-right text-xs font-bold uppercase">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                currentUserId={currentUserId}
                isOwner={isOwner}
                isRevealed={Boolean(revealedPins[user.id])}
                onTogglePinReveal={onTogglePinReveal}
                onOpenEdit={onOpenEdit}
                onOpenChangeRole={onOpenChangeRole}
                onOpenResetPassword={onOpenResetPassword}
                onUpdateStatus={onUpdateStatus}
                onOpenDelete={onOpenDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
