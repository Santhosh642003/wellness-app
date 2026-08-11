import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// ── Resend (preferred in production — works over HTTPS, no port blocking) ─────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';

// ── nodemailer / SMTP (fallback — works on dev networks, blocked on Railway) ──
function createTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

const transporter = createTransport();

function isEmailConfigured() {
  return resend !== null || transporter !== null;
}

function productionGuard() {
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('Email delivery is not configured — contact support');
    err.status = 503;
    throw err;
  }
}

async function sendViaResend(to, subject, html) {
  const { error } = await resend.emails.send({ from: resendFrom, to, subject, html });
  if (error) throw Object.assign(new Error(`Resend error: ${error.message}`), { status: 502 });
}

async function sendViaSMTP(to, subject, html) {
  const from = process.env.SMTP_FROM || `"NJIT Campus Wellness" <${process.env.SMTP_USER}>`;
  await transporter.sendMail({ from, to, subject, html });
}

async function sendEmail(to, subject, html) {
  if (resend) return sendViaResend(to, subject, html);
  if (transporter) return sendViaSMTP(to, subject, html);
  productionGuard();
  // dev-only no-op (caller logs the code themselves)
}

export async function sendOtpEmail(toEmail, code) {
  if (!isEmailConfigured()) {
    productionGuard();
    console.log(`[DEV] OTP for ${toEmail}: ${code}`);
    return { devMode: true };
  }

  await sendEmail(toEmail, 'Your NJIT Wellness Verification Code', `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0b0b0b;font-family:'Segoe UI',Helvetica,sans-serif;color:#fff;">
      <div style="max-width:480px;margin:40px auto;background:#121212;border:1px solid #222;border-radius:16px;padding:40px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">NJIT Campus Wellness</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;">Verify your email</h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 32px;">Enter this 6-digit code in the app to complete your registration. The code expires in 10 minutes.</p>
        <div style="background:#0f0f0f;border:1px solid #2d2d2d;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#34d399;">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:12px;margin:0;">If you didn't request this, ignore this email. This code is only valid once.</p>
      </div>
    </body>
    </html>
  `);
}

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!isEmailConfigured()) {
    productionGuard();
    console.log(`[DEV] Password reset link for ${toEmail}: ${resetUrl}`);
    return { devMode: true };
  }

  await sendEmail(toEmail, 'Reset your NJIT Wellness password', `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0b0b0b;font-family:'Segoe UI',Helvetica,sans-serif;color:#fff;">
      <div style="max-width:480px;margin:40px auto;background:#121212;border:1px solid #222;border-radius:16px;padding:40px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">NJIT Campus Wellness</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;">Reset your password</h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 32px;">
          We received a request to reset the password for your account. Click the button below to choose a new password.
          This link expires in <strong style="color:#e5e7eb;">1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#10b981);color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:16px 32px;border-radius:12px;margin-bottom:32px;">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">
          If the button above doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="color:#9ca3af;font-size:11px;word-break:break-all;margin:0 0 24px;">${resetUrl}</p>
        <p style="color:#6b7280;font-size:12px;margin:0;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
      </div>
    </body>
    </html>
  `);
}

export async function sendQuizLiveEmail(toEmail, quizTitle, quizUrl) {
  if (!transporter && !resend) {
    console.log(`[DEV] Quiz live notification for ${toEmail}: ${quizTitle} — ${quizUrl}`);
    return { devMode: true };
  }

  await sendEmail(toEmail, `New Quiz Available: ${quizTitle}`, `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0b0b0b;font-family:'Segoe UI',Helvetica,sans-serif;color:#fff;">
      <div style="max-width:480px;margin:40px auto;background:#121212;border:1px solid #222;border-radius:16px;padding:40px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">NJIT Campus Wellness</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;">New Quiz Available</h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">A new quiz has just gone live on the NJIT Campus Wellness platform. Test your knowledge and earn points!</p>
        <div style="background:#0f0f0f;border:1px solid #2d2d2d;border-radius:12px;padding:20px;margin-bottom:28px;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Quiz</div>
          <div style="font-size:18px;font-weight:700;color:#34d399;">${quizTitle}</div>
        </div>
        <a href="${quizUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#10b981);color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:16px 32px;border-radius:12px;margin-bottom:28px;">
          Take the Quiz →
        </a>
        <p style="color:#6b7280;font-size:12px;margin:0;">Log in to the NJIT Campus Wellness app to complete this quiz and earn your points. Good luck!</p>
      </div>
    </body>
    </html>
  `);
}

export async function sendAnnouncementEmail(toEmail, title, body) {
  if (!transporter && !resend) {
    console.log(`[DEV] Announcement email for ${toEmail}: ${title}`);
    return { devMode: true };
  }

  await sendEmail(toEmail, `NJIT Wellness: ${title}`, `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0b0b0b;font-family:'Segoe UI',Helvetica,sans-serif;color:#fff;">
      <div style="max-width:480px;margin:40px auto;background:#121212;border:1px solid #222;border-radius:16px;padding:40px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">NJIT Campus Wellness</span>
        </div>
        <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;">${title}</h2>
        <div style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0 0 28px;">${body.replace(/\n/g, '<br>')}</div>
        <p style="color:#6b7280;font-size:12px;margin:0;">This announcement was sent from the NJIT Campus Wellness platform.</p>
      </div>
    </body>
    </html>
  `);
}
