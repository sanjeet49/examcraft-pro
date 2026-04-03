import { GoogleGenAI } from "@google/genai";

// Shared singleton Gemini client — import this instead of creating per-route instances
let _ai: GoogleGenAI | null = null;

export const getAI = (): GoogleGenAI => {
    if (!_ai) {
        _ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY || "dummy-key-for-build",
        });
    }
    return _ai;
};

/**
 * Wraps a Gemini API call with automatic retry on 429 rate-limit errors.
 * Retries once after `delayMs` before surfacing the error to the caller.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 1,
    delayMs = 5000
): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        const is429 =
            err?.status === 429 ||
            err?.message?.includes("429") ||
            err?.message?.includes("quota") ||
            err?.message?.includes("RESOURCE_EXHAUSTED");

        if (is429 && retries > 0) {
            await new Promise((r) => setTimeout(r, delayMs));
            return withRetry(fn, retries - 1, delayMs * 2);
        }
        throw err;
    }
}

/** Standard 429 error response returned to the client */
export const quotaErrorResponse = () =>
    Response.json(
        {
            error: "Google AI quota reached. Please wait a minute and try again.",
            message: "Google AI quota reached. Please wait a minute and try again.",
        },
        { status: 429 }
    );
