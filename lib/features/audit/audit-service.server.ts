import { createClient } from "@supabase/supabase-js";
import { headers, cookies } from "next/headers";

// --- Enums (Must match DB types exactly) ---

export enum AuditAction {
    // Auth
    USER_LOGIN = 'user.login',
    USER_LOGOUT = 'user.logout',
    IDENTITY_MERGED = 'identity.merged',

    // Story
    STORY_STARTED = 'story.started',
    STORY_GENERATED = 'story.generated',
    STORY_FAILED = 'story.failed',

    // Magic Sentence
    MAGIC_SENTENCE_GENERATED = 'magic_sentence.generated',
    MAGIC_SENTENCE_FAILED = 'magic_sentence.failed',

    // Word Insights
    WORD_INSIGHT_GENERATED = 'word_insight.generated',
    WORD_INSIGHT_VIEWED = 'word_insight.viewed',

    // Library
    BOOK_FAVORITED = 'book.favorited',
    BOOK_UNFAVORITED = 'book.unfavorited',
    BOOK_OPENED = 'book.opened',
    BOOK_COMPLETED = 'book.completed',

    // Vocabulary
    WORD_ADDED = 'word.added',
    WORD_REMOVED = 'word.removed',

    // Profiles
    CHILD_CREATED = 'child_profile.created',
    CHILD_UPDATED = 'child_profile.updated',
    CHILD_DELETED = 'child_profile.deleted',
    CHILD_SWITCHED = 'child_profile.switched',
    LIBRARY_SETTINGS_UPDATED = 'child_profile.library_settings_updated',

    // Assets
    IMAGE_UPLOADED = 'image.uploaded'
}

export enum EntityType {
    USER = 'user',
    STORY = 'story',
    BOOK = 'book',
    WORD = 'word',
    CHILD_PROFILE = 'child_profile',
    IMAGE = 'image',
    MAGIC_SENTENCE = 'magic_sentence'
}

// --- Types ---

export interface AuditLogPayload {
    action: AuditAction;
    entityType: EntityType;
    entityId?: string;
    details?: Record<string, any>;
    userId?: string; // Optional: If known, otherwise tries to resolve
    identityKey?: string; // Optional: Force a specific identity key
    childId?: string; // Link action to a specific child
}

// --- Service ---

export class AuditService {
    private static getServiceRoleClient() {
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                }
            }
        );
    }

    /**
     * Resolves the "Identity Key" for audit logging.
     * Priority:
     * 1. Provided explicit identityKey
     * 2. userId (if logged in)
     * 3. 'guest_id' from cookies
     * 4. 'unknown'
     */
    private static getIdentityKey(userId?: string, explicitIdentityKey?: string): string {
        if (explicitIdentityKey) return explicitIdentityKey;
        if (userId) return userId;

        // Try to get guest_id from cookies (Next.js server context)
        try {
            const cookieStore = cookies();
            const guestId = cookieStore.get("guest_id")?.value;
            if (guestId) return guestId;
        } catch (e) {
            // Context error or not in a request scope
        }

        return 'unknown';
    }

    /**
     * Sanitizes details to ensure JSON size limits and remove sensitive keys.
     */
    private static sanitizeDetails(details: Record<string, any>): Record<string, any> {
        try {
            const sanitized: Record<string, any> = {};
            const MAX_STRING_LENGTH = 255;

            for (const [key, value] of Object.entries(details)) {
                // Remove sensitive fields
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('key')) {
                    continue;
                }

                if (typeof value === 'string') {
                    sanitized[key] = value.length > MAX_STRING_LENGTH
                        ? value.substring(0, MAX_STRING_LENGTH) + '...'
                        : value;
                } else {
                    // Pass through numbers, booleans, and small objects/arrays
                    // We assume valid JSONB will be handled by Supabase client
                    sanitized[key] = value;
                }
            }
            return sanitized;
        } catch (e) {
            return { error: 'Failed to sanitize details' };
        }
    }

    private static getIpAddress(): string | null {
        try {
            const heading = headers();
            const forwardedFor = heading.get('x-forwarded-for');
            if (forwardedFor) {
                return forwardedFor.split(',')[0].trim();
            }
            return heading.get('x-real-ip') || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Main logging function. Fire-and-forget (never throws).
     */
    // In-memory cache to prevent duplicate logs (e.g. from multiple SSR passes or rapid re-renders)
    private static recentLogs = new Map<string, number>();
    private static LOG_COOLDOWN_MS = 5000; // 5 seconds

    static async log(payload: AuditLogPayload): Promise<void> {
        try {
            // Check for duplicates
            const lockKey = `${payload.action}:${payload.entityId || 'no-entity'}:${payload.userId || 'no-user'}`;
            const now = Date.now();
            const lastLog = this.recentLogs.get(lockKey);

            if (lastLog && (now - lastLog < this.LOG_COOLDOWN_MS)) {
                // Skip logging if within cooldown
                return;
            }

            // Update lock
            this.recentLogs.set(lockKey, now);

            // Cleanup old keys occasionally
            if (this.recentLogs.size > 1000) {
                for (const [key, timestamp] of this.recentLogs.entries()) {
                    if (now - timestamp > this.LOG_COOLDOWN_MS) {
                        this.recentLogs.delete(key);
                    }
                }
            }

            // Run asynchronously to not block main thread if possible, 
            // BUT in server actions/lambda, we often need to await promises.
            // We use a safe try/catch block to ensure we never crash the request.

            const identityKey = this.getIdentityKey(payload.userId, payload.identityKey);
            let childId = payload.childId;

            // Try to resolve childId from cookies if not provided
            if (!childId) {
                try {
                    const cookieStore = cookies();
                    const cookieChildId = cookieStore.get("activeChildId")?.value;
                    // Validate UUID format to prevent obvious junk from causing FK errors
                    if (cookieChildId && /^[0-9a-f-]{36}$/i.test(cookieChildId)) {
                        childId = cookieChildId;
                    }
                } catch (e) {
                    // Not in request scope
                }
            }

            // Optimization: If no identity and we are in a context where we can't find one, log as 'anonymous'
            // or should we skip? We usually want to log 'unknown' if critical.

            const ipAddress = this.getIpAddress();
            const sanitizedDetails = payload.details ? this.sanitizeDetails(payload.details) : {};

            const supabase = this.getServiceRoleClient();

            const logEntry = {
                identity_key: identityKey,
                owner_user_id: payload.userId || null,
                child_id: childId || null,
                action_type: payload.action,
                entity_type: payload.entityType,
                entity_id: payload.entityId,
                details: sanitizedDetails,
                ip_address: ipAddress,
                status: 'success'
            };

            const { error } = await supabase.from('audit_logs').insert(logEntry);

            if (error) {
                // Handle foreign key violation on child_id (23503)
                // This can happen if the activeChildId cookie is stale or belongs to a different environment
                if (error.code === '23503' && error.message?.includes('child_id') && logEntry.child_id) {
                    console.warn(`[AuditService] Invalid child_id ${logEntry.child_id} in log for ${payload.action}. Retrying without child_id.`);
                    const { error: retryError } = await supabase.from('audit_logs').insert({
                        ...logEntry,
                        child_id: null
                    });
                    if (retryError) {
                        console.error(`[AuditService] Failed to write log for ${payload.action} after retry:`, retryError);
                    }
                } else {
                    // Log to console so our log drain catches it
                    console.error(`[AuditService] Failed to write log for ${payload.action}:`, error);
                }
            } else {
                console.info(`[AuditService] Log success: ${payload.action} for ${identityKey}`);
            }
        } catch (error) {
            console.error('[AuditService] Unexpected error:', error);
        }
    }
}
