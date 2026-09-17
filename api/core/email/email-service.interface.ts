import type { EmailMessage } from "../../interface/email-message.interface.js";

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}
