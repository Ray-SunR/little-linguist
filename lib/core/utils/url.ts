export function getBaseUrl() {
    // If we're on the client, use location.origin
    if (typeof window !== 'undefined') {
        // Preference for environment variable if set, otherwise location.origin
        const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
        
        return window.location.origin;
    }

    // On the server, we should ideally NOT call this without a request object
    // but we can provide a fallback if absolutely necessary
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;

    return 'http://localhost:3000';
}

/**
 * Get the base URL from a Next.js Request or Headers object
 * Respects proxy headers (x-forwarded-host, x-forwarded-proto)
 */
export function getBaseUrlFromRequest(request: Request | Headers) {
    const headers = 'headers' in request ? request.headers : request;
    
    // Explicit environment variable override
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;

    const host = headers.get('x-forwarded-host') || headers.get('host');
    const proto = headers.get('x-forwarded-proto') || 'https';
    
    // Safety check: if host is null (unlikely in middleware but possible in some tests)
    if (!host) {
        return 'http://localhost:3000';
    }

    const base = `${proto}://${host}`;
    return base.endsWith('/') ? base.slice(0, -1) : base;
}
