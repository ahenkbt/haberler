import nodemailer from "nodemailer";
import { db, siteSettingsTable } from "@workspace/db";

type SmtpResolved = {
  transport: ReturnType<typeof nodemailer.createTransport>;
  from: string;
};

async function resolveSmtpFromDatabase(): Promise<SmtpResolved | null> {
  try {
    const rows = await db
      .select({
        host: siteSettingsTable.smtpHost,
        port: siteSettingsTable.smtpPort,
        user: siteSettingsTable.smtpUser,
        pass: siteSettingsTable.smtpPass,
        from: siteSettingsTable.smtpFrom,
      })
      .from(siteSettingsTable)
      .limit(1);
    const row = rows[0];
    const host = row?.host?.trim();
    const user = row?.user?.trim();
    const pass = row?.pass?.trim();
    if (!host || !user || !pass) return null;
    const port = Math.min(65535, Math.max(1, Number(row?.port ?? "587") || 587));
    const from = row?.from?.trim() || `Yekpare <${user}>`;
    return {
      transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
      from,
    };
  } catch {
    return null;
  }
}

function resolveSmtpFromEnv(): SmtpResolved | null {
  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const from = process.env["SMTP_FROM"] ?? "Yekpare <noreply@yekpare.net>";

  if (host && user && pass) {
    return {
      transport: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
      from,
    };
  }
  return null;
}

/** SMTP_* ortam değişkenleri (kısmi olabilir). Gelen kutusu IMAP eşlemesi DB boşken kullanılır. */
export function getSmtpEnvAuthFields(): { host: string; user: string; pass: string } {
  return {
    host: String(process.env["SMTP_HOST"] ?? "").trim(),
    user: String(process.env["SMTP_USER"] ?? "").trim(),
    pass: String(process.env["SMTP_PASS"] ?? "").trim(),
  };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; preview?: string }> {
  const envCfg = resolveSmtpFromEnv();
  const cfg = envCfg ?? (await resolveSmtpFromDatabase());
  if (!cfg) {
    return { sent: false };
  }
  try {
    await cfg.transport.sendMail({ from: cfg.from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

export type ExplicitSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export async function sendEmailViaSmtp(
  cfg: ExplicitSmtpConfig,
  opts: { to: string; subject: string; html: string; text?: string },
): Promise<{ sent: boolean; error?: string }> {
  const host = cfg.host?.trim();
  const user = cfg.user?.trim();
  const pass = cfg.pass?.trim();
  if (!host || !user || !pass) return { sent: false, error: "SMTP eksik" };
  const port = Math.min(65535, Math.max(1, Number(cfg.port) || 587));
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: cfg.secure || port === 465,
    auth: { user, pass },
  });
  const from = cfg.from?.trim() || user;
  try {
    await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function buildActivationEmail(opts: {
  vendorName: string;
  ownerName: string;
  email: string;
  password: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `🎉 Yekpare İşletme Hesabınız Onaylandı — ${opts.vendorName}`;
  const html = `
<!DOCTYPE html><html lang="tr"><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🎉 Başvurunuz Onaylandı!</h1>
  </div>
  <div style="padding:28px 24px">
    <p style="color:#374151;font-size:15px">Merhaba <strong>${opts.ownerName}</strong>,</p>
    <p style="color:#374151;font-size:15px"><strong>${opts.vendorName}</strong> işletmenizin Yekpare başvurusu onaylandı. Artık işletme panelinize giriş yapabilirsiniz.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600">GİRİŞ BİLGİLERİNİZ</p>
      <p style="margin:4px 0;color:#111827;font-size:14px">📧 E-posta: <strong>${opts.email}</strong></p>
      <p style="margin:4px 0;color:#111827;font-size:14px">🔑 Şifre: <strong style="font-family:monospace;background:#fef3c7;padding:2px 6px;border-radius:4px">${opts.password}</strong></p>
    </div>
    <p style="color:#ef4444;font-size:13px">⚠️ Güvenliğiniz için giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${opts.loginUrl}" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Panele Giriş Yap →
      </a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="color:#9ca3af;font-size:12px;margin:0">Yekpare — yekpare.net</p>
  </div>
</div>
</body></html>`;
  const text = `Merhaba ${opts.ownerName},\n\n${opts.vendorName} işletmeniz onaylandı!\n\nE-posta: ${opts.email}\nŞifre: ${opts.password}\n\nGiriş: ${opts.loginUrl}`;
  return { subject, html, text };
}

export function buildPasswordResetEmail(opts: {
  ownerName: string;
  vendorName: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Yekpare — Şifre Sıfırlama Talebi`;
  const html = `
<!DOCTYPE html><html lang="tr"><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">🔐 Şifre Sıfırlama</h1>
  </div>
  <div style="padding:28px 24px">
    <p style="color:#374151;font-size:15px">Merhaba <strong>${opts.ownerName}</strong>,</p>
    <p style="color:#374151;font-size:15px"><strong>${opts.vendorName}</strong> hesabınız için şifre sıfırlama talebi alındı.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${opts.resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Şifremi Sıfırla →
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px">Bu link <strong>30 dakika</strong> geçerlidir. Eğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelin.</p>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="color:#9ca3af;font-size:12px;margin:0">Yekpare — yekpare.net</p>
  </div>
</div>
</body></html>`;
  const text = `Şifre sıfırlama linki: ${opts.resetUrl}\n\nBu link 30 dakika geçerlidir.`;
  return { subject, html, text };
}
