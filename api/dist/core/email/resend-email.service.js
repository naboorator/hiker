export class ResendEmailService {
    apiKey;
    from;
    constructor(apiKey, from) {
        this.apiKey = apiKey;
        this.from = from;
    }
    async send(message) {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": message.idempotencyKey,
            },
            body: JSON.stringify({
                from: this.from,
                to: [message.to],
                subject: message.subject,
                html: message.html,
                text: message.text,
            }),
        });
        if (!response.ok)
            throw new Error(`Resend rejected email with status ${response.status}`);
    }
}
