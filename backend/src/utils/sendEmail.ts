interface EmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({
  to,
  subject,
  text,
}: EmailOptions): Promise<void> {
  // TODO: Implement actual email sending with Nodemailer
  console.log('Email stub', { to, subject, text });
}

export default sendEmail;
