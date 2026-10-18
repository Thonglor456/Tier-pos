import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { createContext, type TrpcContext } from "./_core/context";
import { STAFF_TOKEN_HEADER, resetPinAttempts } from "./_core/staffAuth";
import { appRouter } from "./routers";

const STAFF_ROW = { id: 7, name: "น้องหน้าร้าน", pinCode: "2580", role: "staff" as const, isActive: true, branchId: 2 };

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    verifyStaffPin: vi.fn(async (staffId: number, pin: string) => (staffId === 7 && pin === "2580" ? STAFF_ROW : null)),
    getActivePosUser: vi.fn(async (id: number) => (id === 7 ? STAFF_ROW : null)),
  };
});

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn().mockRejectedValue(new Error("no oauth")) } }));

const original = { ...ENV };
afterEach(() => {
  Object.assign(ENV, original);
  resetPinAttempts();
});

function publicCtx(): TrpcContext {
  return { user: null, staff: null, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("staff PIN login without JWT_SECRET (same as Railway)", () => {
  it("correct PIN logs in and the token works on later requests", async () => {
    ENV.cookieSecret = "";
    ENV.databaseUrl = "mysql://user:pass@railway.internal:3306/railway";

    const result = await appRouter.createCaller(publicCtx()).posUsers.verifyStaffPin({ staffId: 7, pin: "2580" });
    expect(result?.name).toBe("น้องหน้าร้าน");
    expect(result?.token).toBeTruthy();

    const ctx = await createContext({
      req: { headers: { [STAFF_TOKEN_HEADER]: result!.token } },
      res: {},
    } as unknown as Parameters<typeof createContext>[0]);
    expect(ctx.staff).toEqual({ id: 7, name: "น้องหน้าร้าน", role: "staff", branchId: 2 });

    const me = await appRouter.createCaller(ctx).posUsers.me();
    expect(me?.id).toBe(7);
  });

  it("wrong PIN is still rejected", async () => {
    ENV.cookieSecret = "";
    ENV.databaseUrl = "mysql://user:pass@railway.internal:3306/railway";
    const result = await appRouter.createCaller(publicCtx()).posUsers.verifyStaffPin({ staffId: 7, pin: "0000" });
    expect(result).toBeNull();
  });
});
