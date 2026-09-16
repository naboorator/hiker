export class IdempotentEmailService {
    provider;
    completed = new Set();
    pending = new Map();
    constructor(provider) {
        this.provider = provider;
    }
    async send(message) {
        if (this.completed.has(message.idempotencyKey))
            return;
        const existing = this.pending.get(message.idempotencyKey);
        if (existing)
            return existing;
        const delivery = this.provider.send(message).then(() => {
            this.completed.add(message.idempotencyKey);
        });
        this.pending.set(message.idempotencyKey, delivery);
        try {
            await delivery;
        }
        finally {
            this.pending.delete(message.idempotencyKey);
        }
    }
}
