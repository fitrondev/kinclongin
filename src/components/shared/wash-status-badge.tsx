import {
  CheckCircle,
  Clock,
  Droplets,
  LucideIcon,
  Sparkles,
  Wind,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export interface WashStatusBadgeProps {
  status: TicketStatus | string;
  showIcon?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  QUEUED: {
    label: "Antre",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: Clock,
  },
  WASHING: {
    label: "Dicuci",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Droplets,
  },
  DRYING: {
    label: "Finishing",
    className:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    icon: Wind,
  },
  READY: {
    label: "Siap Ambil",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: Sparkles,
  },
  COMPLETED: {
    label: "Selesai",
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

export function WashStatusBadge({
  status,
  showIcon = false,
  className,
}: WashStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-bold shadow-2xs",
        config.className,
        className
      )}
    >
      {showIcon ? <Icon className="h-3 w-3 shrink-0" /> : null}
      <span>{config.label}</span>
    </Badge>
  );
}
