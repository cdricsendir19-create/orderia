import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "orderia_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.ORDERIA_SESSION_SECRET;
  if (!value) throw new Error("ORDERIA_SESSION_SECRET is not configured");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function validSignature(payload: string, signature: string) {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSession(merchantId: string) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${merchantId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function readSession(value?: string | null) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [merchantId, expiresRaw, signature] = parts;
  const expires = Number(expiresRaw);
  if (!merchantId || !Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return null;
  if (!validSignature(`${merchantId}.${expires}`, signature)) return null;
  return { merchantId, expires };
}

export async function getDashboardMerchantId() {
  const jar = await cookies();
  return readSession(jar.get(COOKIE)?.value)?.merchantId ?? null;
}

export const dashboardCookieName = COOKIE;
export const dashboardCookieMaxAge = MAX_AGE;
