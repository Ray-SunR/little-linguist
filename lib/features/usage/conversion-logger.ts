import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";
import { cookies } from "next/headers";

/**
 * Server-side utility for logging conversion events.
 * Handles tracking of guest sessions converting to registered users.
 */
export class ConversionLogger {
  /**
   * Logs a successful conversion event when a guest draft becomes a permanent profile.
   */
  static async logConversion(userId: string, childId: string, name: string) {
    const guestId = cookies().get('guest_id')?.value;
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[CONVERSION:SUCCESS] User ${userId} created profile ${childId} (${name}). GuestID: ${guestId || 'none'}`);
    }

    // 1. Log the child creation with conversion metadata
    await AuditService.log({
      action: AuditAction.CHILD_CREATED,
      entityType: EntityType.CHILD_PROFILE,
      entityId: childId,
      userId: userId,
      childId: childId,
      details: { 
        name,
        is_conversion: !!guestId,
        guest_id: guestId 
      }
    });

    // 2. Log the identity merge if a guest ID was present
    if (guestId) {
      await AuditService.log({
        action: AuditAction.IDENTITY_MERGED,
        entityType: EntityType.USER,
        entityId: userId,
        userId: userId,
        details: { 
          guest_id: guestId,
          source: 'story_maker_conversion' 
        }
      });
      console.info(`[ConversionLogger] User ${userId} successfully converted from guest ${guestId}`);
    }
  }

  /**
   * Server action helper to log when a guest hits the "Login Wall"
   */
  static async logGuestInterruption(guestId: string, reason: string) {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[CONVERSION:INTERRUPTION] Guest ${guestId} interrupted for ${reason}`);
    }
    await AuditService.log({
      action: AuditAction.STORY_STARTED,
      entityType: EntityType.USER,
      identityKey: guestId,
      details: { 
        step: 'interrupted_for_login',
        reason
      }
    });
  }
}
