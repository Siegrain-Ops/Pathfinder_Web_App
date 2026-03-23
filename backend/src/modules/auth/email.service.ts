// ---------------------------------------------------------------------------
// Email service — Resend provider
// ---------------------------------------------------------------------------

import { Resend } from 'resend'

const FROM    = process.env.MAIL_FROM    ?? 'PathLegends <noreply@example.com>'
const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173'

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

// ── Shared HTML shell ────────────────────────────────────────────────────────

function shell(body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1c1917;background:#fafaf9;">
      <p style="margin:0 0 24px;font-size:22px;font-weight:700;">
        <span style="color:#e7e5e4;">⚔ Path</span><span style="color:#d97706;">Legends</span>
      </p>
      ${body}
      <hr style="border:none;border-top:1px solid #e7e5e4;margin:32px 0 16px;" />
      <p style="margin:0;font-size:11px;color:#a8a29e;">
        You received this email because an action was performed on your PathLegends account.<br />
        If you did not initiate this action, you can safely ignore this message.
      </p>
    </div>
  `
}

function primaryButton(href: string, label: string): string {
  return `
    <p style="margin:24px 0;">
      <a href="${href}"
         style="display:inline-block;background:#d97706;color:#ffffff;padding:12px 28px;
                border-radius:6px;font-weight:600;text-decoration:none;font-size:14px;">
        ${label}
      </a>
    </p>
  `
}

// ── Email senders ────────────────────────────────────────────────────────────

export const emailService = {
  async sendVerificationEmail(
    toEmail: string,
    displayName: string,
    token: string,
  ): Promise<void> {
    const url = `${baseUrl}/verify-email?token=${token}`
    const resend = getResendClient()

    await resend.emails.send({
      from:    FROM,
      to:      toEmail,
      subject: 'Verify your PathLegends account',
      html: shell(`
        <p style="margin:0 0 8px;font-size:16px;">Hi ${escHtml(displayName)},</p>
        <p style="margin:0 0 16px;color:#57534e;">
          Thanks for signing up! Please verify your email address to activate your account.
        </p>
        ${primaryButton(url, 'Verify Email')}
        <p style="margin:0;font-size:12px;color:#a8a29e;">
          This link expires in <strong>24 hours</strong>.
          If the button above does not work, copy and paste the URL below into your browser:<br />
          <span style="word-break:break-all;color:#78716c;">${url}</span>
        </p>
      `),
    })
  },

  async sendPasswordResetEmail(
    toEmail: string,
    displayName: string,
    token: string,
  ): Promise<void> {
    const url = `${baseUrl}/reset-password?token=${token}`
    const resend = getResendClient()

    await resend.emails.send({
      from:    FROM,
      to:      toEmail,
      subject: 'Reset your PathLegends password',
      html: shell(`
        <p style="margin:0 0 8px;font-size:16px;">Hi ${escHtml(displayName)},</p>
        <p style="margin:0 0 16px;color:#57534e;">
          We received a request to reset the password for your account.
          Click the button below to choose a new password.
        </p>
        ${primaryButton(url, 'Reset Password')}
        <p style="margin:0;font-size:12px;color:#a8a29e;">
          This link expires in <strong>1 hour</strong>.
          If you did not request a password reset, no action is required — your password has not changed.
        </p>
      `),
    })
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
}
