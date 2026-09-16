import nodemailer from "nodemailer";
export class MailpitEmailService {
    from;
    transport;
    constructor(host, port, from) {
        this.from = from;
        this.transport = nodemailer.createTransport({ host, port, secure: false });
    }
    async send(message) {
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
