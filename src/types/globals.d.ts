import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

import type { UserRole } from "@/generated/prisma/enums";

// Definisi Role yang didukung di Kinclongin POS
export type Roles =
  | "owner"
  | "manager"
  | "cashier"
  | "washer"
  | "admin"
  | "superadmin"
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "WASHER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      outletId?: string | null;
      fullName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: UserRole;
    outletId?: string | null;
    fullName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: UserRole;
    outletId?: string | null;
    fullName?: string;
  }
}
