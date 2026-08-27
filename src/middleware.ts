import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, getClientIp, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";

/**
 * Next.js Middleware — runs on every matched request before the route handler.
 *
 * Responsibilities:
 * 1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. Rate limiting on auth and sensitive API routes
 * 3. CSRF protection on state-changing API requests
 * 4. Authentication gate for /dashboard/* routes
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    // ─────────────────────────────────────────────
    // 1. SECURITY HEADERS (applied to all responses)
    // ─────────────────────────────────────────────
    const response = NextResponse.next();

    // Prevent clickjacking
    response.headers.set("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    response.headers.set("X-Content-Type-Options", "nosniff");

    // XSS protection (legacy browsers)
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions policy (disable unused browser features)
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    );

    // HSTS — enforce HTTPS (only in production)
    if (process.env.NODE_ENV === "production") {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload"
        );
    }

    // Content Security Policy
    const csp = [
        "default-src 'self'",
        // Scripts: self + inline (needed for Next.js) + eval (needed for KaTeX)
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
        // Styles: self + inline (needed for Tailwind/KaTeX)
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Fonts
        "font-src 'self' https://fonts.gstatic.com data:",
        // Images: self + data URIs (for base64 logos) + blob (for generated content)
        "img-src 'self' data: blob: https:",
        // Connect: self + Google AI API + Google OAuth
        "connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com",
        // Frame for Google OAuth popup
        "frame-src https://accounts.google.com https://www.google.com",
        // Object/media
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join("; ");

    response.headers.set("Content-Security-Policy", csp);

    // ─────────────────────────────────────────────
    // 2. RATE LIMITING
    // ─────────────────────────────────────────────
    const clientIp = getClientIp(request);

    // Rate limit: Registration endpoint
    if (pathname === "/api/auth/register" && method === "POST") {
        const result = checkRateLimit(`register:${clientIp}`, RATE_LIMIT_CONFIGS.register);
        if (result.limited) {
            return NextResponse.json(
                { message: "Too many registration attempts. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                        "X-RateLimit-Limit": String(RATE_LIMIT_CONFIGS.register.maxRequests),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            );
        }
    }

    // Rate limit: Login attempts (NextAuth credentials)
    if (pathname.startsWith("/api/auth") && method === "POST") {
        const result = checkRateLimit(`auth:${clientIp}`, RATE_LIMIT_CONFIGS.auth);
        if (result.limited) {
            return NextResponse.json(
                { message: "Too many login attempts. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                        "X-RateLimit-Limit": String(RATE_LIMIT_CONFIGS.auth.maxRequests),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            );
        }
    }

    // Rate limit: AI routes
    if (pathname.startsWith("/api/ai/") && method === "POST") {
        const result = checkRateLimit(`ai:${clientIp}`, RATE_LIMIT_CONFIGS.ai);
        if (result.limited) {
            return NextResponse.json(
                { message: "Too many AI requests. Please wait before trying again." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                    },
                }
            );
        }
    }

    // Rate limit: Credit purchase
    if (pathname === "/api/user/credits" && method === "POST") {
        const result = checkRateLimit(`credits:${clientIp}`, RATE_LIMIT_CONFIGS.credits);
        if (result.limited) {
            return NextResponse.json(
                { message: "Too many purchase attempts. Please try again later." },
                { status: 429 }
            );
        }
    }

    // Rate limit: Student test submissions
    if (pathname.match(/^\/api\/paper\/[^/]+\/submit$/) && method === "POST") {
        const result = checkRateLimit(`submit:${clientIp}`, RATE_LIMIT_CONFIGS.auth);
        if (result.limited) {
            return NextResponse.json(
                { message: "Too many submissions. Please wait before trying again." },
                { status: 429 }
            );
        }
    }

    // ─────────────────────────────────────────────
    // 3. CSRF PROTECTION
    // ─────────────────────────────────────────────
    // For state-changing requests to API routes, verify the Origin/Referer
    // matches our application's origin. This prevents cross-site request forgery.
    // Skip for NextAuth routes (they have their own CSRF token handling).
    if (
        pathname.startsWith("/api/") &&
        !pathname.startsWith("/api/auth/") &&
        ["POST", "PUT", "DELETE", "PATCH"].includes(method)
    ) {
        const origin = request.headers.get("origin");
        const referer = request.headers.get("referer");
        const host = request.headers.get("host");

        // In production, strictly enforce origin check
        if (process.env.NODE_ENV === "production" && host) {
            const allowedOrigin = `https://${host}`;
            const isOriginValid = origin === allowedOrigin || origin === `http://${host}`;
            const isRefererValid = referer?.startsWith(allowedOrigin) || referer?.startsWith(`http://${host}`);

            // Allow if either origin or referer matches (some browsers don't send origin)
            // Also allow requests with no origin AND no referer (server-to-server, same-origin fetch)
            if (origin && !isOriginValid && !isRefererValid) {
                return NextResponse.json(
                    { message: "Forbidden: Invalid request origin" },
                    { status: 403 }
                );
            }
        }
    }

    // ─────────────────────────────────────────────
    // 4. AUTHENTICATION GATE (Dashboard routes)
    // ─────────────────────────────────────────────
    if (pathname.startsWith("/dashboard")) {
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return response;
}

/**
 * Matcher configuration — only run middleware on matched routes.
 * This avoids running on static files, images, fonts, etc.
 */
export const config = {
    matcher: [
        // Dashboard routes (auth gate)
        "/dashboard/:path*",
        // API routes (rate limiting + CSRF + headers)
        "/api/:path*",
        // Public pages (security headers only)
        "/",
        "/login",
        "/register",
        "/test/:path*",
    ],
};
