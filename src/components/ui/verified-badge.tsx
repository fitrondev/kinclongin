import * as React from "react";

import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export interface VerifiedBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "company" | "anti-fraud" | "official";
  size?: "sm" | "default" | "lg";
}

const variantLabels: Record<
  NonNullable<VerifiedBadgeProps["variant"]>,
  string
> = {
  default: "Terverifikasi NTB",
  company: "Perusahaan Terverifikasi NIB",
  "anti-fraud": "Bebas Biaya / Anti-Penipuan",
  official: "Disnakertrans NTB Terdata",
};

const sizeClasses: Record<NonNullable<VerifiedBadgeProps["size"]>, string> = {
  sm: "text-[11px] py-0.5 px-2 gap-1",
  default: "text-xs py-1 px-2.5 gap-1.5",
  lg: "text-sm py-1.5 px-3 gap-2",
};

const iconSizes: Record<NonNullable<VerifiedBadgeProps["size"]>, string> = {
  sm: "size-3",
  default: "size-3.5",
  lg: "size-4",
};

export function VerifiedBadge({
  variant = "default",
  size = "default",
  children,
  className,
  ...props
}: VerifiedBadgeProps) {
  return (
    <span
      className={cn(
        "bg-chart-1/10 text-chart-1 border-chart-1/20 inline-flex items-center rounded-full border font-medium transition-colors select-none",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <ShieldCheck className={cn("shrink-0", iconSizes[size])} />
      <span>{children ?? variantLabels[variant]}</span>
    </span>
  );
}
