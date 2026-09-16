import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { rateLimit } from "../core/rate-limit.js";

test("rate limiter rejects requests after the configured maximum", () => {
  const middleware = rateLimit(1, 60_000);
  const request = { ip: "127.0.0.1", socket: {} } as Request;
  let status = 0;
  let nextCalls = 0;
  const response = {
    status(value: number) {
      status = value;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  middleware(request, response, () => {
    nextCalls += 1;
  });
  middleware(request, response, () => {
    nextCalls += 1;
  });
  assert.equal(nextCalls, 1);
  assert.equal(status, 429);
});
