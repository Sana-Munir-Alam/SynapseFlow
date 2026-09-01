import { NextFunction, Request, Response } from "express";

const BUCKET_CAPACITY = 3;       // max tokens a user can hold
const REFILL_RATE_MS = 10000;    // 1 token refilled every 10 seconds

interface BucketState {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketState>();

export const aiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Date.now();

  // get or initialise bucket for this user
  const bucket = buckets.get(userId) ?? { tokens: BUCKET_CAPACITY, lastRefill: now };

  // calculate how many tokens have refilled since last request
  const elapsed = now - bucket.lastRefill;
  const refillAmount = Math.floor(elapsed / REFILL_RATE_MS);

  if (refillAmount > 0) {
    bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
  }

  // reject if empty
  if (bucket.tokens <= 0) {
    const msUntilNextToken = REFILL_RATE_MS - (elapsed % REFILL_RATE_MS);
    const secondsUntilNextToken = Math.ceil(msUntilNextToken / 1000);

    return res.status(429).json({
      message: `You're sending requests too fast. Try again in ${secondsUntilNextToken}s.`
    });
  }

  // consume one token and save
  bucket.tokens -= 1;
  buckets.set(userId, bucket);

  return next();
};

// sweep buckets that are full and untouched
setInterval(() => {
  const now = Date.now();
  for (const [userId, bucket] of buckets.entries()) {
    const elapsed = now - bucket.lastRefill;
    const refillAmount = Math.floor(elapsed / REFILL_RATE_MS);
    const currentTokens = Math.min(BUCKET_CAPACITY, bucket.tokens + refillAmount);
    if (currentTokens >= BUCKET_CAPACITY) {
      buckets.delete(userId);
    }
  }
}, 60 * 1000);