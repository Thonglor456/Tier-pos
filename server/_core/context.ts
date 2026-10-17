import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getActivePosUser } from "../db";
import { sdk } from "./sdk";
import { STAFF_TOKEN_HEADER, verifyStaffToken, type StaffSession } from "./staffAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  staff: StaffSession | null;
};

async function resolveStaff(req: CreateExpressContextOptions["req"]): Promise<StaffSession | null> {
  const raw = req.headers?.[STAFF_TOKEN_HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  const staffId = await verifyStaffToken(token);
  if (!staffId) return null;
  // อ่านสิทธิ์และสาขาจากฐานข้อมูลทุกครั้ง: ปิดบัญชีหรือเปลี่ยนสิทธิ์แล้วมีผลทันที
  const user = await getActivePosUser(staffId);
  if (!user) return null;
  return { id: user.id, name: user.name, role: user.role, branchId: user.branchId ?? null };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  let staff: StaffSession | null = null;
  try {
    staff = await resolveStaff(opts.req);
  } catch {
    staff = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    staff,
  };
}
