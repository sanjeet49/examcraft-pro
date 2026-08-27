/**
 * Security validation utilities for user input.
 */

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validates password strength.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character (!@#$%^&*...)");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validates email format.
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitizes a string by trimming whitespace and removing control characters.
 */
export function sanitizeInput(input: string): string {
    // Remove control characters (except newlines and tabs in case of text areas)
    // eslint-disable-next-line no-control-regex
    return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
