import {
  Banknote,
  Building2,
  Gift,
  LucideIcon,
  QrCode,
  Split,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export interface PaymentMethodBadgeProps {
  method: PaymentMethod | string;
  showIcon?: boolean;
  className?: string;
}

interface MethodConfig {
  label: string;
  className: string;
  icon: LucideIcon;
}

const METHOD_CONFIG: Record<string, MethodConfig> = {
  CASH: {
    label: "Tunai",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: Banknote,
  },
  QRIS: {
    label: "QRIS",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: QrCode,
  },
  BANK_TRANSFER: {
    label: "Transfer",
    className:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    icon: Building2,
  },
  SPLIT: {
    label: "Split",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: Split,
  },
  LOYALTY_POINTS: {
    label: "Poin",
    className:
      "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400",
    icon: Gift,
  },
};

export function PaymentMethodBadge({
  method,
  showIcon = true,
  className,
}: PaymentMethodBadgeProps) {
  const config = METHOD_CONFIG[method] || {
    label: method,
    className: "border-border bg-muted text-muted-foreground",
    icon: Wallet,
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
