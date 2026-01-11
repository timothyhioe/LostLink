import nodemailer from "nodemailer";
import { env } from "../config/env";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: EmailOptions): Promise<void> {
  if (!env.SMTP_HOST) {
    console.log("Email stub", { to, subject, text });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || `no-reply@${env.MINIO_ENDPOINT}`,
      to,
      subject,
      text,
    });
    console.log("Email sent", { to, subject });
  } catch (err) {
    console.error("Failed to send email", err);
    throw err;
  }
}

export default sendEmail;
