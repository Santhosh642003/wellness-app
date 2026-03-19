import nodemailer from 'nodemailer';

function createTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const transporter = createTransport();

export async function sendOtpEmail(toEmail, code) {
  if (!transporter) {
    // Dev mode — log to console and skip sending
    console.log(`[DEV] OTP for ${toEmail}: ${code}`);
    return { devMode: true };
  }

  const from = process.env.SMTP_FROM || `"NJIT Campus Wellness" <${process.env.SMTP_USER}>`;
  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Your NJIT Wellness Verification Code',
    html: `
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
    `,
  });
}
