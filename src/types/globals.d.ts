export {};

// Definisi Role yang didukung di Kinclongin POS
export type Roles =
  | "owner"
  | "manager"
  | "cashier"
  | "washer"
  | "admin"
  | "superadmin"
  | "org:owner"
  | "org:admin"
  | "org:manager"
  | "org:cashier"
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "WASHER";

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: Roles;
    };
    org_id?: string;
    org_role?: string;
    org_slug?: string;
  }
}
