import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Prisma client used by clearance.service so tests run without a DB.
vi.mock("../src/lib/prisma", () => ({
  prisma: { backgroundCheck: { findFirst: vi.fn() } },
}));

import { prisma } from "../src/lib/prisma";
import { evaluateClearance, describeClearanceSnapshot } from "../src/services/clearance.service";

const findFirst = prisma.backgroundCheck.findFirst as unknown as ReturnType<typeof vi.fn>;

describe("evaluateClearance", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("blocks a volunteer with no background check on file", async () => {
    findFirst.mockResolvedValue(null);
    const result = await evaluateClearance("volunteer-1");
    expect(result.cleared).toBe(false);
    expect(result.reason).toMatch(/no background check/i);
  });

  it("blocks a volunteer whose check is still PENDING", async () => {
    findFirst.mockResolvedValue({ id: "c1", status: "PENDING", expiresAt: null });
    const result = await evaluateClearance("volunteer-1");
    expect(result.cleared).toBe(false);
  });

  it("blocks a volunteer whose CLEARED check has expired", async () => {
    findFirst.mockResolvedValue({
      id: "c1",
      status: "CLEARED",
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const result = await evaluateClearance("volunteer-1");
    expect(result.cleared).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it("clears a volunteer with a CLEARED, non-expired check", async () => {
    findFirst.mockResolvedValue({
      id: "c1",
      status: "CLEARED",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    const result = await evaluateClearance("volunteer-1");
    expect(result.cleared).toBe(true);
  });

  it("clears a volunteer with a CLEARED check that has no expiration on file", async () => {
    findFirst.mockResolvedValue({ id: "c1", status: "CLEARED", expiresAt: null });
    const result = await evaluateClearance("volunteer-1");
    expect(result.cleared).toBe(true);
  });
});

describe("describeClearanceSnapshot", () => {
  it("returns NOT_REQUIRED when the shift has no background-check requirement", () => {
    expect(describeClearanceSnapshot({ cleared: false, reason: "n/a" }, false)).toBe("NOT_REQUIRED");
  });

  it("includes the expiration date when cleared", () => {
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    const snapshot = describeClearanceSnapshot({ cleared: true, reason: "Cleared", expiresAt }, true);
    expect(snapshot).toContain("CLEARED");
    expect(snapshot).toContain("2027-01-01");
  });

  it("includes the block reason when not cleared", () => {
    const snapshot = describeClearanceSnapshot({ cleared: false, reason: "Background check status is EXPIRED" }, true);
    expect(snapshot).toContain("NOT_CLEARED");
    expect(snapshot).toContain("EXPIRED");
  });
});
