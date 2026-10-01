import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * Mengambil record user aktif yang sedang login dari database MySQL.
 * Di-memoize per-request dengan React cache() untuk efisiensi Server Components.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  let dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      outlet: true,
      employee: true,
      ownedOutlets: true,
    },
  });

  if (!dbUser) {
    return null;
  }

  // Jika Owner belum memilih cabang aktif, pilih cabang pertama yang dimiliki
  if (!dbUser.outletId && dbUser.ownedOutlets.length > 0) {
    const firstOutlet = dbUser.ownedOutlets[0];
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { outletId: firstOutlet.id },
      include: {
        outlet: true,
        employee: true,
        ownedOutlets: true,
      },
    });
  }

  return dbUser;
});
