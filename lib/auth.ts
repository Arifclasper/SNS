import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  signAdminToken,
  verifyAdminToken,
} from "./jwt";

const WEAK_PASSWORDS = new Set([
  "change-me",
  "change-me-too",
  "changeme",
  "password",
  "admin",
  "sns2026",
]);

export function adminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) {
    throw new Error(
      "ADMIN_PASSWORD is not set. Add the owner console password to .env.local " +
        "(and to the deployment environment).",
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (value.length < 16) {
      throw new Error(
        "ADMIN_PASSWORD must be at least 16 characters in production. " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(24).toString('base64url'))\"",
      );
    }
    if (WEAK_PASSWORDS.has(value.toLowerCase())) {
      throw new Error("ADMIN_PASSWORD is a known placeholder. Set a unique production password.");
    }
  }

  return value;
}

/**
 * Constant-time password comparison. Both sides are hashed first so the
 * comparison length is fixed and does not leak the password length.
 */
function passwordsMatch(input: string, expected: string): boolean {
  const actual = createHash("sha256").update(input).digest();
  const wanted = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actual, wanted);
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

export async function signIn(password: string): Promise<boolean> {
  if (!passwordsMatch(password, adminPassword())) return false;

  const store = await cookies();
  store.set(ADMIN_COOKIE, await signAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
