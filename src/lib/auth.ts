import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { writeAudit } from "@/lib/audit";

export const APP_NAME = "Payroll";

const SIGN_IN_PATHS = new Set(["/sign-in/email", "/two-factor/verify-totp", "/two-factor/verify-backup-code"]);

export const auth = betterAuth({
  appName: APP_NAME,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Accounts are created only by an administrator (see src/lib/users.ts).
    disableSignUp: true,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      isSystemAdmin: { type: "boolean", defaultValue: false, input: false },
      mustChangePassword: { type: "boolean", defaultValue: false, input: false },
      isActive: { type: "boolean", defaultValue: true, input: false },
    },
  },
  session: {
    // Sign out after 12 hours; refresh the expiry at most once an hour while in use.
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/two-factor/verify-totp": { window: 300, max: 10 },
      "/two-factor/verify-backup-code": { window: 300, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const row = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, session.userId) });
          if (!row?.isActive) throw new APIError("FORBIDDEN", { message: "This account is disabled." });
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!SIGN_IN_PATHS.has(ctx.path)) return;
      const ipAddress = ctx.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const returned = ctx.context.returned;
      if (isAPIError(returned)) {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email.toLowerCase() : null;
        await writeAudit({
          action: ctx.path === "/sign-in/email" ? "auth.login_failed" : "auth.2fa_failed",
          entityType: "user",
          userEmail: email,
          ipAddress,
        });
        return;
      }
      const created = ctx.context.newSession;
      // During a 2FA challenge the password step yields no session; the login is
      // recorded when the second factor is verified.
      if (!created) return;
      if (ctx.path === "/sign-in/email" && created.user.twoFactorEnabled) return;
      await writeAudit({
        action: "auth.login",
        entityType: "user",
        entityId: created.user.id,
        userId: created.user.id,
        userEmail: created.user.email,
        ipAddress,
      });
    }),
  },
  plugins: [
    twoFactor({
      issuer: APP_NAME,
      backupCodeOptions: { amount: 10 },
    }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
