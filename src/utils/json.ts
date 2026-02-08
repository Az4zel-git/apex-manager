import { logger } from './logger';

/**
 * Safely parses a JSON string into a typed object.
 * Returns a default value if parsing fails, ensuring runtime safety.
 * 
 * @param jsonString - The string to parse.
 * @param fallback - The default value to return on failure.
 * @param context - Optional context for identifying the error source.
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T, context: string = 'JSON Parse'): T {
    if (!jsonString) return fallback;
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        logger.error(`[${context}] Failed to parse JSON:`, error);
        return fallback;
    }
}

/**
 * Validates that an object matches a basic predicate.
 * @param data - The data to validate.
 * @param predicate - A function that returns true if valid.
 */
export function validateSchema<T>(data: any, predicate: (d: any) => boolean): T | null {
    if (predicate(data)) {
        return data as T;
    }
    return null;
}
