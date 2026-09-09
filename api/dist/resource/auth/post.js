import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createAccessToken } from '../../core/auth.js';
import { database, isDuplicateEntry, withTransaction } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import { toSqlDateTime } from '../../core/sql-date.js';
export function registerAuthPostRoutes(router) {
    router.post('/auth/register', async (request, response) => {
        const { name, email, password, repeatPassword } = credentials(request.body, true);
        if (password !== repeatPassword)
            throw new HttpError(400, 'Passwords do not match');
        const normalizedEmail = email.toLowerCase();
        const created = {
            id: randomUUID(),
            name,
            email: normalizedEmail,
            passwordHash: await bcrypt.hash(password, 12),
            role: 'normal_user',
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        try {
            await withTransaction(async (connection) => {
                await connection.query(`INSERT INTO users (id, name, email, password_hash, role, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`, [
                    created.id,
                    created.name,
                    created.email,
                    created.passwordHash,
                    created.role,
                    toSqlDateTime(created.createdAt),
                ]);
                await connection.query('INSERT INTO settings (user_id, app_name, owner_name) VALUES (?, ?, ?)', [created.id, 'My hike log', created.name]);
            });
        }
        catch (error) {
            if (isDuplicateEntry(error))
                throw new HttpError(409, 'A user is already registered with this email');
            throw error;
        }
        const user = created;
        const { id, name: registeredName, email: registeredEmail, role } = user;
        response.status(201).json({ user: { id, name: registeredName, email: registeredEmail, role } });
    });
    router.post('/auth/login', async (request, response) => {
        const { email, password } = credentials(request.body, false);
        const [user] = await database.query(`SELECT id, name, email, password_hash AS passwordHash, role, status,
              CAST(created_at AS CHAR) AS createdAt
         FROM users WHERE email = ?`, [email.toLowerCase()]);
        if (!user || user.status === 'deleted' || !(await bcrypt.compare(password, user.passwordHash)))
            throw new HttpError(401, 'Invalid email or password');
        if (user.status === 'blocked')
            throw new HttpError(403, 'Your account is blocked');
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
