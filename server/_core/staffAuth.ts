import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

// Header the POS client sends after a staff member logs in with their PIN.
export const STAFF_TOKEN_HEADER = "x-staff-token";
const STAFF_SESSION_MS = 1000 * 60 * 60 * 24 * 30; // แท็บเล็ตหน้าร้านค้างล็อกอินได้ 30 วัน

export type StaffRole = "staff" | "manager" | "admin";

export type StaffSession = {
  id: number;
  name: string;
  role: StaffRole;
  branchId: number | null;
};

function getSecret() {
  // ไม่มี JWT_SECRET บน Railway: ใช้ค่าที่ได้จาก DATABASE_URL แทน (คงที่และเป็นความลับ)
  const secret = ENV.cookieSecret || (ENV.databaseUrl && createHash("sha256").update(`staff:${ENV.databaseUrl}`).digest("hex"));
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function signStaffToken(staffId: number): Promise<string> {
  return new SignJWT({ sid: staffId, typ: "staff" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + STAFF_SESSION_MS) / 1000))
    .sign(getSecret());
}

/** Returns the staff id inside a valid token, or null. Role/branch are always re-read from the DB. */
export async function verifyStaffToken(token: string | undefined | null): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.typ !== "staff" || typeof payload.sid !== "number") return null;
    return payload.sid;
  } catch {
    return null;
  }
}

export const isManagerRole = (role: StaffRole) => role === "manager" || role === "admin";

/**
 * สาขาที่ผู้ใช้คนนี้ดูหรือแก้ได้: แอดมินเลือกได้ทุกสาขา (undefined = ทุกสาขา);
 * คนที่ผูกกับสาขาถูกล็อกไว้ที่สาขาตัวเองเสมอ ไม่ว่าจะขอสาขาไหนมา
 */
export function scopeBranch(staff: StaffSession, requested?: number | null): number | undefined {
  if (staff.role !== "admin" && staff.branchId) return staff.branchId;
  return requested ?? undefined;
}

/** For writes that must target exactly one branch. */
export function requireBranch(staff: StaffSession, requested?: number | null): number {
  const branchId = scopeBranch(staff, requested);
  if (!branchId) throw new Error("กรุณาเลือกสาขา");
  return branchId;
}

// ─── PIN brute-force guard ───────────────────────────────────────────────────
// PIN มีแค่ 4–6 หลัก จึงต้องจำกัดการเดา: ผิดครบ 5 ครั้งล็อก 5 นาที (เก็บในหน่วยความจำของเซิร์ฟเวอร์)
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function assertNotLocked(key: string, now = Date.now()) {
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil > now) {
    const mins = Math.ceil((entry.lockedUntil - now) / 60000);
    throw new Error(`ใส่ PIN ผิดหลายครั้ง กรุณารอ ${mins} นาที`);
  }
}

export function recordPinResult(key: string, ok: boolean, now = Date.now()) {
  if (ok) {
    attempts.delete(key);
    return;
  }
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.count = 0;
    entry.lockedUntil = now + LOCK_MS;
  }
  attempts.set(key, entry);
}

export function resetPinAttempts() {
  attempts.clear();
}
