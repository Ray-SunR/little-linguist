import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeHaptics } from '../haptics';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
    },
}));

vi.mock('@capacitor/haptics', () => ({
    Haptics: {
        impact: vi.fn(),
    },
    ImpactStyle: {
        Light: 'LIGHT',
        Medium: 'MEDIUM',
        Heavy: 'HEAVY',
    },
}));

describe('safeHaptics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT call Haptics.impact when NOT on native platform', async () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        
        await safeHaptics.impact({ style: ImpactStyle.Light });
        
        expect(Haptics.impact).not.toHaveBeenCalled();
    });

    it('should call Haptics.impact when on native platform', async () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(Haptics.impact).mockResolvedValue(undefined);
        
        await safeHaptics.impact({ style: ImpactStyle.Light });
        
        expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('should catch and ignore errors from Haptics.impact', async () => {
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(Haptics.impact).mockRejectedValue(new Error('Browser does not support the vibrate API'));
        
        // This should not throw
        await expect(safeHaptics.impact({ style: ImpactStyle.Light })).resolves.not.toThrow();
        
        expect(Haptics.impact).toHaveBeenCalled();
    });
});
