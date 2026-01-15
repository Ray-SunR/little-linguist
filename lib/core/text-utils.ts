/**
 * Sanitizes a word for storage and strict comparison.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes special characters except hyphens and spaces
 * - Collapses multiple spaces
 */
export function sanitizeWord(text: string): string {
    return text
        .trim()
        .toLowerCase()
        // Allow alphanumeric, spaces, and hyphens. Remove quotes, etc.
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, " ");
}
