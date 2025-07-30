import "server-only";

import { cache } from "react";

import NextAuth, { NextAuthConfig } from "next-auth";
import { Provider } from "next-auth/providers/index";
import Resend from "next-auth/providers/resend";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";

import { prisma } from "@roast/db";

function buildAuthConfig(): NextAuthConfig {
  const providers: Provider[] = [];

  const { AUTH_RESEND_KEY, EMAIL_FROM } = process.env;

  if (AUTH_RESEND_KEY && EMAIL_FROM) {
    providers.push(
      Resend({
        apiKey: AUTH_RESEND_KEY,
        from: EMAIL_FROM,
        name: "Email",
      })
    );
  }

  // Type compatibility workaround for @auth/prisma-adapter v2.10.0 with Prisma Client v6.13.0
  // The adapter expects a specific Prisma Client type structure. This creates a properly typed wrapper.
  const prismaAdapter = PrismaAdapter(prisma as Parameters<typeof PrismaAdapter>[0]) as Adapter;
  
  const config: NextAuthConfig = {
    adapter: prismaAdapter,
    providers,
    session: {
      strategy: "database",
    },
    trustHost: true,
    callbacks: {
      session: async ({ session, user }) => {
        if (session?.user) {
          session.user.id = user.id;
          session.user.role = user.role;
        }
        return session;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  };

  return config;
}

const nextAuth = NextAuth(buildAuthConfig());
export const { handlers, signIn, signOut } = nextAuth;

// current next-auth v5 beta doesn't cache the session, unsure if intentionally
// note: this is React builtin cache, so it's per-request
export const auth = cache(nextAuth.auth);

export async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}
