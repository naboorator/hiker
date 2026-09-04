import jwt from 'jsonwebtoken';
import { HttpError } from './http-error.js';
const tokenSecret = process.env['JWT_SECRET'] ?? 'my-hike-development-secret-change-me';
export function createAccessToken(userId, role) {
    return jwt.sign({ role }, tokenSecret, { subject: userId, expiresIn: '7d' });
}
export function requireAuthentication(request, response, next) {
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer '))
        return next(new HttpError(401, 'Authentication required'));
    try {
        const payload = jwt.verify(authorization.slice(7), tokenSecret);
        if (!payload.sub)
            throw new Error('Missing subject');
        response.locals['userId'] = payload.sub;
        response.locals['role'] = payload.role;
        next();
    }
    catch {
        next(new HttpError(401, 'Invalid or expired access token'));
    }
}
export function authenticatedUserId(response) {
    const userId = response.locals['userId'];
    if (typeof userId !== 'string')
        throw new HttpError(401, 'Authentication required');
    return userId;
}
