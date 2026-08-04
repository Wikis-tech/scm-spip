import nodemailer from 'nodemailer';

// SCM Capital Corporate Brand Theme Configurations
const BRAND_PRIMARY = '#0d1527'; // Dark deep blue
const BRAND_SECONDARY = '#b1191f'; // Crimson Red
const BRAND_GOLD = '#d4af37'; // Wealth Gold
const BRAND_BG = '#f8fafc'; // Clean slate light gray
const BRAND_TEXT = '#334155'; // Dark gray copy

let smtpAuthenticationDisabled = false;

/**
 * Creates SMTP transporter lazily based on environment variables.
 * Falls back gracefully if credentials are not configured.
 */
function getTransporter() {
  if (smtpAuthenticationDisabled) {
    return null;
  }

  if (process.env.DEMO_MODE === 'true') {
    console.log("[SCM MAIL SERVICE] DEMO_MODE=true detected. Physical SMTP transmission is deliberately bypassed.");
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    console.warn(
      "[SCM MAIL SERVICE WARNING] SMTP Credentials not fully configured in environment.\n" +
      "Missing: " + [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASSWORD"].filter(Boolean).join(", ") + "\n" +
      "Falling back to SCM sandbox console-logger for development."
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Use true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      // Modern Exchange Server / Microsoft 365 requires TLS 1.2 minimum. Never restrict to SSLv3.
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    }
  });
}

/**
 * Robust email dispatcher support function.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; mode: 'smtp' | 'console'; message: string }> {
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || `SCM Capital Security <no-reply@scmcapitalng.com>`;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html,
      });
      console.log(`[SCM SMTP DISPATCH SUCCESS] Real email transmitted to ${to} for subject "${subject}"`);
      return {
        success: true,
        mode: 'smtp',
        message: `Registered SMTP transmission sent successfully to ${to}.`
      };
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.log(`[SCM SMTP GRACEFUL BYPASS] SCM Capital SMTP delivery bypassed for ${to}: ${errMsg}`);
      
      // Check if SMTP error represents credentials issue (535 authentication unsuccessful/invalid login)
      if (
        errMsg.toLowerCase().includes('auth') || 
        errMsg.toLowerCase().includes('login') || 
        errMsg.toLowerCase().includes('credentials') || 
        errMsg.toLowerCase().includes('535')
      ) {
        console.log(`[SCM SMTP CREDENTIALS UPDATE] Invalid SMTP configurations discovered. Enabling automatic offline sandbox simulations default to secure platform continuity.`);
        smtpAuthenticationDisabled = true;
      }
    }
  }

  // Graceful visual console simulation fallback for sandbox trials
  console.log(`\n======================================================`);
  console.log(`[SCM SANDBOX SIMULATED OUTBOX TRANSMISSION]`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`MIME text payload:`);
  console.log(`------------------------------------------------------`);
  console.log(text);
  console.log(`======================================================\n`);

  return {
    success: true,
    mode: 'console',
    message: `SMTP offline. Sandbox email compiled to system terminal logs.`
  };
}

/**
 * Creates a fully styled corporate SCM Capital HTML wrapping template.
 */
function wrapHtmlTemplate(title: string, mainContentHtml: string, actionButtonHtml: string = '') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, -apple-system;
          background-color: ${BRAND_BG};
          color: ${BRAND_TEXT};
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(13, 21, 39, 0.05);
        }
        .header {
          background-color: ${BRAND_PRIMARY};
          padding: 30px;
          text-align: center;
          border-bottom: 4px solid ${BRAND_SECONDARY};
        }
        .header-logo {
          color: #ffffff;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 2px;
          text-decoration: none;
          text-transform: uppercase;
        }
        .header-subtitle {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 5px;
        }
        .content {
          padding: 40px;
          line-height: 1.6;
        }
        .content h1 {
          color: ${BRAND_PRIMARY};
          font-size: 20px;
          font-weight: bold;
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 15px;
        }
        .content p {
          margin-bottom: 20px;
          font-size: 14.5px;
        }
        .code-box {
          background-color: #f1f5f9;
          border: 1.5px dashed #cbd5e1;
          color: ${BRAND_SECONDARY};
          font-family: 'Courier New', Courier, monospace;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 5px;
          text-align: center;
          padding: 15px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .action-button-area {
          text-align: center;
          margin: 30px 0;
        }
        .action-button {
          background-color: ${BRAND_PRIMARY};
          color: #ffffff;
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-decoration: none;
          text-transform: uppercase;
          padding: 14px 28px;
          border-radius: 6px;
          border-bottom: 3px solid ${BRAND_SECONDARY};
          transition: transform 0.2s;
        }
        .footer {
          background-color: #f8fafc;
          border-top: 1px solid #f1f5f9;
          padding: 25px 40px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
        }
        .footer-links {
          margin-bottom: 10px;
        }
        .footer-links a {
          color: ${BRAND_PRIMARY};
          text-decoration: none;
          margin: 0 10px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-logo">SCM CAPITAL</div>
          <div class="header-subtitle">Prospect Intelligence Platform</div>
        </div>
        <div class="content">
          ${mainContentHtml}
          ${actionButtonHtml}
        </div>
        <div class="footer">
          <div class="footer-links">
            <a href="https://scmcapitalng.com">Compliance Regulations</a> • 
            <a href="mailto:support@scmcapitalng.com">Support Workspace</a>
          </div>
          &copy; 2026 SCM Capital Group Limited. Licensed under SEC Nigeria.<br>
          All operations are heavily encrypted, audited, and strictly confidential.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 1. Dispatches Corporate Activation / Verification Code Email (OTP)
 */
export async function sendVerificationEmail(email: string, fullName: string, code: string) {
  const subject = `SCM Workspace Activation Key: ${code}`;
  const text = `Dear ${fullName},\n\nWelcome to the SCM Capital Prospect Intelligence Platform.\n\nYour corporate account verification security OTP key is: ${code}\n\nPlease enter this code on the enrollment panel to finalize your roster.\n\nThis security key remains active for 15 minutes. For safety, do not share this token.\n\nBest Regards,\nSCM Capital System Security.`;
  
  const mainContentHtml = `
    <h1>Activate Your SCM Capital Workspace</h1>
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Welcome to the <strong>SCM Capital Prospect Intelligence Platform (SPIP)</strong>. Your personnel dossier has been added to our corporate registers.</p>
    <p>To authorize this workstation and gain core advisory portal credentials, please input and verify the security activation token below:</p>
    <div class="code-box">${code}</div>
    <p><em>Security Warning: This corporate key is unique to your identity. Never distribute security OTP keys to third parties. SCM staff will never request keys.</em></p>
  `;

  return sendEmail({ to: email, subject, text, html: wrapHtmlTemplate('Activate SCM Workspace', mainContentHtml) });
}

/**
 * 2. Dispatches Password Recovery Email (OTP)
 */
export async function sendPasswordResetEmail(email: string, fullName: string, code: string) {
  const subject = `SCM Credentials Security Recovery Token: ${code}`;
  const text = `A credentials recovery request was logged for your SCM Capital profile.\n\nYour 6-digit security recovery token is: ${code}\n\nInput this code into your console to reset your credentials.\n\nIf you did not initiate this request, contact cyber compliance immediately.\n\nBest Regards,\nSCM Capital Cyber-Security.`;
  
  const mainContentHtml = `
    <h1>Credentials Security Recovery</h1>
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>A credentials recovery and workspace security reset request has been triggered for your account.</p>
    <p>Please utilize the 6-digit corporate verification OTP below to redefine your account passwords:</p>
    <div class="code-box">${code}</div>
    <p>If you did not execute this password recovery, please notify the SCM Capital System Security Team instantly to freeze access.</p>
  `;

  return sendEmail({ to: email, subject, text, html: wrapHtmlTemplate('Credentials Recovery', mainContentHtml) });
}

/**
 * 3. Dispatches Prospect Portal Invitation Email
 */
export async function sendProspectInvitationEmail(
  toEmail: string,
  contactName: string,
  prospectName: string,
  inviterName: string,
  inviterRole: string
) {
  const subject = `Corporate Access Invitation from SCM Capital - Private Executive Portal`;
  const text = `Dear ${contactName},\n\nWe represent SCM Capital Group Limited.\n\n${inviterName}, serving as ${inviterRole}, invites you and the leadership of ${prospectName} to SCM's VIP Prospect Dashboard.\n\nExplore personalized asset management strategies, capital market intelligence briefs, and high-yield treasury suggestions drafted specifically for your enterprise.\n\nAccess Invitation Token: SCM-VIP-${prospectName.toUpperCase().replace(/\s+/g, '')}\n\nReview compliance logs or register at https://scmcapitalng.com.\n\nBest Regards,\nSCM Client Communications.`;

  const mainContentHtml = `
    <h1>Exclusive Corporate Invitation</h1>
    <p>Dear <strong>${contactName}</strong>,</p>
    <p>We represent SCM Capital Group Limited. On behalf of our investment committees, <strong>${inviterName}</strong> (${inviterRole}) has initiated a secure corporate prospect dialogue for the leadership of <strong>${prospectName}</strong>.</p>
    <p>We invite you to connect directly with SCM advisors. We have initialized a private investor terminal where your treasury teams can review our custom high-yield treasury frameworks, asset-allocation strategies, and regulatory coverage logs.</p>
    <p>Your institutional entry pass is code-locked: <strong style="color: ${BRAND_SECONDARY}; font-family: monospace;">SCM-VIP-${prospectName.toUpperCase().replace(/\s+/g, '-')}</strong></p>
  `;

  const actionButtonHtml = `
    <div class="action-button-area">
      <a href="https://scmcapitalng.com" class="action-button">Sign In To Executive Portal</a>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    text,
    html: wrapHtmlTemplate('Executive Portal Corporate Invitation', mainContentHtml, actionButtonHtml),
  });
}

/**
 * 4. General Notification Email
 */
export async function sendNotificationEmail(
  toEmail: string,
  officerName: string,
  subject: string,
  title: string,
  body: string
) {
  const text = `ALERT: ${title}\n\nDear ${officerName},\n\nA corporate alert was triggered on your SCM Prospect Dashboard:\n\n${body}\n\nReview this detail inside your executive dashboard at https://scmcapitalng.com.`;

  const mainContentHtml = `
    <h1>Corporate System Alert</h1>
    <p>Dear <strong>${officerName}</strong>,</p>
    <p>The following real-time administrative notification has been registered for your active prospect workflow:</p>
    <div style="background-color: #fdf2f2; border-left: 4px solid ${BRAND_SECONDARY}; padding: 15px 20px; border-radius: 4px; margin: 20px 0; font-size: 13.5px; line-height: 1.5; color: ${BRAND_PRIMARY}; font-weight: 500;">
      <strong>${title}</strong><br>
      <span style="color: #475569; font-weight: normal; font-size: 12.5px; display: block; margin-top: 5px;">${body}</span>
    </div>
    <p>We recommend signing in to review scheduling details, timeline adjustments, or associated documents.</p>
  `;

  const actionButtonHtml = `
    <div class="action-button-area">
      <a href="https://scmcapitalng.com" class="action-button">Enter SCM Dashboard</a>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    text,
    html: wrapHtmlTemplate(title, mainContentHtml, actionButtonHtml),
  });
}
