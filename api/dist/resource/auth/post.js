import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createAccessToken } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
export function registerAuthPostRoutes(router) {
    router.post('/auth/register', async (request, response) => {
        const { name, email, password, repeatPassword } = credentials(request.body, true);
        if (password !== repeatPassword)
            throw new HttpError(400, 'Passwords do not match');
        const normalizedEmail = email.toLowerCase();
        const user = await database.update(async (data) => {
            if (data.users.some((candidate) => candidate.email.trim().toLowerCase() === normalizedEmail))
                throw new HttpError(409, 'A user is already registered with this email');
            const created = {
                id: randomUUID(),
                name,
                email: normalizedEmail,
                passwordHash: await bcrypt.hash(password, 12),
                role: 'normal_user',
                createdAt: new Date().toISOString(),
            };
            data.users.push(created);
            data.settings.push({ userId: created.id, appName: 'My hike log', ownerName: created.name });
            return created;
        });
        const { id, name: registeredName, email: registeredEmail, role } = user;
        response.status(201).json({ user: { id, name: registeredName, email: registeredEmail, role } });
    });
    router.post('/auth/login', async (request, response) => {
        const { email, password } = credentials(request.body, false);
        const user = (await database.read()).users.find((candidate) => candidate.email === email.toLowerCase());
        if (!user || !(await bcrypt.compare(password, user.passwordHash)))
            throw new HttpError(401, 'Invalid email or password');
        response.json(authResponse(user));
    });
}
function credentials(value, registration) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new HttpError(400, 'A JSON object is required');
    const body = value;
    const name = typeof body['name'] === 'string' ? body['name'].trim() : '';
    const email = typeof body['email'] === 'string' ? body['email'].trim() : '';
    const password = typeof body['password'] === 'string' ? body['password'] : '';
    const repeatPassword = typeof body['repeatPassword'] === 'string' ? body['repeatPassword'] : '';
    if (registration && !name)
        throw new HttpError(400, 'Name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new HttpError(400, 'Valid email is required');
    if (password.length < 8)
        throw new HttpError(400, 'Password must contain at least 8 characters');
    return { name, email, password, repeatPassword };
}
function authResponse(user) {
    const { id, name, email, role } = user;
    return { token: createAccessToken(id, role), user: { id, name, email, role } };
}
