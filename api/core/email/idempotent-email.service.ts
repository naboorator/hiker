import type { EmailMessage } from "../../interface/email-message.interface.js";
import type { EmailService } from "./email-service.interface.js";

export class IdempotentEmailService implements EmailService {
  private readonly completed = new Set<string>();
  private readonly pending = new Map<string, Promise<void>>();

  constructor(private readonly provider: EmailService) {}

  async send(message: EmailMessage): Promise<void> {
    if (this.completed.has(message.idempotencyKey)) return;
    const existing = this.pending.get(message.idempotencyKey);
    if (existing) return existing;
    const delivery = this.provider.send(message).then(() => {
      this.completed.add(message.idempotencyKey);
    });
    this.pending.set(message.idempotencyKey, delivery);
    try {
      await delivery;
    } finally {
      this.pending.delete(message.idempotencyKey);
    }
  }
}
