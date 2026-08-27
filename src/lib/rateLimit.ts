/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Uses a sliding-window counter pattern with automatic cleanup.
 * For single-server deployments (Hostinger VPS with PM2), in-memory
 * storage is sufficient. For multi-server deployments, swap this
 * with a Redis-backed implementation.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
        if (now > entry.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 60_000);

interface RateLimitConfig {
    /** Maximum number of requests allowed within the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
}

/**
 * Preset rate limit configurations for different route categories
 */
export const RATE_LIMIT_CONFIGS = {
    /** Auth routes: 5 requests per 60 seconds per IP */
    auth: { maxRequests: 5, windowSeconds: 60 } as RateLimitConfig,

    /** Registration: 3 requests per 300 seconds (5 min) per IP */
    register: { maxRequests: 3, windowSeconds: 300 } as RateLimitConfig,

    /** AI routes: 10 requests per 60 seconds per user */
    ai: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,

    /** General API: 60 requests per 60 seconds per IP */
    general: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,

    /** Credit purchase: 5 requests per 300 seconds per user */
    credits: { maxRequests: 5, windowSeconds: 300 } as RateLimitConfig,
} as const;

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique key (e.g., IP address or user ID)
 * @param config - Rate limit configuration
 * @returns Object with `limited` boolean and metadata
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): { limited: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const key = identifier;
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        // First request or window expired — start fresh
        rateLimitStore.set(key, {
            count: 1,
            resetAt: now + config.windowSeconds * 1000,
        });
        return {
            limited: false,
            remaining: config.maxRequests - 1,
            resetAt: now + config.windowSeconds * 1000,
        };
    }

    // Within the window
    entry.count++;

    if (entry.count > config.maxRequests) {
        return {
            limited: true,
            remaining: 0,
            resetAt: entry.resetAt,
        };
    }

    return {
        limited: false,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
    };
}

/**
 * Extract client IP from request headers.
 * Handles X-Forwarded-For (reverse proxy), X-Real-IP, and direct connection.
 */
export function getClientIp(request: Request): string {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
        // X-Forwarded-For can contain multiple IPs; first is the client
        return xff.split(",")[0].trim();
    }

    const xRealIp = request.headers.get("x-real-ip");
    if (xRealIp) {
        return xRealIp.trim();
    }

    // Fallback — not ideal but covers direct connections
    return "unknown";
}
