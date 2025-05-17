import "server-only";

import { cache } from "react";

import NextAuth, { NextAuthConfig } from "next-auth";
import { Provider } from "next-auth/providers/index";
import Resend from "next-auth/providers/resend";

import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const config: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    providers,
  };

  return config;
}

const nextAuth = NextAuth(buildAuthConfig());
export const { handlers, signIn, signOut } = nextAuth;

// current next-auth v5 beta doesn't cache the session, unsure if intentionally
// note: this is React builtin cache, so it's per-request
export const auth = cache(nextAuth.auth);
