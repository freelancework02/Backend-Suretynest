// controllers/contactController.js
const nodemailer = require("nodemailer");

// Simple HTML escaping to avoid broken markup / XSS
const escapeHtml = (unsafe = "") => {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const sendContactForm = async (req, res) => {
    try {
        const { name, email, phone, msg, toEmail } = req.body;

        // Basic validation
        if (!name || !email || !msg) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required.",
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Escape unsafe input
        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safePhone = escapeHtml(phone || "");
        const safeMsg = escapeHtml(msg);
        const msgHtml = safeMsg.replace(/\n/g, "<br>");

        // TEXT fallback
        const textBody = `
New enquiry from SuretyNest.com

Name:    ${safeName}
Email:   ${safeEmail}
Phone:   ${safePhone || "Not provided"}

Message:
${msg}
    `.trim();

        // 🌟 === SURETYNEST – UPDATED BRAND THEME ===
        // Primary Colors from SuretyNest:
        // Navy Blue: #0d2c55 (used as deep accent/background)
        // Light Teal/Gradient: #0fb7d4 → #1ad1a3 (primary gradient)
        // Clean White Backgrounds
        // Light Gray Backgrounds: #f8fafc (subtle card backgrounds)
        // Dark Gray Text: #1f2937 (primary text)
        // Medium Gray Text: #6b7280 (secondary text)
        // Accent Gradient: #0fb7d4 → #1ad1a3 (buttons, highlights)

        const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>New Enquiry - SuretyNest Financial Solutions</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @media (max-width: 600px) {
    .sn-container { width: 100% !important; border-radius: 0 !important; }
    .sn-inner { padding: 18px !important; }
    .sn-header, .sn-footer { padding-left: 18px !important; padding-right: 18px !important; }
    .sn-btn { width: 100% !important; text-align:center !important; }
    .sn-detail-row { display: block !important; padding: 12px 0 !important; }
    .sn-detail-label { margin-bottom: 4px !important; }
  }
</style>
</head>

<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
  <tr>
    <td align="center" style="padding:0 12px;">

      <table width="100%" cellpadding="0" cellspacing="0" class="sn-container"
        style="max-width:620px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(13,44,85,0.08);border:1px solid #e5e7eb;">

        <!-- HEADER WITH GRADIENT -->
        <tr>
          <td class="sn-header"
            style="background:linear-gradient(135deg, #0d2c55, #0fb7d4 85%);padding:32px 32px 24px;color:white;text-align:center;">
            <div style="font-size:28px;font-weight:700;letter-spacing:0.02em;margin-bottom:8px;">
              SuretyNest
            </div>
            <div style="font-size:14px;color:#e6faff;opacity:0.9;">
              Financial Solutions • Clarity • Confidence
            </div>
            <div style="font-size:12px;margin-top:16px;color:#e6faff;background:rgba(255,255,255,0.12);display:inline-block;padding:6px 16px;border-radius:20px;">
              New Contact Form Enquiry
            </div>
          </td>
        </tr>

        <!-- SUBTLE SEPARATOR -->
        <tr>
          <td style="background:linear-gradient(to right, #0fb7d4, #1ad1a3);height:3px;"></td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="sn-inner" style="padding:32px;background:white;">

            <!-- Introduction Card -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <div style="color:#1f2937;font-size:15px;line-height:1.6;">
                    <span style="color:#0d2c55;font-weight:600;">A new enquiry has been submitted on SuretyNest.com.</span> 
                    You'll find the contact details and message below. 
                  </div>
                </td>
              </tr>
            </table>

            <!-- DETAILS CARD - Modern Layout -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:28px;">

              <!-- Name -->
              <tr class="sn-detail-row">
                <td style="padding:20px 20px 16px;border-bottom:1px solid #e5e7eb;">
                  <div class="sn-detail-label" style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:6px;">
                    Contact Name
                  </div>
                  <div style="color:#1f2937;font-size:18px;font-weight:600;display:flex;align-items:center;">
                    <span style="display:inline-block;width:4px;height:18px;background:linear-gradient(to bottom, #0fb7d4, #1ad1a3);margin-right:10px;border-radius:2px;"></span>
                    ${safeName}
                  </div>
                </td>
              </tr>

              <!-- Email -->
              <tr class="sn-detail-row">
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <div class="sn-detail-label" style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:6px;">
                    Email Address
                  </div>
                  <a href="mailto:${safeEmail}"
                    style="font-size:16px;color:#0d2c55;text-decoration:none;font-weight:500;display:flex;align-items:center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#0fb7d4" stroke-width="2"/>
                      <path d="M22 6L12 13L2 6" stroke="#0fb7d4" stroke-width="2"/>
                    </svg>
                    ${safeEmail}
                  </a>
                </td>
              </tr>

              <!-- Phone -->
              <tr class="sn-detail-row">
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <div class="sn-detail-label" style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:6px;">
                    Phone Number
                  </div>
                  <a href="tel:${safePhone}"
                    style="font-size:16px;color:#0d2c55;text-decoration:none;font-weight:500;display:flex;align-items:center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right:8px;" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 16.92V19.92C22 20.47 21.55 20.92 21 20.92C16.03 20.92 12.1 19.24 9 16.5C6.13 13.97 4.1 10.96 3.28 7.82C3.09 7.07 3 6.31 3 5.5C3 4.95 3.45 4.5 4 4.5H7C7.55 4.5 8 4.95 8 5.5C8 6.07 8.15 6.62 8.42 7.11C8.64 7.53 8.67 8.04 8.46 8.48L7.37 10.79C8.88 13.62 11.38 16.12 14.21 17.63L16.52 16.54C16.96 16.33 17.47 16.36 17.89 16.58C18.38 16.85 18.93 17 19.5 17C20.05 17 20.5 17.45 20.5 18V21C20.5 21.55 20.05 22 19.5 22C17.32 22 15.19 21.53 13.25 20.65C11.09 19.66 9.16 18.25 7.57 16.43C5.75 14.84 4.34 12.91 3.35 10.75C2.47 8.81 2 6.68 2 4.5C2 3.95 2.45 3.5 3 3.5H6C6.55 3.5 7 3.95 7 4.5C7 5.62 7.19 6.69 7.56 7.69" stroke="#0fb7d4" stroke-width="2"/>
                    </svg>
                    ${safePhone || "Not provided"}
                  </a>
                </td>
              </tr>

              <!-- Message -->
              <tr class="sn-detail-row">
                <td style="padding:20px;">
                  <div class="sn-detail-label" style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;margin-bottom:8px;">
                    Their Message
                  </div>
                  <div style="background:white;padding:18px;border-radius:8px;border-left:4px solid #0fb7d4;">
                    <div style="font-size:15px;line-height:1.6;color:#1f2937;">
                      ${msgHtml}
                    </div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA BUTTONS -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="mailto:${safeEmail}" class="sn-btn"
                          style="display:inline-block;padding:14px 32px;border-radius:40px;font-size:15px;font-weight:600;
                          background:linear-gradient(135deg, #0fb7d4, #1ad1a3);color:#ffffff;text-decoration:none;box-shadow:0 4px 12px rgba(15,183,212,0.25);">
                          ✉️ Reply to ${safeName}
                        </a>
                        <a href="tel:${safePhone}" class="sn-btn"
                          style="display:inline-block;padding:14px 32px;border-radius:40px;font-size:15px;font-weight:600;margin-left:12px;
                          background:#f8fafc;color:#0d2c55;text-decoration:none;border:2px solid #e5e7eb;">
                          📞 Call ${safePhone ? '' : 'Client'}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

           

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="sn-footer"
            style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;line-height:1.6;">
            <table width="100%">
              <tr>
                <td>
                  <div style="margin-bottom:12px;">
                    <span style="color:#0d2c55;font-weight:600;">SuretyNest Financial Solutions</span>
                    <br>
                    Empowering clarity, confidence, and a strong financial path forward.
                  </div>
                  <div style="font-size:12px;color:#9ca3af;">
                    This enquiry was sent from the contact form on 
                    <a href="https://suretynest.vercel.app" style="color:#0d2c55;font-weight:500;text-decoration:none;">
                      SuretyNest.com
                    </a>
                    <br>
                  </div>
                </td>
               
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
    `.trim();

        const mailOptions = {
            from: `"SuretyNest Financial Solutions" <${process.env.SMTP_USER}>`,
            replyTo: email,
            to: toEmail || process.env.CONTACT_TO_EMAIL,
            subject: `New SuretyNest Enquiry from ${safeName}`,
            text: textBody,
            html: htmlBody,
            headers: {
                "X-Mailer": "SuretyNest-ContactForm",
            },
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully to SuretyNest.",
        });
    } catch (error) {
        console.error("Contact form email error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send message. Please try again.",
        });
    }
};

module.exports = { sendContactForm };