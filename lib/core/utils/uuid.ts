/**
 * Robust UUID v4 generator that works in all contexts:
 * 1. Native crypto.randomUUID (Browser/Secure Context & Node.js 14+)
 * 2. Web Crypto API getRandomValues (Higher precision fallback)
 * 3. Node.js 'crypto' module (For server-side/scripts)
 * 4. Math.random (Last resort for extremely restricted non-secure contexts)
 */
export function generateUUID(): string {
    // 1. Try native crypto.randomUUID (Best)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // 2. Try Web Crypto getRandomValues (Strong Fallback)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
    }

    // 3. Ultimate fallback (Math.random)
    // WARNING: This is predictable and should only be used in non-secure local dev environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
