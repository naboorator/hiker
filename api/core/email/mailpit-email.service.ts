import nodemailer from "nodemailer";
import type { EmailMessage } from "../../interface/email-message.interface.js";
import type { EmailService } from "./email-service.interface.js";

export class MailpitEmailService implements EmailService {
  private readonly transport;

  constructor(
    host: string,
    port: number,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({ host, port, secure: false });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: { "X-Idempotency-Key": message.idempotencyKey },
    });
  }
}
