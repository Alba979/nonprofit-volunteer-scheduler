import twilio from "twilio";
import { SmsStatus, SmsType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { logger } from "../utils/logger";

const isConfigured = Boolean(
  config.sms.accountSid && config.sms.authToken && config.sms.fromNumber
);

const client = isConfigured ? twilio(config.sms.accountSid, config.sms.authToken) : null;

interface SendSmsOptions {
  volunteerId: string;
  phone: string;
  type: SmsType;
  body: string;
}

/**
 * Sends a text message via Twilio when credentials are configured.
 * Falls back to a SIMULATED status (logged, not transmitted) in local/dev
 * environments so the rest of the system remains fully testable without an
 * active Twilio account. Every attempt — sent, failed, or simulated — is
 * persisted for auditability.
 */
export async function sendSms({ volunteerId, phone, type, body }: SendSmsOptions) {
  if (!client) {
    logger.info({ phone, type }, `[SIMULATED SMS] ${body}`);
    return prisma.smsMessage.create({
      data: { volunteerId, type, body, status: SmsStatus.SIMULATED },
    });
  }

  try {
    const message = await client.messages.create({
      to: phone,
      from: config.sms.fromNumber,
      body,
    });
    return prisma.smsMessage.create({
      data: { volunteerId, type, body, status: SmsStatus.SENT, providerSid: message.sid },
    });
  } catch (err) {
    logger.error({ err, phone, type }, "Failed to send SMS via Twilio");
    return prisma.smsMessage.create({
      data: { volunteerId, type, body, status: SmsStatus.FAILED },
    });
  }
}

export const smsTemplates = {
  shiftReminder: (volunteerFirstName: string, shiftTitle: string, startTime: Date, location: string) =>
    `Hi ${volunteerFirstName}, this is a reminder that you're scheduled for "${shiftTitle}" ` +
    `on ${startTime.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} ` +
    `at ${location}. Reply CANCEL if you can no longer make it.`,

  replacementRequest: (shiftTitle: string, startTime: Date, location: string) =>
    `A volunteer opening just came up for "${shiftTitle}" on ` +
    `${startTime.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} at ${location}. ` +
    `Can you cover it? Log in to claim the shift.`,

  cancellationConfirmation: (volunteerFirstName: string, shiftTitle: string) =>
    `Hi ${volunteerFirstName}, we've recorded your cancellation for "${shiftTitle}". ` +
    `Thanks for letting us know — we're reaching out to find a replacement.`,

  backgroundCheckRedirect: (volunteerFirstName: string, shiftTitle: string) =>
    `Hi ${volunteerFirstName}, "${shiftTitle}" requires an active background check. ` +
    `We've started a clearance request for you — watch for a follow-up email with next steps.`,

  backgroundCheckExpiring: (volunteerFirstName: string, expiresAt: Date) =>
    `Hi ${volunteerFirstName}, your background check expires on ` +
    `${expiresAt.toLocaleDateString("en-US", { dateStyle: "medium" })}. Renew it soon to keep ` +
    `booking restricted shifts without interruption.`,
};
