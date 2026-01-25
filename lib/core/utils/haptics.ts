import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, type ImpactOptions } from '@capacitor/haptics';

export { ImpactStyle };

export const safeHaptics = {
    /**
     * Safely triggers a haptics impact.
     * Only runs on native platforms and silently handles any errors.
     */
    impact: async (options: ImpactOptions): Promise<void> => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }
        try {
            await Haptics.impact(options);
        } catch (error) {
            // Silently ignore haptics failures to prevent uncaught promise errors
            if (process.env.NODE_ENV === 'development') {
                console.warn('Haptics impact failed:', error);
            }
        }
    }
};
