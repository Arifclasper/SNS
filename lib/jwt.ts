import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./config";

/**
 * Edge-safe JWT helpers. This file must not import Node-only modules so it can
 * be used from both `middleware.ts` (Edge runtime) and server actions (Node).
 */

export const ADMIN_COOKIE = SESSION_COOKIE_NAME;
export const ADMIN_MAX_AGE = SESSION_MAX_AGE_SECONDS;

const ISSUER = "sns-collection";
const AUDIENCE = "sns-admin";
const ALG = "HS256";

const MIN_SECRET_LENGTH = 32;

function secretKey(): Uint8Array {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) {
    throw new Error(
      "JWT_SECRET is not set. Add a 32+ character random value to .env.local " +
        "(and to the deployment environment).",
    );
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: ` +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return new TextEncoder().encode(value);
}

export async function signAdminToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setSubject("admin")
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ADMIN_MAX_AGE)
    .setJti(crypto.randomUUID())
    .sign(secretKey());
}

export async function verifyAdminToken(token?: string | null): Promise<boolean> {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: [ALG],
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 5,
    });
    return payload.sub === "admin" && payload.role === "owner";
  } catch {
    return false;
  }
}
