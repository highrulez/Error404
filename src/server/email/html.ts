/** HTML escaping for user-provided text in email templates */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function openFormButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<p style="margin:20px 0"><a href="${safeHref}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-family:Segoe UI,Arial,sans-serif;font-size:14px">${safeLabel}</a></p>`;
}

export function wrapEmailDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.5">${bodyHtml}<p style="margin-top:28px;font-size:12px;color:#64748b">This message was sent by the OneFlow prototype. Do not reply with confidential employee data.</p></body></html>`;
}
