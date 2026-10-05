import {
  CheckCircle2,
  CreditCard,
  Crown,
  Droplets,
  ShieldCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserRole, UserStatus } from "@/generated/prisma/enums";

export function getRoleLabel(role: UserRole) {
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

export function RoleBadge({ role }: { role: UserRole }) {
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

export function StatusBadge({ status }: { status: UserStatus }) {
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

export function PermissionIcon({ allowed }: { allowed: boolean }) {
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
