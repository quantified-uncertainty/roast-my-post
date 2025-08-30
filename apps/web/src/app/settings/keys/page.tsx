import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { ROUTES } from "@/constants/routes";
import { ApiKeysCard } from "./ApiKeysCard";

export default async function ApiKeysPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect(ROUTES.AUTH.SIGNIN);
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert Date objects to ISO strings for SSR -> CSR serialization
  const serializedApiKeys = apiKeys.map((key) => ({
    ...key,
    createdAt: key.createdAt.toISOString(),
    lastUsedAt: key.lastUsedAt?.toISOString() || null,
    expiresAt: key.expiresAt?.toISOString() || null,
  }));

  return <ApiKeysCard initialApiKeys={serializedApiKeys} />;
}
