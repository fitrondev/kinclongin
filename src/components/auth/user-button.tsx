"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserButtonProps {
  appearance?: {
    elements?: {
      userButtonAvatarBox?: string;
    };
  };
}

export function UserButton({ appearance }: UserButtonProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="bg-muted border-primary/20 h-9 w-9 animate-pulse rounded-xl border" />
    );
  }

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/sign-in">Masuk</Link>
      </Button>
    );
  }

  const user = session.user;
  const fullName = user.fullName || user.name || "Pengguna";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`focus-visible:ring-primary flex cursor-pointer items-center justify-center rounded-xl transition-transform hover:opacity-90 focus:outline-hidden focus-visible:ring-2 ${
            appearance?.elements?.userButtonAvatarBox ||
            "border-primary/20 h-9 w-9 border-2"
          }`}
          aria-label="Menu Pengguna"
        >
          <Avatar className="h-full w-full rounded-xl">
            <AvatarImage
              src={user.image || undefined}
              alt={fullName}
              className="rounded-xl object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary rounded-xl text-xs font-black">
              {initials || "K"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5 p-1">
            <div className="flex items-center justify-between">
              <p className="max-w-37.5 truncate text-sm leading-none font-extrabold">
                {fullName}
              </p>
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary text-[10px] font-bold"
              >
                {user.role || "STAF"}
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-xs leading-none">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer gap-2">
              <LayoutDashboard className="text-muted-foreground h-4 w-4" />
              <span>Dasbor Manajerial</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/pos/antrean" className="cursor-pointer gap-2">
              <CreditCard className="text-muted-foreground h-4 w-4" />
              <span>Kasir & Antrean</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar Akun</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
