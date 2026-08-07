import { BackgroundCheckStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface ClearanceResult {
  cleared: boolean;
  reason: string;
  checkId?: string;
  expiresAt?: Date | null;
}

/**
 * The single source of truth for "is this volunteer allowed on a restricted
 * shift right now?" Every booking, reminder, and compliance log routes
 * through here so the rule can never drift between call sites.
 */
export async function evaluateClearance(volunteerId: string): Promise<ClearanceResult> {
  const latest = await prisma.backgroundCheck.findFirst({
    where: { volunteerId },
    orderBy: { requestedAt: "desc" },
  });

  if (!latest) {
    return { cleared: false, reason: "No background check on file" };
  }

  if (latest.status !== BackgroundCheckStatus.CLEARED) {
    return { cleared: false, reason: `Background check status is ${latest.status}`, checkId: latest.id };
  }

  if (latest.expiresAt && latest.expiresAt.getTime() < Date.now()) {
    return {
      cleared: false,
      reason: `Background check expired on ${latest.expiresAt.toISOString().slice(0, 10)}`,
      checkId: latest.id,
      expiresAt: latest.expiresAt,
    };
  }

  return { cleared: true, reason: "Cleared", checkId: latest.id, expiresAt: latest.expiresAt };
}

/** Human-readable snapshot stored on the immutable attendance log. */
export function describeClearanceSnapshot(result: ClearanceResult, required: boolean): string {
  if (!required) return "NOT_REQUIRED";
  if (result.cleared) {
    return result.expiresAt
      ? `CLEARED (exp. ${result.expiresAt.toISOString().slice(0, 10)})`
      : "CLEARED (no expiration on file)";
  }
  return `NOT_CLEARED (${result.reason})`;
}
