/**
 * AWS SES v2 sender — server-only.
 * Do not import from client components.
 */

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import { getEmailServerConfig } from "./config";

export interface SesAttachment {
  fileName: string;
  contentType: string;
  /** Base64 content */
  contentBase64: string;
}

export interface SesSendInput {
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: SesAttachment[];
}

export interface SesSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/html",
]);

const MAX_ATTACHMENT_BYTES = 4.5 * 1024 * 1024; // SES practical limit buffer

let client: SESv2Client | null = null;

function getClient(): SESv2Client {
  if (client) return client;
  const cfg = getEmailServerConfig();
  client = new SESv2Client({
    region: cfg.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  return client;
}

export function validateAttachments(
  attachments: SesAttachment[] | undefined
): { ok: true } | { ok: false; error: string } {
  if (!attachments?.length) return { ok: true };
  for (const a of attachments) {
    if (!ALLOWED_MIME.has(a.contentType)) {
      return {
        ok: false,
        error: `Unsupported attachment type: ${a.contentType}`,
      };
    }
    const bytes = Buffer.from(a.contentBase64, "base64").byteLength;
    if (bytes > MAX_ATTACHMENT_BYTES) {
      return {
        ok: false,
        error: `Attachment ${a.fileName} exceeds size limit`,
      };
    }
  }
  return { ok: true };
}

function buildRawMime(args: {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  attachments: SesAttachment[];
}): Uint8Array {
  const boundary = `OneFlow_${Date.now().toString(36)}`;
  const lines: string[] = [];
  lines.push(`From: ${args.from}`);
  lines.push(`To: ${args.to.join(", ")}`);
  if (args.cc.length) lines.push(`Cc: ${args.cc.join(", ")}`);
  lines.push(`Subject: ${args.subject}`);
  lines.push("MIME-Version: 1.0");
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push('Content-Type: multipart/alternative; boundary="alt_' + boundary + '"');
  lines.push("");
  lines.push(`--alt_${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(args.textBody);
  lines.push("");
  lines.push(`--alt_${boundary}`);
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(args.htmlBody);
  lines.push("");
  lines.push(`--alt_${boundary}--`);
  for (const att of args.attachments) {
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push(
      `Content-Type: ${att.contentType}; name="${att.fileName.replace(/"/g, "")}"`
    );
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(
      `Content-Disposition: attachment; filename="${att.fileName.replace(/"/g, "")}"`
    );
    lines.push("");
    lines.push(att.contentBase64.replace(/(.{76})/g, "$1\n"));
  }
  lines.push(`--${boundary}--`);
  lines.push("");
  return new TextEncoder().encode(lines.join("\r\n"));
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendViaSes(input: SesSendInput): Promise<SesSendResult> {
  const cfg = getEmailServerConfig();
  if (!cfg.hasCredentials) {
    return { ok: false, error: "AWS SES credentials are not configured." };
  }
  if (!cfg.fromEmail) {
    return { ok: false, error: "SES_FROM_EMAIL is not configured." };
  }
  if (!input.to.length) {
    return { ok: false, error: "No SES recipients." };
  }

  const attCheck = validateAttachments(input.attachments);
  if (!attCheck.ok) return { ok: false, error: attCheck.error };

  const fromHeader = cfg.fromName
    ? `${cfg.fromName} <${cfg.fromEmail}>`
    : cfg.fromEmail;
  const textBody = input.textBody || stripHtml(input.htmlBody);
  const attachments = input.attachments || [];

  try {
    let commandInput: SendEmailCommandInput;

    if (attachments.length) {
      commandInput = {
        FromEmailAddress: cfg.fromEmail,
        Destination: {
          ToAddresses: input.to,
          CcAddresses: input.cc?.length ? input.cc : undefined,
        },
        Content: {
          Raw: {
            Data: buildRawMime({
              from: fromHeader,
              to: input.to,
              cc: input.cc || [],
              subject: input.subject,
              htmlBody: input.htmlBody,
              textBody,
              attachments,
            }),
          },
        },
      };
    } else {
      commandInput = {
        FromEmailAddress: cfg.fromEmail,
        Destination: {
          ToAddresses: input.to,
          CcAddresses: input.cc?.length ? input.cc : undefined,
        },
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: input.htmlBody, Charset: "UTF-8" },
              Text: { Data: textBody, Charset: "UTF-8" },
            },
          },
        },
      };
    }

    const result = await getClient().send(new SendEmailCommand(commandInput));
    return { ok: true, messageId: result.MessageId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "SES send failed (unknown error).";
    // Never log secrets — only the error message
    console.error("[OneFlow SES] send failed:", message);
    return { ok: false, error: message };
  }
}
