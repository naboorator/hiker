import type { RequestHandler } from "express";

interface AttemptWindow {
  count: number;
  resetsAt: number;
}

export function rateLimit(
  maxRequests: number,
  windowMilliseconds: number,
): RequestHandler {
  const attempts = new Map<string, AttemptWindow>();
  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const current = attempts.get(key);
    const window =
      !current || current.resetsAt <= now
        ? { count: 0, resetsAt: now + windowMilliseconds }
        : current;
    window.count += 1;
    attempts.set(key, window);
    if (window.count > maxRequests) {
      response
        .status(429)
        .json({ error: "Too many requests. Please try again later" });
      return;
    }
    next();
  };
}
