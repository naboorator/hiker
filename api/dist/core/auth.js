import jwt from 'jsonwebtoken';
import { HttpError } from './http-error.js';
import { database } from './database.js';
const tokenSecret = process.env['JWT_SECRET'] ?? 'my-hike-development-secret-change-me';
export function createAccessToken(userId, role) {
    return jwt.sign({ role }, tokenSecret, { subject: userId, expiresIn: '7d' });
}
export async function requireAuthentication(request, response, next) {
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer '))
        return next(new HttpError(401, 'Authentication required'));
    try {
        const payload = jwt.verify(authorization.slice(7), tokenSecret);
        if (!payload.sub)
            throw new Error('Missing subject');
        const [user] = await database.query('SELECT role, status FROM users WHERE id = ?', [payload.sub]);
        if (!user)
            return next(new HttpError(401, 'User no longer exists'));
        if (user.status === 'blocked')
            return next(new HttpError(403, 'Your account is blocked'));
        if (user.status === 'deleted')
            return next(new HttpError(401, 'User no longer exists'));
        response.locals['userId'] = payload.sub;
        response.locals['role'] = user.role;
        next();
    }
    catch (error) {
        if (error instanceof HttpError)
            return next(error);
        if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'))
            return next(new HttpError(401, 'Invalid or expired access token'));
        next(error);
    }
}
export function authenticatedUserRole(response) {
    const role = response.locals['role'];
    if (role !== 'normal_user' && role !== 'admin')
        throw new HttpError(401, 'Authentication required');
    return role;
}
export function isAdministrator(response) {
    return authenticatedUserRole(response) === 'admin';
}
export function requireAdministrator(response) {
    if (!isAdministrator(response))
        throw new HttpError(403, 'Administrator access required');
}
export function authenticatedUserId(response) {
    const userId = response.locals['userId'];
    if (typeof userId !== 'string')
        throw new HttpError(401, 'Authentication required');
    return userId;
}
