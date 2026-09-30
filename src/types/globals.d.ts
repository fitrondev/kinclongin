export {};

// Definisi Role yang didukung di KerjaNTB
export type Roles =
  | "admin"
  | "superadmin"
  | "moderator"
  | "company"
  | "individual"
  | "SUPERADMIN"
  | "COMPANY"
  | "INDIVIDUAL";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
    };
  }
}
