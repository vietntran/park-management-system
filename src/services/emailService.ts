// src/services/emailService.ts
import { readFileSync } from "fs";
import path from "path";

import { Resend } from "resend";

import logger from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  async sendVerificationEmail(email: string, token: string) {
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;

      // Read the template
      const templatePath = path.join(
        process.cwd(),
        "src/emails/templates/verification.html",
      );
      let template = readFileSync(templatePath, "utf8");

      // Replace placeholders
      template = template.replace(/\{verificationUrl\}/g, verificationUrl);

      await resend.emails.send({
        from: "Park System <noreply@your-domain.com>",
        to: email,
        subject: "Verify your email address",
        html: template,
      });

      logger.info("Verification email sent successfully", {
        email,
        verificationUrl,
      });
    } catch (error) {
      logger.error("Failed to send verification email", {
        error: error instanceof Error ? error : new Error(String(error)),
        email,
      });
      throw new Error("Failed to send verification email");
    }
  },
};
