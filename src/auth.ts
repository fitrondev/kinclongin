import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

const credentialsSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const { email, password } = parsed.data;

          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: {
              outlet: true,
              ownedOutlets: true,
            },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          if (user.status !== "ACTIVE") {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          // Jika user adalah OWNER dan belum punya outlet aktif tetapi punya cabang yang dimiliki
          let activeOutletId = user.outletId;
          if (!activeOutletId && user.ownedOutlets.length > 0) {
            activeOutletId = user.ownedOutlets[0].id;
            await prisma.user.update({
              where: { id: user.id },
              data: { outletId: activeOutletId },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            image: user.avatarUrl,
            role: user.role,
            outletId: activeOutletId,
            fullName: user.fullName,
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.outletId = user.outletId ?? undefined;
        token.fullName = user.fullName ?? (user.name || undefined);
      }

      if (trigger === "update" && session?.outletId) {
        token.outletId = session.outletId;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.role = (token.role as UserRole) || UserRole.CASHIER;
        session.user.outletId = (token.outletId as string) || undefined;
        session.user.fullName =
          (token.fullName as string) || session.user.name || "";
        session.user.name =
          (token.fullName as string) || session.user.name || "";
      }
      return session;
    },
  },
});
